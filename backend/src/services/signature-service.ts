import { fromBase64, toBase64 } from '@mysten/bcs'
import { blake2b } from '@noble/hashes/blake2b'
import { bcs } from '@mysten/sui/bcs'
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519'
import { getZkLoginSignature } from '@mysten/sui/zklogin'
import type { StoredSession } from '../utils/session-store.js'

const TRANSACTION_INTENT_SCOPE = 'TransactionData'

function messageWithIntent(scope: string, message: Uint8Array) {
  return bcs
    .IntentMessage(bcs.fixedArray(message.length, bcs.u8()))
    .serialize({
      intent: {
        scope: { [scope]: true },
        version: { V0: true },
        appId: { Sui: true },
      },
      value: message,
    })
    .toBytes()
}

export async function createZkLoginSignatureForTransaction(
  session: StoredSession,
  transactionBlockBase64: string,
) {
  if (!session.proof) {
    throw new Error('ZkLogin proof is missing from session')
  }
  const transactionBytes = fromBase64(transactionBlockBase64)
  const intentMessage = messageWithIntent(TRANSACTION_INTENT_SCOPE, transactionBytes)
  const digest = blake2b(intentMessage, { dkLen: 32 })
  const ephemeralKeypair = Ed25519Keypair.fromSecretKey(fromBase64(session.ephemeralKeyPair))
  const userSignatureBytes = await ephemeralKeypair.sign(digest)

  return getZkLoginSignature({
    inputs: session.proof,
    maxEpoch: session.maxEpoch,
    userSignature: toBase64(userSignatureBytes),
  })
}
