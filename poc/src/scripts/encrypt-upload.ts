import "../polyfill.js";

import { TextEncoder } from "node:util";
import { EncryptedObject } from "@mysten/seal";
import { walrus } from "../lib/walrus.js";
import { seal } from "../lib/seal.js";
import {
	PACKAGE_ID,
	CONTENT_ID_HEX,
	WALRUS_DELETABLE,
	WALRUS_EPOCHS,
	SUI_SECRET_KEY,
} from "../lib/env.js";
import { signerFromEnvKey } from "../lib/keypair.js";

const signer = signerFromEnvKey(SUI_SECRET_KEY);

(async () => {
	console.log("=== Seal Encrypt + Walrus Upload ===\n");

	// 1. 원본 텍스트 준비
	const originalText = "Hello, Walrus+Seal (simple policy)! by. Chan";
	const data = new TextEncoder().encode(originalText);
	console.log(`Original text: "${originalText}"`);
	console.log(`Original size: ${data.length} bytes`);

	// 2. Seal로 암호화
	console.log("\nSeal encrypting...");
	const { encryptedObject } = await seal.encrypt({
		threshold: 1,
		packageId: PACKAGE_ID,
		id: CONTENT_ID_HEX,
		data,
	});

	console.log(`Encryption complete: ${encryptedObject.length} bytes`);

	// 3. Walrus에 업로드
	console.log("\nWalrus uploading with writeBlob...");

	const result = await walrus.writeBlob({
		blob: encryptedObject, // 직접 Uint8Array 전달 (Base64 인코딩 없음)
		epochs: WALRUS_EPOCHS,
		deletable: WALRUS_DELETABLE,
		signer: signer as unknown as NonNullable<
			Parameters<typeof walrus.writeBlob>[0]
		>["signer"],
	});

	console.log("Upload successful!");
	console.log(`Blob ID: ${result.blobId}`);
	console.log(`Storage size: ${result.blobObject?.size || "unknown"} bytes`);
	console.log("\nWalrus URL:");
	console.log(
		`https://aggregator.walrus-testnet.walrus.space/v1/blobs/${result.blobId}`,
	);

	// 메타데이터 확인
	const meta = EncryptedObject.parse(encryptedObject);
	console.log(`\nEncryption metadata:`);
	console.log(`Threshold: ${meta.threshold}`);
	console.log(`Services count: ${meta.services.length}`);
})();
