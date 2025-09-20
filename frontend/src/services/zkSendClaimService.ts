import { BACKEND_BASE_URL, ZKSEND_NETWORK } from "./env";

export interface SponsoredTransactionSummary {
	digest: string;
	bytes: string;
	sponsor: string;
	expiresAt: number;
}

export interface SponsorRequestBody {
	transactionBlockKindBytes: string | Uint8Array;
	sender: string;
	claimer: string;
	network?: string;
}

export interface ExecuteSponsorResponse {
	digest: string;
}

function ensureBase64(data: string | Uint8Array): string {
	if (typeof data === "string") {
		return data;
	}

	let binary = "";
	for (let i = 0; i < data.length; i += 1) {
		binary += String.fromCharCode(data[i]);
	}

	return btoa(binary);
}

async function requestJson<T>(path: string, init: RequestInit): Promise<T> {
	const response = await fetch(`${BACKEND_BASE_URL}${path}`, {
		credentials: "include",
		headers: {
			"Content-Type": "application/json",
			...(init.headers ?? {}),
		},
		...init,
	});

	if (!response.ok) {
		const message = await response.text();
		throw new Error(message || `${response.status} ${response.statusText}`);
	}

	return (await response.json()) as T;
}

export async function requestSponsoredTransaction(
	body: SponsorRequestBody,
): Promise<SponsoredTransactionSummary> {
	const payload = {
		transactionBlockKindBytes: ensureBase64(body.transactionBlockKindBytes),
		sender: body.sender,
		claimer: body.claimer,
		network: body.network ?? ZKSEND_NETWORK,
	};

	const { data } = await requestJson<{ data: SponsoredTransactionSummary }>(
		"/v1/transaction-blocks/sponsor",
		{
			method: "POST",
			body: JSON.stringify(payload),
		},
	);

	return data;
}

export async function executeSponsoredTransaction(
	digest: string,
	claimerSignature: string,
): Promise<ExecuteSponsorResponse> {
	const { data } = await requestJson<{ data: ExecuteSponsorResponse }>(
		`/v1/transaction-blocks/sponsor/${digest}`,
		{
			method: "POST",
			body: JSON.stringify({ signature: claimerSignature }),
		},
	);

	return data;
}

export interface SponsoredClaimParams extends SponsorRequestBody {
	sign: (transactionBlockBase64: string) => Promise<string>;
}

export interface SponsoredClaimResult {
	digest: string;
	sponsor: string;
	expiresAt: number;
}

export async function claimViaSponsoredFlow(
	params: SponsoredClaimParams,
): Promise<SponsoredClaimResult> {
	const sponsored = await requestSponsoredTransaction(params);
	const claimerSignature = await params.sign(sponsored.bytes);
	const execution = await executeSponsoredTransaction(
		sponsored.digest,
		claimerSignature,
	);

	return {
		digest: execution.digest,
		sponsor: sponsored.sponsor,
		expiresAt: sponsored.expiresAt,
	};
}
