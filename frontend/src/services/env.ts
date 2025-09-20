// Environment configuration for frontend
export const NETWORK = (import.meta.env.VITE_NETWORK || "testnet") as
	| "testnet"
	| "mainnet";
export const SUI_RPC =
	import.meta.env.VITE_SUI_RPC || `https://fullnode.${NETWORK}.sui.io:443`;

// Package and policy IDs from deployed contracts
export const PACKAGE_ID = import.meta.env.VITE_PACKAGE_ID;
export const POLICY_ID = import.meta.env.VITE_POLICY_ID;
export const CONTENT_ID_HEX =
	import.meta.env.VITE_CONTENT_ID_HEX || "6a6f686e5f646f65";

// Backend integration
export const BACKEND_BASE_URL =
	import.meta.env.VITE_BACKEND_BASE_URL || "http://localhost:3001";
export const ZKSEND_CLAIM_API =
	import.meta.env.VITE_ZKSEND_CLAIM_API || BACKEND_BASE_URL;
export const ZKSEND_NETWORK = (
	import.meta.env.VITE_ZKSEND_NETWORK || NETWORK
) as typeof NETWORK;

// Misc
export const CLOCK_OBJECT_ID =
	import.meta.env.VITE_CLOCK_OBJECT_ID || "0x6";

// Seal server configuration
export const SEAL_SERVER_IDS = (import.meta.env.VITE_SEAL_SERVER_IDS || "")
	.split(",")
	.filter(Boolean);
export const SEAL_SERVER_WEIGHTS = (
	import.meta.env.VITE_SEAL_SERVER_WEIGHTS || "1,1"
)
	.split(",")
	.map(Number);

// Walrus storage configuration
export const WALRUS_EPOCHS = Number(import.meta.env.VITE_WALRUS_EPOCHS || "5");
export const WALRUS_DELETABLE =
	(import.meta.env.VITE_WALRUS_DELETABLE || "true") === "true";

// Access control
export const OPEN_AFTER_MS = BigInt(import.meta.env.VITE_OPEN_AFTER_MS || "0");
export const ALLOWLIST = (import.meta.env.VITE_ALLOWLIST || "")
	.split(",")
	.filter(Boolean);

// Validation
if (!PACKAGE_ID) {
	throw new Error("VITE_PACKAGE_ID not configured in .env");
}

if (!POLICY_ID) {
	throw new Error("VITE_POLICY_ID not configured in .env");
}

if (SEAL_SERVER_IDS.length === 0) {
	throw new Error("VITE_SEAL_SERVER_IDS not configured in .env");
}
