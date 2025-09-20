import "../polyfill.js";

import { Transaction } from "@mysten/sui/transactions";
import type {
	SuiObjectChange,
	SuiObjectChangeCreated,
} from "@mysten/sui/client";
import { suiClient } from "../lib/seal.js";
import { PACKAGE_ID, POLICY_ID, SUI_SECRET_KEY } from "../lib/env.js";
import { signerFromEnvKey } from "../lib/keypair.js";

const signer = signerFromEnvKey(SUI_SECRET_KEY);
const admin = signer.getPublicKey().toSuiAddress();
const ticketRecipient = process.env.TICKET_RECIPIENT || admin;
const mintCountRaw = process.env.TICKET_MINT_COUNT || "1";
const mintCount = Number(mintCountRaw);

if (!POLICY_ID) {
	throw new Error("Set POLICY_ID in the environment before minting tickets");
}

if (!Number.isInteger(mintCount) || mintCount <= 0) {
	throw new Error(
		`Set TICKET_MINT_COUNT to a positive integer (received "${mintCountRaw}")`,
	);
}

(async () => {
	const tx = new Transaction();
	tx.moveCall({
		target: `${PACKAGE_ID}::content_gate_ticket::mint_tickets`,
		arguments: [
			tx.object(POLICY_ID),
			tx.pure.address(admin),
			tx.pure.address(ticketRecipient),
			tx.pure.u64(mintCount),
		],
	});

	const res = await suiClient.signAndExecuteTransaction({
		signer,
		transaction: tx,
		options: { showObjectChanges: true },
	});

	const changes = (res.objectChanges ?? []) as SuiObjectChange[];
	const createdChanges = changes.filter(
		(change): change is SuiObjectChangeCreated => change.type === "created",
	);

	const ticketIds = createdChanges
		.filter((change) =>
			change.objectType?.endsWith("::content_gate_ticket::Ticket"),
		)
		.map((change) => change.objectId);

	if (ticketIds.length === 0) {
		console.warn(
			"Mint executed but no ticket IDs returned. Inspect transaction digest:",
			res.digest,
		);
	}

	console.log("Minted Ticket IDs =>", ticketIds.join(", "));
})();
