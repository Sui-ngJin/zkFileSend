# 티켓 기반 콘텐츠 게이트 (1 Policy : N Tickets)

이 문서는 Seal · Walrus · zkLogin · zkSend 조합으로 암호화 콘텐츠를 보호하는 최신 구조를 설명합니다. 하나의 `Policy`는 여러 개의 `Ticket`을 발행하며, 각 티켓은 고유한 `policy_id`를 포함한 NFT 형태로 생성되어 Sui 지갑 또는 zkSend 링크를 통해 양도할 수 있습니다. 티켓 소유자만이 Seal 복호화 Dry-Run 승인을 통과해 Walrus Blob을 복호화할 수 있습니다.

## 1. 구성 요소 개요

- **Move 모듈 (`move/myapp/sources/content_gate_ticket.move`)**
  - `Policy`: 공유 객체. 관리자 주소와 타임락(`open_after_ms`)을 보관하며 해당 정책으로 발행된 모든 티켓과 연결됩니다.
  - `Ticket`: `has key` 특성을 가진 NFT. 생성 시 `policy_id`가 박혀 동일 정책인지 O(1)로 검증할 수 있습니다.
  - `new_policy(admin, recipient, count)`: 정책 생성과 동시에 `count`개의 티켓을 `recipient`에게 발행합니다.
  - `mint_tickets(...)`: 관리자가 필요 시 추가 티켓을 배치 발행하는 함수.
  - `seal_approve_with_ticket(...)`: Seal 서버가 Dry-Run으로 호출하는 승인 함수. 전달된 티켓의 `policy_id`가 공유 정책과 일치하는지 확인합니다.

- **TypeScript 유틸리티**
  - `src/scripts/init-policy.ts`: 정책 생성 + 초기 티켓 발행.
  - `src/scripts/encrypt-upload.ts`: Seal로 암호화 후 Walrus에 업로드.
  - `src/scripts/mint-tickets.ts`: 추가 티켓 발행.
  - `src/scripts/set-ticket-email.ts`: 티켓에 복호화 시 검증할 수신자 이메일을 해시로 설정.
  - `src/scripts/fetch-decrypt.ts`: 티켓을 Dry-Run 인자로 제출해 콘텐츠를 복호화.
  - `src/scripts/zk-send.ts`: zkSend 링크 생성 기능을 통해 티켓을 원하는 수신자에게 1회성 링크로 전달

## 2. 환경 변수 정리

`.env`에 아래 항목을 설정하세요.

- `SUI_SECRET_KEY`: 관리자이자 초기 서명자 개인 키.
- `PACKAGE_ID`: `npm run publish` 실행 후 반환되는 패키지 ID.
- `TICKET_COUNT`: 정책 생성 시 발행할 티켓 수 (기본 1).
- `TICKET_RECIPIENT`: 신규 티켓을 받을 주소. 지정하지 않으면 관리자가 받습니다.
- `TICKET_MINT_COUNT`: `ticket:mint` 스크립트로 추가 발행할 수량.
- `POLICY_ID`: `policy:ticket` 실행 결과.
- `TICKET_ID`: 복호화·양도에 사용할 특정 티켓 ID.
- `RECEIVER_EMAIL`: `ticket:set-email` 실행 시 사용할 주소의 이메일.
- `CLAIMER_EMAIL`: 복호화 시 사용자가 입력할 이메일 (소문자로 정규화 후 사용 권장).
- `ZKSEND_HOST` / `ZKSEND_NETWORK`: `npm run ticket:zk-send`로 링크 생성 시 사용할 호스트와 네트워크 (기본값은 `http://localhost:3100`, `.env`의 `NETWORK`).
- `VITE_BACKEND_BASE_URL`: Google 로그인/스폰서 API를 제공하는 백엔드 주소 (예: `http://localhost:3001`).
- `NEW_TICKET_OWNER`: `ticket:transfer` 실행 시 티켓을 넘겨줄 주소.
- `BLOB_ID`: Walrus 업로드 결과.
- `OPEN_AFTER_MS`: 타임락 (밀리초). 0이면 비활성.
- `SEAL_SERVER_IDS`, `SEAL_SERVER_WEIGHTS`: Seal 키 서버 정보.
- `WALRUS_EPOCHS`, `WALRUS_DELETABLE`: Walrus 보관 옵션.

## 3. 전체 흐름

