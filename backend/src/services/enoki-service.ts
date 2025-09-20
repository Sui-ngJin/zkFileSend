import { randomUUID } from "crypto";
import type { Request } from "express";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { fromBase64, toBase64 } from "@mysten/sui/utils";
import { EnokiClient } from "@mysten/enoki";
import { config } from "../config.js";
import { sessionStore } from "../utils/session-store.js";

const GOOGLE_OAUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const PENDING_TTL_MS = 5 * 60 * 1_000;
const SESSION_TTL_MS = 6 * 60 * 60 * 1_000;

type PendingEntry = {
	randomness: string;
	maxEpoch: number;
	ephemeralSecret: string;
	expiresAt: number;
};

const pendingStates = new Map<string, PendingEntry>();

const enokiClient = new EnokiClient({
	apiKey: config.enokiPrivateKey,
	apiUrl: config.enokiApiUrl,
});

function cleanupPending() {
	const now = Date.now();
	for (const [state, entry] of pendingStates.entries()) {
		if (now > entry.expiresAt) {
			pendingStates.delete(state);
		}
	}
}

export async function startGoogleAuth(state?: string) {
	const ephemeral = Ed25519Keypair.generate();
	const { secretKey } = decodeSuiPrivateKey(ephemeral.getSecretKey());
	const ephemeralSecret = toBase64(secretKey);

	const nonceResponse = await enokiClient.createZkLoginNonce({
		network: config.enokiEnv,
		ephemeralPublicKey: ephemeral.getPublicKey(),
	});

	const loginState = state ?? randomUUID();
	pendingStates.set(loginState, {
		randomness: nonceResponse.randomness,
		maxEpoch: nonceResponse.maxEpoch,
		ephemeralSecret,
		expiresAt: nonceResponse.estimatedExpiration ?? Date.now() + PENDING_TTL_MS,
	});

	const params = new URLSearchParams({
		client_id: config.googleClientId,
		redirect_uri: config.googleRedirectUri,
		response_type: "id_token",
		scope: "openid email profile",
		nonce: nonceResponse.nonce,
		state: loginState,
		prompt: "select_account",
	});

	cleanupPending();

	return {
		url: `${GOOGLE_OAUTH_URL}?${params}`,
		state: loginState,
	};
}

function normalizeHash(hash: string) {
	if (!hash) return "";
	return hash.startsWith("#") ? hash.slice(1) : hash;
}

function extractEmailFromJwt(idToken: string): string | null {
	const parts = idToken.split(".");
	if (parts.length < 2) {
		return null;
	}
	const base64 = parts[1]
		.replace(/-/g, "+")
		.replace(/_/g, "/")
		.padEnd(parts[1].length + ((4 - (parts[1].length % 4)) % 4), "=");
	try {
		const payload = JSON.parse(Buffer.from(base64, "base64").toString("utf8")) as {
			email?: string;
		};
		return payload?.email ?? null;
	} catch (error) {
		console.warn("Failed to decode id_token payload", error);
		return null;
	}
}

export async function completeGoogleAuth(state: string, hash: string) {
	const entry = pendingStates.get(state);
	if (!entry || Date.now() > entry.expiresAt) {
		pendingStates.delete(state);
		throw new Error("Login state expired or unknown");
	}

	pendingStates.delete(state);

	const params = new URLSearchParams(normalizeHash(hash));
	const idToken = params.get("id_token");
	const stateFromHash = params.get("state");

	if (!idToken) {
		throw new Error("Missing id_token in callback");
	}

	if (stateFromHash && stateFromHash !== state) {
		throw new Error("State mismatch");
	}

	const login = await enokiClient.getZkLogin({ jwt: idToken });
	const ephemeralKeypair = Ed25519Keypair.fromSecretKey(
		fromBase64(entry.ephemeralSecret),
	);
	const proof = await enokiClient.createZkLoginZkp({
		network: config.enokiEnv,
		jwt: idToken,
		randomness: entry.randomness,
		maxEpoch: entry.maxEpoch,
		ephemeralPublicKey: ephemeralKeypair.getPublicKey(),
	});

	const email = extractEmailFromJwt(idToken);

	const { id, expiresAt } = sessionStore.createSession(
		{
			address: login.address,
			jwt: idToken,
			randomness: entry.randomness,
			maxEpoch: entry.maxEpoch,
			ephemeralKeyPair: entry.ephemeralSecret,
			proof,
			email,
		},
		SESSION_TTL_MS,
	);

	return {
		sessionId: id,
		expiresAt,
		address: login.address,
		salt: login.salt,
		publicKey: login.publicKey,
		email: email ?? undefined,
	};
}

export function extractHashFromRequest(req: Request) {
	const hash = req.body?.hash ?? req.query?.hash ?? "";
	if (typeof hash !== "string") {
		throw new Error("Missing OAuth hash fragment");
	}
	return hash;
}
