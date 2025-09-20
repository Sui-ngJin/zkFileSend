import {getFullnodeUrl, SuiClient} from "@mysten/sui/client";
import {SealClient} from "@mysten/seal";
import {WalrusClient} from "@mysten/walrus";
import {Transaction} from "@mysten/sui/transactions";
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

// Type for wallet signing functions
type SignAndExecuteTransactionFn = (
    params: { transaction: Transaction },
    options?: {
        onSuccess?: (result: any) => void;
        onError?: (error: any) => void;
    },
) => void;
export class SealService {
    private suiClient: SuiClient;
    private seal: SealClient | null = null;
    private walrus: WalrusClient;

    constructor() {
        this.suiClient = new SuiClient({url: SUI_RPC || getFullnodeUrl(NETWORK)});
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
            const {encryptedObject} = await this.seal.encrypt({
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
                    {transaction: registerTx},
                    {
                        onSuccess: async (result) => {
                            try {
                                console.log("Register complete:", result);

                                // 3. Upload to storage nodes
                                await flow.upload({digest: result.digest});
                                console.log("Upload to storage nodes complete");

                                // 4. Certify blob (지갑 서명 필요)
                                const certifyTx = flow.certify();

                                signAndExecuteTransaction(
                                    {transaction: certifyTx},
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

}

export const sealService = new SealService();
