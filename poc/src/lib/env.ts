import "dotenv/config";

export const NETWORK = (process.env.NETWORK || "testnet") as
	| "testnet"
	| "mainnet";
export const SUI_RPC =
	process.env.SUI_RPC || `https://fullnode.${NETWORK}.sui.io:443`;
export const PACKAGE_ID = process.env.PACKAGE_ID!;
export const POLICY_ID = process.env.POLICY_ID!;
export const CONTENT_ID_HEX = process.env.CONTENT_ID_HEX || "6a6f686e5f646f65";
export const OPEN_AFTER_MS = BigInt(process.env.OPEN_AFTER_MS || "0");
export const WALRUS_EPOCHS = Number(process.env.WALRUS_EPOCHS || "3");
export const WALRUS_DELETABLE =
	(process.env.WALRUS_DELETABLE || "true") === "true";
export const SEAL_SERVER_IDS = (process.env.SEAL_SERVER_IDS || "")
	.split(",")
	.map((s) => s.trim())
	.filter(Boolean);
export const SEAL_SERVER_WEIGHTS = (process.env.SEAL_SERVER_WEIGHTS || "")
	.split(",")
	.map((s) => Number(s.trim()))
	.filter((n) => !isNaN(n));
export const ALLOWLIST = (process.env.ALLOWLIST || "")
	.split(",")
	.map((s) => s.trim())
	.filter(Boolean);
export const SUI_SECRET_KEY = process.env.SUI_SECRET_KEY!;
export const BLOB_ID = process.env.BLOB_ID;
