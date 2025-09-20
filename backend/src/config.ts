import { config as loadEnv } from "dotenv";
import { z } from "zod";
import { getFullnodeUrl } from "@mysten/sui/client";

loadEnv();

const schema = z.object({
	PORT: z.coerce.number().default(3001),
	SUI_NETWORK: z.enum(["mainnet", "testnet", "devnet"]).default("testnet"),
	SUI_RPC_URL: z
		.string()
		.optional()
		.transform((value) => (value && value.length > 0 ? value : undefined)),
	SPONSOR_PRIVATE_KEY: z.string().min(1, "SPONSOR_PRIVATE_KEY is required"),
	SPONSOR_GAS_BUDGET: z.coerce.bigint().default(2_000_000n),
	SPONSOR_MAX_TX_LIFETIME_MS: z.coerce.number().default(60_000),
	SESSION_SECRET: z.string().min(1, "SESSION_SECRET is required"),
	CORS_ORIGIN: z.string().optional(),

	ENOKI_PROJECT_ID: z.string().min(1, "ENOKI_PROJECT_ID is required"),
	ENOKI_PRIVATE_KEY: z.string().min(1, "ENOKI_PRIVATE_KEY is required"),
	ENOKI_API_URL: z
		.string()
		.optional()
		.transform((value) => (value && value.length > 0 ? value : undefined)),
	ENOKI_ENV: z.enum(["mainnet", "testnet"]).default("testnet"),

	GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is required"),
	GOOGLE_CLIENT_SECRET: z.string().min(1, "GOOGLE_CLIENT_SECRET is required"),
	GOOGLE_REDIRECT_URI: z
		.string()
		.url("GOOGLE_REDIRECT_URI must be a valid URL"),
	PUBLIC_BASE_URL: z.string().optional(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
	throw new Error(parsed.error.message);
}

const {
	PORT,
	SUI_NETWORK,
	SUI_RPC_URL,
	SPONSOR_PRIVATE_KEY,
	SPONSOR_GAS_BUDGET,
	SPONSOR_MAX_TX_LIFETIME_MS,
	SESSION_SECRET,
	CORS_ORIGIN,
	ENOKI_PROJECT_ID,
	ENOKI_PRIVATE_KEY,
	ENOKI_API_URL,
	ENOKI_ENV,
	GOOGLE_CLIENT_ID,
	GOOGLE_CLIENT_SECRET,
	GOOGLE_REDIRECT_URI,
	PUBLIC_BASE_URL,
} = parsed.data;

export const config = {
	port: PORT,
	network: SUI_NETWORK,
	rpcUrl: SUI_RPC_URL ?? getFullnodeUrl(SUI_NETWORK),
	sponsorPrivateKey: SPONSOR_PRIVATE_KEY,
	sponsorGasBudget: SPONSOR_GAS_BUDGET,
	sponsorMaxLifetimeMs: SPONSOR_MAX_TX_LIFETIME_MS,
	sessionSecret: SESSION_SECRET,
	corsOrigin: CORS_ORIGIN,
	enokiProjectId: ENOKI_PROJECT_ID,
	enokiPrivateKey: ENOKI_PRIVATE_KEY,
	enokiApiUrl: ENOKI_API_URL,
	enokiEnv: ENOKI_ENV,
	googleClientId: GOOGLE_CLIENT_ID,
	googleClientSecret: GOOGLE_CLIENT_SECRET,
	googleRedirectUri: GOOGLE_REDIRECT_URI,
	publicBaseUrl:
		PUBLIC_BASE_URL ??
		GOOGLE_REDIRECT_URI.replace(/\/api\/auth\/google\/callback$/, ""),
};
