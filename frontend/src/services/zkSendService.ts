import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { NETWORK, SUI_RPC } from "./env";
import { ZkSendLinkBuilder } from "@mysten/zksend"; 
import { Transaction } from "@mysten/sui/transactions";

type SignAndExecuteTransactionFn = (
    params: { transaction: Transaction },
    options?: {
        onSuccess?: (result: any) => void;
        onError?: (error: any) => void;
    },
) => void;


export const createSendTicketLink = async (
	claimableTicketId: string,
	senderAddress: string,
	signAndExecuteTransaction: SignAndExecuteTransactionFn,
	setLink: (link: string) => void,
) =>  {
    const suiClient = new SuiClient({ url: SUI_RPC || getFullnodeUrl(NETWORK) });
    
    const link = new ZkSendLinkBuilder({
		sender: senderAddress,
		client: suiClient,
		network: "testnet",
		host: `http://localhost:3100`, // 이 값이 없으면 https://my.slush.app/ 가 기본 host
	});

	link.addClaimableObject(claimableTicketId);

	const tx = await link.createSendTransaction();
	const url = link.getLink();
	setLink(url);

	// 클레임 zklink
	console.log('zkSendLink:' + url);

	await signAndExecuteTransaction({
		transaction: tx
	});
}