1. **패키지 배포** – `npm run publish`로 Move 패키지를 배포하고 `.env`의 `PACKAGE_ID` 값을 갱신합니다.
2. **정책 및 초기 티켓 발행** – `npm run policy:ticket`
   - `TICKET_COUNT`만큼 티켓이 발행되어 콘솔에 `TICKET_IDS` 목록으로 출력됩니다.
   - 출력된 ID를 복사해 `TICKET_ID`나 스프레드시트 등에 기록해 둡니다.
3. **추가 발행 (선택)** – `npm run ticket:mint`로 새로운 수량을 `TICKET_RECIPIENT`에게 배포합니다.
4. **암호화 + 업로드** – `npm run encrypt:upload` → `BLOB_ID` 확보.
5. **이메일 바인딩** – 티켓을 배포하기 전에 `npm run ticket:set-email`을 실행해 티켓에 수신자의 이메일 해시를 기록합니다. 한 번 설정하면 다시 변경할 수 없으므로 정확한 이메일인지 확인하세요.
6. **티켓 배포**
   - **직접 전송**: `npm run ticket:transfer` 실행 후 `NEW_TICKET_OWNER`로 양도.
   - **zkSend 링크**: `npm run ticket:zk-send`를 사용하거나 Sui Wallet에서 티켓을 선택해 링크를 생성합니다. 새 스크립트는 `TICKET_ID`를 공유 가능한 링크에 넣고, 상대가 링크를 열면 해당 티켓 한 개를 청구할 수 있습니다.
7. **복호화** – 티켓 소유자가 `.env`에 `TICKET_ID`, `BLOB_ID`, `CLAIMER_EMAIL`을 지정한 뒤 `npm run fetch:ticket`을 실행하면, 입력한 이메일을 해시해 티켓 메타데이터와 일치할 때만 복호화가 허용됩니다.

## 4. zkSend 사용 팁

1. Sui Wallet에서 티켓 NFT를 선택하고 **Send > zkSend** 메뉴를 사용합니다.
2. 생성된 링크는 1회성입니다. 전달 전 HTTPS 등 안전한 채널을 사용하세요.
3. 수신자는 링크를 열고 지갑으로 로그인(zkLogin 지원)한 뒤 티켓을 청구합니다.
4. 청구가 완료되면 Wallet에서 티켓 ID를 확인하고 `.env`의 `TICKET_ID`로 설정해 `fetch:ticket`을 실행합니다.

## 5. 보안 및 운영 고려사항

- 티켓이 탈취되었을 경우 `ticket:transfer`로 새로운 주소에 재발급하거나, Move 모듈 업그레이드로 기존 티켓을 무효화하는 옵션을 고려하세요.
- `mint_tickets`는 관리자 주소로 서명해야 하며, 잘못된 `recipient`를 지정하면 복구가 어렵습니다.
- 고가치 콘텐츠라면 `OPEN_AFTER_MS` 타임락과 별도의 온체인 감사 로깅(예: 이벤트 발행)을 결합하는 것이 좋습니다.
- 실제 zkLogin 흐름을 재현하려면 CLI 대신 브라우저 지갑(또는 백엔드 서명 프록시)을 사용해 Session Key 서명을 생성해야 합니다.

## 6. 문제 해결 FAQ

- **출력된 티켓 수가 기대와 다름**: 가스 부족 가능성이 있습니다. `sui client` 로그를 확인하거나 `TICKET_COUNT`를 재설정 후 재시도하세요.
- **`EBadTicket`**: 다른 정책에서 발행된 티켓을 사용한 경우입니다. 올바른 `TICKET_ID`인지 확인하세요.
- **`EEmailHashNotSet` / `EEmailHashMismatch`**: 티켓에 이메일 해시가 설정되지 않았거나, 복호화 시 입력한 이메일이 티켓에 기록된 해시와 다릅니다. `ticket:set-email`을 다시 실행하거나 정확한 이메일을 입력하세요.
- **`ENoAccess`**: 타임락이 아직 만료되지 않았습니다. 시스템 시간을 확인하거나 `OPEN_AFTER_MS`를 0으로 조정하세요.
- **복호화 시 빈 결과**: Walrus Blob이 아직 인증되지 않았을 가능성이 있습니다. 수 분 후 다시 시도하세요.

이 가이드를 참고하면 정책 초기화부터 zkSend 배포, 최종 복호화까지의 흐름을 단계별로 재현할 수 있습니다. 추가 질문이나 개선 아이디어가 있다면 README 또는 세션 핸드오프 문서를 참고하고 팀에 문의하세요.
