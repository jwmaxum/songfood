# B2B-10 구현·운영 검증 기록

작업일: 2026-10-04. 기준 소스: 739d118c01e231854ee7c042770876801a0ec29a.
범위: 무료 환경에서 실제 고객 문서 이메일 연결, 출시 상품 검수·제한 거래, 발송 실패·결과 불명 운영.
9단계의 독립 스테이징·전체 복구·실계정 거래 UAT를 완료한 것으로 간주하지 않는다.

## 1. 관리자 사용 방법

| 메뉴 | 동작 | 권한 |
| --- | --- | --- |
| /admin/mail | Gmail SMTP 연결·인증 점검, 실패/결과 불명/처리 중 및 최근 감사 이력 | 관리자 |
| /admin/crm | 문의 상세 → 고객 이메일·내부 테스트 알림 → 수신자·메일 미리보기 → 확인·사유 → 실제 이메일 발송 | 관리자·문의 담당자 |
| /admin/releases | 모든 상품 출시 검수 목록·검색·정보/가격 관리 연결 | 관리자·상품 담당자 |
| /admin/releases | 국내/해외 각각 승인·철회, 사유 기록, 승인 상품 거래 제한 활성화/해제 | 관리자 |
| /admin/launch | 실제 SMTP 연결·출시 검수·계좌·회사 정책·가격·환율·운영 담당자 점검 | 관리자 |

기존 가입 절차는 그대로 유지한다. 개인도 이메일 인증 후 가입·구매할 수 있고 사업자번호는 선택이며 고객 가입 승인 단계는 추가하지 않았다.

## 2. 실제 고객 이메일

- 기존 jwmaxum@gmail.com Gmail 앱 비밀번호를 Supabase Edge Function의 암호화된 비밀값에 연결했다. Supabase Auth 회원인증 SMTP 설정은 변경하지 않았다.
- Cloudflare Worker는 기존 서버 전용 Supabase 자격증명으로 HTTPS relay를 호출한다. 별도 유료 이메일 서비스·Supabase Pro 브랜치를 생성하지 않았다.
- relay: b2b-notification-relay, Gmail smtp.gmail.com:465 implicit TLS, Nodemailer 10.0.14, Supabase JS 2.111.0.
- 기존 Auth의 SMTP는 587이다. Edge Function에서 금지된 outbound 25/587을 사용하지 않고 465의 실제 TLS·인증 성공을 확인했다.
- 메일 제목: **송영민푸드 문의·문서 업데이트 | Song Young Min Food Account Update**.
- 공개 로고 /logo.png와 한영 안내, 운영 /account 로그인 링크를 제공한다. PDF 첨부·가격·거래 조건·비공개 Storage URL·로그인 토큰은 넣지 않는다.
- Proforma Invoice가 최종 Commercial Invoice가 아님을 안내한다. 회원가입 확인 링크 메일은 기존 Supabase Auth 템플릿을 유지한다.
- 수신자는 RFQ 자유 입력 이메일을 사용하지 않는다. DB에서 현재 인증된 고객 이메일·활성 계정·현재 회사/소속 권한·고객 공개 활동을 검사한다. 비회원 문의는 이 메일 발송 대상이 아니며 직원이 별도 연락을 기록한다.
- 미리보기 후 이메일 주소나 권한이 바뀌면 저장된 미리보기 해시가 일치하지 않아 발송을 거절한다. 클라이언트가 보낸 이메일·제목·HTML·URL·작성자 값은 사용하지 않는다.

### 발송 결과와 복구

| 상태 | 의미 | 운영 처리 |
| --- | --- | --- |
| queued | 실제 메일 발송 대기 | 최신 수신자·본문 확인 후 직원 발송 |
| sending | 하나의 발송 요청이 처리 중 | 중복 클릭/같은 요청 키는 새 메일을 보내지 않음 |
| accepted | SMTP 서버가 접수 | 실제 수신·스팸함 여부는 별도로 확인 |
| failed | SMTP 인증/명시적 접수 거절 | 관리자 원인 확인·사유 기록 후 대기로 복구 |
| uncertain | 네트워크 단절·응답 손실·처리 기한 경과 | 자동 재발송 금지. Gmail 보낸 편지함과 고객 수신 확인 후 관리자 복구 |

