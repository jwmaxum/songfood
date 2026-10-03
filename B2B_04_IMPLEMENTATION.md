# B2B 4단계 — RFQ·견적 초안·CRM 구현 기록

- 단계: B2B-04 / 작업일: 2026-10-03 (Asia/Seoul)
- 개발 폴더: C:/Users/Microsoft/Projects/songfood
- 상태: **기능 구현·Supabase 적용·개발 검증 완료. 실제 승인 SKU와 직원/고객 계정의 통합 인수 및 운영 앱 배포 대기.**
- 기준: [전체 계획](B2B_LAUNCH_DEVELOPMENT_PLAN.md), [2단계 가격 서비스](B2B_02_IMPLEMENTATION.md), [3단계 고객 화면](B2B_03_IMPLEMENTATION.md)
- 운영 상품·가격·환율을 임의 변경하지 않았다. DB 테스트 자료는 트랜잭션 롤백했다. 실제 고객 문의·PI·메일 생성, 커밋·푸시·앱 배포는 하지 않았다.

## 1. 구현한 작업

| 작업 | 결과 |
| --- | --- |
| B2B-04-01 | 기존 commercial_inquiries ID·기업·작성자를 유지하며 사내 담당자, 수정 번호, 활동, 견적 버전을 연결 |
| B2B-04-02 | RFQ CTN 수량·기존 MOQ 표시, 목적지 국가/항구, 희망 선적항·출하일·요구 서류 입력. 개인의 회사명·사업자번호 선택 정책 유지 |
| B2B-04-03 | 요청 키·입력 해시와 DB 고유키/트랜잭션으로 재시도·중복 클릭 방지. 필드별 오류와 실패 입력 보존. 명시적 새 문의는 새 요청으로 처리 |
| B2B-04-04 | 관리자 검색·종류/상태/담당자 필터·페이지, 배정·상태 변경, 내부 메모, 고객 공개 회신, 변경 이력 |
| B2B-04-05 | 고객/회사별 서버 승인 가격·환율·포장·VAT·FOB 기준과 검토 내용을 고정하는 불변 견적 초안 버전 |
| B2B-04-06 | 품목별 제안 USD/CTN 단가·조정 사유·사전 협의 상태/근거. 기존 단가 보존 및 조정 전후 합계 구분. PI 자동 발행 없음 |
| B2B-04-07 | 알림 대기열·실패·시도 이력·내부 테스트 수신함. 실패 후 재시도, 전달 완료 중복 실행 차단 |

## 2. 사용 방법

### 고객

1. /shop?mode=export에서 상품을 선택한 뒤 /rfq에서 CTN 수량과 목적지를 확인한다.
2. 연락처·국가·이메일을 입력한다. 회사, 사업자번호는 가입/문의 공통 필수가 아니다.
3. 희망 선적항, 출하일, 서류명(한 줄 한 개)을 필요에 따라 입력한다.
4. 제출 실패 시 입력을 유지한 채 같은 내용으로 재시도한다. 성공 시 DB 접수번호를 표시한다.
5. 동일 화면에서 별도 문의를 시작하려면 “새 견적함 / New request” 또는 국내 “새 구매 문의”를 사용한다.
6. 로그인 상태에서 접수한 내역은 /account에서 조회하며 공개 회신·상태 이력만 보인다. 비회원 문의를 이메일 일치만으로 기존 계정에 자동 연결하지 않는다.

### 관리자

1. /admin/crm에 admin 또는 inquiry_staff 직원 계정으로 접근한다.
2. 검색/필터 후 문의를 선택하고 담당자와 진행 상태를 지정한다.
3. “내부 메모 · 직원만”과 “고객 공개 회신 · 마이페이지”를 구분해 저장한다. 회신을 저장해도 이메일이 자동 발송되지는 않는다.
4. 해외 RFQ에서 공급 가능 수량·납기·서류와 FOB 비용을 검토한다.
5. 필요한 경우 가격 조정 영역에 USD/CTN 단가와 사유를 적고 협의 상태·근거를 기록한다.
6. “서버 가격으로 초안 저장”을 누른다. v1, v2 등 이력이 쌓이며 이전 버전은 덮어쓰지 않는다.
7. 다른 담당자가 먼저 수정하면 409 충돌을 반환한다. 입력을 확인하고 상세 새로고침 후 최신 버전으로 검토한다.
8. 알림 점검 영역에서 실패 상황 → 재시도 → 내부 전달 완료와 시도 기록을 확인할 수 있다. 실제 테스트는 별도 인수용 문의를 지정해 수행한다.

