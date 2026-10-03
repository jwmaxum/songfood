# B2B-01 구현·연동 기록

작성일: 2026-09-29\
개발 폴더: C:/Users/Microsoft/Projects/songfood\
상태: **1단계 코드·Supabase 회원 DB·Gmail SMTP 연결과 실제 메일 수신·로그인 확인 완료. 운영 배포 전 기존 권한 전환 필요.**

## 1. 확정한 회원 정책

- 국내 도매고객, 해외 바이어와 함께 **개인의 대용량 식료품 구매를 허용**한다.
- 이메일 주소 → 인증 메일의 링크 → 가입/로그인 완료. 비밀번호, 이름, 회사명, 사업자번호를 최초 가입 필수값으로 받지 않는다.
- 이메일 인증으로 회원을 바로 활성화한다. 가입 심사나 관리자 승인 대기는 없다.
- 기존 비밀번호가 있는 회원과 직원은 비밀번호 로그인도 사용할 수 있다. 비밀번호를 잊은 고객은 이메일 링크로 로그인한다.
- 회사 정보는 계정 화면에서 선택적으로 추가한다. 사업자번호를 비워도 저장할 수 있다. 새 회사는 즉시 이용 가능하며, 이는 사업자 진위 인증이나 외상거래 승인을 의미하지 않는다.
- 기존 회사 자료를 공유하려는 추가 담당자만 대표 담당자에게 소속 확인을 받는다. 이 절차는 개인회원 가입·상품 탐색·개인 문의의 선행조건이 아니다.
- 회사와 무관한 개인 문의는 본인만 조회한다. 회사 문의는 활성 소속 담당자만 공유한다. 회사 소속이 생겨도 기존 개인 문의는 다른 회사 구성원에게 공개되지 않는다.
- 실제 주문·입금·결제·출고는 6단계다. 현재는 상품 탐색과 개인/국내 도매 구매 문의, 해외 RFQ를 이용한다.

## 2. Supabase 연결

| 항목 | 확인 결과 |
| --- | --- |
| 제공된 비밀 파일 | C:/Users/Microsoft/Projects/.env.local |
| 제공된 Supabase 값의 종류 | 관리 API 토큰. 브라우저용 키와 구분해서 사용 |
| 연결 프로젝트 | songfood / ejtozvlsnagtpsddhhoj |
| 상태·리전 | ACTIVE_HEALTHY / ap-northeast-2 |
| 앱 연결 키 | 해당 프로젝트의 기존 publishable / secret 키를 조회해 앱 .env.local에 저장 |
| 앱 환경변수 이름 | 호환성을 위해 NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY 유지. 실제 값은 새 형식 키 |
| 비밀 보호 | 관리 토큰·Gmail 앱 비밀번호는 앱으로 복사하지 않음. 모든 .env.local은 Git 제외 |
| 로컬 복귀 주소 | http://127.0.0.1:3000/account/confirmed 및 localhost 변형 추가 |
| 기존 Auth 설정 | 이메일 가입 허용, 이메일 확인 유지. 운영 Site URL·메일 템플릿 보존 |
| 연결 전 데이터 | Auth 사용자 1명, 직원 프로필 1개, 상품 53개, 주문 0개, 구매 문의 0개 |

공유 운영 프로젝트에 연결되어 있다. 기존 상품·직원 데이터를 초기화하거나 seed를 다시 실행하지 않았다. 운영 홈페이지를 배포하거나 Git 커밋/푸시하지 않았다.

## 3. 구현 범위

| 작업 | 결과 |
| --- | --- |
| 시연 로그인·주문 제거 | 임의 자격증명 로그인, 예시 고객·주문·배송 성공 제거. 과거 localStorage 시연값 제거 |
| 고객 인증 | Supabase 이메일 링크 요청·검증, 서버 회원 생성, 선택 비밀번호 로그인 |
| 가입 완료 처리 | 인증 URL의 fragment를 즉시 제거. Supabase 토큰 검증 후 앱 세션 발급. JWT·refresh token을 localStorage에 저장하지 않음 |
| 개인·회사 회원 | 개인 즉시 활성화, 회사 선택 등록, nullable 사업자번호, 회사 자동 활성화, 기존 회사 소속 확인 |
| 직원 권한 | 기존 admin/product_staff/inquiry_staff/order_staff 유지. 서버 페이지·API·메뉴에 역할 검사 |
| 계정·소속 보호 | 활성 회원 확인, 회사별 공유 범위, 개인별 문의 범위, 중지 계정과 담당자 차단 |
| 결제 진실성 | URL 파라미터로 결제 성공을 표시하지 않음. 결제 승인 API는 6단계까지 503. 관리자 예시 거래 제거 |
| 공개 상품 | 공개 API와 페이지에서 내부 도매가·수출가·할인율·정확한 재고·미등록 필드 제외 |
| 요청 보호 | 동일 출처, JSON/실제 바이트 제한, DB 기반 요청 제한, 오류 비밀 제외, 보안 헤더 |
| 개발 검증 | 테스트·lint:b2b·typecheck·Worker 빌드 CI, check:b2b-env, 로컬 npm 실행기 |

