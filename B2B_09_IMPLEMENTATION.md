# B2B-09 실행 기록 — 운영 점검·복구 준비

작성일: 2026-10-04 (KST)  
판정: **운영 점검 기능 구현 및 로컬·실제 DB 검증 완료. 독립 Worker 스테이징·전체 복구·상업 오픈 검수는 미완료.**

## 1. 이번 단계의 결정

- GitHub main push → Cloudflare Workers Builds 자동 배포를 유지한다.
- 개인 가입·사업자번호 선택·추가 가입 승인 없음 정책을 유지한다.
- 단가는 EA 기준이며 상품별 MOQ·포장·세금·승인 버전으로 계산한다.
- 해외 FOB는 국내 도매가의 VAT 10% 제외 기준이고 국내 운송·수출통관·적재 비용을 포함한다. 금액 조정은 사전 협의와 수정 PI로 처리한다.
- PI는 Proforma Invoice이며 최종 Commercial Invoice나 결제 영수증이 아니다.
- 사용자가 유료 Supabase 브랜치 생성을 요청해 `songfood-staging`을 `persistent:true, with_data:false`로 요청했다. API는 HTTP 402, `Branching is supported only on the Pro plan or above`로 거절했다. 생성·신규 과금은 발생하지 않았다.
- 사용자는 이후 **Pro 전환은 다음에 하고 지금은 무료로 개발**하도록 지시했다. 브랜치 생성은 보류한다. 다른 프로젝트를 삭제하거나 운영 DB를 스테이징처럼 사용하지 않는다.
- 실제 Storage 파일의 로컬 암호화 백업은 자동 승인 검토가 구체적인 대상·목적지 승인 부족으로 거절했다. 해당 승인 질문은 별도로 남아 있으며 실제 파일 다운로드는 실행하지 않았다.

## 2. 구현한 운영 기능

### 관리자 → 오픈 점검·서비스 중지

주소: `/admin/launch` (admin만 접근)

실제 DB에서 다음을 조회한다.

| 자동 점검 | 의미와 한계 |
| --- | --- |
| 회사·배송·반품·개인정보 안내 | 공개 정보의 빈 항목 표시. 내용의 법적·사업적 적합성은 운영자가 실제 근거로 검수 |
| 개인 구매 가능한 승인 가격 | 유효한 공통·개인 가격이 있는 상품 수. 전체 출시 SKU 승인과 동일하지 않음 |
| 환율 | 최신 승인 환율의 만료 여부. 만료된 최신 환율 대신 과거 버전을 자동 사용하지 않음 |
| 국내 계좌·PI 판매자 설정 | 등록 여부. 실제 계좌 소유·조건은 운영자가 확인 |
| PI 저장소 | `b2b-proforma` 버킷이 비공개인지 확인 |
| 문서 통지 방식 | 현재 `test_inbox`임을 표시. Supabase 가입 인증 SMTP와 별개 |
| 대응 담당자·목표 시간 | 관리자 입력. 미지정 상태를 완료로 처리하지 않음 |
| 알림 실패·발행 준비 PI | 복구할 업무가 있는지 수량 확인 |

자동 항목이 모두 충족되어도 상업 오픈을 자동 승인하지 않는다. 스테이징 UAT, 출시 SKU 근거, 전체 백업·복구, Worker 롤백, 담당자·통지 방식, 배포 범위를 별도 확인한다.

### 거래 중지·재개

- 신규 RFQ/국내 구매 문의, 신규 국내 주문, 신규 PI 발행을 각각 중지한다.
- 변경 사유 필수, 관리자/활성 상태 확인, 서버 actor 사용, 같은 출처 확인, 저장 버전 충돌 409, 변경 전후 감사 이력을 적용한다.
- 제어 상태는 DB에서 매 요청 조회한다. DB 연결 실패나 제어 행 누락이면 신규 접수는 503으로 차단된다.
- 세 테이블 INSERT trigger도 제어를 검사한다. 공유 행 잠금과 설정 변경 행 잠금으로 신규 DB 거래와 중지를 직렬화한다.
- 이미 성공한 동일 요청 키의 문의·주문 재시도는 기존 결과를 반환한다. 기존 문서 조회·다운로드, 이미 준비된 PI 복구, 입금·출고 업무 기록은 이 스위치의 대상이 아니다.
- 중지 저장 이전에 시작된 거래나 발행 준비는 끝날 수 있다. 모든 진행 중 거래 취소나 전체 사이트 차단 기능으로 해석하면 안 된다.
- 기본값은 모두 접수 가능이다. 실제 미승인 가격·계좌·환율 등 기존 검증은 그대로 적용된다.
- 정보 노출 사고에는 이 스위치만으로 대응하지 않는다. 키·세션 폐기, 접근 통제, 배포 원복을 함께 수행한다.