초안은 **내부 검토 자료**이며 Proforma Invoice, 최종 Commercial Invoice, 주문 확정서가 아니다. 공급·서류·납기·MOQ·가격·환율 또는 가격 조정 협의가 미완료면 보완 항목이 남는다. 영업 담당자의 “협의 완료” 기록은 고객의 온라인 PI 수락을 대신하지 않는다.

## 3. 금액과 가격 적용

- 가격표 선택은 **문의 작성 고객·소속 회사**를 기준으로 한다. 작성 직원의 계약가를 사용하지 않는다.
- 비회원은 공통 가격표만 사용한다. 작성 계정이나 회사 소속이 중지되면 새 회사 견적 작성을 막는다.
- 2단계 승인 가격 엔진을 재사용한다. VAT 포함 도매가의 과세 품목은 공급가를 분리하고 면세/별도 VAT 등 SKU 승인값을 적용한다.
- EA 기준 가격을 검수된 CTN 입수로 환산하고, 서버의 유효한 환율을 사용한다. 수출 MOQ 및 가격/환율 만료도 검사한다.
- 국내 운송·수출통관·본선 적재 비용은 VAT 제외 도매가 안에 포함한다. 기본 FOB 비용을 다시 자동 가산하지 않는다.
- 승인 가격·포장·환율이 없으면 금액은 null/미확정이다. 제안 단가만으로 누락된 기준 가격을 우회하지 않는다.
- 요청 인도조건이 FOB가 아니거나 희망 선적항이 승인 가격의 항구와 다르면 별도 검토 항목으로 표시한다.
- 가격 버전 전체, 계산 행, 환율 이력 전체, 포장·선적항·VAT·유효기간, 요청·검토·조정 근거를 JSON 스냅샷에 보관한다.
- 기준가와 제안가를 구분하고 USD 소수 2자리·정수 minor units로 합계를 계산한다.
- **적용 후 실DB 확인:** 문의 0건, 견적 초안 0건, 승인 가격 0건, 환율 0건. 테스트 문의는 남기지 않았다. 실제 금액 견적을 시작하려면 운영 SKU와 환율을 먼저 검수·승인해야 한다.

## 4. DB·권한·동시성

적용 파일: supabase/migrations/20261003090000_b2b_crm_quotes.sql

| 객체 | 용도 |
| --- | --- |
| commercial_inquiries 추가 필드 | assigned_to, revision, requested_loading_port, desired_ship_date, required_documents |
| b2b_inquiry_requests | 소유 범위/요청 UUID·내용 해시·접수 ID. 중복 방지 기록은 만료 삭제하지 않음 |
| b2b_inquiry_activities | 불변 활동 이력, internal/customer 공개 범위 |
| b2b_quote_drafts | 문의별 불변 순차 버전, 이전 버전 연결, 서버 스냅샷 |
| b2b_notification_outbox | 활동별 유일한 내부 알림·상태·시도 횟수 |
| b2b_notification_attempts | 불변 실패/성공 시도 로그 |
| b2b_notification_test_inbox | 알림별 하나의 내부 수신 기록. 연락처 없이 ID만 저장 |

