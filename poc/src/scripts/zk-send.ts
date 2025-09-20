import "../polyfill.js";

import { ZkSendLinkBuilder } from "@mysten/zksend";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { NETWORK, SUI_SECRET_KEY } from "../lib/env";
import { signerFromEnvKey } from "../lib/keypair.js";

const ticketId = process.env.TICKET_ID;
const host = process.env.ZKSEND_HOST || "http://localhost:3100";
const network = (process.env.ZKSEND_NETWORK || NETWORK) as
	| "testnet"
	| "mainnet";

if (!ticketId) {
	throw new Error(
		"Set TICKET_ID in the environment before generating a zkSend link",
	);
}

const client = new SuiClient({ url: getFullnodeUrl(network) });
const signer = signerFromEnvKey(SUI_SECRET_KEY);
const senderAddress = signer.getPublicKey().toSuiAddress();

(async () => {
	const link = new ZkSendLinkBuilder({
		sender: senderAddress,
		client,
		network,
		host,
	});

	link.addClaimableObject(ticketId);

	const tx = await link.createSendTransaction();
	const result = await client.signAndExecuteTransaction({
		transaction: await tx.build({ client }),
		signer,
		options: { showEffects: true },
	});

	console.log("zkSend link:", link.getLink());
	console.log("Transaction digest:", result.digest);
})();