- DB row lock·시도 번호·요청 키·발송 lease token·완료 시 token 비교를 적용했다.
- 처리 기한은 2분이다. 기한이 지난 sending은 CRM 결과 조회 시 uncertain으로 전환하고 감사 기록을 남긴다. 자동 재시도 작업은 없다.
- SMTP 접수 후 DB 결과 저장이 실패하면 성공으로 확정하지 않고 관리자 확인을 요청한다.
- accepted는 다시 발송 대기로 복구할 수 없다. failed/uncertain 복구는 관리자와 10자 이상 확인 사유가 필요하다.
- 실제 메일 시도는 프로젝트 전체 최대 50회/24시간, 직원별 API 10회/시간이다. SMTP 인증 점검은 관리자 3회/15분이고 메일을 보내지 않는다.
- SMTP 연결 성공은 7일간 유효한 점검으로 표시한다. 유효 기간 후 관리자에서 재점검한다.
- 기존 내부 test_inbox의 delivered는 실제 이메일 접수로 재해석하지 않는다. 실제 이메일 테이블·시도 이력을 분리했다.

## 3. 출시 상품 검수와 거래 제한

- 정상 상품도 포함해 전체 상품을 표시한다. 국내·해외 자동 검사와 현재 승인·철회·재검수 상태를 보여준다.
- 자동 검사: 상품명/SKU/원산지/보관/소비기한/원재료/알레르겐/중량, 국내 유효 공통·개인 승인 가격, 해외 영문명·유효 FOB 포함 가격·카톤 환산·수출 MOQ.
- 수입국 규정, 콜드체인, 공급사 표시자료, 서류, 실제 가격·세금·포장·MOQ·FOB 범위는 관리자 검수 근거를 입력한다. 자동 검사 통과가 규제 인증이나 판매 승인 완료를 의미하지 않는다.
- 승인은 상품 정보·현재 적용 승인 가격 버전의 SHA-256에 묶는다. 정보 또는 적용 가격이 달라지면 재검수가 필요하다. 가격 만료는 기존 가격 엔진과 DB 검사에서도 거절한다.
- 단순 재고 수량·일부 예시 가격·평점·수정 시각은 출시 해시에 포함하지 않는다. 실제 표시정보와 가격 승인 기록을 기준으로 한다.
- 국내와 해외를 각각 승인할 수 있고 둘 다 해제하면 신규 거래 대상에서 철회한다. 이력과 사유는 변경/삭제할 수 없다.
- **승인 상품 거래 제한은 기본 비활성**이다. 기존 가격 승인 규칙을 유지하며 관리자가 실제 검수한 상품을 최소 하나 등록하고 사유를 남겨 활성화한다.
- 활성화하면 검수 대기·변경·철회 상품의 국내 구매 버튼을 문의 안내로 대체한다. 상품 안내·RFQ 문의는 계속 가능하다.
- 신규 주문 품목 저장, PI 발행 준비와 최종 issued 전환 시 DB trigger가 최신 검수 상태를 검사한다. 해외는 견적의 출처 가격 버전도 다시 검사한다.
- 기존 접수 주문·발행 PI 조회/다운로드는 유지하고 동일 요청 키의 기존 주문 재조회는 철회 후에도 가능하다.

현재 운영 상품 53개, 승인 가격 0개, 출시 승인 0개다. 허구의 가격·수출 조건·은행 계좌·회사 정보로 승인을 생성하지 않았으며 거래 제한도 임의 활성화하지 않았다.

## 4. DB와 배포 파일

적용한 확장 마이그레이션:

