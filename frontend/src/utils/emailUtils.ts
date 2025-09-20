/**
 * 이메일 관련 유틸리티 함수들
 * POC의 hash.ts와 동일한 로직을 브라우저 환경에 맞게 구현
 */

/**
 * 이메일 주소 정규화 (소문자 변환, 공백 제거)
 */
export function normalizeEmail(email: string): string {
	return email.trim().toLowerCase();
}

/**
 * 이메일 주소를 SHA2-256으로 해시 처리하여 Uint8Array 형태로 반환
 * Move 컨트랙트의 hash::sha2_256과 일치하도록 구현
 */
export async function hashEmailToVector(email: string): Promise<Uint8Array> {
	// 이메일 주소 정규화
	const normalizedEmail = normalizeEmail(email);

	// 브라우저 환경에서 SHA-256 해시 생성
	const encoder = new TextEncoder();
	const data = encoder.encode(normalizedEmail);
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);

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