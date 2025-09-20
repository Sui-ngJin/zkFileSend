import { Transaction } from "@mysten/sui/transactions";
import { fromHex } from "@mysten/sui/utils";
import { SessionKey } from "@mysten/seal";
import { walrus } from "../lib/walrus.js";
import { seal, sealSuiClient, suiClient } from "../lib/seal.js";
import {
	PACKAGE_ID,
	POLICY_ID,
	CONTENT_ID_HEX,
	SUI_SECRET_KEY,
} from "../lib/env.js";
import { signerFromEnvKey } from "../lib/keypair.js";
import { WalrusBlob } from "@mysten/walrus";
import { hashEmailToVector } from "../lib/hash.js";

const signer = signerFromEnvKey(SUI_SECRET_KEY);
const ticketId = process.env.TICKET_ID;
const blobId = process.env.BLOB_ID;
const claimerEmailRaw = process.env.CLAIMER_EMAIL;

if (!ticketId) {
	throw new Error(
		"Set TICKET_ID in the environment to use fetch-decrypt-ticket",
	);
}

if (!blobId) {
	throw new Error("Set BLOB_ID in the environment to use fetch-decrypt-ticket");
}

if (!claimerEmailRaw) {
	throw new Error(
		"Set CLAIMER_EMAIL in the environment with the email used for this ticket",
	);
}

// 이메일을 SHA3-256으로 해시 처리
const claimerEmailBytes = hashEmailToVector(claimerEmailRaw);

(async () => {
	const blob: WalrusBlob = await walrus.getBlob({ blobId });
	const encrypted = new Uint8Array(await blob.asFile().bytes());

	const sessionKey = await SessionKey.create({
		address: signer.getPublicKey().toSuiAddress(),
		packageId: PACKAGE_ID,
		ttlMin: 10,
		suiClient: sealSuiClient,
	});
	const { signature } = await signer.signPersonalMessage(
		sessionKey.getPersonalMessage(),
	);
	await sessionKey.setPersonalMessageSignature(signature);

	const tx = new Transaction();
	tx.moveCall({
		target: `${PACKAGE_ID}::content_gate_ticket::seal_approve_with_ticket`,
		arguments: [
			tx.pure.vector("u8", fromHex(CONTENT_ID_HEX)),
			tx.object(POLICY_ID),
			tx.object(ticketId),
			tx.object("0x6"),
			tx.pure.vector("u8", claimerEmailBytes),
		],
	});
	const txBytes = await tx.build({
		client: suiClient,
		onlyTransactionKind: true,
	});

	const decrypted = await seal.decrypt({
		data: encrypted,
		sessionKey,
		txBytes,
	});
	console.log("PLAINTEXT =", new TextDecoder().decode(decrypted));
})();
