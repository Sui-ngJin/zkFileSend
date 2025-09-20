import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { WalrusClient } from "@mysten/walrus";

const suiClient = new SuiClient({
	url: getFullnodeUrl("testnet"),
});

const walrusClient = new WalrusClient({
	network: "testnet",
	suiClient: suiClient as unknown as Exclude<
		ConstructorParameters<typeof WalrusClient>[0]["suiClient"],
		undefined
	>,
});
