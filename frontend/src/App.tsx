import { useEffect, useState } from "react";
import {
	useCurrentAccount,
	useSignAndExecuteTransaction,
	useSignPersonalMessage,
} from "@mysten/dapp-kit";
import { ZkSendLink } from "@mysten/zksend";
import { sealService } from "./services/sealService";
import { sealDecryptService } from "./services/sealDecryptService";
import Header from "./components/Header";
import { FAQ } from "./components/FAQ";
import uploadIcon from "./assets/upload.svg";
import { WalletModal } from "./components/WalletModal";
import {
	fetchSession,
	logout,
	signPersonalMessageWithZkLogin,
	type SessionInfo,
} from "./services/zkLoginService";
import {
	BACKEND_BASE_URL,
	ZKSEND_CLAIM_API,
	ZKSEND_NETWORK,
} from "./services/env";

type ClaimLinkState = {
	link: ZkSendLink;
	ticketId?: string;
	claimed: boolean;
	claimedBy?: string;
};

function formatAddress(address?: string | null) {
	if (!address) return "";
	const normalized = address.toLowerCase();
	return `${normalized.slice(0, 6)}…${normalized.slice(-4)}`;
}

// File type detection based on magic bytes
function detectFileType(data: Uint8Array): string {
	const bytes = Array.from(data.slice(0, 10));

	// JPEG
	if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
		return ".jpg";
	}

	// PNG
	if (
		bytes[0] === 0x89 &&
		bytes[1] === 0x50 &&
		bytes[2] === 0x4e &&
		bytes[3] === 0x47
	) {
		return ".png";
	}

	// GIF
	if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
		return ".gif";
	}

	// PDF
	if (
		bytes[0] === 0x25 &&
		bytes[1] === 0x50 &&
		bytes[2] === 0x44 &&
		bytes[3] === 0x46
	) {
		return ".pdf";
	}

	// ZIP
	if (
		bytes[0] === 0x50 &&
		bytes[1] === 0x4b &&
		(bytes[2] === 0x03 || bytes[2] === 0x05)
	) {
		return ".zip";
	}

	// Default to .bin if unknown
	return ".bin";
}

