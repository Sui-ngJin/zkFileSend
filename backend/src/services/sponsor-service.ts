import { SuiClient } from "@mysten/sui/client";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction, TransactionDataBuilder } from "@mysten/sui/transactions";
import { fromBase64, normalizeSuiAddress, toBase64 } from "@mysten/sui/utils";
import type { CoinStruct } from "@mysten/sui/client";
import { config } from "../config.js";
import { transactionCache } from "../utils/sponsor-cache.js";

const SUI_TYPE = "0x2::sui::SUI";

class SponsorService {
	private readonly client: SuiClient;
	private readonly keypair: Ed25519Keypair;
	private readonly address: string;

	constructor() {
		const { secretKey } = decodeSuiPrivateKey(config.sponsorPrivateKey);
		this.keypair = Ed25519Keypair.fromSecretKey(secretKey);
		this.address = normalizeSuiAddress(this.keypair.toSuiAddress());
		this.client = new SuiClient({ url: config.rpcUrl });
	}

	get sponsorAddress() {
		return this.address;
	}

	private async pickGasCoin(requiredBalance: bigint) {
		const coins = await this.client.getCoins({
			owner: this.address,
			coinType: SUI_TYPE,
			limit: 100,
		});
		const suitable = coins.data.find(
			(coin) => BigInt(coin.balance) > requiredBalance,
		);
		if (!suitable) {
			throw new Error("Sponsor address does not have enough SUI to cover gas");
		}
		return suitable;
	}

	private coinToObjectRef(coin: CoinStruct) {
		return {
			objectId: coin.coinObjectId,
			digest: coin.digest,
			version: coin.version,
		};
	}

	async prepareSponsoredTransaction(options: {
		transactionBlockKindBytes: string;
		claimer: string;
		sender: string;
	}) {
		const referenceGasPrice = await this.client.getReferenceGasPrice();
		const coin = await this.pickGasCoin(
			config.sponsorGasBudget * BigInt(referenceGasPrice),
		);

		const tx = Transaction.fromKind(
			fromBase64(options.transactionBlockKindBytes),
		);
		tx.setSender(options.sender);
		tx.setGasOwner(this.address);
		tx.setGasPrice(referenceGasPrice);
		tx.setGasBudget(config.sponsorGasBudget);
		tx.setGasPayment([this.coinToObjectRef(coin)]);

		const txBytes = await tx.build({ client: this.client });
		const digest = TransactionDataBuilder.getDigestFromBytes(txBytes);

		transactionCache.set(
			digest,
			{
				txBytes,
				claimer: normalizeSuiAddress(options.claimer),
				sender: normalizeSuiAddress(options.sender),
			},
			config.sponsorMaxLifetimeMs,
		);

		return {
			digest,
			bytes: toBase64(txBytes),
			sponsorAddress: this.address,
		};
	}

	async executeSponsoredTransaction(digest: string, claimerSignature: string) {
		const cached = transactionCache.get(digest);
		if (!cached) {
			throw new Error("Sponsored transaction not found or expired");
		}

		const sponsorSignature = (
			await this.keypair.signTransaction(cached.txBytes)
		).signature;

		const txBase64 = toBase64(cached.txBytes);
		const execution = await this.client.executeTransactionBlock({
			transactionBlock: txBase64,
			signature: [claimerSignature, sponsorSignature],
			options: { showEffects: true },
		});

		transactionCache.delete(digest);

		return execution;
	}
}

export const sponsorService = new SponsorService();