1. 20261004150000_b2b_customer_mail.sql — 실제 이메일 상태·감사·SMTP 점검 및 발송 RPC.
2. 20261004153000_b2b_product_release.sql — 상품 검수·정책·감사와 신규 거래 제한.
3. 20261004160000_b2b_mail_release_hardening.sql — 검증한 발신 origin 통일·PI 최종 발행 재검사.
4. 20261004163000_b2b_release_policy_fix.sql — 정책 RPC의 레코드 별칭 충돌 수정.
5. 20261004170000_b2b_release_availability.sql — 주문/PI 레코드 분기·가격 버전 재검사·카탈로그 출시 상태.

- 새 테이블은 RLS 및 anon/authenticated 직접 접근 차단, 서버 전용 RPC를 적용했다.
- Edge Function은 JWT gateway 검증과 **service_role Bearer의 내부 비교**를 함께 적용한다. 고객/anon JWT가 gateway를 통과해도 서버 전용 요청으로 인정하지 않는다.
- 서버 API는 현재 직원 역할과 변경 요청 출처를 검사한다. 고객/직원 비밀값과 provider 응답을 사용자 오류나 로그에 출력하지 않는다.
- .env.mail.example은 비밀값 없는 예시다. 실제 .env.mail.local은 Git 제외.
- Supabase Auth 설정 조회의 smtp_pass 응답은 재사용 가능한 Gmail 앱 비밀번호가 아니었다. 원본 비밀번호는 이전에 사용자 제공한 환경 파일에서 메모리로 읽어 encrypted Edge secret에 저장했다.
- 앞으로 relay 코드·설정을 다시 배포할 때: `npm run deploy:mail -- .env.mail.local`. 관리 토큰·Gmail 앱 비밀번호·대상 Supabase URL·메일 링크 origin을 해당 비공개 파일에 명시한다. 명령은 메일을 발송하지 않는다.
- Worker 앱은 기존 GitHub main push → Cloudflare Workers Builds 자동 배포를 사용한다. **Edge Function은 별도 배포**이며 위 명령과 관리자 SMTP 점검을 함께 수행한다.

## 5. 검증 결과

- 단위/회귀: 64개 묶음 **508개 통과**. 최종 메일 응답 수정 후 관련 4개 묶음 39개 추가 재확인.
- 전체 line coverage **68.62%**. 새로운 notifications 라이브러리 line coverage 100%. 전체 80%를 달성한 것으로 표시하지 않는다.
- 실제 DB: 기존 가입·가격·CRM·PI·주문·운영·권한과 신규 메일·출시 검수 **12개 SQL 묶음 BEGIN/ROLLBACK 통과**. 실제 SMTP 호출은 하지 않았다.
- DB 확인: 상품 53, 승인 가격 0, 출시 검수 0, 실제 이메일 이벤트 0, 거래 제한 비활성. 테스트 상품 수정·시도·주문·발행 자료는 저장하지 않았다.
- hosted Edge Function: Gmail SMTP TLS·인증 HTTP 200 / SMTP_VERIFIED 확인. **실제 고객 수신 테스트는 수행하지 않았다.**
- 타입 오류 0, repository lint 오류 0 / 기존 경고 76. 서버 비밀키 없는 Next·OpenNext Worker 전체 빌드 성공.
- 브라우저 20개 주요 흐름 확인: 개발 모드에서 기존/출시 흐름 19개, 최종 운영 빌드에서 새 출시/메일 흐름 2개 재검증 성공. GitHub CI는 전체 20개를 운영 빌드로 다시 검사한다.
- 브라우저: loopback 전용 Supabase stand-in, 가짜 키/세션/거래 자료. 외부 요청 차단과 알 수 없는 API 호출 검사를 사용한다. 실제 이메일이나 운영 주문은 만들지 않는다.
- Windows에서 QA dev 서버가 Worker 출력 폴더를 사용하는 동안 첫 Worker 빌드는 EPERM 파일 잠금으로 중단됐다. QA 서버 종료 후 재실행한 전체 Worker 빌드는 성공했다. 개발 QA 캐시의 API 컴파일 오류는 생성 캐시 정리 후 운영 빌드 브라우저 검사로 검증했다.
- 운영 dependency audit 취약점 0. 커밋할 변경 파일의 실제 비밀값·토큰 패턴, CJS 구문 및 diff 공백 검사가 통과했다. 공개 프로젝트 ID는 비밀키로 분류하지 않는다.
- 원격 배포·운영 HTTP·공개 API 권한의 결과는 최종 기록에 추가한다.

