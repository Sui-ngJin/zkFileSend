# 참고 자료
https://seal-docs.wal.app/UsingSeal/
https://seal-docs.wal.app/Pricing/#verified-key-servers

# 현재 구조 요약
- 하나의 Walrus Blob을 Seal로 암호화해 저장
- `content_gate_ticket` 모듈이 1 Policy : N Ticket 구조를 제공
- 티켓은 NFT 형태로 발행되어 Sui Wallet/zkSend 로 양도 가능
- 티켓 소유자가 `fetch:ticket` 스크립트로 복호화 권한을 획득

## 🚀 실행 순서

1. **의존성 설치**
```
npm i
cp .env.example .env
# SUI_SECRET_KEY, NETWORK, SEAL_SERVER_IDS 등 환경 변수 입력
```

2. **Move 패키지 배포**
```
npm run publish
```

3. **Policy 생성 + 초기 티켓 발행**
```
# .env에 TICKET_COUNT, TICKET_RECIPIENT 등 설정
npm run policy:ticket
# 콘솔에 POLICY_ID, TICKET_IDS 출력
```

4. **추가 티켓 발행 (선택)**
```
# TICKET_MINT_COUNT, TICKET_RECIPIENT 설정 후 실행
npm run ticket:mint
```

5. **암호화 + 업로드**
```
npm run encrypt:upload
# 결과 BLOB_ID를 .env에 기록
```

6. **티켓 배포**
```
# 직접 전송
npm run ticket:transfer

# 또는 Sui Wallet에서 zkSend 링크 생성 후 공유
```

7. **복호화 테스트**
```
# 수신자가 TICKET_ID, BLOB_ID 설정
npm run fetch:ticket
```

---

## 🧪 팁 & 하드닝
- zkSend 링크는 HTTPS 등의 안전한 채널로 전달하세요.
- `OPEN_AFTER_MS`로 타임락을 적용할 수 있습니다 (0이면 비활성).
- 다중 운영자를 고려하면 Policy `admin`을 멀티시그/DAO 객체로 교체하세요.
- `mint_tickets` 실행 시 잘못된 recipient를 지정하면 복구가 어려우므로 주의가 필요합니다.

---

## 📓 메모
- 티켓은 `policy_id`를 포함하므로 잘못된 정책으로 Dry-Run을 시도하면 `EBadTicket`으로 중단됩니다.
- Seal SessionKey 는 현재 Ed25519 서명자를 사용하며 실제 zkLogin 흐름을 구현하려면 세션 키 교체가 필요합니다.
- Walrus Blob 인증이 지연되면 수 분 뒤 복호화를 재시도하세요.