### 상태 확인·로그

- `GET /api/health`: 서버 인증 설정과 제어 DB 읽기가 가능하면 200 `{"status":"ok"}`, 실패면 503 `{"status":"unavailable"}`. 응답은 no-store이며 개인정보·키·설정 내용을 포함하지 않는다.
- 이 경로의 200은 전체 거래 UAT나 가격·Storage·SMTP 건강성을 보장하지 않는다.
- `scripts/health-smoke.cjs`: 상태, 한영 상품 화면, 주문·PI 비회원 401, 관리자 오픈 점검 비회원 403 확인. 데이터 쓰기·메일 요청은 없다.
- GitHub `Song Food service availability`는 6시간마다 및 수동 실행한다. GitHub 일정은 지연될 수 있으며 실시간 장애 탐지/SLA가 아니다.
- 실패 알림 수신은 운영자가 GitHub notification 설정에서 확인해야 한다. 자동으로 전화·메일·Slack 알림을 연결했다고 표시하지 않는다.
- Cloudflare structured error logs는 고정 이벤트·범주·상태/라우트 템플릿만 기록한다. 요청 본문, 이메일, 인증 URL, 제공자 오류 원문은 기록하지 않는다.
- 인증 링크의 query가 일반 요청 로그에 남지 않도록 `invocation_logs:false`를 설정했다. 운영은 10% 샘플링, 스테이징 설정은 100%다. 샘플링 때문에 모든 개별 오류가 보존되는 것은 아니다.
- 기존 라벨·상품 동기화 오류 로그도 오류 원문 출력을 제거했다.

## 3. 환경 분리와 배포 보호

| 환경 | 현재 상태 |
| --- | --- |
| 로컬 개발 | C:\\Users\\Microsoft\\Projects\\songfood, 기존 실제 연결 유지 |
| 독립 브라우저 QA | 127.0.0.1:3100 앱 / 4011 테스트 Supabase 응답, 가짜 키·검증 자료만 사용 |
| 운영 Supabase | `ejtozvlsnagtpsddhhoj`, 실제 개인 1명·상품 53개 |
| 운영 Worker | https://song-food.jwmaxum.workers.dev |
| 별도 Supabase staging | 없음. Free 플랜에서 branch 생성 402, 사용자 지시로 전환 보류 |
| 별도 Worker staging | `env.staging` 설정 준비. Supabase 분리 전 실제 연결·배포·거래 검증 미실행 |

`.env.staging.example`을 Git 제외 `.env.staging.local`에 복사하고 별도 프로젝트의 공개 URL/anon·서버 secret을 설정한다. 예제의 빈 값으로 빌드할 수 없다.

스테이징 도구는 명시된 파일만 읽고 누락된 Supabase 설정을 운영 `.env.local`에서 보충하지 않는다. 운영 project ref/URL/키·origin, public key를 서버 key로 사용하는 설정을 거절한다. 결제 key는 비운다.

Next의 공개 환경변수는 빌드 때 고정되므로 **운영 산출물의 runtime 비밀값만 교체해 스테이징에 사용하지 않는다.** 별도 공개 설정으로 새로 빌드한다. 전체 Worker·서버 함수·클라이언트 자산 해시를 기록하고 deploy/preview에서 일치 여부를 확인한다. 운영 deploy는 staging 표식이 있는 산출물을 거절한다.

```powershell
.\npm-local.cmd run build:staging
.\npm-local.cmd run deploy:staging
node scripts/staging-worker.cjs preview .env.staging.local
```

Wrangler 환경의 secrets/vars/bindings는 각각 설정해야 한다. 스테이징 runtime secrets는 대시보드 또는 Wrangler secret 명령에서 입력하고 실제 값을 명령 기록·Git·채팅에 넣지 않는다. 빌드 파일에는 secret 값 대신 환경·시각·해시만 기록한다.

