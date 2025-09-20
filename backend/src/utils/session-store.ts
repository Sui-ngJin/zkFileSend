import { randomUUID } from "crypto";
import type { EnokiClient } from "@mysten/enoki";

type ZkLoginProof = Awaited<ReturnType<EnokiClient["createZkLoginZkp"]>>;

export type StoredSession = {
	address: string;
	jwt: string;
	randomness: string;
	maxEpoch: number;
	ephemeralKeyPair: string;
	proof?: ZkLoginProof;
	email?: string | null;
	expiresAt: number;
};

class SessionStore {
	private readonly sessions = new Map<string, StoredSession>();

	createSession(data: Omit<StoredSession, "expiresAt">, ttlMs: number) {
		const id = randomUUID();
		const expiresAt = Date.now() + ttlMs;
		this.sessions.set(id, { ...data, expiresAt });
		return { id, expiresAt };
	}

	getSession(id: string) {
		const session = this.sessions.get(id);
		if (!session) {
			return null;
		}
		if (Date.now() > session.expiresAt) {
			this.sessions.delete(id);
			return null;
		}
		return session;
	}

	deleteSession(id: string) {
		this.sessions.delete(id);
	}
}

export const sessionStore = new SessionStore();
