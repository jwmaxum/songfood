> 후속 배포 기록 (2026-10-03): 08e7aec의 GitHub CI와 Cloudflare 자동 배포 성공을 확인했고, 새 운영 앱 확인 후 legacy 직접 DB 접근 차단을 적용했다. 본문 중 미푸시/권한 대기 기록은 당시 이력이다. 실제 승인 SKU 기반 원격 PI 발행·다운로드 인수는 별도로 남아 있다. 현재 결과는 [배포 안내](CLOUDFLARE_GIT_DEPLOYMENT.md), [6단계 기록](B2B_06_IMPLEMENTATION.md)을 따른다.

# B2B 5단계 — Proforma Invoice 구현·검증 기록

- 단계: B2B-05 / 작업일: 2026-10-03 (Asia/Seoul)
- 개발 폴더: C:/Users/Microsoft/Projects/songfood
- 상태: **기능 구현·Supabase 적용·로컬 검증 완료. Cloudflare 원격 스테이징과 실계정 인수는 대기 중이므로 단계의 모든 완료 기준을 충족한 상태는 아니다.**
- 기준: [전체 개발계획](B2B_LAUNCH_DEVELOPMENT_PLAN.md), [4단계 RFQ·견적 초안](B2B_04_IMPLEMENTATION.md)
- 실제 판매가격·환율·송금정보를 임의 등록하거나 실제 고객 PI/이메일을 발행하지 않았다. 커밋·푸시·운영 앱 배포도 수행하지 않았다.

## 1. 작업 결과

| 작업 ID | 반영 내용 |
| --- | --- |
| B2B-05-01 | pdf-lib와 정적 한글 글꼴로 Worker 호환 PDF 생성. 실제 local workerd에서 1·28·100품목 렌더링 성공. 원격 스테이징은 토큰 권한 대기 |
| B2B-05-02 | 고객용 미리보기, 한영 PDF, 모든 페이지의 PROFORMA INVOICE 및 최종 Commercial Invoice 아님 표시 |
| B2B-05-03 | admin 발행 승인, 최신 견적·현재 승인 가격·고정 환율·유효기간·FOB 비용 포함·조정 협의 검사 |
| B2B-05-04 | 문서 번호·문의별 버전·불변 스냅샷·SHA-256·비공개 PDF 보관·개인/회사 소유권 검사 |
| B2B-05-05 | 고객 열람·PDF 다운로드·명시적 조건 수락·수정 요청·만료/대체 문서 수락 차단 |
| B2B-05-06 | 수정 사유·이전 PI 연결. 수락된 조건은 새 제안이 발행돼도 보존하고 고객이 새 버전을 수락할 때 대체 |
| B2B-05-07 | 발행 준비→PDF 저장 확인→발행 확정, 중복 요청 방지·같은 문서 재시도·활동/알림 분리 |

가입 허들은 유지한다. 개인 구매가 가능하고 회사·사업자번호는 선택이다. 기존 회사 거래문서 접근에는 활성 소속이 필요하다.

## 2. 관리자 사용 순서

1. /admin/pricing에서 실제 SKU의 가격·VAT·포장·MOQ·FOB 항구/포함비용을 검수·승인하고 유효 환율을 등록한다.
2. /admin/crm에서 해외 RFQ를 선택한다. 공급·납기·서류와 가격 조정 협의를 검토한 최신 견적 초안을 저장한다.
3. “Proforma Invoice 발행·이력”의 “판매자·결제·송금 기본정보”에 실제 확정된 법인명·주소·연락처·결제조건·송금정보를 입력한다. 예시 은행계좌를 기본값으로 넣지 않았다.
4. 구매자 거래 주소, PI 유효기간, 발행·수정 사유를 입력하고 FOB 비용 포함 확인에 체크한다. 유효기간은 PC 현지 시각으로 입력하고 PDF에는 UTC로 표시한다.
5. “발행 전 고객용 미리보기”에서 상품·CTN 수량·USD 단가/합계·항구·조건을 확인한다. 필드나 견적 버전/수정번호가 바뀌면 다시 미리보기해야 한다.
6. “확인한 PI 발행”을 누른다. 서버가 근거를 재검증하고 번호·버전을 예약한 뒤 PDF를 비공개 저장하고 해시가 일치할 때 발행을 확정한다.
7. PDF 저장 중 실패하면 “발행 재시도”로 같은 번호/버전을 복구한다. 더 이상 진행할 수 없는 준비 건은 “미발행 준비 취소” 후 새 초안을 검토한다. 취소된 번호/기록은 삭제하거나 재사용하지 않는다.
8. 발행 이력에서 보관 PDF와 SHA-256, 고객 열람/수락/수정 요청을 확인한다.

