import { walrus } from "../lib/walrus.js";

(async () => {
	const blobId1 = "1qgjEuR_O4hTKVqDGfTQW6saBcp8PpTsTC2SaB6KCUI";
	const blobId2 = "7ytRAcynM62hWMbQrDZ5MN1GlhC3mC319r4Qg8pSnsM";
	// kxRcYAZU0UWeKzGuLJ8nfOqUZATG8DgMQCLE2pBNOGY
	// W-zyd-zdT64FXwpDng1tWJdDi98uUZiC-DNgikdzlL8
	const walrusFiles = await walrus.getFiles({ ids: [blobId1, blobId2] });
	console.log(walrusFiles);
})();
