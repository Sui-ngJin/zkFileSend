/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_SUI_RPC: string;
	readonly VITE_NETWORK: string;
	readonly VITE_SEAL_SERVER_IDS: string;
	readonly VITE_SEAL_SERVER_WEIGHTS: string;
	readonly VITE_PACKAGE_ID: string;
	readonly VITE_POLICY_ID: string;
	readonly VITE_CONTENT_ID_HEX: string;
	readonly VITE_OPEN_AFTER_MS: string;
	readonly VITE_ALLOWLIST: string;
	readonly VITE_WALRUS_EPOCHS: string;
	readonly VITE_WALRUS_DELETABLE: string;
	readonly VITE_SUI_SECRET_KEY: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
