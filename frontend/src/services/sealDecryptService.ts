import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { fromHex } from "@mysten/sui/utils";
import { SessionKey, SealClient } from "@mysten/seal";
import { WalrusClient } from "@mysten/walrus";
import {
	CLOCK_OBJECT_ID,
	CONTENT_ID_HEX,
	NETWORK,
	PACKAGE_ID,
	SEAL_SERVER_IDS,
	SEAL_SERVER_WEIGHTS,
	SUI_RPC,
} from "./env";

export type PersonalMessageSigner = (
	message: Uint8Array
) => Promise<string>;

function normalizeEmail(email: string) {
	return email.trim().toLowerCase();
}

export class SealDecryptService {
	private readonly suiClient: SuiClient;
	private readonly walrus: WalrusClient;
	private readonly seal: SealClient;

	constructor() {
		const rpcUrl = SUI_RPC || getFullnodeUrl(NETWORK);
		this.suiClient = new SuiClient({ url: rpcUrl });
		this.walrus = new WalrusClient({
			network: NETWORK,
			suiClient: this.suiClient,
		});
		this.seal = new SealClient({
			suiClient: this.suiClient,
			serverConfigs: SEAL_SERVER_IDS.map((objectId, index) => ({
				objectId,
				weight: SEAL_SERVER_WEIGHTS[index] || 1,
			})),
			verifyKeyServers: true,
		});
	}

	async decryptWithTicket(
		blobId: string,
		ticketId: string,
		claimerAddress: string,
		claimerEmail: string,
		signPersonalMessage: PersonalMessageSigner,
	): Promise<Uint8Array> {
		const emailBytes = new TextEncoder().encode(
			normalizeEmail(claimerEmail),
		);
		const policyBytes = Array.from(fromHex(CONTENT_ID_HEX));

		const ticketObject = await this.suiClient.getObject({
			id: ticketId,
			options: { showContent: true },
		});

		const policyId = (() => {
			const fields = (ticketObject.data?.content as {
				fields?: Record<string, unknown>;
			})?.fields;
			const value = fields?.policy_id;
			if (typeof value === "string") {
				return value;
			}
			throw new Error("Unable to resolve policy_id from ticket");
		})();

		const encrypted = await this.walrus.readBlob({ blobId });

		const sessionKey = await SessionKey.create({
			address: claimerAddress,
			packageId: PACKAGE_ID,
			ttlMin: 10,
			suiClient: this.suiClient,
		});

		const { signature } = await signPersonalMessage({
			message: sessionKey.getPersonalMessage(),
		});
		await sessionKey.setPersonalMessageSignature(signature);

		const tx = new Transaction();
		tx.moveCall({
			target: `${PACKAGE_ID}::content_gate_ticket::seal_approve_with_ticket`,
			arguments: [
				tx.pure.vector("u8", policyBytes),
				tx.object(policyId),
				tx.object(ticketId),
				tx.object(CLOCK_OBJECT_ID),
				tx.pure.vector("u8", Array.from(emailBytes)),
			],
		});

		const txBytes = await tx.build({
			client: this.suiClient,
			onlyTransactionKind: true,
		});

		return await this.seal.decrypt({
			data: encrypted,
			sessionKey,
			txBytes,
		});
	}
}

export const sealDecryptService = new SealDecryptService();
