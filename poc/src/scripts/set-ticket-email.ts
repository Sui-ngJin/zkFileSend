import '../polyfill.js';

import { Transaction } from '@mysten/sui/transactions';
import { PACKAGE_ID, SUI_SECRET_KEY } from '../lib/env.js';
import { signerFromEnvKey } from '../lib/keypair.js';
import { suiClient } from '../lib/seal.js';

const ticketId = process.env.TICKET_ID;
const receiverEmailRaw = process.env.RECEIVER_EMAIL;

if (!ticketId) {
  throw new Error('Set TICKET_ID in the environment before setting the ticket email');
}

if (!receiverEmailRaw) {
  throw new Error('Set RECEIVER_EMAIL in the environment to bind the ticket to an email');
}

const receiverEmailBytes = Array.from(new TextEncoder().encode(receiverEmailRaw.trim().toLowerCase()));
const signer = signerFromEnvKey(SUI_SECRET_KEY);

(async () => {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::content_gate_ticket::set_ticket_email`,
    arguments: [tx.object(ticketId), tx.pure.vector('u8', receiverEmailBytes)],
  });

  const res = await suiClient.signAndExecuteTransaction({ signer, transaction: tx });
  console.log('Ticket email hash updated. Transaction digest =', res.digest);
})();