발행·설정 변경은 admin만 가능하다. inquiry_staff는 CRM의 문서와 이력을 열람할 수 있다. 미리보기는 문서 발행이 아니며 번호를 예약하지 않는다.

기존 수락 PI를 수정하려면 고객의 수정 요청을 먼저 기록해야 한다. 새 PI 발행만으로 기존 수락 조건은 바뀌지 않는다. 새 버전이 수락되면 이전 버전은 대체 상태가 되지만 기존 PDF·수락 시각은 보존된다.

## 3. 고객 사용 순서

1. 이메일 인증 후 /account의 Proforma Invoice 영역을 연다.
2. 본인 또는 활성 소속 회사의 발행 문서만 조회한다. 준비/취소된 미발행 문서는 노출하지 않는다.
3. 문서를 열어 조건을 확인하고 PDF를 다운로드한다.
4. 변경이 필요하면 사유를 10~2,000자로 입력해 수정 요청을 제출한다.
5. 조건 수락 체크박스를 직접 선택하고 “조건 수락 / Accept terms”를 누른다.
6. 이미 수락한 조건은 수정 요청만으로 취소되지 않는다. 만료·대체·수정 요청이 진행 중인 문서는 새 수락을 막는다.

PI 수락은 결제·입금·주문 확정을 의미하지 않는다. 비회원 RFQ를 같은 이메일이라는 이유만으로 회원에게 자동 연결하지 않는다. 비회원 문서는 직원이 관리하며 고객 포털 이용에는 확인된 소유관계가 필요하다.

## 4. 가격·문서 규칙

- 해외 기본 조건은 USD·FOB이며 실제 승인 가격의 선적항을 표시한다.
- EA 기준 국내 도매가와 검수된 CTN 입수, SKU VAT 설정, 고정 환율을 재사용한다.
- 국내 운송·수출통관·본선 적재 비용은 VAT 제외 도매가에 포함하며 기본가에 다시 자동 가산하지 않는다.
- 가격 조정에는 사유와 사전 협의 근거가 필요하고 변경 PI에 반영한다.
- 현재 가격 원본이 견적의 승인 스냅샷과 다르거나 만료됐으면 새 초안 검토를 요구한다.
- 계산은 정수 USD minor units로 보관하며 행 합계와 전체 합계를 검사한다.
- PI 유효기간은 발행 시각 이후이고 가격/환율 만료 이전이어야 한다.
- 발행 후 가격/환율/판매자 설정이 달라져도 보관 PDF를 재생성하거나 덮어쓰지 않는다.
- 글꼴이 지원하지 않는 문자는 명시적 오류로 처리해 이름/주소의 조용한 문자 누락을 방지한다.
- 다페이지마다 PI 제목·최종 Invoice 아님·문서/버전·쪽수를 표시한다.
- 이번 샘플 PDF는 28개 가상 품목·3페이지·USD 6,720.00이며 실제 발행이 아니다. 송금 계좌가 없고 TEST ONLY 표시를 포함한다.

## 5. DB·저장·보안

적용 파일: supabase/migrations/20261003150000_b2b_proforma.sql

| 객체 | 목적 |
| --- | --- |
| b2b_pi_settings | 판매자·결제·송금 기본정보와 수정 번호 |
| b2b_pi_documents | 번호·문의별 버전·이전 버전·스냅샷·수락/수정 상태·PDF 경로/크기/해시 |
| b2b_pi_events | 불변 발행·열람·다운로드·수락·수정 요청 이력 |
| b2b-proforma 비공개 Storage bucket | PDF 전용, 최대 10 MiB |
| pi prepare/finish/customer action RPC | 행 잠금·권한·수정 충돌·중복 키·트랜잭션 상태 변경 |

