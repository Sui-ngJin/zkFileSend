import { Transaction } from '@mysten/sui/transactions';
import type { SuiObjectChange, SuiObjectChangeCreated } from '@mysten/sui/client';
import { suiClient } from '../lib/seal.js';
import { PACKAGE_ID, SUI_SECRET_KEY } from '../lib/env.js';
import { signerFromEnvKey } from '../lib/keypair.js';

const signer = signerFromEnvKey(SUI_SECRET_KEY);

(async () => {
  const admin = signer.getPublicKey().toSuiAddress();
  const ticketRecipient = process.env.TICKET_RECIPIENT || admin;
  const ticketCountRaw = process.env.TICKET_COUNT || '1';
  const ticketCount = Number(ticketCountRaw);

  if (!Number.isInteger(ticketCount) || ticketCount <= 0) {
    throw new Error(`Set TICKET_COUNT to a positive integer (received "${ticketCountRaw}")`);
  }

  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::content_gate_ticket::new_policy`,
    arguments: [
      tx.pure.address(admin),
      tx.pure.address(ticketRecipient),
      tx.pure.u64(ticketCount),
    ],
  });

  const res = await suiClient.signAndExecuteTransaction({
    signer,
    transaction: tx,
    options: { showEffects: true, showObjectChanges: true },
  });

  if (res.effects?.status.status !== 'success') {
    throw new Error(res.effects?.status.error || 'new_policy transaction failed');
  }

  const changes = (res.objectChanges ?? []) as SuiObjectChange[];
  const createdChanges = changes.filter(
    (change): change is SuiObjectChangeCreated => change.type === 'created',
  );

  const policyId = createdChanges.find((change) => change.objectType?.endsWith('::content_gate_ticket::Policy'))?.objectId;

  const ticketIds = createdChanges
    .filter((change) => change.objectType?.endsWith('::content_gate_ticket::Ticket'))
    .map((change) => change.objectId);

  if (!policyId) {
    throw new Error('Policy was not created; inspect the transaction response.');
  }

  if (ticketIds.length === 0) {
    console.warn('No Ticket objects reported in response. Re-run with tracing enabled to inspect.');
  } else if (ticketIds.length !== ticketCount) {
    console.warn(`Requested ${ticketCount} tickets but observed ${ticketIds.length}. Check gas budget and response.`);
  }

  console.log('POLICY_ID =', policyId);
  console.log('TICKET_IDS =', ticketIds.join(', '));
})();
