import { BACKEND_BASE_URL } from "./env";

const LOGIN_MESSAGE_TYPE = "enoki:login";
const POPUP_FEATURES = [
	"width=480",
	"height=720",
	"resizable=yes",
	"scrollbars=yes",
	"status=no",
	"toolbar=no",
	"menubar=no",
	"location=no",
].join(",");

const backendOrigin = (() => {
	if (typeof window === "undefined") {
		return BACKEND_BASE_URL;
	}
	try {
		return new URL(BACKEND_BASE_URL, window.location.href).origin;
	} catch (error) {
		console.warn(
			"Invalid BACKEND_BASE_URL, defaulting origin to window.location",
			error,
		);
		return window.location.origin;
	}
})();

async function request<T>(path: string, init?: RequestInit): Promise<T> {
	const response = await fetch(`${BACKEND_BASE_URL}${path}`, {
		...init,
		credentials: "include",
		headers: {
			"Content-Type": "application/json",
			...(init?.headers ?? {}),
		},
	});

	if (!response.ok) {
		const message = await response.text();
		throw new Error(message || `${response.status} ${response.statusText}`);
	}

	return (await response.json()) as T;
}

export interface ZkLoginPopupResult {
	address: string;
	salt: string;
	publicKey: string;
	expiresAt: number;
}

export interface SessionInfo {
	address: string;
	expiresAt: number;
}

export interface SponsoredSignatureResponse {
	signature: string;
}

function awaitPopupMessage(popup: Window): Promise<ZkLoginPopupResult> {
	return new Promise<ZkLoginPopupResult>((resolve, reject) => {
		let closedChecker: number | undefined;
		const timeoutId = window.setTimeout(() => {
			cleanup();
			reject(new Error("Login timed out"));
		}, 120_000);

		const cleanup = () => {
			window.removeEventListener("message", handleMessage);
			if (closedChecker) window.clearInterval(closedChecker);
			window.clearTimeout(timeoutId);
			if (!popup.closed) popup.close();
		};

		const handleMessage = (event: MessageEvent) => {
			if (event.origin !== backendOrigin) return;
			const message = (event.data as { type?: string; payload?: unknown }) ?? {};
			if (message.type !== LOGIN_MESSAGE_TYPE) return;
			cleanup();
			resolve(message.payload as ZkLoginPopupResult);
		};

		window.addEventListener("message", handleMessage);
		closedChecker = window.setInterval(() => {
			if (popup.closed) {
				cleanup();
				reject(new Error("Login window closed before completion"));
			}
		}, 500);
	});
}

export async function startGoogleZkLogin(): Promise<ZkLoginPopupResult> {
	const { authorizationUrl } = await request<{ authorizationUrl: string; state: string }>(
		"/api/auth/google/start",
	);

	const popup = window.open(authorizationUrl, "zkLogin", POPUP_FEATURES);
	if (!popup) {
		throw new Error("Popup blocked. Please allow popups for this site.");
	}

	return await awaitPopupMessage(popup);
}

export async function fetchSession(): Promise<SessionInfo | null> {
	const response = await fetch(`${BACKEND_BASE_URL}/api/auth/session`, {
		credentials: "include",
	});

	if (response.status === 401) {
		return null;
	}

	if (!response.ok) {
		const message = await response.text();
		throw new Error(message || `${response.status} ${response.statusText}`);
	}

	return (await response.json()) as SessionInfo;
}

export async function logout(): Promise<void> {
	await fetch(`${BACKEND_BASE_URL}/api/auth/logout`, {
		method: "POST",
		credentials: "include",
		headers: { "Content-Type": "application/json" },
	});
}

export async function signTransactionBlock(
	transactionBlockBase64: string,
): Promise<string> {
	const { signature } = await request<SponsoredSignatureResponse>(
		"/api/auth/sign",
		{
			method: "POST",
			body: JSON.stringify({ transactionBlock: transactionBlockBase64 }),
		},
	);

	return signature;
}