- 신규 테이블 RLS 활성화. PUBLIC/anon/authenticated의 직접 접근·RPC 실행을 차단하고 서비스 역할만 허용한다.
- 앱 API는 직원 역할·동일 출처·본문 크기·입력 검증을 거친다. RPC에서도 활성 직원/담당자 권한을 확인한다.
- 문의 생성은 범위+요청 키 advisory transaction lock과 고유키로 직렬화한다. 본문이 다른 동일 키는 409.
- 담당자 변경·메모·견적 저장은 문의 행 잠금과 expected revision을 사용한다. 견적은 최신 기준 버전도 검사한다.
- 이미 저장된 요청을 재전송하면 현재 가격을 다시 읽기 전에 이전 결과를 반환한다. 이후 가격 만료가 접수 응답 복구를 막지 않는다.
- 고객 조회는 먼저 본인·활성 회사 소유 문의를 확정한 뒤 공개 활동 필드만 조회한다. 내부 메모/직원 ID/가격 출처/초안 스냅샷은 고객 API에 포함하지 않는다.
- API 오류는 내부 DB 메시지나 자격증명을 노출하지 않는다.
- 브라우저에는 요청 내용 전체 대신 정규화된 입력 해시와 UUID만 최대 30개 저장한다. 연락처 입력은 기존 메모리 정책을 유지한다.
- 이번 알림은 DB 내부 수신함 전용이다. 기존 Supabase Gmail SMTP 인증 메일과 상업 견적 알림은 별도 기능이다.
- 목록 30건/페이지, 상세 활동 최근 200건, 초안 30버전, 알림 100건, 전달 시도 200건을 표시한다. 고객은 최근 문의 100건·공개 활동 조회 1,000건 중 문의별 20건을 표시한다. 보관된 이력을 삭제하지 않으며 대량 조회·내보내기는 후속 운영 기능이다.

## 5. 검증 결과

| 검사 | 결과와 범위 |
| --- | --- |
| Jest | **41개 묶음, 288개 테스트 통과**. 기존 249개에서 39개 추가 |
| 핵심 도메인 커버리지 | commercial-inquiry.ts + crm/quote.ts: 문장 91.22%, 분기 91.66%, 함수 95.83%, 줄 100%. 저장소 전체 커버리지는 아님 |
| 타입 | next typegen + tsc --noEmit 통과 |
| 범위 린트 | lint:b2b / lint:pricing / lint:storefront / lint:crm 오류 0. 기존 이미지 경고 5건 |
| 전체 저장소 lint | **FAIL: 기존 오류 130건·경고 91건**. CRM 범위 오류/경고 0. 전체 출시 품질 승인으로 간주하지 않음 |
| Supabase 통합 | 적용 전 migration+fixture 트랜잭션에서 접수 재시도·다른 본문 충돌, 직원/배정 권한·RLS/GRANT, 수정 번호 충돌, 내부/공개 활동, 초안 불변/버전/기준 충돌, 알림 실패→성공→중복 호출 검사 후 ROLLBACK |
| 실제 DB 적용 | 추가형 마이그레이션 적용 및 회원·가격·CRM 스키마 표식 check:b2b-env 확인 |
| 브라우저 | Edge desktop 1440px, mobile 390px. 6개 흐름: 실제 상품 53개·비로그인 API 차단, RFQ 구조/재시도/입력 보존, 새 요청 키 해제, 국내/RFQ 모바일, 격리 CRM 상태/메모/초안/알림, 관리자 모바일 넘침 검사 통과 |
| 브라우저 한계 | 고객 POST는 가로채기 fixture, 관리자 화면은 실제 컴포넌트를 번들한 격리 fixture. 실직원 로그인·실고객 문의 생성 통합 인수는 미실행. 운영 앱에 인증 우회 경로를 추가하지 않음 |
| 배포 빌드 | PASS: Next.js 16.3.6 최적화 빌드·타입·112개 페이지 생성, OpenNext Cloudflare Worker 번들 생성 성공. Windows 지원 경고가 있어 실제 Worker 스테이징 검증은 별도 필요 |
| 비밀값/변경 검토 | PASS: 소스·문서 344개 및 공개 JS 번들 47개에서 설정된 서버 자격증명 노출 0건. CRM raw HTML/console 출력 없음. env/cache Git 제외 확인, 변경 전 사본 비교 및 git diff --check 통과 |

DB 재현 SQL은 supabase/tests/b2b_crm_quotes.sql이다. 반드시 마이그레이션이 적용된 테스트 DB에서 BEGIN / 해당 검사 / ROLLBACK으로 실행한다. 성공 검사를 실제 운영 자료 생성으로 남기지 않는다.

로컬 검사/화면 증거는 .npm-cache/b2b-phase4/에 있다. 자격증명과 개인정보를 결과 파일에 기록하지 않았고 Git 제외 경로다. 신규 DB 구조는 원격 적용했지만 Worker 앱 배포·Git 반영은 하지 않았다.