해외 정책은 유지한다. VAT 제외 도매가 안에 국내 운송·수출통관·본선 적재 비용을 포함하고, 변동 시 사전 안내·협의·수정 PI로 처리한다. PI는 최종 Invoice가 아니다. 가격 계산 확정은 2단계이며 이번 단계에서 판매가를 확정하지 않았다.

## 4. 세션과 권한

앱 쿠키에는 256비트 난수만 들어가며 DB에는 그 SHA-256 해시를 저장한다. HttpOnly·SameSite=Strict, HTTPS 환경에서는 Secure를 사용한다. 고객/직원 쿠키를 분리하며 유효기간은 55분이다. 만료 후 다시 로그인한다. 로그아웃은 DB 세션을 삭제한 뒤 쿠키를 지운다.

인증 요청은 이메일 소유권 확인 후에만 세션을 발급한다. 회사 ID, 사용자 ID, 직원 역할을 브라우저 입력에서 받아 권한으로 사용하지 않는다. 비밀번호 없는 인증 경로는 항상 customer 세션만 발급한다. 기존 중지 회원을 다시 active로 덮어쓰지 않는다.

회원 요청마다 Supabase 사용자 존재·인증·중지 상태 및 앱 계정 상태를 확인한다. 직원 요청은 user_profiles의 실제 역할과 상태도 검사한다. 회사 등록이 자동 활성화된다고 직원 권한이나 다른 회사 자료가 부여되지는 않는다.

## 5. DB 적용과 운영 배포 경계

### 적용 완료

supabase/migrations/20260929_b2b_identity_security.sql:

- customer_accounts, companies, company_members, company_join_requests.
- b2b_sessions, b2b_rate_limits, b2b_access_audit, b2b_schema_versions.
- 기존 commercial_inquiries에 company_id와 submitted_by 및 조회 인덱스 추가.
- 새 회원 테이블은 RLS 활성화 및 anon/authenticated/PUBLIC 직접 접근 제거. 서버만 접근.
- 신규 가입자가 과거 프로필 자기 수정 정책으로 직원 역할을 올릴 수 없도록 user_profiles 클라이언트 쓰기 권한 제거.
- 서버 전용 요청 제한·회사 등록·담당자 소속·관리자 상태 변경 RPC.
- 회사 등록번호 nullable, 상태 기본값 approved(화면 표기: 이용 가능). 개인 계정 상태 기본값 active.
- schema version: 20260929_b2b_identity_security 및 20260929_personal_membership.

먼저 전체 변경과 검증을 트랜잭션에서 실행·ROLLBACK한 뒤 적용했다. 실제 DB의 개인 활성화, 번호 없는 회사 등록, 담당자 동의, 직원 권한 차단, 요청 제한 검증도 통과했으며 시험 데이터는 ROLLBACK했다.

### 새 앱 배포와 함께 적용할 파일

supabase/migrations/20260930_b2b_legacy_access_lockdown.sql은 **아직 미적용**이다.

기존 공개 사이트에는 브라우저의 Supabase 상품 직접 조회가 남아 있다. 이 파일은 상품 및 기존 민감 테이블의 직접 권한을 회수하므로 새 서버 API 기반 앱과 함께 배포해야 한다. 현재 로컬 API의 응답 제한만으로 기존 원격 DB의 모든 직접 접근이 차단되었다고 간주하지 않는다.

운영 전 순서:

1. 스테이징에서 새 앱·모든 역할·기존 CMS/상품 화면을 검증한다.
2. DB 백업과 배포 복구 절차를 준비한다.
3. 정확한 운영 NEXT_PUBLIC_APP_URL과 프로젝트 환경값으로 Worker를 빌드한다.
4. 새 앱 배포와 기존 권한 전환 SQL을 같은 배포 작업에서 적용한다.
5. Supabase 직접 접근, 개인/회사 교차 접근, 직원 역할, 가격 유출, 구매 문의를 재검증한다.
6. 결제는 6단계 완료 전까지 활성화하지 않는다.

## 6. 메일 설정

사용자는 jwmaxum@gmail.com과 Gmail 앱 비밀번호로 SMTP 사용을 선택했다. 실제로 저장된 비밀번호는 G:/내 드라이브/apps/.env.local의 GMAIL_APP_PASSWORD 항목에서 읽었다. C:/Users/Microsoft/Projects/.env.local에는 관리 토큰이 저장되어 있다. 코드·문서에 비밀번호 값을 기록하지 않는다.

연결 완료 설정: smtp.gmail.com, STARTTLS 587, 사용자/발신 이메일 jwmaxum@gmail.com, 발신자명 Songfood. Google에서 발급한 앱 비밀번호가 필요하다. Gmail 일반 로그인 비밀번호를 대체해 넣지 않는다.

