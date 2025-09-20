# zkSend 클레임 테스트 가이드

## 0. 준비물
- Sui testnet 지갑(또는 zkLogin 계정)과 가스가 있는 주소
- `.env` / `frontend/.env` 업데이트 권한
- `@mysten/zksend` 링크를 생성할 수 있는 환경 (루트 스크립트 `src/scripts/zkSend.ts` 또는 직접 SDK 사용)

## 1. 환경 변수 정리
1. 루트 `.env` 및 `frontend/.env`에 다음 항목을 확인하세요.
   - `VITE_NETWORK`, `VITE_PACKAGE_ID`, `VITE_POLICY_ID`, `VITE_SEAL_SERVER_IDS`
   - `VITE_ZKSEND_CLAIM_API` (기본값: `https://api.slush.app`)
   - `VITE_ZKSEND_NETWORK` (기본값: testnet)
   - `VITE_ENOKI_PROJECT_ID`, `VITE_ENOKI_ENV`(기본값은 testnet), `VITE_ENOKI_GOOGLE_CLIENT_ID`
2. 링크를 로컬에서 열 계획이면 `VITE_SUI_RPC`가 testnet 노드를 가리키는지 확인합니다.
3. 새로 추가된 프론트엔드 의존성을 설치합니다.
   ```bash
   cd frontend
   npm install
   ```

## 2. 링크 생성 (Sender)
1. 루트 스크립트 `src/scripts/zkSend.ts`를 참고해 `ZkSendLinkBuilder`로 링크를 만듭니다.
   - `host`를 `http://localhost:5173`, `path`를 `/claim`으로 지정하면 프론트 dApp이 바로 열립니다.
   - 예시: `builder.getLink()` 결과가 `http://localhost:5173/claim#...` 형태인지 확인합니다.
2. 링크 생성 트랜잭션이 성공하면 콘솔에 출력되는 URL과 함께 전송 대상 주소, 전달 자산(SUI 또는 티켓 object id)을 기록합니다.

## 3. 프론트엔드 실행
```bash
cd frontend
npm run dev
```
- Vite 서버가 기본적으로 `http://localhost:5173`에서 동작합니다.
- preview 환경에서도 동일하게 작동하므로, 실제 도메인을 사용할 경우 링크 생성 시 host/path를 해당 도메인으로 맞춰주세요.

## 4. 클레임 시나리오 (Claimer)
1. 브라우저에서 발급받은 링크를 엽니다. 예: `http://localhost:5173/claim#...`.
2. 페이지에서 `Sign in with Google` 버튼을 눌러 Enoki 기반 zkLogin 세션을 생성합니다.
   - 로컬 지갑을 연결해도 되지만, Google만으로도 주소가 발급됩니다.
3. `Link details` 카드에 vault 주인 주소와 네트워크가 올바르게 표시되는지 확인합니다.
4. `Claimable assets` 섹션에서 수령 가능한 코인/오브젝트 목록을 확인합니다.
5. `Claim now` 버튼을 눌러 클레임을 실행합니다.
   - 성공 시 하단에 트랜잭션 digest가 표시됩니다.
   - 실패하면 경고 메시지가 나타나며, 재시도 전에 링크가 이미 사용되었는지 확인합니다.

## 5. 검증
- 지갑에서 티켓 NFT 또는 코인이 수령되었는지 확인합니다.
- `https://explorer.sui.io/txblock/<digest>?network=testnet`에서 트랜잭션 성공 여부와 수취 주소를 검증합니다.
- 필요 시 `sui client object <object-id> --network testnet`으로 소유자 변화를 다시 확인합니다.

## 트러블슈팅
- **링크 로드 실패**: 링크 해시(`#...`)가 비어 있거나 `network` 파라미터가 빠진 경우입니다. 링크를 다시 생성하세요.
- **클레임 API 오류**: `VITE_ZKSEND_CLAIM_API`가 올바른 API 엔드포인트인지 확인합니다. 기본값은 Slush 운영 API입니다.
- **이미 클레임된 링크**: 페이지 상단에 `이미 클레임됨` 메시지가 표시됩니다. 새 링크를 발급해야 합니다.
- **자산 목록이 비어 있음**: 방금 생성한 링크는 인덱싱이 지연될 수 있습니다. 몇 분 뒤 새로고침하거나 `loadClaimedAssets` 옵션을 켠 뒤 다시 시도하세요.