## 4. 백업·복구 도구와 범위

추가 런타임 라이브러리 없이 Node crypto와 기존 Supabase SDK, PostgreSQL native tools를 사용한다.

| 도구 | 처리 범위 | 현재 검증 |
| --- | --- | --- |
| backup-archive.cjs | gzip + AES-256-GCM, 복호화 해시 검증 | 시험 바이트 정확 복구, 잘못된 키·변조 거절 통과 |
| backup-database.cjs | pg_dump custom: public/auth/storage/supabase_migrations | 연결·암호화·실행 가드 단위 검증. 실제 DB dump 미실행 |
| backup-storage.cjs | 모든 버킷의 실제 객체와 비공개 PDF, 원본 해시·버킷 설정·경로를 암호화 manifest로 보관 | 실제 파일 다운로드 승인 대기 |
| restore-database.cjs | 독립 target public schema가 빈 경우만 단일 트랜잭션 복구 | 운영·동일 target 금지. 실제 native 복구 미실행 |

`pg_dump`에는 Storage **파일 본문**, Auth SMTP·redirect 설정, cluster roles, 다른 스키마·DB extensions 설정 등이 모두 포함되는 것은 아니다. native archive가 만들어져도 재해복구 완료로 표시하지 않는다.

현재 이 PC에는 PostgreSQL 도구/Docker가 없으며 `SONGFOOD_DATABASE_URL`도 제공되지 않았다. DB 비밀번호를 reset하지 않는다. PostgreSQL 서버 버전 이상인 도구를 준비하고 `.env.backup.example`을 Git 제외 private 설정으로 복사한다. 복호화 키는 32바이트 무작위 값의 base64이며 파일·키를 서로 다른 보호된 위치에 추가 보관한다.

```powershell
# Node 24가 PATH에 있는 운영자 터미널에서 실행. 설정 값은 출력하지 않는다.
node --env-file=.env.backup.local scripts/backup-database.cjs
node --env-file=.env.local --env-file=.env.backup.local scripts/backup-storage.cjs
node --env-file=.env.backup.local scripts/restore-database.cjs <archive.sfba> --confirm-empty-target
```

- archive·manifest는 기본 `.npm-cache/backups`에 저장하고 Git에서 제외한다. DB 연결 비밀번호는 child 환경으로 전달하며 command argument에 넣지 않는다.
- DB archive는 128MiB, Storage 파일은 개당 32MiB를 넘으면 이 메모리 기반 도구를 사용하지 않는다. 대용량은 native 스트리밍 백업으로 전환한다.
- restore에는 원본/target URL과 key가 필요하다. 운영 project ref·동일 DB target·기존 public tables가 있으면 거절한다. `--clean`으로 대상 테이블을 삭제하지 않는다.
- 빈 독립 DB라도 Supabase 관리 auth/storage schema·역할·extension 차이를 먼저 확인한다. 실제 Supabase target은 공식 backup-restore 절차를 검토한 뒤 시험 복구한다. generic pg_restore 도구만으로 자동 복원 성공을 보장하지 않는다.
- 임시 평문 dump는 전용 임시 폴더를 만들고 finally에서 지운다. artifact로 올리지 않는다.
- 실제 백업 일정·외부 보관·retention·담당자·RPO/RTO는 미설정이다. 사용자 선택과 저장소·키 준비 없이 자동 백업이 실행된다고 표시하지 않는다.

## 5. 실제 검증 결과

| 검사 | 결과 |
| --- | --- |
| TypeScript/Next route types | 통과, 오류 0 |
| 전체 lint | 오류 0, 기존 경고 76 |
| Jest | 60 suites / 469 tests 통과 |
| 전체 line coverage | 68.16%. verification-loop 권장 80% 미달이며 전체 coverage 달성을 주장하지 않음 |
| 신규 launch library line coverage | 96.42% |
| Playwright 생산 모드 | 18개 통과. 한영·360/390/768/1440px, 접근성, RFQ·PI·주문 오류·중지 재개 |
| 실제 Supabase SQL | 신규 controls 및 기존 8 suites, 총 9개 BEGIN/ROLLBACK 검증 통과 |
| 기존 운영 Worker 호환 | 새 스키마 적용 뒤 기존 8개 HTTP/권한 검증과 공개 상품 private 가격 필드 제외 통과 |
| 서버 비밀키 없는 Worker build | 통과. 마지막 보안 설정까지 반영한 재빌드 성공 |
| 비밀값·CJS 구문·diff 검사 | 이번 변경 42개 파일 통과 |
| 실제 별도 Worker + Supabase UAT | 미실행 |
| 전체 DB/Storage 복원·Worker 이전 버전 롤백 | 미실행 |