- 신규 테이블 RLS와 RPC 실행권한은 서비스 역할 전용이다. 브라우저에서 직접 변경할 수 없다.
- 공개 Storage 정책이 다른 버킷에 존재해도 이 버킷에는 적용되지 않도록 anon/authenticated 제한 정책을 추가했다.
- API마다 활성 직원 또는 고객·회사 소유권을 확인한다. 수정 요청에는 동일 출처, 본문 제한, 요청 UUID를 검사한다.
- 다운로드는 인증된 API를 경유하고 저장된 SHA-256·길이를 다시 확인한다. 응답은 private/no-store·attachment·nosniff다. 공개 URL이나 장기 다운로드 토큰을 발급하지 않는다.
- 고객 응답은 허용 필드만 구성한다. 내부 견적 검토 메모, 원가/가격 출처, 직원 ID, 저장 경로, 서버 키를 포함하지 않는다.
- 발행은 관리자별 시간당 20회로 제한한다. 문의 행 잠금·고유키로 동시 예약을 제어한다.
- 같은 요청 키와 본문은 같은 문서를 반환한다. 동일 키에 다른 내용이면 충돌로 처리한다.
- 저장은 upsert:false이며 저장 응답 유실 시 이미 저장된 바이트가 같은 해시인지 확인한 후 발행을 복구한다.
- 발행 준비와 확정 사이에도 활성 구매자/회사 소속, 최신 견적, 가격/환율 유효성을 검사한다.
- 문서 번호는 PG sequence이므로 롤백/취소로 결번이 생길 수 있다. 결번을 재사용하지 않는다.
- 발행·수락·수정 요청의 공개 활동과 내부 알림 대기열을 함께 기록한다. 알림 전달 실패가 PDF 발행을 되돌리거나 새 번호를 만들지 않는다.
- 알림은 4단계 내부 테스트 수신함에 연결돼 있다. 실제 거래 이메일 자동 발송은 아직 연결하지 않았으며 Supabase 회원 인증 SMTP와 구분한다.

적용 후 확인: 실제 PI 0건, 승인 가격 0건, 환율 0건, bucket public=false. 실제 사용 데이터는 만들지 않았다. Storage 검증은 가상 PDF 한 건만 올리고 검증 후 해당 객체만 삭제했다.

## 6. 검증 결과

| 검사 | 결과·범위 |
| --- | --- |
| 전체 Jest | PASS: **45개 묶음·322개 테스트**, 4단계 288개에서 34개 추가 |
| PI 핵심 커버리지 | validation/pdf/types 대상 문장 99%, 분기 84.93%, 함수/줄 100%. 저장소 전체 커버리지는 아님 |
| 타입·범위 린트 | PASS: TypeScript, lint:pi, lint:crm, lint:b2b 및 환경/스키마 표식 |
| 전체 저장소 린트 | FAIL: 오류 130건·경고 92건. 기존 전역 품질 과제로 출시 전 정리 필요 |
| 빌드 | Next.js 최적화 및 OpenNext Cloudflare Worker 번들 생성 성공. Windows 지원 경고 존재 |
| Supabase SQL | 권한/RLS·중복/다른 본문 충돌·동시 준비·불변성·재시도·다른 고객/회사 접근·만료·수락 보존·수정 대체 검사 후 ROLLBACK |
| 실제 Storage | 비공개 업로드, 덮어쓰기 거부, SHA 검증, 공개 URL 접근 거부(400) 확인 후 가상 객체 제거 |
| PDF | 28품목 3페이지 렌더링·한글/영문·제목 반복·쪽수·합계 및 PNG 육안 검사 통과. 동일 입력의 동일 바이트 생성과 미지원 문자 오류 테스트 |
| 브라우저 | Edge 1440px/390px, 비로그인 API 차단, 고객 열람/동의/수정/다운로드, 관리자 미리보기/저장 실패/같은 문서 재시도/이력 검증. 페이지 오류·전체 가로 넘침 없음 |
| 브라우저 한계 | 고객 응답은 fixture, 관리자는 실제 PiPanel의 격리 번들. 실제 직원·고객 계정과 승인 상품을 이용한 통합 인수는 별도 |
| local workerd | 실제 PDF 렌더러·ASSETS 글꼴로 1/28/100품목 HTTP 200, 약 0.75~0.77 MB. 관측 경과시간 약 1.1~1.5초로 클라우드 CPU 측정값이 아님 |
| 원격 Cloudflare | 대기: 토큰 active 확인, Workers API HTTP 401 / code 10000. 원격 Worker 생성·앱 배포를 하지 않음 |
| 의존성 감사 | npm audit: 기존 영향 패키지 12개(high 10, moderate 2). 추가한 PDF 패키지 관련 보고는 없었음. 기존 xlsx·도구 의존성 등을 출시 전 수정/교체 검토하며 자동 대량 업데이트는 하지 않음 |
| 보안·변경 검토 | 소스/문서 393개·공개 JS 번들 47개에서 설정된 서버 비밀값 노출 0건, env/cache Git 제외, git diff --check 통과. 전체 저장소 보안 인증을 뜻하지 않음 |