최초 확인 시 custom SMTP가 없었고 Supabase 기본 발송 제한은 시간당 2통이었다. 기본 발송은 프로젝트 팀 외 일반 고객 주소에 사용할 수 없다. SMTP 연결 성공 여부와 실제 수신 여부는 별개로 기록한다. 운영 확장 시 Gmail 발송 한도를 검토하고 전용 발송 서비스로 이전할 수 있다.

참고:
- [Supabase 이메일 링크 인증](https://supabase.com/docs/guides/auth/auth-email-passwordless)
- [Supabase SMTP 설정](https://supabase.com/docs/guides/auth/auth-smtp)
- [Gmail SMTP 설정](https://support.google.com/mail/answer/7104828?hl=en)
- [Google 앱 비밀번호](https://support.google.com/mail/answer/185833?hl=en)

## 7. 검증 기록

- 단위·회귀 테스트: 30개 묶음 / 209개 통과.
- 회원·보안 코드 린트 통과.
- Supabase check:b2b-env 통과. publishable/secret 연결 및 최신 회원 스키마 표식 확인.
- 새 비공개 테이블 RLS·직접 권한·서버 RPC 실행 권한 검사 통과.
- 실제 DB 트랜잭션 검증: 개인 활성화, 사업자번호 null/빈값 정규화, 회사 자동 활성화, 소속 요청 없는 가입 차단, 요청 후 담당자 합류, 고객의 관리자 변경 차단, DB 요청 제한 통과.
- 새 가입 흐름에서 추가 검증: 잘못된 이메일/외부 Origin은 발송하지 않음, 메일 발송 실패를 성공으로 표시하지 않음, 미인증/잘못된 토큰은 세션 미발급, 임의 staff 요청 무시, 개인 문의 본인 범위 제한.

Next.js 프로덕션 빌드/타입 검사와 OpenNext Worker 빌드가 통과했다. 실제 Edge 브라우저에서 데스크톱 8개 시나리오, 모바일 3개 경로, API 16개 검사, 53개 공개 상품 필드 제한을 확인했고 JavaScript 오류와 화면 가로 넘침이 없었다. 개인 계정 선택 입력 화면은 격리된 UI fixture로도 검증했다. Gmail SMTP 자격증명 인증, Supabase SMTP 설정, 앱 인증 메일 요청 HTTP 202를 확인했다. 사용자가 실제 메일 수신과 링크를 통한 계정 진입을 확인했다. Gmail 외 수신함 도달과 운영 Worker 런타임은 아직 별도 검증 항목이다. 전체 레거시 린트에는 기존 오류가 있어 신규 회원·보안 경로 lint:b2b를 CI 기준으로 사용한다.

## 8. 다음 요청

- “1단계의 운영 배포와 기존 DB 권한 전환을 진행해 주세요.”
- “B2B 개발계획의 2단계를 진행해 주세요.”
- “6단계에서 개인과 사업자의 국내 대용량 주문·결제를 구현해 주세요.”

2단계 착수 전 국내 도매가격의 VAT 포함 여부와 상품 포장/단위 해석을 결정해야 한다. 개인 주문에 회사 등록·사업자번호·관리자 가입 승인을 다시 필수 조건으로 추가하지 않는다.

## 9. 최종 확인

- 실제 활성 고객 1명과 유효 고객 세션 1개를 DB 집계로 확인했다. 이메일/토큰은 검증 출력에 포함하지 않았다.
- 브라우저 정적 번들 45개 파일에 실제 Supabase 관리 토큰·서버 secret 키가 없음을 검사했다.
- 운영 전환 SQL은 실제 DB의 트랜잭션에서 문법·권한 검증 후 ROLLBACK했다. 운영 권한 전환 표식은 0개로, 미적용 상태임을 재확인했다.
- Gmail SMTP 설정: smtp.gmail.com:587, 발신 jwmaxum@gmail.com, 시간당 30통. Google SMTP 자격증명 검증 성공, 앱 메일 요청 202, 사용자 수신·로그인 확인 완료.


## 2026-10-03 인증 메일 브랜딩 반영

Supabase의 회원가입 확인과 Magic Link 제목·본문을 한영 송영민푸드 메일로 변경하고 설정 재조회를 완료했다. 신규 가입 제목은 “송영민푸드 회원가입 확인링크 | SONGFOOD Sign-up Confirmation”, 기존 회원 로그인 제목은 “송영민푸드 로그인 확인링크 | SONGFOOD Sign-in Link”다. 기존 공개 로고와 인증 버튼·대체 링크를 포함한다.

SMTP·Site URL·인증 링크 처리·가입 승인 정책은 유지한다. 640px/390px 두 템플릿의 로고·레이아웃을 확인했고 실제 메일 수신 확인은 별도다. HTML 소스와 운영·복구 방법: [인증 메일 템플릿](supabase/templates/README.md).