## 6. 실제 오픈 전 남은 조건

1. 관리자에서 실제 출시 SKU·검수 근거·가격·MOQ·VAT·FOB·유효기간을 입력·승인한다.
2. 실제 환율·은행 계좌·PI 판매자/결제 조건, 사업자·주소·배송/반품·개인정보 기준을 확인한다.
3. 실제 운영자와 대응 목표를 지정하고 허용된 소규모 거래 범위를 정한다.
4. 허가받은 테스트 수신자에게 한 건 발송하고 수신/스팸/로그인/권한·수신 후 재시도 방지를 인수 기록으로 남긴다. SMTP 인증 성공만으로 이 검수를 대체하지 않는다.
5. 9단계 독립 DB/Auth/Storage UAT, 전체 백업 복구·앱 원복 검증은 별도로 남는다. 유료 Pro/브랜치는 생성하지 않았다.
6. 무료 운영의 제한 출시 검수와 전체 상업 오픈 판정을 구분한다.

## 7. 장애·원복

- 발송 장애는 재발송을 멈추고 /admin/mail, CRM 결과 조회와 Gmail 보낸 편지함을 대조한다. uncertain을 관리자 확인 없이 대기로 바꾸지 않는다.
- 검수 오류·상품 변경은 /admin/releases에서 해당 국내/해외 승인을 철회하고 /admin/launch에서 신규 주문/PI를 중지한다. 기존 문서·원장을 수정하거나 삭제하지 않는다.
- Worker 원복 시 구버전은 고객 이메일 UI가 없지만 새 DB 테이블은 유지한다. SMTP 기능을 끄려면 relay를 비활성화하고 새 발송을 중지한다. 이미 접수된 메일을 취소된 것으로 처리하지 않는다.
- 이미 발행한 PI·접수 주문의 보관·권한·금액 기록은 롤백 시에도 보존한다.
- destructive DB rollback은 하지 않는다. 확장 스키마를 유지하고 필요하면 새 보정 마이그레이션을 사용한다.

## 8. 다음 요청

**“11단계를 진행해 주세요. 실제 출시 SKU·가격·계좌·회사 정책과 운영 담당자를 관리자에서 검수하고, 허가한 수신자·실계정으로 제한 출시 인수 테스트와 오픈 판정표를 갱신해 주세요.”**

Pro 전환 후 독립 스테이징·복구 검증은 9단계 후속으로 이어간다. 무료 개발 환경에서 확인하지 못한 복구/독립 UAT를 완료로 표시하지 않는다.

## 공식 참고자료

- [Supabase Edge Functions 제한](https://supabase.com/docs/guides/functions/limits)
- [Supabase 무료 플랜](https://supabase.com/pricing)
- [Supabase 함수 인증](https://supabase.com/docs/guides/functions/auth)
- [Supabase 함수 배포 API](https://supabase.com/docs/reference/api/v1-deploy-a-function)
- [Supabase 함수 비밀값](https://supabase.com/docs/guides/functions/secrets)
- [Nodemailer SMTP·verify](https://nodemailer.com/smtp)
- [Nodemailer 공식 저장소](https://github.com/nodemailer/nodemailer)
- [Gmail 발송 제한](https://support.google.com/mail/answer/22839?hl=en)
