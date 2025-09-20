import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { SealClient, SessionKey } from "@mysten/seal";
import { WalrusClient } from "@mysten/walrus";
import { Transaction } from "@mysten/sui/transactions";
import { fromHex } from "@mysten/sui/utils";
import {
	CONTENT_ID_HEX,
	NETWORK,
	PACKAGE_ID,
	POLICY_ID,
	SEAL_SERVER_IDS,
	SEAL_SERVER_WEIGHTS,
	SUI_RPC,
	WALRUS_DELETABLE,
	WALRUS_EPOCHS,
} from "./env";

// Type for wallet signing functions
type SignAndExecuteTransactionFn = (
	params: { transaction: Transaction },
	options?: {
		onSuccess?: (result: any) => void;
		onError?: (error: any) => void;
	},
) => void;
type SignPersonalMessageFn = (params: {
	message: Uint8Array;
}) => Promise<{ signature: string }>;

export class SealService {
	private suiClient: SuiClient;
	private seal: SealClient | null = null;
	private walrus: WalrusClient;

	constructor() {
		this.suiClient = new SuiClient({ url: SUI_RPC || getFullnodeUrl(NETWORK) });
		this.walrus = new WalrusClient({
			network: NETWORK,
			suiClient: this.suiClient,
		});

		if (SEAL_SERVER_IDS.length > 0) {
			this.initializeSealClient();
		}
	}

	private initializeSealClient() {
		try {
			this.seal = new SealClient({
				suiClient: this.suiClient,
				serverConfigs: SEAL_SERVER_IDS.map((id, i) => ({
					objectId: id,
					weight: SEAL_SERVER_WEIGHTS[i] || 1,
				})),
				verifyKeyServers: true,
			});
		} catch (error) {
			console.warn("Failed to initialize Seal client:", error);
		}
	}

	async encryptAndUploadWithWallet(
		file: File,
		userAddress: string,
		signAndExecuteTransaction: SignAndExecuteTransactionFn,
	): Promise<{ blobId: string; encryptedSize: number }> {
		try {
			// 파일 변환 (Uint8Array 로)
			const arrayBuffer = await file.arrayBuffer();
			const data = new Uint8Array(arrayBuffer);

			console.log(`Encrypting file: ${file.name} (${data.length} bytes)`);

			if (!this.seal) {
				throw new Error(
					"Seal client not initialized. Please check server configuration.",
				);
			}

			// Encrypt with Seal
			const { encryptedObject } = await this.seal.encrypt({
				threshold: 1,
				packageId: PACKAGE_ID,
				id: CONTENT_ID_HEX,
				data,
			});

			console.log(`Encryption complete: ${encryptedObject.length} bytes`);

			// Upload to Walrus - writeBlobFlow API 사용 (지갑 트랜잭션 기반)
			console.log("Uploading to Walrus using writeBlobFlow...");

			// 1. writeBlobFlow 생성 및 인코딩
			const flow = this.walrus.writeBlobFlow({
				blob: encryptedObject,
			});

			await flow.encode();
			console.log("Blob flow encoded");

			// 2. Register blob (지갑 서명 필요)
			const registerTx = flow.register({
				epochs: WALRUS_EPOCHS,
				owner: userAddress,
				deletable: WALRUS_DELETABLE,
			});

			return new Promise((resolve, reject) => {
				signAndExecuteTransaction(
					{ transaction: registerTx },
					{
						onSuccess: async (result) => {
							try {
								console.log("Register complete:", result);

								// 3. Upload to storage nodes
								await flow.upload({ digest: result.digest });
								console.log("Upload to storage nodes complete");

								// 4. Certify blob (지갑 서명 필요)
								const certifyTx = flow.certify();

								signAndExecuteTransaction(
									{ transaction: certifyTx },
									{
										onSuccess: async (certifyResult) => {
											try {
												console.log("Certify complete:", certifyResult);

												// 5. Get blob ID
												const blobId = (await flow.getBlob()).blobId;
												console.log("Final blob ID:", blobId);

												resolve({
													blobId,
													encryptedSize: encryptedObject.length,
												});
											} catch (error) {
												reject(error);
											}
										},
										onError: (error) => {
											console.error("Certify failed:", error);
											reject(error);
										},
									},
								);
							} catch (error) {
								reject(error);
							}
						},
						onError: (error) => {
							console.error("Register failed:", error);
							reject(error);
						},
					},
				);
			});
		} catch (error) {
			console.error("Encryption/upload failed:", error);
			throw error;
		}
	}

	async decryptAndDownloadWithWallet(
		blobId: string,
		userAddress: string,
		signPersonalMessage: SignPersonalMessageFn,
	): Promise<Uint8Array> {
		try {
			if (!this.seal) {
				throw new Error(
					"Seal client not initialized. Please check server configuration.",
				);
			}

			console.log(`Fetching blob: ${blobId}`);

			// Walrus에서 암호화된 파일 가져오기 (readBlob 방식으로 직접 접근)
			console.log("Fetching raw blob data with blob ID:", blobId);

			try {
				// readBlob을 사용하여 WalrusFile 래퍼 없이 직접 원시 데이터 가져오기
				const encrypted = await this.walrus.readBlob({ blobId });
				console.log(`Fetched raw encrypted data: ${encrypted.length} bytes`);
				console.log(
					"First 20 bytes of raw data:",
					Array.from(encrypted.slice(0, 20)),
				);

				// SessionKey 생성
				const sessionKey = await SessionKey.create({
					address: userAddress,
					packageId: PACKAGE_ID,
					ttlMin: 10,
					suiClient: this.suiClient,
				});

				// console.log('SessionKey created for address:', sessionKey.address);

				// 지갑에 personal message 서명 요청
				const { signature } = await signPersonalMessage({
					message: sessionKey.getPersonalMessage(),
				});

				await sessionKey.setPersonalMessageSignature(signature);
				console.log("Personal message signed");

				// 승인 트랜잭션 생성
				const tx = new Transaction();
				tx.moveCall({
					target: `${PACKAGE_ID}::content_gate::seal_approve_simple`,
					arguments: [
						tx.pure.vector("u8", fromHex(CONTENT_ID_HEX)),
						tx.object(POLICY_ID),
						tx.pure.address(userAddress),
						tx.object("0x6"), // &Clock
					],
				});
				const txBytes = await tx.build({
					client: this.suiClient,
					onlyTransactionKind: true,
				});
				console.log("Transaction bytes created, length:", txBytes.length);

				console.log("Attempting decryption...");
				const decrypted = await this.seal.decrypt({
					data: encrypted,
					sessionKey,
					txBytes,
				});
				console.log(`Decrypted data: ${decrypted.length} bytes`);

				return decrypted;
			} catch (fetchError) {
				console.error("Error fetching or processing file:", fetchError);
				throw fetchError;
			}
		} catch (error) {
			console.error("Decryption failed:", error);
			throw error;
		}
	}
}

export const sealService = new SealService();