function App() {
	const currentAccount = useCurrentAccount();
	const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
	const { mutateAsync: signPersonalMessage } = useSignPersonalMessage();
	const [receiverAddress, setReceiverAddress] = useState("");
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [isUploading, setIsUploading] = useState(false);
	const [uploadResult, setUploadResult] = useState<{
		blobId: string;
		encryptedSize: number;
	} | null>(null);
	const [alertMessage, setAlertMessage] = useState<{
		type: "error" | "success";
		text: string;
	} | null>(null);
	const [currentTab, setCurrentTab] = useState<"send" | "download">("send");
	const [isWalletModalOpen, setWalletModalOpen] = useState(false);
	const [zkSession, setZkSession] = useState<SessionInfo | null>(null);
	const [claimLinkInput, setClaimLinkInput] = useState("");
	const [claimLinkLoading, setClaimLinkLoading] = useState(false);
	const [isClaiming, setIsClaiming] = useState(false);
	const [claimLinkState, setClaimLinkState] = useState<ClaimLinkState | null>(
		null,
	);
	const [claimError, setClaimError] = useState<string | null>(null);
	const [claimDigest, setClaimDigest] = useState<string | null>(null);
	const [claimNetwork, setClaimNetwork] = useState<"mainnet" | "testnet">(
		ZKSEND_NETWORK,
	);

	// Decrypt functionality states
	const [blobIdInput, setBlobIdInput] = useState("");
	const [isDecrypting, setIsDecrypting] = useState(false);

	useEffect(() => {
		let mounted = true;
		const loadSession = async () => {
			try {
				const session = await fetchSession();
				if (mounted) {
					setZkSession(session);
				}
			} catch (error) {
				if (mounted) {
					setZkSession(null);
				}
			}
		};

		if (typeof window !== "undefined") {
			void loadSession();
		}

		return () => {
			mounted = false;
		};
	}, []);

	const handleOpenSignIn = () => {
		setWalletModalOpen(true);
	};

	const handleCloseSignIn = () => {
		setWalletModalOpen(false);
	};

	const handleZkLoginSuccess = (session: SessionInfo) => {
		setZkSession(session);
		setAlertMessage({ type: "success", text: "Signed in with zkLogin" });
		void fetchSession()
			.then((fresh) => {
				if (fresh) {
					setZkSession(fresh);
				}
			})
			.catch(() => {
				/* ignore refresh errors */
			});
	};

	const handleLogout = async () => {
		try {
			await logout();
		} catch (error) {
			console.error("Failed to log out", error);
		}
		setZkSession(null);
		setWalletModalOpen(false);
		setAlertMessage({ type: "success", text: "Signed out." });
	};

	const handleLoadClaimLink = async () => {
		const rawInput = claimLinkInput.trim();
		if (!rawInput) {
			setClaimError("Paste a zkSend claim link first.");
			setClaimLinkState(null);
			return;
		}

		let candidate = rawInput;
		try {
			void new URL(candidate);
		} catch {
			candidate = `https://${candidate}`;
		}

		let parsed: URL;
		try {
			parsed = new URL(candidate);
		} catch (error) {
			setClaimError(
				error instanceof Error ? error.message : "Invalid claim link URL.",
			);
			setClaimLinkState(null);
			return;
		}

		const networkParam = parsed.searchParams.get("network");
		if (networkParam === "mainnet" || networkParam === "testnet") {
			setClaimNetwork(networkParam);
		} else {
			setClaimNetwork(ZKSEND_NETWORK);
		}

		setClaimLinkLoading(true);
		setClaimError(null);
		setClaimDigest(null);
		setIsClaiming(false);

		try {
			const link = await ZkSendLink.fromUrl(parsed.toString(), {
				claimApi: ZKSEND_CLAIM_API,
			});
			setClaimLinkState({
				link,
				ticketId:
					link.assets?.nfts?.[0]?.objectId ??
					link.assets?.coins?.[0]?.objectId ??
					undefined,
				claimed: Boolean(link.claimed),
				claimedBy: link.claimedBy,
			});
			setCurrentTab("download");
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: "Failed to load zkSend claim link.";
			setClaimLinkState(null);
			setClaimError(message);
		} finally {
			setClaimLinkLoading(false);
		}
	};

	const handleClearClaimLink = () => {
		setClaimLinkInput("");
		setClaimLinkState(null);
		setClaimError(null);
		setClaimDigest(null);
		setClaimLinkLoading(false);
		setIsClaiming(false);
		setClaimNetwork(ZKSEND_NETWORK);
	};

	const handleClaimTicket = async () => {
		if (!claimLinkState) {
			setAlertMessage({
				type: "error",
				text: "Load a zkSend claim link before claiming.",
			});
			setClaimError("Load a zkSend claim link before claiming.");
			return;
		}

		if (!zkSession) {
			setAlertMessage({
				type: "error",
				text: "Sign in with Google (zkLogin) to claim the shared ticket.",
			});
			setWalletModalOpen(true);
			return;
		}

		setIsClaiming(true);
		setClaimError(null);
		setClaimDigest(null);

		try {
			const link = claimLinkState.link;
			if (!link.keypair) {
				throw new Error("이 링크에는 서명용 키가 포함되어 있지 않습니다.");
			}

			const result = await link.claimAssets(zkSession.address);

			setClaimLinkState((previous) =>
				previous
					? {
						...previous,
						claimed: true,
						claimedBy: zkSession.address,
					}
					: previous,
			);
			setClaimDigest(result.digest ?? null);
			setAlertMessage({
				type: "success",
				text: "티켓을 성공적으로 클레임했습니다. 이제 파일을 복호화할 수 있습니다.",
			});
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: "Failed to claim the shared ticket.";
			setClaimError(message);
			setAlertMessage({ type: "error", text: message });
		} finally {
			setIsClaiming(false);
		}
	};

	const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (file) {
			setSelectedFile(file);
		}
	};

	const handleEncryptAndUpload = async () => {
		if (!selectedFile || !receiverAddress) {
			setAlertMessage({
				type: "error",
				text: "Please select a file and enter receiver address",
			});
			return;
		}

		if (!currentAccount) {
			setAlertMessage({
				type: "error",
				text: "Please connect your wallet first",
			});
			return;
		}

		setIsUploading(true);
		setAlertMessage(null);
		try {
			console.log("Starting encryption and upload...");
			const result = await sealService.encryptAndUploadWithWallet(
				selectedFile,
				currentAccount.address,
				signAndExecuteTransaction,
			);

			setUploadResult(result);
			setAlertMessage({
				type: "success",
				text: `File encrypted and uploaded! Blob ID: ${result.blobId}`,
			});
		} catch (error) {
			console.error("Upload failed:", error);
			setAlertMessage({
				type: "error",
				text: error instanceof Error ? error.message : "Upload failed",
			});
		} finally {
			setIsUploading(false);
		}
	};

	const handleDecryptAndDownload = async () => {
		if (!blobIdInput) {
			setAlertMessage({ type: "error", text: "Please enter Blob ID" });
			return;
		}

		const hasWallet = Boolean(currentAccount?.address);
		const zkLoginAddress = zkSession?.address ?? null;
		const zkLoginEmail = zkSession?.email ?? null;
		const canUseTicketDecrypt =
			!hasWallet && Boolean(zkLoginAddress && zkLoginEmail && ticketId && alreadyClaimed);

		if (!hasWallet && !canUseTicketDecrypt) {
			setAlertMessage({
				type: "error",
				text:
					"Connect a wallet or sign in with zkLogin using a claimed ticket before decrypting.",
			});
			return;
		}

		setIsDecrypting(true);
		setAlertMessage(null);
		try {
			console.log("Starting decryption...");
			const decryptedData = hasWallet
				? await sealService.decryptAndDownloadWithWallet(
					blobIdInput,
					currentAccount!.address,
					signPersonalMessage,
				)
				: await sealDecryptService.decryptWithTicket(
					blobIdInput,
					ticketId!,
					zkLoginAddress!,
					zkLoginEmail!,
					signPersonalMessageWithZkLogin
				);

			// Detect file type and create download link
			const fileExtension = detectFileType(decryptedData);
			const blob = new Blob([new Uint8Array(decryptedData)]);
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `decrypted_file_${Date.now()}${fileExtension}`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);

			setAlertMessage({
				type: "success",
				text: "File decrypted and downloaded successfully!",
			});
		} catch (error) {
			console.error("Decryption failed:", error);
			setAlertMessage({
				type: "error",
				text: error instanceof Error ? error.message : "Decryption failed",
			});
		} finally {
			setIsDecrypting(false);
		}
	};

	const claimAssets = claimLinkState?.link.assets;
	const claimSummary = {
		coins: claimAssets?.coins?.length ?? 0,
		nfts: claimAssets?.nfts?.length ?? 0,
		balances: claimAssets?.balances?.length ?? 0,
	};
	const ticketId = claimLinkState?.ticketId;
	const alreadyClaimed = claimLinkState?.claimed ?? false;
	const claimedBy = claimLinkState?.claimedBy;
	const claimerAddress = zkSession?.address ?? null;
	const disableClaimButton = !claimLinkState || alreadyClaimed || isClaiming;
	const claimButtonLabel = isClaiming
		? "Claiming..."
		: !claimLinkState
			? "Load a claim link"
			: alreadyClaimed
				? "Already claimed"
				: zkSession
					? "Claim ticket"
					: "Sign in to claim";
	const assetParts: string[] = [];
	if (claimSummary.nfts > 0) {
		assetParts.push(
			`${claimSummary.nfts} ticket${claimSummary.nfts === 1 ? "" : "s"}`,
		);
	}
	if (claimSummary.coins > 0) {
		assetParts.push(
			`${claimSummary.coins} coin${claimSummary.coins === 1 ? "" : "s"}`,
		);
	}
	if (claimSummary.balances > 0) {
		assetParts.push(
			`${claimSummary.balances} balance${claimSummary.balances === 1 ? "" : "s"}`,
		);
	}
	const claimAssetsText = assetParts.length > 0 ? assetParts.join(" • ") : "No assets detected";

	return (
		<div
			style={{
				width: "100%",
				position: "relative",
				minHeight: "100vh",
				textAlign: "center",
				fontSize: "48px",
				color: "#221d1d",
				fontFamily: "Pretendard",
				backgroundColor: "#fff",
				overflowX: "hidden",
			}}
		>
			<WalletModal
				isOpen={isWalletModalOpen}
				onClose={handleCloseSignIn}
				onZkLoginSuccess={handleZkLoginSuccess}
			/>
			{/* Background Grid - Figma Implementation */}
			<div
				style={{
					position: "absolute",
					top: 0,
					left: 0,
					width: "100vw",
					height: "932px",
					overflow: "hidden",
					zIndex: 0,
				}}
			>
				{/* Vertical Grid Lines */}
				{Array.from({ length: 50 }, (_, i) => 43 + i * 57).map(
					(left, index) => (
						<div
							key={`v-${index}`}
							style={{
								position: "absolute",
								top: 0,
								left: `${left}px`,
								backgroundColor: "#f0f0f0",
								width: "1px",
								height: "932px",
							}}
						/>
					),
				)}

				{/* Horizontal Grid Lines */}
				{Array.from({ length: 30 }, (_, i) => 45 + i * 57).map((top, index) => (
					<div
						key={`h-${index}`}
						style={{
							position: "absolute",
							top: `${top}px`,
							left: 0,
							backgroundColor: "#f0f0f0",
							width: "100vw",
							height: "1px",
						}}
					/>
				))}

				{/* Decorative Grid Boxes */}
				<div
					style={{
						position: "absolute",
						top: "331px",
						left: "158px",
						backgroundColor: "#f8f8f8",
						width: "56px",
						height: "56px",
					}}
				/>
				<div
					style={{
						position: "absolute",
						top: "730px",
						left: "272px",
						backgroundColor: "#f8f8f8",
						width: "56px",
						height: "56px",
					}}
				/>
				<div
					style={{
						position: "absolute",
						top: "160px",
						left: "272px",
						backgroundColor: "#fafafa",
						width: "56px",
						height: "56px",
					}}
				/>
				<div
					style={{
						position: "absolute",
						top: "559px",
						left: "1298px",
						backgroundColor: "#fafafa",
						width: "56px",
						height: "56px",
					}}
				/>
				<div
					style={{
						position: "absolute",
						top: "787px",
						left: "1241px",
						backgroundColor: "#fafafa",
						width: "56px",
						height: "56px",
					}}
				/>
				<div
					style={{
						position: "absolute",
						top: "217px",
						left: "1241px",
						backgroundColor: "#f8f8f8",
						width: "56px",
						height: "56px",
					}}
				/>

				{/* Bottom Fade Gradient */}
				<div
					style={{
						position: "absolute",
						top: "729px",
						left: 0,
						background: "linear-gradient(0deg, #fff, rgba(255, 255, 255, 0))",
						width: "100vw",
						height: "203px",
					}}
				/>
			</div>

			{/* Header */}
			<Header
				currentTab={currentTab}
				onTabChange={setCurrentTab}
				onSignInClick={handleOpenSignIn}
				sessionAddress={zkSession?.address}
				onLogout={zkSession ? handleLogout : undefined}
			/>

			{/* Main Content */}
			<div
				style={{
					paddingTop: "203px",
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					gap: "120px",
					position: "relative",
					zIndex: 1,
					width: "100%",
					maxWidth: "100vw",
					boxSizing: "border-box",
				}}
			>
				{/* Hero Section */}
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						gap: "48px",
						width: "100%",
						maxWidth: "1200px",
						position: "relative",
					}}
				>
					<div
						style={{
							width: "368px",
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							gap: "16px",
						}}
					>
						<div
							style={{
								letterSpacing: "-0.02em",
								lineHeight: "120%",
								fontWeight: "600",
							}}
						>
							Meet zkFileSend.
						</div>
						<div
							style={{
								fontSize: "20px",
								letterSpacing: "-0.02em",
								lineHeight: "120%",
								fontWeight: "500",
								color: "#636161",
							}}
						>
							Trusting big tech with your files?
							<br />
							That's a gamble we don't take.
						</div>
					</div>

					{/* Alert Message */}
					{alertMessage && (
						<div
							style={{
								width: "600px",
								padding: "12px 16px",
								borderRadius: "6px",
								backgroundColor:
									alertMessage.type === "error" ? "#fef2f2" : "#f0fdf4",
								border: `1px solid ${alertMessage.type === "error" ? "#fca5a5" : "#86efac"}`,
								fontSize: "14px",
								color: alertMessage.type === "error" ? "#dc2626" : "#16a34a",
								fontWeight: "500",
							}}
						>
							{alertMessage.text}
						</div>
					)}

					<div
						style={{
							width: "600px",
							padding: "24px",
							borderRadius: "12px",
							backgroundColor: "#fff",
							border: "1px solid #ebebeb",
							boxShadow: "0px 0px 24px rgba(0, 0, 0, 0.06)",
							display: "flex",
							flexDirection: "column",
							gap: "16px",
							textAlign: "left",
						}}
					>
						<div
							style={{
								fontSize: "18px",
								fontWeight: 600,
								color: "#221d1d",
							}}
						>
							Claim shared ticket
						</div>
						<div style={{ fontSize: "14px", color: "#636161" }}>
							Network: <span style={{ fontWeight: 600 }}>{claimNetwork}</span>
						</div>
						<div style={{ fontSize: "13px", color: "#636161" }}>
							Paste a zkSend claim link below. You can manually enter the Walrus Blob ID in the
							<strong> Download </strong>
							tab when you're ready to decrypt.
						</div>
						<div
							style={{
								display: "flex",
								flexDirection: "column",
								gap: "8px",
							}}
						>
							<input
								type="text"
								placeholder="https://.../claim#..."
								value={claimLinkInput}
								onChange={(event) => {
									setClaimLinkInput(event.target.value);
									if (claimError) {
										setClaimError(null);
									}
								}}
								style={{
									width: "100%",
									borderRadius: "6px",
									backgroundColor: "#fff",
									border: "1px solid #f1f1f1",
									padding: "12px 16px",
									fontSize: "16px",
									color: "#221d1d",
								}}
							/>
							<div
								style={{
									display: "flex",
									gap: "8px",
								}}
							>
								<button
									onClick={handleLoadClaimLink}
									disabled={claimLinkLoading || !claimLinkInput.trim()}
									style={{
										padding: "10px 16px",
										borderRadius: "6px",
										border: "none",
										backgroundColor:
											claimLinkLoading || !claimLinkInput.trim()
												? "#b6b6b6"
												: "#221d1d",
										color: "#fff",
										fontWeight: 600,
										cursor:
											claimLinkLoading || !claimLinkInput.trim()
												? "not-allowed"
												: "pointer",
									}}
								>
									{claimLinkLoading ? "Loading..." : "Load link"}
								</button>
								{(claimLinkInput || claimLinkState) && (
									<button
										type="button"
										onClick={handleClearClaimLink}
										disabled={claimLinkLoading}
										style={{
											padding: "10px 16px",
											borderRadius: "6px",
											border: "1px solid #e4e4e7",
											backgroundColor: "#fff",
											color: "#221d1d",
											fontWeight: 500,
											cursor: claimLinkLoading ? "not-allowed" : "pointer",
										}}
									>
										Clear
									</button>
								)}
							</div>
						</div>

						{claimError ? (
							<div style={{ fontSize: "14px", color: "#dc2626" }}>{claimError}</div>
						) : null}

						{claimLinkLoading && !claimError ? (
							<div style={{ fontSize: "14px", color: "#636161" }}>
								Loading claim details…
							</div>
						) : null}

						{claimLinkState && !claimLinkLoading ? (
							<>
								<div style={{ fontSize: "14px", color: "#636161" }}>
									Vault owner:
									<span style={{ fontWeight: 600, color: "#221d1d" }}>
										{` ${formatAddress(claimLinkState.link.address)}`}
									</span>
								</div>
								<div style={{ fontSize: "14px", color: "#636161" }}>
									Assets in link: {claimAssetsText}
								</div>
								{ticketId ? (
									<div style={{ fontSize: "14px", color: "#636161", wordBreak: "break-all" }}>
										Ticket object ID:
										<span style={{ fontWeight: 600, color: "#221d1d" }}>
											{` ${ticketId}`}
										</span>
									</div>
								) : null}
								{alreadyClaimed ? (
									<div style={{ fontSize: "14px", color: "#16a34a" }}>
										Already claimed
										{claimedBy ? ` by ${formatAddress(claimedBy)}` : ""}.
									</div>
								) : null}
								{claimDigest ? (
									<div style={{ fontSize: "14px", color: "#16a34a", wordBreak: "break-all" }}>
										Last claim digest: {claimDigest}
									</div>
								) : null}
								<div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
									<button
										onClick={handleClaimTicket}
										disabled={disableClaimButton}
										style={{
											width: "100%",
											borderRadius: "6px",
											backgroundColor: disableClaimButton ? "#b6b6b6" : "#221d1d",
											color: "#fff",
											height: "41px",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											padding: "12px 16px",
											border: "none",
											fontWeight: 600,
											cursor: disableClaimButton ? "not-allowed" : "pointer",
											opacity: disableClaimButton ? 0.6 : 1,
										}}
									>
										{claimButtonLabel}
									</button>
									{zkSession ? (
										<div style={{ fontSize: "13px", color: "#636161" }}>
											Ticket will be claimed to
											<span style={{ fontWeight: 600, color: "#221d1d" }}>
												{` ${formatAddress(claimerAddress)}`}
											</span>
											.
										</div>
									) : (
										<div style={{ fontSize: "13px", color: "#636161" }}>
											Sign in to receive the ticket in your zkLogin wallet.
										</div>
									)}
								</div>
							</>
						) : !claimLinkLoading && !claimError ? (
							<div style={{ fontSize: "14px", color: "#636161" }}>
								Load a zkSend claim link to preview ticket details.
							</div>
						) : null}
					</div>

					{/* Upload Result */}
					{uploadResult && (
						<div
							style={{
								width: "600px",
								padding: "16px",
								borderRadius: "6px",
								backgroundColor: "#f0fdf4",
								border: "1px solid #86efac",
								fontSize: "14px",
								color: "#16a34a",
								fontWeight: "500",
								textAlign: "left",
							}}
						>
							<div style={{ fontWeight: "bold", marginBottom: "8px" }}>
								🎉 Upload Successful!
							</div>
							<div style={{ marginBottom: "4px" }}>
								<strong>Blob ID:</strong> {uploadResult.blobId}
							</div>
							<div style={{ marginBottom: "4px" }}>
								<strong>Encrypted Size:</strong>{" "}
								{(uploadResult.encryptedSize / 1024).toFixed(2)} KB
							</div>
							<div style={{ fontSize: "12px", color: "#16a34a" }}>
								Share this Blob ID with the receiver to access the file.
							</div>
						</div>
					)}

					{/* Main Form */}
					{currentTab === "send" ? (
						<div
							style={{
								width: "600px",
								boxShadow: "0px 0px 24px rgba(0, 0, 0, 0.06)",
								borderRadius: "12px",
								backgroundColor: "#fbfaf9",
								border: "1px solid #ebebeb",
								display: "flex",
								flexDirection: "column",
								alignItems: "flex-start",
								padding: "32px",
								gap: "24px",
								minWidth: "320px",
								maxWidth: "600px",
								textAlign: "left",
								fontSize: "14px",
								color: "#636161",
							}}
						>
							{/* File Upload */}
							<div
								style={{
									width: "100%",
									display: "flex",
									flexDirection: "column",
									alignItems: "flex-start",
									gap: "10px",
								}}
							>
								<div style={{ fontWeight: "500" }}>Choose a file</div>
								<div
									style={{
										width: "100%",
										borderRadius: "6px",
										backgroundColor: "#fff",
										border: "1px solid #f1f1f1",
										display: "flex",
										flexDirection: "column",
										alignItems: "center",
										justifyContent: "center",
										padding: "32px 0px",
										gap: "12px",
										fontSize: "16px",
										color: "#d1d1d1",
										cursor: "pointer",
									}}
								>
									<input
										type="file"
										onChange={handleFileSelect}
										style={{ display: "none" }}
										id="file-input"
									/>
									<label
										htmlFor="file-input"
										style={{
											cursor: "pointer",
											textAlign: "center",
											width: "100%",
										}}
									>
										<div
											style={{
												display: "flex",
												flexDirection: "column",
												alignItems: "center",
												gap: "12px",
											}}
										>
											<img
												src={uploadIcon}
												alt="Upload"
												style={{ width: "24px", height: "24px" }}
											/>
											<div style={{ fontWeight: "500" }}>
												{selectedFile
													? selectedFile.name
													: "Drag and drop or select a file."}
											</div>
										</div>
									</label>
								</div>
							</div>

							{/* Receiver Input */}
							<div
								style={{
									width: "100%",
									display: "flex",
									flexDirection: "column",
									alignItems: "flex-start",
									gap: "10px",
								}}
							>
								<div style={{ fontWeight: "500" }}>Enter the receiver</div>
								<input
									type="text"
									placeholder="Email or Sui account"
									value={receiverAddress}
									onChange={(e) => setReceiverAddress(e.target.value)}
									style={{
										width: "100%",
										borderRadius: "6px",
										backgroundColor: "#fff",
										border: "1px solid #f1f1f1",
										padding: "12px 16px",
										fontSize: "16px",
										color: "#221d1d",
										outline: "none",
										boxSizing: "border-box",
									}}
								/>
							</div>

							{/* Send Button */}
							<div
								style={{
									width: "100%",
									display: "flex",
									flexDirection: "column",
									alignItems: "center",
									justifyContent: "center",
									gap: "8px",
									fontSize: "16px",
									color: "#b6b6b6",
								}}
							>
								<button
									onClick={handleEncryptAndUpload}
									disabled={
										isUploading ||
										!selectedFile ||
										!receiverAddress ||
										!currentAccount
									}
									style={{
										width: "100%",
										borderRadius: "6px",
										backgroundColor: "#221d1d",
										color: "#fff",
										height: "41px",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										padding: "12px 16px",
										border: "none",
										fontWeight: "600",
										cursor:
											isUploading ||
											!selectedFile ||
											!receiverAddress ||
											!currentAccount
												? "not-allowed"
												: "pointer",
										opacity:
											isUploading ||
											!selectedFile ||
											!receiverAddress ||
											!currentAccount
												? 0.33
												: 1,
										boxSizing: "border-box",
									}}
								>
									{isUploading
										? "Encrypting & Uploading..."
										: "Send via encryption"}
								</button>
								<div
									style={{
										fontSize: "14px",
										fontWeight: "500",
										textAlign: "center",
									}}
								>
									Only the receiver can see this file not us, not even Sui or
									Walrus validators.
								</div>
							</div>
						</div>
					) : (
						/* Download Form */
						<div
							style={{
								width: "600px",
								boxShadow: "0px 0px 24px rgba(0, 0, 0, 0.06)",
								borderRadius: "12px",
								backgroundColor: "#fbfaf9",
								border: "1px solid #ebebeb",
								display: "flex",
								flexDirection: "column",
								alignItems: "flex-start",
								padding: "32px",
								gap: "24px",
								minWidth: "320px",
								maxWidth: "600px",
								textAlign: "left",
								fontSize: "14px",
								color: "#636161",
							}}
						>
							{/* Blob ID Input */}
							<div
								style={{
									width: "100%",
									display: "flex",
									flexDirection: "column",
									alignItems: "flex-start",
									gap: "10px",
								}}
							>
								<div style={{ fontWeight: "500" }}>Enter Blob ID</div>
								<input
									type="text"
									placeholder="Enter Blob ID to decrypt"
									value={blobIdInput}
									onChange={(e) => setBlobIdInput(e.target.value)}
									style={{
										width: "100%",
										borderRadius: "6px",
										backgroundColor: "#fff",
										border: "1px solid #f1f1f1",
										padding: "12px 16px",
										fontSize: "16px",
										color: "#221d1d",
										outline: "none",
										boxSizing: "border-box",
									}}
								/>
							</div>

							{/* Download Button */}
							<div
								style={{
									width: "100%",
									display: "flex",
									flexDirection: "column",
									alignItems: "center",
									justifyContent: "center",
									gap: "8px",
									fontSize: "16px",
									color: "#b6b6b6",
								}}
							>
								<button
									onClick={handleDecryptAndDownload}
									disabled={isDecrypting || !blobIdInput}
									style={{
										width: "100%",
										borderRadius: "6px",
										backgroundColor:
											isDecrypting || !blobIdInput ? "#b6b6b6" : "#221d1d",
										color: "#fff",
										height: "41px",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										padding: "12px 16px",
										border: "none",
										fontWeight: "600",
										cursor:
											isDecrypting || !blobIdInput ? "not-allowed" : "pointer",
										opacity: isDecrypting || !blobIdInput ? 0.33 : 1,
										boxSizing: "border-box",
									}}
								>
									{isDecrypting ? "Decrypting..." : "Decrypt & Download"}
								</button>
								<div
									style={{
										fontSize: "14px",
										fontWeight: "500",
										textAlign: "center",
									}}
								>
									Wallet 또는 zkLogin 티켓으로만 복호화가 가능합니다.
								</div>
							</div>
						</div>
					)}
				</div>

				{/* FAQ Section */}
				<FAQ />

				{/* Footer */}
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						padding: "24px 0px",
						gap: "10px",
						fontSize: "14px",
						color: "#d1d1d1",
					}}
				>
					<div>©zkFileSend 2025</div>
					<div>Powered by Sui.</div>
				</div>
			</div>
		</div>
	);
}

