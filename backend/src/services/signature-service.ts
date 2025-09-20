import { fromBase64, toBase64 } from "@mysten/bcs";
import { blake2b } from "@noble/hashes/blake2b";
import { bcs } from "@mysten/sui/bcs";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { getZkLoginSignature } from "@mysten/sui/zklogin";
import type { StoredSession } from "../utils/session-store.js";

function messageWithIntent(message: Uint8Array) {
	return bcs
		.IntentMessage(bcs.fixedArray(message.length, bcs.u8()))
		.serialize({
		intent: {
			scope: { TransactionData: true } as const,
			version: { V0: true } as const,
			appId: { Sui: true } as const,
		},
		value: message,
	})
	.toBytes();
}

function personalMessageWithIntent(message: Uint8Array) {
	const messageVector = bcs.vector(bcs.u8()).serialize(message).toBytes();
	return bcs
		.IntentMessage(bcs.fixedArray(messageVector.length, bcs.u8()))
		.serialize({
			intent: {
				scope: { PersonalMessage: true } as const,
				version: { V0: true } as const,
				appId: { Sui: true } as const,
			},
			value: messageVector,
		})
		.toBytes();
}

export async function createZkLoginSignatureForTransaction(
	session: StoredSession,
	transactionBlockBase64: string,
) {
	if (!session.proof) {
		throw new Error("ZkLogin proof is missing from session");
	}
	const transactionBytes = fromBase64(transactionBlockBase64);
	const intentMessage = messageWithIntent(transactionBytes);
	const digest = blake2b(intentMessage, { dkLen: 32 });
	const ephemeralKeypair = Ed25519Keypair.fromSecretKey(
		fromBase64(session.ephemeralKeyPair),
	);
	const userSignatureBytes = await ephemeralKeypair.sign(digest);

	return getZkLoginSignature({
		inputs: session.proof,
		maxEpoch: session.maxEpoch,
		userSignature: toBase64(userSignatureBytes),
	});
}

export async function createZkLoginSignatureForPersonalMessage(
	session: StoredSession,
	messageBase64: string,
) {
	if (!session.proof) {
		throw new Error("ZkLogin proof is missing from session");
	}
	const messageBytes = fromBase64(messageBase64);
	console.log(`messageBytes: ${messageBytes}`);

	const intentMessage = personalMessageWithIntent(messageBytes);
	console.log(`intentMessage: ${intentMessage}`);

	const digest = blake2b(intentMessage, { dkLen: 32 });
	console.log(`digest: ${digest}`);

	const ephemeralKeypair = Ed25519Keypair.fromSecretKey(
		fromBase64(session.ephemeralKeyPair),
	);
	console.log(ephemeralKeypair);

	const userSignatureBytes = await ephemeralKeypair.sign(digest);

	return getZkLoginSignature({
		inputs: session.proof,
		maxEpoch: session.maxEpoch,
		userSignature: toBase64(userSignatureBytes),
	});
}

export async function createEphemeralSignatureForPersonalMessage(
	session: StoredSession,
	messageBase64: string,
) {
	const messageBytes = fromBase64(messageBase64);
	console.log(`messageBytes for ephemeral: ${messageBytes}`);

	const intentMessage = personalMessageWithIntent(messageBytes);
	console.log(`intentMessage for ephemeral: ${intentMessage}`);

	const digest = blake2b(intentMessage, { dkLen: 32 });
	console.log(`digest for ephemeral: ${digest}`);

	const ephemeralKeypair = Ed25519Keypair.fromSecretKey(
		fromBase64(session.ephemeralKeyPair),
	);
	console.log(`ephemeralKeypair for session key:`, ephemeralKeypair);

	const userSignatureBytes = await ephemeralKeypair.sign(digest);

	// SessionKey.setPersonalMessageSignature는 에페멀 키의 원시 서명만 필요
	return toBase64(userSignatureBytes);
}
