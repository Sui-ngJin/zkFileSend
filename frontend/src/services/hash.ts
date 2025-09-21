/**
 * 이메일 주소를 SHA-256으로 해시 처리하여 vector<u8> 형태로 반환
 * 브라우저 환경에서 Web Crypto API 사용
 */
export async function hashEmailToVector(email: string): Promise<Uint8Array> {
	// 이메일 주소 정규화 (소문자로 변환, 공백 제거)
	const normalizedEmail = email.trim().toLowerCase();

	// TextEncoder로 문자열을 바이트 배열로 변환
	const encoder = new TextEncoder();
	const data = encoder.encode(normalizedEmail);

	// SHA-256 해시 생성 (Web Crypto API 사용)
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