전체 판정: **5단계 구현·범위 검증 PASS / 원격 스테이징 완료 기준 및 실거래 인수 대기 / 사이트 출시 승인 대기**.

SQL 재현 파일은 supabase/tests/b2b_proforma.sql이다. 테스트 DB에서 BEGIN → 검사 → ROLLBACK으로 실행한다. 서비스 DB에 fixture를 커밋하지 않는다. 개발 검증 증거는 Git 제외 .npm-cache/b2b-phase5에 보관한다.

로컬 개발 서버를 http://127.0.0.1:3000에서 재시작했다. /account HTTP 200, 비로그인 PI 목록/다운로드 401, 관리자 PI 403을 최종 확인했다.

## 7. Cloudflare 남은 확인

**2026-10-03 사용자 후속 지시:** GitHub push → 기존 song-food Worker의 Cloudflare Workers Builds 자동 배포로 전환한다. 별도 테스트 Worker를 로컬에서 직접 배포하는 아래 절차는 이전 계획이다. 앞으로 [Git 연동 배포 안내](CLOUDFLARE_GIT_DEPLOYMENT.md)의 설정과 배포 성공 커밋을 기준으로 원격 검증한다.


1. C:/Users/Microsoft/Projects/.env.local의 CLOUDFLARE_ACCOUNT_ID와 CLOUDFLARE_API_TOKEN을 사용한다. 값을 소스/문서/채팅에 복사하지 않는다.
2. 전달된 토큰의 활성 여부는 확인됐으나 Workers 접근은 거절됐다. 이 응답만으로 토큰의 전체 권한 범위를 단정하지 않는다.
3. 계정 소유 토큰의 새 권한 모델에서는 **Workers 제품 범위 Admin**이 새 Worker 생성에 필요하다. 기존 Worker의 배포는 해당 Worker Editor로 가능하다. 기존 토큰 권한 UI에서는 Workers Scripts 편집을 확인한다. R2 Access Key/Secret Key는 PDF의 Supabase 저장에 필요하지 않다.
4. 별도 이름 songfood-pi-stage5-20261003의 테스트 Worker가 존재하지 않는지 먼저 확인한다. 가상 자료와 글꼴만 사용해 배포하고 1/28/100품목 PDF 생성·다운로드·내용 및 실제 CPU/메모리 한도를 검증한다.
5. 테스트용 Worker는 검증 후 정리하고 그 결과를 이 문서에 기록한다. 현재 저장된 앱 배포 명령을 무심코 실행해 운영 앱을 덮어쓰지 않는다.
6. Cloudflare Free 10ms CPU 한도를 로컬 성공으로 충족했다고 판단하지 않는다. 실제 요금제/사용량에 맞춰 PDF 작업 한도 또는 실행 구조를 확정해야 한다.
7. 채팅에 공유된 토큰과 R2 비밀키는 재발급·교체하는 것을 권장한다. 이번에는 R2 비밀키를 저장하거나 사용하지 않았다.

