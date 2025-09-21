import { Transaction } from "@mysten/sui/transactions";
import type {
	SuiObjectChange,
	SuiObjectChangeCreated,
} from "@mysten/sui/client";
import { suiClient } from "../lib/seal.js";
import { PACKAGE_ID, SUI_SECRET_KEY, RECEIVER_EMAIL } from "../lib/env.js";
import { signerFromEnvKey } from "../lib/keypair.js";
import { hashEmailToVector } from "../lib/hash.js";

const signer = signerFromEnvKey(SUI_SECRET_KEY);

(async () => {
	const admin = signer.getPublicKey().toSuiAddress();

	if (!RECEIVER_EMAIL) {
		throw new Error(
			"Set RECEIVER_EMAIL in the environment (should be the recipient's email address)",
		);
	}

	// 이메일을 SHA3-256으로 해시 처리
	const hashedEmailBytes = hashEmailToVector(RECEIVER_EMAIL);

	const tx = new Transaction();
	tx.moveCall({
		target: `${PACKAGE_ID}::content_gate_ticket::new_policy`,
		arguments: [
			tx.pure.address(admin),
			tx.pure.vector("u8", hashedEmailBytes),
		],
	});

	const res = await suiClient.signAndExecuteTransaction({
		signer,
		transaction: tx,
		options: { showEffects: true, showObjectChanges: true },
	});

	if (res.effects?.status.status !== "success") {
		throw new Error(
			res.effects?.status.error || "new_policy transaction failed",
		);
	}

	const changes = (res.objectChanges ?? []) as SuiObjectChange[];
	const createdChanges = changes.filter(
		(change): change is SuiObjectChangeCreated => change.type === "created",
	);

	const policyId = createdChanges.find((change) =>
		change.objectType?.endsWith("::content_gate_ticket::Policy"),
	)?.objectId;

	const ticketId = createdChanges
		.find((change) =>
			change.objectType?.endsWith("::content_gate_ticket::Ticket"),
		)?.objectId;

	if (!policyId) {
		throw new Error(
			"Policy was not created; inspect the transaction response.",
		);
	}

	if (!ticketId) {
		console.warn(
			"No Ticket objects reported in response. Re-run with tracing enabled to inspect.",
		);
	}

	console.log("RECEIVER_EMAIL =", RECEIVER_EMAIL);
	console.log("POLICY_ID =", policyId);
	console.log("TICKET_ID =", ticketId || "Not found");
})();
