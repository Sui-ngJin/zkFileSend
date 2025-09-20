import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { fromBase64 } from '@mysten/sui/utils';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';

/**
 * Accepts:
 *  - bech32: "suiprivkey1..."
 *  - base64 with scheme byte (length 33)
 *  - raw base64 32-byte secret (length 32)
 */
export function signerFromEnvKey(input: string): Ed25519Keypair {
  if (!input) throw new Error('Empty key string');

  // Case 1) bech32 (suiprivkey...)
  if (input.startsWith('suiprivkey')) {
    const { schema, secretKey } = decodeSuiPrivateKey(input);
    if (schema !== 'ED25519') throw new Error(`Unsupported scheme: ${schema}`);
    if (secretKey.length !== 32) throw new Error(`Wrong secretKey size from bech32: ${secretKey.length}`);
    return Ed25519Keypair.fromSecretKey(secretKey);
  }

  // Case 2) base64
  const raw = fromBase64(input);
  if (raw.length === 33) {
    // [scheme byte | 32-byte secret]
    return Ed25519Keypair.fromSecretKey(raw.slice(1));
  }
  if (raw.length === 32) {
    // plain 32-byte secret
    return Ed25519Keypair.fromSecretKey(raw);
  }
  // 흔한 실수: 패딩 누락으로 길이가 31 등 비정상
  throw new Error(`Wrong secretKey size. Expected 32 or 33 bytes, got ${raw.length}. (Check base64 padding "=" or provide suiprivkey)`);
}