export default App;
function ensureBackendFetchCredentials() {
	if (typeof window === "undefined") {
		return;
	}
	const marker = "__zkFileSendFetchPatched";
	const globalObject = window as typeof window & Record<string, unknown>;
	if (globalObject[marker]) {
		return;
	}

	const targetOrigins = new Set<string>();
	const addOrigin = (value?: string) => {
		if (!value) return;
		try {
			const url = new URL(value, window.location.href);
			targetOrigins.add(url.origin);
		} catch (error) {
			console.warn("Failed to parse origin for credentialed fetch", value, error);
		}
	};

	addOrigin(BACKEND_BASE_URL);
	addOrigin(ZKSEND_CLAIM_API);

	const originalFetch = window.fetch.bind(window);

	window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
		let requestUrl: string | undefined;
		if (typeof input === "string") {
			requestUrl = input;
		} else if (input instanceof URL) {
			requestUrl = input.href;
		} else if (input instanceof Request) {
			requestUrl = input.url;
		} else {
			requestUrl = undefined;
		}

		let shouldInclude = false;
		if (requestUrl) {
			try {
				const origin = new URL(requestUrl, window.location.href).origin;
				shouldInclude = targetOrigins.has(origin);
			} catch {
				shouldInclude = false;
			}
		}

		if (!shouldInclude) {
			return originalFetch(input as any, init as any);
		}

		if (input instanceof Request) {
			const cloned = new Request(input, {
				...init,
				credentials: "include",
			});
			return originalFetch(cloned);
		}

		const nextInit: RequestInit = {
			...init,
			credentials: "include",
		};
		return originalFetch(input as any, nextInit);
	};

	globalObject[marker] = true;
}

ensureBackendFetchCredentials();