전체 판정: **4단계 기능 개발·범위 검증 PASS / 사이트 출시 및 전체 저장소 품질 승인 대기**. 전체 lint 잔여 오류, 실계정 통합 인수, 판매 데이터 승인, Worker 스테이징·배포가 남아 있다.

## 6. 변경 위치와 운영 반영

- 고객 입력: src/app/rfq, src/app/wholesale, src/context/RFQContext.tsx
- 접수 파서·키: src/lib/commercial-inquiry.ts, src/lib/inquiry-client.ts
- 직원 API/도메인: src/app/api/admin/crm, src/app/api/commercial-inquiries, src/lib/crm
- 관리자: src/app/admin/crm
- 고객 조회: src/lib/customer-auth.ts, src/components/storefront/AccountActivity.tsx
- 검사/CI: src/__tests__/b2b-crm*, scripts/check-b2b-env.cjs, package.json, .github/workflows/deploy.yml

이번 DB 변경은 기존 접수 ID와 테이블을 유지하는 추가형이다. 이전 앱은 새 필드를 몰라도 기존 문의를 유지한다. 새 CRM 이력·중복 방지 기능은 새 앱에서만 적용된다. 기존 운영의 직접 DB 접근 차단 파일 20260930_b2b_legacy_access_lockdown.sql은 새 앱 전환과 함께 적용해야 하므로 이번에도 원격 적용하지 않았다.

문제 발생 시 먼저 앱 버전을 되돌리고 문의/견적 이력 테이블은 보존한다. 자동 DROP/삭제 원복은 제공하지 않는다. 다른 단계의 미커밋 작업이 많이 있으므로 전체 git reset 대신 이번 변경만 비교·복원한다. 변경 전 사본은 .npm-cache/b2b-phase4/before에 보관했다.

재현 명령:

~~~powershell
Set-Location 'C:/Users/Microsoft/Projects/songfood'
./npm-local.cmd run typecheck
./npm-local.cmd run lint:b2b
./npm-local.cmd run lint:pricing
./npm-local.cmd run lint:storefront
./npm-local.cmd run lint:crm
./npm-local.cmd test -- --runInBand
./npm-local.cmd run check:b2b-env
# 개발 서버 중지 후
./npm-local.cmd run build:worker
# 빌드 후 로컬 개발 재시작
./npm-local.cmd run dev -- --hostname 127.0.0.1
~~~

## 7. 다음 단계

**5단계 Proforma Invoice 발행**을 요청할 수 있다. 견적 초안 스냅샷을 기반으로 발행 승인·번호/버전·한영 PDF·비공개 다운로드·고객 열람/수정 요청/수락·만료 처리를 연결한다.

5단계에서도 발행 시점에 승인 가격·유효 환율·포장·FOB 항구·필수 서류·협의 근거를 재확인한다. 4단계의 “검토 미완료” 초안은 발행 승인으로 취급하지 않는다. 판매자 법인/연락처, 결제조건, 실제 은행정보, 문서 유효기간 등은 확정된 자료만 사용한다. 상업 알림을 이메일로 연결할 때는 지정된 테스트 수신처부터 전달·중복·실패를 검증한다.

요청 문장:

> B2B 개발계획의 5단계를 진행해 주세요. 4단계 RFQ·견적 초안을 바탕으로 Proforma Invoice 발행·PDF·버전 관리·고객 확인을 연결해 주세요.

실제 출시 전 남은 운영 과제: 상품별 가격/포장/MOQ/VAT/FOB 승인, 환율 등록, 직원·개인·회사 실계정 인수, 기존 권한 전환, 전체 lint 정리, Worker 스테이징 및 운영 배포.

## 8. 구현 선택 근거

새 외부 큐나 이메일 패키지 없이 기존 Supabase PostgreSQL 트랜잭션과 가격 서비스를 확장했다. 내부 DB 수신함 검증은 외부 메일 전송의 exactly-once 보장을 의미하지 않는다.

- [PostgreSQL INSERT / ON CONFLICT](https://www.postgresql.org/docs/current/sql-insert.html)
- [PostgreSQL transaction/row locks](https://www.postgresql.org/docs/current/explicit-locking.html)
- [Supabase Database Functions](https://supabase.com/docs/guides/database/functions)
