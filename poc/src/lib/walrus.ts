import { WalrusClient } from "@mysten/walrus";
import { NETWORK } from "./env.js";
import { suiClient } from "./seal.js";

type WalrusClientOptions = ConstructorParameters<typeof WalrusClient>[0];

export const walrus = new WalrusClient({
	network: NETWORK,
	suiClient: suiClient as unknown as Exclude<
		WalrusClientOptions["suiClient"],
		undefined
	>,
});
