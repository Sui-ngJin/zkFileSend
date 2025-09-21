import React from "react";
import ReactDOM from "react-dom/client";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import {
	SuiClientProvider,
	WalletProvider,
	lightTheme,
	type ThemeVars,
} from "@mysten/dapp-kit";
import { getFullnodeUrl } from "@mysten/sui/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";

import "@mysten/dapp-kit/dist/index.css";
// import "./styles/dapp-kit-modal-override.css";

const queryClient = new QueryClient();

const networks = {
	testnet: { url: getFullnodeUrl("testnet") },
	mainnet: { url: getFullnodeUrl("mainnet") },
};

// Custom theme for ConnectButton
const customTheme: ThemeVars = {
	...lightTheme,
	blurs: {
		modalOverlay: "blur(0)",
	},
	backgroundColors: {
		primaryButton: "#221d1d",
		primaryButtonHover: "#333",
		outlineButtonHover: "#f5f5f5",
		modalOverlay: "rgba(24 36 53 / 20%)",
		modalPrimary: "white",
		modalSecondary: "#f7f8f8",
		iconButton: "transparent",
		iconButtonHover: "#f0f1f2",
		dropdownMenu: "#ffffff",
		dropdownMenuSeparator: "#f3f6f8",
		walletItemHover: "rgba(0, 0, 0, 0.05)",
		walletItemSelected: "",
	},
	borderColors: {
		outlineButton: "#e4e4e7",
	},
	colors: {
		primaryButton: "#fff",
		outlineButton: "#221d1d",
		// primaryButtonHover: '#fff',
		// outlineButtonHover: '#221d1d',
		iconButton: "#000",
		// iconButtonHover: '#000',
		body: "#221d1d",
		bodyMuted: "#636161",
		bodyDanger: "#ff794d",
	},
	shadows: {
		primaryButton: "0 0 0 0 transparent",
		walletItemSelected: "",
	},
	fontWeights: {
		normal: "500",
		medium: "500",
		bold: "600",
	},
	fontSizes: {
		small: "16px",
		medium: "16px",
		large: "16px",
		xlarge: "16px",
	},
	typography: {
		fontFamily:
			'"Pretendard", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
		fontStyle: "normal",
		letterSpacing: "-0.02em",
		lineHeight: "",
	},
};

ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<QueryClientProvider client={queryClient}>
			<SuiClientProvider networks={networks} defaultNetwork="testnet">
				<WalletProvider theme={customTheme}>
					<ChakraProvider value={defaultSystem}>
						<App />
					</ChakraProvider>
				</WalletProvider>
			</SuiClientProvider>
		</QueryClientProvider>
	</React.StrictMode>,
);