참고: [Workers 권한](https://developers.cloudflare.com/workers/authorization/), [API 권한 목록](https://developers.cloudflare.com/fundamentals/api/reference/permissions/), [Workers 한도](https://developers.cloudflare.com/workers/platform/limits/).

## 8. 변경 위치·재현

- src/lib/pi: 검증·PDF·글꼴·서버 저장/발행·공개 타입
- src/app/admin/crm/PiPanel.tsx: 판매자 설정·미리보기·발행·복구·이력
- src/components/pi: 고객 문서·수락·수정 요청
- src/app/api/admin/crm/[id]/pi, src/app/api/admin/pi, src/app/api/account/pi: 권한 API
- public/fonts: 공식 Nanum Gothic TTF와 OFL 라이선스
- src/__tests__/b2b-pi*: 도메인·PDF·API·UI 회귀 검사
- .github/workflows/deploy.yml: PI 범위 린트 추가. scripts/check-b2b-env.cjs: 5단계 DB 표식 확인
- output/pdf/songfood-proforma-sample.pdf: 가상 출력 샘플

~~~powershell
Set-Location 'C:/Users/Microsoft/Projects/songfood'
./npm-local.cmd run lint:pi
./npm-local.cmd run lint:crm
./npm-local.cmd run lint:b2b
./npm-local.cmd run typecheck
./npm-local.cmd test -- --runInBand
./npm-local.cmd run check:b2b-env
# 개발 서버를 중지한 뒤
./npm-local.cmd run build:worker
./npm-local.cmd run dev -- --hostname 127.0.0.1
~~~

신규 SQL은 기존 자료를 유지하는 추가형이다. 오류 시 앱 버전을 되돌리고 이미 생성된 문서/이력/PDF는 보존한다. 자동 DROP이나 전체 git reset을 사용하지 않는다. 이전 단계 미커밋 작업이 있으므로 .npm-cache/b2b-phase5/before와 이번 파일을 비교한다.

기존 20260930_b2b_legacy_access_lockdown.sql은 이번에도 원격 적용하지 않았다. 새 운영 앱 전환 시점에 기존 직접 접근 권한과 함께 전환해야 한다.

## 9. 다음 단계 요청

기능 개발은 **6단계 국내 주문·입금·출고·재주문**으로 이어갈 수 있다. 5단계 원격 검증은 출시 전 필수 미완료 항목으로 유지한다.

> B2B 개발계획의 6단계를 진행해 주세요. 개인과 사업자가 사용할 수 있는 국내 주문 요청·직원 확정·입금 확인·출고·재주문을 실제 DB에 연결해 주세요. 사업자번호 선택 정책과 현재 승인 가격 재검증을 유지해 주세요.

실판매 시작 전에는 실제 SKU/환율 승인, 판매자·송금정보 입력, 실제 직원·개인·회사 계정 인수, 전체 lint·기존 의존성 보안 문제 정리, 기존 권한 전환, Worker 스테이징과 운영 배포가 필요하다.

## 10. 구현 선택 근거

pdf-lib 1.17.1과 @pdf-lib/fontkit 1.1.1을 고정했다. 오래된 배포 버전이므로 최근 유지보수를 보장한다고 표현하지 않으며 이후 의존성 점검에 포함한다. Node 전용 PDF 실행기나 외부 PDF 전송 서비스는 추가하지 않았다.

Nanum Gothic은 공식 Google Fonts 배포본과 OFL을 함께 보관한다. 이 글꼴의 subset 출력에서 시각적 문자 누락을 확인해 전체 임베딩을 사용했다. 서버에서 결정적인 바이트를 생성하고 원본 저장소의 해시를 대조한다.

- [pdf-lib 공식 저장소](https://github.com/Hopding/pdf-lib)
- [Nanum Gothic 배포본](https://github.com/google/fonts/blob/main/ofl/nanumgothic/NanumGothic-Regular.ttf)
- [OFL 라이선스](https://github.com/google/fonts/blob/main/ofl/nanumgothic/OFL.txt)
- [OpenNext bindings](https://opennext.js.org/cloudflare/bindings)
- [Cloudflare ASSETS binding](https://developers.cloudflare.com/workers/static-assets/binding/)
- [Supabase 표준 업로드](https://supabase.com/docs/guides/storage/uploads/standard-uploads)
- [Supabase 비공개 다운로드](https://supabase.com/docs/guides/storage/serving/downloads)
