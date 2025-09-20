import { SUI_SECRET_KEY } from '../lib/env';
import { signerFromEnvKey } from '../lib/keypair';
import { ZkSendLinkBuilder } from '@mysten/zksend';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';

const client = new SuiClient({ url: getFullnodeUrl("testnet") });

const sender = signerFromEnvKey(SUI_SECRET_KEY);
const senderAddress = sender.getPublicKey().toSuiAddress();

(async () => {
    const link = new ZkSendLinkBuilder({
        sender: senderAddress,
        client,
        network: "testnet",
        // host: "https://localhost:8080", // 이 값이 없으면 https://my.slush.app/ 가 기본 host
    });

    const claimableTicketId = "0x09c43aa95a27af05331a923f9ae47f6a72e754df7c1d67d4a19bb6c3443ca4b7" 
    link.addClaimableObject(claimableTicketId)

    const tx = await link.createSendTransaction()
    const url = link.getLink();

    // 클레임 zklink
    console.log(url);
    const built = await tx.build({ client: client });

    const result = await client.signAndExecuteTransaction({
        transaction: built,
        signer: sender,
        options: {
            showEffects: true
        }
    });
    console.log(result);
}) ()