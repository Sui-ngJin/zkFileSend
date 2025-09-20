import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { SealClient } from "@mysten/seal";
import {
	NETWORK,
	SUI_RPC,
	SEAL_SERVER_IDS,
	SEAL_SERVER_WEIGHTS,
} from "./env.js";

const rawSuiClient = new SuiClient({ url: SUI_RPC || getFullnodeUrl(NETWORK) });

// Walrus와 Seal 패키지가 서로 다른 @mysten/sui 버전을 참조하면서 타입이 미묘하게 어긋나므로
// 여기서 한 번만 캐스팅하여 호환 클라이언트를 만들어 재사용한다.
type SealClientOptions = ConstructorParameters<typeof SealClient>[0];

const sealCompatibleClient = rawSuiClient as unknown as NonNullable<
	SealClientOptions["suiClient"]
>;

export const suiClient = rawSuiClient;
export const sealSuiClient = sealCompatibleClient;

if (SEAL_SERVER_IDS.length === 0) {
	throw new Error("No SEAL_SERVER_IDS configured in .env");
}

if (SEAL_SERVER_IDS.length !== SEAL_SERVER_WEIGHTS.length) {
	throw new Error(
		`Mismatch: ${SEAL_SERVER_IDS.length} server IDs but ${SEAL_SERVER_WEIGHTS.length} weights`,
	);
}

export const seal = new SealClient({
	suiClient: sealCompatibleClient,
	serverConfigs: SEAL_SERVER_IDS.map((id, i) => ({
		objectId: id,
		weight: SEAL_SERVER_WEIGHTS[i] || 1,
	})),
	verifyKeyServers: true,
});