SQL 시험 계정·중지·감사 기록은 rollback했다. 확장 스키마만 운영에 적용했다. 적용 직후 상품 53, 승인 가격 0, 실제 RFQ/주문/PI 0, controls 감사 0, pause flags 모두 false를 확인했다. 실제 고객에게 시험 이메일·문서를 발송하거나 시험 가격을 운영 가격표에 승인하지 않았다.

증거는 Git 제외 `.npm-cache/b2b-phase9`, `test-results`, `coverage`에 보관한다. 브라우저 fixture 검증은 실제 Supabase Auth/Storage 거래 검증으로 바꿔 표시하지 않는다.

## 6. 장애 대응·롤백 실행 절차

1. 관리자 오픈 점검에서 영향받는 신규 문의/주문/PI만 중지하고 사유를 남긴다. 관리자도 접속 불가하면 Worker/DB 접근 장애를 먼저 해결한다. 미확인 거래를 다시 생성하지 않는다.
2. `npm run check:health`, GitHub 실패 시각, Cloudflare 고정 오류 이벤트, 관리자 문서·감사·접수 기록을 확인한다.
3. idempotency key와 접수번호를 대조하고 preparing PI의 Storage hash·상태를 확인한다. 준비 문서는 기존 관리자 복구/취소 기능을 사용한다.
4. DB 손상이 아니라 앱 회귀라면 Cloudflare Deployments/Versions에서 확인한 직전 정상 버전으로 복귀한다. **DB는 롤백되지 않는다.** 이번 추가 테이블·trigger는 제거하지 않는다.
5. 스테이징에서만 먼저 이전 Worker 버전 복귀와 현재 버전 재배포를 실제 수행하고 버전 ID·HTTP·권한·거래 결과를 기록한다.
6. DB 손상은 신규 접수를 중지한 상태에서 백업을 별도 DB로 복구한다. row counts/합계/불변 PI snapshot/PDF hash/sequence/RLS/RPC/회사 범위/Auth 설정·사용자/Storage 파일을 검수한다. 곧바로 운영 DB에 덮어쓰지 않는다.
7. 원인·처리자·시각·영향 접수번호·재발 방지·RPO/RTO 결과를 기록하고 신규 기능을 하나씩 재개한다.

```powershell
# 아래 명령은 실제 검증된 버전 ID로 스테이징에서 실행할 때 사용한다.
.\npm-local.cmd exec -- wrangler versions list --env staging --json
.\npm-local.cmd exec -- wrangler rollback <previous-version-id> --env staging --message "staging rollback drill"
.\npm-local.cmd exec -- wrangler tail --env staging
```

## 7. 배포 패키지와 현재 오픈 판정

- 스키마: `20261004120000_b2b_launch_controls.sql` — 확장만 적용, 기존 함수 signature/거래 데이터 보존.
- 기능: 관리자 오픈 점검·접수 중지/재개·감사, privacy-safe logs, health smoke, staging guard, 암호화 백업/restore tools.
- 배포 범위: 사용자에게 이미 승인받은 GitHub main → 기존 Worker 코드 업데이트. 상업 판매의 무조건 오픈이나 결제 방식 변경은 포함하지 않는다.
- 배포 전: type/lint/unit/Worker/browser/SQL/security/diff 검사. Cloudflare native build가 별도 GitHub browser job 완료를 기다리는 설정은 없으므로 각 검사의 성공을 실제로 확인한다.
- source commit·GitHub CI·Cloudflare check·운영 HTTP 결과는 아래 최종 배포 기록에서 연결한다.

현재 **상업 오픈 검수 보류** 사유:

1. 승인된 실사용 상품 가격 0, 유효 환율·국내 계좌·PI 판매자 설정 미완료.
2. 사업주·사업자·주소·배송/반품/개인정보 세부사항과 실제 출시 SKU 근거 미완료.
3. 별도 Supabase/Worker 스테이징과 실제 사용자 UAT 미완료.
4. 전체 DB·Storage 백업/복원과 Worker 롤백 실행 증거 없음.
5. 문서 알림은 테스트 수신함. 실통지 방법·담당자·장애 수신 설정 미확정.

## 8. 다음에 요청할 개발 작업

**“무료 환경의 9단계 후속 검수를 진행해 주세요. 실제 출시 상품·가격·계좌·회사 정책을 관리자에서 확인하고 오픈 판정표를 갱신해 주세요.”**

Pro 전환 후: **“Supabase Pro 전환을 완료했습니다. 승인했던 songfood-staging 브랜치를 생성하고 실제 Worker UAT와 DB·Storage 복구·롤백 검증을 이어가 주세요.”**

10단계 제안은 **실제 통지 연결·출시 SKU 제한 오픈·운영 안정화**다. 운영자가 통지 방식을 정하고 실제 회사/가격/계좌/배송 기준을 검수한 범위로 진행한다. 9단계의 미검증 항목을 완료한 것으로 넘기지 않는다.

## 참고한 공식 문서

- [Supabase Branching](https://supabase.com/docs/guides/deployment/branching)
- [Supabase Branching 사용량 과금](https://supabase.com/docs/guides/platform/manage-your-usage/branching)
- [Supabase DB backup](https://supabase.com/docs/guides/platform/backups)
- [Supabase backup/restore](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)
- [Cloudflare 환경 분리](https://developers.cloudflare.com/workers/wrangler/environments/)
- [Cloudflare Worker rollback](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/)
- [Cloudflare Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/)
- [Cloudflare Builds API — user-scoped token 요구](https://developers.cloudflare.com/workers/ci-cd/builds/api-reference/)
- 설치된 Next 16.3.6의 environment-variables, instrumentation, route, deploying 가이드를 확인하고 구현했다.

## 9. 최종 소스 배포 기록

- 소스 버전: [12e9e33d2eb494cf765823ec3d5e7f625b19dd31](https://github.com/jwmaxum/songfood/commit/12e9e33d2eb494cf765823ec3d5e7f625b19dd31)
- [GitHub CI 37164161077](https://github.com/jwmaxum/songfood/actions/runs/37164161077): build/type/lint/unit 및 Linux 독립 브라우저 검사 **모두 성공**.
- [Cloudflare build 24107a8e-f35f-418d-aa7b-74ae970ff1a4](https://dash.cloudflare.com/7c88b2d2b3fe9baf32dc744ac0a631b3/workers/services/view/song-food/production/builds/24107a8e-f35f-418d-aa7b-74ae970ff1a4): GitHub `Workers Builds: song-food` check **success**.
- 실제 [운영 Worker](https://song-food.jwmaxum.workers.dev), 2026-10-04 **09:14:32 KST** 읽기 전용 검증: health 200, ko/en 상품 화면 200·HTML 언어 일치, 주문/PI 비회원 401, 관리자 launch 비회원 403.
- [모니터 시험 실행 37164336498](https://github.com/jwmaxum/songfood/actions/runs/37164336498): **success**. 정기 workflow가 사용하는 실제 운영 경로까지 검증했다.
- 마지막 보안 수정이 반영된 서버 비밀키 없는 Worker build 성공, TypeScript 오류 0, lint 오류 0/경고 76, 운영 dependency audit 취약점 0.
- 42개 변경 파일의 비밀값·CJS 구문·diff whitespace 검증 통과. 검증 범위는 이번 변경이며 전체 Git 과거 이력 검사로 표시하지 않는다.
- Workers runtime version ID 조회는 제공된 Cloudflare 토큰에서 HTTP 401/code 10000으로 실패했다. 위 Git 소스 버전·실제 build ID·실제 HTTP 검증을 기록하고, 확인하지 못한 runtime ID를 임의로 기재하지 않는다.
- 이 기록을 저장하는 후속 문서 커밋은 같은 코드에 문서만 추가한다. 새 문서 커밋의 CI/배포 상태는 GitHub/Cloudflare에서 해당 SHA로 별도 확인한다.
