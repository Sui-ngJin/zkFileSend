import { FunctionComponent, useMemo } from "react";
import styles from "./Header.module.css";

interface HeaderProps {
	currentTab: "send" | "download";
	onTabChange: (tab: "send" | "download") => void;
	onSignInClick: () => void;
	sessionAddress?: string | null;
	onLogout?: () => void;
}

const Header: FunctionComponent<HeaderProps> = ({
	currentTab,
	onTabChange,
	onSignInClick,
	sessionAddress,
	onLogout,
}) => {
	const signInLabel = useMemo(() => {
		if (!sessionAddress) return "Sign in";
		const trimmed = sessionAddress.toLowerCase();
		return `${trimmed.slice(0, 6)}…${trimmed.slice(-4)}`;
	}, [sessionAddress]);

	return (
		<div className={styles.header}>
			<div className={styles.zkfilesendParent}>
				<b className={styles.zkfilesend}>zkFileSend</b>
				<div className={styles.pushButton}>
					<div className={styles.label}>beta</div>
				</div>
			</div>
			<div className={styles.authButtons}>
				<div className={styles.signInWrapper}>
					<button
						type="button"
						className={styles.signInButton}
						onClick={(event) => {
							event.preventDefault();
							onSignInClick();
						}}
						title={sessionAddress ?? undefined}
					>
						<span className={styles.signIn}>{signInLabel}</span>
					</button>
				</div>
				{sessionAddress && onLogout ? (
					<button
						type="button"
						className={styles.logoutButton}
						onClick={(event) => {
							event.preventDefault();
							onLogout();
						}}
					>
						Log out
					</button>
				) : null}
			</div>
			<div className={styles.frameParent}>
				<div
					className={
						currentTab === "send"
							? styles.sendWrapper
							: styles.sendWrapperInactive
					}
					onClick={(e) => {
						e.preventDefault();
						onTabChange("send");
					}}
				>
					<div className={styles.signIn}>Send</div>
				</div>
				<div
					className={
						currentTab === "download"
							? styles.downloadWrapperActive
							: styles.downloadWrapper
					}
					onClick={(e) => {
						e.preventDefault();
						onTabChange("download");
					}}
				>
					<div className={styles.signIn}>Download</div>
				</div>
			</div>
		</div>
	);
};

export default Header;
