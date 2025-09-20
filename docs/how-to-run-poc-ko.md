# 티켓 기반 콘텐츠 게이트 POC 실행 가이드 (KO)

이 문서는 Seal · Walrus · zkLogin · zkSend를 결합해 1개의 Policy가 여러 Ticket을 발행하고, 티켓 보유자만 암호화 파일을 복호화할 수 있는 최신 POC 플로우를 설명합니다. 새 시나리오에서는 정책 생성과 추가 발행 단계에서 바로 수신자 이메일 해시를 기록할 수 있으므로, 별도의 `ticket:set-email` 스크립트를 실행할 필요가 없습니다.

## 1. 구성 요소 개요

- **Move 모듈 (`poc/move/myapp/sources/content_gate_ticket.move`)**
  - `Policy`: 공유 객체로 관리자 주소, 타임락(`open_after_ms`), 허용된 Seal 서버 정보를 보관합니다.
  - `Ticket`: `has key` NFT로 `policy_id`, 선택적 이메일 해시 등을 저장하며 zkSend 링크 또는 Sui Wallet을 통해 양도할 수 있습니다.
  - `new_policy(...)`: 정책을 생성하면서 지정한 수의 티켓을 발행하고, 각 티켓에 즉시 이메일 해시를 박아 넣을 수 있도록 확장되었습니다.
  - `mint_tickets(...)`: 기존 정책에 추가 티켓을 발행하고 이메일을 함께 세팅합니다.
  - `seal_approve_with_ticket(...)`: Seal 서버가 Dry-Run으로 호출하는 승인 함수입니다. 전달된 티켓이 올바른 정책/이메일을 포함하는지 검증합니다.

- **TypeScript 스크립트 (`poc/src/scripts/*`)**
  - `publish.sh`: Move 패키지를 배포하고 `PACKAGE_ID`를 출력/`.env`에 반영합니다.
  - `init-policy.ts`: 정책을 초기화하고 초기 티켓을 발행하면서 수신자 이메일을 등록합니다.
  - `mint-tickets.ts`: 선택적으로 추가 티켓을 발행하며, 이때도 이메일을 함께 바인딩합니다.
  - `encrypt-upload.ts`: Seal로 콘텐츠를 암호화하고 Walrus에 업로드합니다.
  - `zk-send.ts`: 특정 티켓을 담은 zkSend 링크를 생성합니다.
  - `fetch-decrypt.ts`: 티켓과 이메일 정보를 Dry-Run에 제출해 콘텐츠를 복호화합니다.

- **프론트엔드/백엔드**
  - `backend`: Google OAuth + Enoki zkLogin 세션을 관리하고, 스폰서 트랜잭션/서명 서비스를 제공합니다.
  - `frontend`: 사용자가 zkLogin으로 인증하고 zkSend를 통해 전달받은 티켓을 청구한 뒤, 복호화 요청을 보낼 수 있는 UI를 제공합니다.

## 2. 환경 변수 정리

`poc/.env`(또는 루트 `.env`)에는 아래 항목을 상황에 맞게 설정합니다.

- `SUI_SECRET_KEY`: 관리자이자 트랜잭션 서명자 개인키 (Base64 혹은 `secret:` 형식).
- `NETWORK`, `SUI_RPC`: 사용할 Sui 네트워크 및 RPC URL. 기본값은 `testnet`과 해당 풀노드 URL입니다.
- `PACKAGE_ID`: 패키지 배포 결과. `npm run publish` 후 자동 갱신됩니다.
- `POLICY_ID`: 초기화된 정책 ID. `npm run init:policy` 실행 후 출력됩니다.
- `TICKET_COUNT`, `TICKET_RECIPIENT`: 초기 티켓 발행 시 사용할 수량/주소.
- `TICKET_MINT_COUNT`: `npm run ticket:mint` 실행 시 추가 발행할 티켓 수 (선택).
- `TICKET_ID`: zkSend 링크 생성 또는 최종 복호화에 사용할 개별 티켓 ID.
- `BLOB_ID`: `npm run encrypt:upload` 결과로 생성되는 Walrus Blob ID.
- `CLAIMER_EMAIL`: 최종 복호화 Dry-Run에서 사용자가 입력할 이메일 문자열.
- `CONTENT_ID_HEX`: Seal 콘텐츠 ID(16진수). 동일한 값이 정책/Seal에서 일치해야 합니다.
- `OPEN_AFTER_MS`: 타임락 설정(밀리초). 0이면 비활성화됩니다.
- `SEAL_SERVER_IDS`, `SEAL_SERVER_WEIGHTS`: Seal 키 서버 목록과 가중치.
- `WALRUS_EPOCHS`, `WALRUS_DELETABLE`: Walrus 저장 기간/삭제 가능 여부.
- `ZKSEND_HOST`, `ZKSEND_NETWORK`: zkSend 링크 생성 시 사용할 호스트와 네트워크 (기본 `http://localhost:3100`, `NETWORK`).

