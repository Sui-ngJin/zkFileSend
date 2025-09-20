// 티켓 전송 기록을 account address 또는 hashed email address 별로 저장하기 위한 간이 데이터베이스를 로컬 스토리지로 구현

export interface TicketTransferRecord {
	id: number;
	link?: string;
	blobId: string;
	fileName: string;
	fileSize: number;
	createdAt: string;
	direction: "sent" | "received";
}

type TransferStore = Record<string, TicketTransferRecord[]>;

const STORAGE_KEY = "ticketTransferRecord";

let memoryStore: TransferStore = {};
let nextId = 1;

function isBrowser() {
	return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function computeNextId(store: TransferStore): number {
	const maxId = Object.values(store)
		.flat()
		.reduce((acc, item) => Math.max(acc, item?.id ?? 0), 0);
	return maxId + 1;
}

function readStore(): TransferStore {
	if (!isBrowser()) {
		return memoryStore;
	}

	const raw = window.localStorage.getItem(STORAGE_KEY);
	if (!raw) {
		memoryStore = {};
		nextId = 1;
		return memoryStore;
	}

	try {
		const parsed = JSON.parse(raw) as {
			zkFile?: TransferStore;
			zkFileNextId?: number;
		};
		memoryStore = parsed.zkFile ?? {};
		if (
			typeof parsed.zkFileNextId === "number" &&
			Number.isFinite(parsed.zkFileNextId)
		) {
			nextId = Math.max(nextId, parsed.zkFileNextId);
		} else {
			nextId = computeNextId(memoryStore);
		}
		return memoryStore;
	} catch (error) {
		console.warn("Failed to parse ticketTransfer store; resetting", error);
		memoryStore = {};
		nextId = 1;
		if (isBrowser()) {
			window.localStorage.removeItem(STORAGE_KEY);
		}
		return memoryStore;
	}
}

function writeStore(store: TransferStore) {
	memoryStore = store;
	if (!isBrowser()) {
		return;
	}

	const payload = JSON.stringify({ zkFile: store, zkFileNextId: nextId });
	try {
		window.localStorage.setItem(STORAGE_KEY, payload);
	} catch (error) {
		console.warn("Failed to persist ticketTransfer store", error);
	}
}

function normalizeKey(key: string) {
	return key.trim().toLowerCase();
}

export function recordTransfer(params: {
	fromKey: string;
	toKey: string;
	fileName: string;
	fileSize: number;
	link?: string;
	blobId: string;
	createdAt?: Date | string;
	id?: number;
}) {
	const store = readStore();
	const createdAt =
		params.createdAt instanceof Date
			? params.createdAt.toISOString()
			: params.createdAt ?? new Date().toISOString();

	const id = (() => {
		if (typeof params.id === "number" && Number.isFinite(params.id)) {
			nextId = Math.max(nextId, params.id + 1);
			return params.id;
		}
		const value = nextId;
		nextId += 1;
		return value;
	})();

	const baseEntry = {
		id,
		link: params.link,
		blobId: params.blobId,
		fileName: params.fileName,
		fileSize: params.fileSize,
		createdAt,
	} satisfies Omit<TicketTransferRecord, "direction">;

	const addEntry = (rawKey: string | undefined, direction: "sent" | "received") => {
		if (!rawKey) return;
		const key = normalizeKey(rawKey);
		if (!key) return;

		const existing = store[key] ?? [];
		const deduped = existing.filter(
			(item) => !(item.id === id && item.direction === direction),
		);
		const entry: TicketTransferRecord = { ...baseEntry, direction };
		store[key] = [entry, ...deduped].sort((a, b) =>
			new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
		);
	};

	addEntry(params.fromKey, "sent");
	addEntry(params.toKey, "received");

	writeStore(store);
}

export function getTransfersByKey(hashedKey: string): TicketTransferRecord[] {
	const store = readStore();
	return [...(store[normalizeKey(hashedKey)] ?? [])];
}

export function clearTransferHistory(hashedKey?: string) {
	if (!hashedKey) {
		nextId = 1;
		writeStore({});
		return;
	}

	const store = readStore();
	const key = normalizeKey(hashedKey);
	if (store[key]) {
		delete store[key];
		nextId = computeNextId(store);
		writeStore(store);
	}
}

export function listAllTransfers(): TransferStore {
	return { ...readStore() };
}
