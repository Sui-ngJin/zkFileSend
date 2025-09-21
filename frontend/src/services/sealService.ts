import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { SealClient, SessionKey } from "@mysten/seal";
import { WalrusClient } from "@mysten/walrus";
import { Transaction } from "@mysten/sui/transactions";
import { fromHex } from "@mysten/sui/utils";
import {
	CONTENT_ID_HEX,
	NETWORK,
	PACKAGE_ID,
	SEAL_SERVER_IDS,
	SEAL_SERVER_WEIGHTS,
	SUI_RPC,
	WALRUS_DELETABLE,
	WALRUS_EPOCHS,
} from "./env";
import { hashEmailToVector } from './hash';

// Type for wallet signing functions
// Support both callback-based mutate and Promise-based mutateAsync styles
type SignAndExecuteTransactionFn = (
	params: { transaction: Transaction; options?: any },
	options?: {
		onSuccess?: (result: any) => void;
		onError?: (error: any) => void;
	},
) => Promise<any> | void;
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

	extractPolicyAndTicketIds = async (
		result: any,
	) => {
		try {
			const suiClient = this.suiClient;
			// Prefer objectChanges from the wallet response if present; otherwise fetch with retry.
			let objectChanges = result?.objectChanges as any[] | undefined;
			console.log(1);
			if (!objectChanges) {
				const maxAttempts = 10;
				for (let attempt = 1; attempt <= maxAttempts; attempt++) {
					try {
						const txBlock = await suiClient.getTransactionBlock({
							digest: result.digest,
							options: {
								showEffects: true,
								showEvents: true,
								showObjectChanges: true,
							}
						});

						objectChanges = txBlock.objectChanges as any[] | undefined;
						if (objectChanges && objectChanges.length) {
							break; // success
						}
					} catch (e) {
						// Ignore and retry below
						console.error(e);
					}

					if (attempt < maxAttempts) {
						await this.sleep(1000); // 1s delay between attempts
					}
				}
			}

			console.log(objectChanges);
			if (objectChanges && objectChanges.length) {
				const createdObjects = objectChanges.filter(
					(change: any) => change.type === 'created'
				);
				console.log(2);

				console.log(createdObjects);
				// Look for Policy and Ticket objects
				const policyObjects = createdObjects.filter(
					(obj: any) => obj.objectType?.includes('Policy')
				);

				const ticketObjects = createdObjects.filter(
					(obj: any) => obj.objectType?.includes('Ticket')
				);

				const policyObj = policyObjects[0] as any;
				const ticketObj = ticketObjects[0] as any;

				const policyId = policyObj?.objectId || policyObj?.packageId || policyObj?.id;
				const ticketId = ticketObj?.objectId || ticketObj?.packageId || ticketObj?.id;

				console.log('succeedded to fetch ticketid ' + ticketId);
				sessionStorage.setItem('ticketId', ticketId);
			}
		} catch (error) {
			console.error("❌ Failed to extract IDs:", error);
		}
	};

	async initPolicy(
		receiver: string,
		admin: string,
		signAndExecuteTransaction: SignAndExecuteTransactionFn,
	) {
		const hashedEmailBytes = await hashEmailToVector(receiver);
		const tx = new Transaction();

		tx.moveCall({
			target: `${PACKAGE_ID}::content_gate_ticket::new_policy`,
			arguments: [
				tx.pure.address(admin),
				tx.pure.vector("u8", hashedEmailBytes),
			],
		});

		// Prefer Promise-based mutateAsync; still compatible with callback mutate
		const maybePromise = signAndExecuteTransaction({
			transaction: tx,
			// Ask the wallet to return rich info so we can parse IDs directly from result
			options: {
				showEffects: true,
				showEvents: true,
				showObjectChanges: true,
			},
		});

		if (maybePromise && typeof (maybePromise as any).then === 'function') {
			const result = await (maybePromise as Promise<any>);
			await this.extractPolicyAndTicketIds(result);
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

	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	async encryptAndUploadWithWallet(
		file: File,
		userAddress: string,
		signAndExecuteTransaction: SignAndExecuteTransactionFn,
		setSigningStep: (step: number) => void,
	): Promise<{ blobId: string; encryptedSize: number } | undefined> {
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
			setSigningStep(2)
			const registerTx = flow.register({
				epochs: WALRUS_EPOCHS,
				owner: userAddress,
				deletable: WALRUS_DELETABLE,
			});

			// Prefer Promise-based mutateAsync; still compatible with callback mutate
			const maybePromise = signAndExecuteTransaction({
				transaction: registerTx,
				// Ask the wallet to return rich info so we can parse IDs directly from result
				options: {
					showEffects: true,
					showEvents: true,
					showObjectChanges: true,
				},
			});

			if (maybePromise && typeof (maybePromise as any).then === 'function') {
				const result = await (maybePromise as Promise<any>);
				
				// 파일 업로드
				for (let attempt = 1; attempt <= 20; attempt++) {
					try {
						await flow.upload({ digest: result.digest });
						console.log("Upload to storage nodes complete");
						break;
					} catch (uploadError) {
						console.warn(`Upload attempt ${attempt} failed:`, uploadError);
						if (attempt < 20) {
							await this.sleep(1000); // 1s delay between attempts
						} else {
							throw new Error(`Upload failed after ${20} attempts: ${uploadError}`);
						}
					}
				}

				// blob 올리는 트렌젝션
				setSigningStep(3);
				const certifyTx = flow.certify();

				// Prefer Promise-based mutateAsync; still compatible with callback mutate
				const maybePromise2 = signAndExecuteTransaction({
					transaction: certifyTx,
					// Ask the wallet to return rich info so we can parse IDs directly from result
					options: {
						showEffects: true,
						showEvents: true,
						showObjectChanges: true,
					},
				});

				if (maybePromise2 && typeof (maybePromise2 as any).then === 'function') {
					await (maybePromise2 as Promise<any>);

					let blobId: string = '';
					for (let attempt = 1; attempt <= 20; attempt++) {
						try {
							blobId = (await flow.getBlob()).blobId;
							console.log("Final blob ID:", blobId);
							return { blobId, encryptedSize: encryptedObject.length };
						} catch (getBlobError) {
							console.warn(`Get blob attempt ${attempt} failed:`, getBlobError);
							if (attempt < 20) {
								await this.sleep(1000); // 1s delay between attempts
							} else {
								throw new Error(`Get blob failed after ${20} attempts: ${getBlobError}`);
							}
						}
					}
				} else {
					throw new Error('wtf');
				}
			} else {
				throw new Error('wtf');
			}
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
						// tx.object(POLICY_ID),
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