> ℹ️ 초기 정책 생성과 추가 발행 스크립트는 이메일 매핑을 위한 입력을 함께 받도록 업데이트되었습니다. 여러 티켓을 동시에 발행할 경우, 스크립트가 요구하는 형식(예: 쉼표로 구분된 이메일 목록)으로 값을 전달하면 각 티켓에 대한 해시가 자동으로 저장됩니다.

## 3. 전체 실행 흐름

1. **Move 패키지 배포 (`publish`)**  
   `cd poc && npm install && npm run publish` → `PACKAGE_ID` 확인/기록.

2. **정책 초기화 + 초기 티켓 발행 (`init:policy`)**  
   필요한 환경 변수를 설정한 뒤 `npm run init:policy`를 실행합니다.  
   - 지정한 이메일이 자동으로 해시되어 티켓에 기록됩니다.  
   - 콘솔에서 `POLICY_ID`, `TICKET_IDS`를 확인하고 `.env`에 반영합니다.

3. **추가 티켓 발행 (선택, `ticket:mint`)**  
   새로운 수량과 수신자/이메일을 지정해 `npm run ticket:mint`를 실행합니다.  
   추가 발행분 역시 즉시 이메일이 설정되므로 별도 작업이 필요 없습니다.

4. **콘텐츠 암호화 및 Walrus 업로드 (`encrypt:upload`)**  
   `npm run encrypt:upload`로 Seal 암호화를 수행하고 Walrus에 업로드합니다.  
   출력된 `BLOB_ID`를 기록합니다.

5. **티켓 배포 (`ticket:zk-send`)**  
   공유할 티켓 ID를 `.env`에 설정하고 `npm run ticket:zk-send`로 1회용 zkSend 링크를 생성합니다.  
   생성된 링크는 HTTPS 등 안전한 채널로 전달하세요.

6. **zkLogin & Ticket Claim (FE/BE)**  
   - 백엔드: `cd backend && npm install && npm run dev`로 세션/스폰서 서비스를 실행합니다.  
   - 프론트엔드: `cd frontend && npm install && npm run dev`로 UI를 띄웁니다.  
   - 사용자는 zkLogin(Google)으로 로그인 → zkSend 링크를 열어 티켓을 청구 → 프론트엔드에서 정책/Ticket 정보를 확인합니다.

7. **복호화 (`fetch:decrypt`)**  
   `TICKET_ID`, `BLOB_ID`, `CLAIMER_EMAIL` 등을 설정한 뒤 `npm run fetch:decrypt`를 실행하면, Dry-Run 검증 후 Walrus Blob을 복호화한 결과가 출력됩니다.

## 4. 보안 및 운영 체크리스트

- zkSend 링크는 항상 안전한 채널로만 공유하고, 사용 후 폐기합니다.
- `OPEN_AFTER_MS`를 활용해 복호화 가능 시점을 지연시키거나, 정책을 멀티시그 객체가 관리하도록 변경하는 방안을 검토하세요.
- Seal 키 서버 목록과 가중치를 주기적으로 검증해 노드 장애를 대비합니다.
- 고가치 콘텐츠라면 Walrus 업로드 직후 인증 상태(aggregator 응답)를 확인하고, 복호화 테스트를 자동화하십시오.

## 5. 자주 묻는 질문

- **티켓 수가 기대와 다릅니다.** 가스 한도를 늘리거나 트랜잭션 로그를 확인하세요.
- **`EBadTicket` 오류가 발생합니다.** Ticket과 Policy ID가 일치하는지, 올바른 이메일이 해시되었는지 확인하세요.
- **`EEmailHashMismatch` 오류가 발생합니다.** 티켓 발행 시 지정한 이메일과 복호화 시 입력한 이메일이 다른 경우입니다.
- **`ENoAccess` 메시지가 나옵니다.** 타임락(`OPEN_AFTER_MS`)이 아직 만료되지 않았습니다.
- **복호화 결과가 비어 있습니다.** Walrus Blob 인증이 완료되지 않았을 수 있으니 잠시 후 재시도하세요.

업데이트된 순서를 따르면 정책 초기화부터 zkSend 배포, zkLogin 기반 청구, 최종 복호화까지의 전 과정을 최신 플로우로 재현할 수 있습니다.
