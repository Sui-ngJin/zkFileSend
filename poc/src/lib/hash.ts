import { createHash } from 'crypto';

/**
 * 이메일 주소를 SHA2-256으로 해시 처리하여 vector<u8> 형태로 반환
 * Move 컨트랙트의 hash::sha2_256과 일치하도록 수정
 */
export function hashEmailToVector(email: string): Uint8Array {
	// 이메일 주소 정규화 (소문자로 변환, 공백 제거)
	const normalizedEmail = email.trim().toLowerCase();

	// SHA2-256 해시 생성 (Move의 hash::sha2_256과 동일)
	const hash = createHash('sha256');
	hash.update(normalizedEmail);
	const hashBuffer = hash.digest();

	return new Uint8Array(hashBuffer);
}

/**
 * Uint8Array를 hex 문자열로 변환
 */
export function bytesToHex(bytes: Uint8Array): string {
	return Array.from(bytes)
		.map(byte => byte.toString(16).padStart(2, '0'))
		.join('');
}

/**
 * Hex 문자열을 Uint8Array로 변환
 */
export function hexToBytes(hex: string): Uint8Array {
	return new Uint8Array(hex.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []);
}
