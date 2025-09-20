import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { fromHex } from "@mysten/sui/utils";
import { SessionKey, SealClient } from "@mysten/seal";
import { WalrusClient } from "@mysten/walrus";
import {
	CONTENT_ID_HEX,
	NETWORK,
	PACKAGE_ID,
	SEAL_SERVER_IDS,
	SEAL_SERVER_WEIGHTS,
	SUI_RPC,
} from "./env";
import { normalizeEmail, hashEmailToVector } from "../utils/emailUtils";
import { toBase64 } from "@mysten/sui/utils";
import { signEphemeralPersonalMessageWithZkLogin } from "./zkLoginService";

export type PersonalMessageSigner = (params: {
	message: Uint8Array;
}) => Promise<{ signature: string }>;


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

	private async resolvePolicyId(ticketId?: string) {
		if (!ticketId) {
			throw new Error("Ticket ID is required to resolve policy");
		}

		const ticketObject = await this.suiClient.getObject({
			id: ticketId,
			options: { showContent: true },
		});

		const fields = (ticketObject.data?.content as {
			fields?: Record<string, unknown>;
		})?.fields;
		const policyId = fields?.policy_id;
		if (typeof policyId === "string") {
			return policyId;
		}

		throw new Error("Unable to resolve policy_id from ticket");
	}

	async decryptWithTicket(
		blobId: string,
		ticketId: string,
		claimerAddress: string,
		claimerEmail: string,
		signPersonalMessage: PersonalMessageSigner,
	): Promise<Uint8Array> {
		console.log(`claimerAddress: ${claimerAddress}`)

		// 이메일을 SHA2-256으로 해시 처리 (Move 컨트랙트와 일치)
		const hashedEmailBytes = await hashEmailToVector(claimerEmail);
		const policyBytes = Array.from(fromHex(CONTENT_ID_HEX));
		const policyId = await this.resolvePolicyId(ticketId);
		console.log(`policyId: ${policyId}`);

		const encrypted = await this.walrus.readBlob({ blobId });

		const sessionKey = await SessionKey.create({
			address: claimerAddress,
			packageId: PACKAGE_ID,
			ttlMin: 10,
			suiClient: this.suiClient,
		});

		console.log(`sessionKey1: ${JSON.stringify(sessionKey, null, 2)}`)
		console.log(sessionKey);

		const personalMessage = sessionKey.getPersonalMessage();
		console.log(`sessionKey.getPersonalMessage(): ${personalMessage.toString()}`);

		// SessionKey에 에페멀 키 서명 설정 (원시 Ed25519 서명)
		const { signature: ephemeralSignature } = await signEphemeralPersonalMessageWithZkLogin({
			message: personalMessage,
		});

		console.log(`sessionKey2: ${JSON.stringify(sessionKey, null, 2)}`)
		console.log(sessionKey);
		try {
			await sessionKey.setPersonalMessageSignature(ephemeralSignature);
			console.log(`ephemeral signature set for SessionKey`);
		} catch (e) {
			console.log(`ephemeral signature not set`);
			console.error(e);
		}

		const tx = new Transaction();
		tx.moveCall({
			target: `${PACKAGE_ID}::content_gate_ticket::seal_approve_with_ticket`,
			arguments: [
				tx.pure.vector("u8", policyBytes),
				tx.object(policyId),
				tx.object(ticketId),
				tx.pure.vector("u8", Array.from(hashedEmailBytes)),
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

	async decryptWithWallet(params: {
		blobId: string;
		ticketId: string;
		claimerAddress: string;
		signPersonalMessage: PersonalMessageSigner;
	}): Promise<Uint8Array> {
		const policyBytes = Array.from(fromHex(CONTENT_ID_HEX));
		const policyId = await this.resolvePolicyId(params.ticketId);
		const encrypted = await this.walrus.readBlob({ blobId: params.blobId });

		const sessionKey = await SessionKey.create({
			address: params.claimerAddress,
			packageId: PACKAGE_ID,
			ttlMin: 10,
			suiClient: this.suiClient,
		});

		const { signature } = await params.signPersonalMessage({
			message: sessionKey.getPersonalMessage(),
		});
		await sessionKey.setPersonalMessageSignature(signature);

		const tx = new Transaction();
		tx.moveCall({
			target: `${PACKAGE_ID}::content_gate::seal_approve_simple`,
			arguments: [
				tx.pure.vector("u8", policyBytes),
				tx.object(policyId),
				tx.pure.address(params.claimerAddress),
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
