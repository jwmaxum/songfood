# B2B 3단계 — 고객 구매·RFQ UI/UX 구현 기록

- 단계: B2B-03 / B2B UI·UX와 기업 마이페이지
- 작업일: 2026-10-03 (Asia/Seoul)
- 개발 폴더: C:/Users/Microsoft/Projects/songfood
- 상태: **화면·기능 구현 및 개발 검증 완료. 실제 승인 가격·회원 통합 인수와 운영 배포 대기.**
- 기준: [전체 개발계획](B2B_LAUNCH_DEVELOPMENT_PLAN.md), [1단계](B2B_01_IMPLEMENTATION.md), [2단계](B2B_02_IMPLEMENTATION.md)
- 신규 패키지·DB 마이그레이션 없음. 실제 상품·가격 변경, 문의 제출, 메일 발송, 커밋·푸시·배포 없음.

## 1. 구현 결과

| 작업 ID | 반영한 내용 | 사용 경로 |
| --- | --- | --- |
| B2B-03-01 | 국내 도매·개인 대용량 구매와 해외 바이어의 첫 진입을 분리. 공통 메뉴·모바일 메뉴·본문 바로가기. 근거 없는 할인·VIP·24시간 배송 표현 제거 | /, 공통 헤더·푸터 |
| B2B-03-02 | SKU/국문/영문/브랜드 검색, 브랜드·카테고리·보관온도·등록 대상국·최소구매단위/수량 필터, 12개 단위 페이지, 목록/카드, 빠른 수량 담기 | /shop, /collections |
| B2B-03-03 | 규격·원재료·알레르기·보관·납기·포장 환산·최소구매·세금 구분·수출 자료 표시. 미확정 값은 확인 필요로 표시 | /products/[id] |
| B2B-03-04 | 국내 EA/BOX/CTN 구매함과 해외 CTN 견적함 분리, 상품·수량 보존, 상세 구매 문의에 선택 상품 전달 | /cart, /rfq, /wholesale |
| B2B-03-05 | 실제 접수 API 기반 국내 문의/RFQ 내역·상태·품목·접수번호, 관심상품, 선택 회사·소속 담당자 기능 유지 | /account |
| B2B-03-06 | FOB 기본값 일치, 포함 비용·사전 협의 후 조정 안내, 가격 미리보기/RFQ 접수/PI/최종 Commercial Invoice 구분 | 상품 상세, RFQ, 계정 |
| B2B-03-07 | 목록·상세 로딩/오류·재시도, 빈 검색/구매함/계정, 미승인·만료 가격 안내, 문의 실패 입력 유지, 키보드 및 390px 모바일 | 주요 구매 경로 |

국내 주문·배송·PI·거래서류 다운로드는 각각 후속 5·6단계의 실제 데이터가 필요하므로 준비 상태로 표시한다. 예시 주문이나 가짜 PI를 생성하지 않는다.

## 2. 이용 방법

### 국내 구매

1. 홈의 국내 상품 또는 /shop에서 SKU·상품명·브랜드를 검색한다.
2. 상세 필터에서 최소구매단위 EA/BOX/CTN을 선택하면 해당 단위의 최소수량 상한을 비교할 수 있다. 서로 다른 단위를 같은 숫자로 비교하지 않는다.
3. 상품의 최소 구매 정보를 보고 단위·수량을 정해 구매함에 담는다. 목록에서는 여러 품목을 연속으로 담을 수 있다.
4. /cart에서 선택 단위의 단가, EA 환산, 서버의 공급가액·VAT·합계를 확인한다. 미승인 가격, 최소수량 위반, 만료 등의 상태에서는 확정 금액을 만들지 않는다.
5. 구매 문의로 이동하면 SKU·상품명·단위·수량이 함께 전달된다. 상품 상세의 구매 문의도 선택을 구매함에 추가한 후 이동한다.
6. 개인도 회사명·사업자번호 없이 연락처를 입력해 문의할 수 있다. 로그인 후 제출한 문의는 마이페이지에 연결된다.

담기는 공급 조건 확인을 위한 선택이며 주문·결제가 아니다. 미확정 상품이나 최소수량 미달 요청도 담당자에게 문의할 수 있지만 자동 가격 미리보기는 서버 기준을 통과해야 한다.

### 해외 바이어

1. 홈의 Export 또는 /shop?mode=export에서 상품을 선택한다.
2. 수량은 CTN으로 입력하며 검수된 Export MOQ가 있으면 표시한다.
3. /rfq에서 여러 상품의 카톤 수량, 목적지, 연락처, 요구 서류·납기를 확인한다.
4. 기본 Incoterms는 FOB다. FOB 가격 확인은 기존 서버 가격 서비스를 호출한다. 다른 인도조건은 개별 검토 안내로 전환한다.
5. 국내 운송·수출통관·본선 적재 비용은 VAT 제외 도매가에 포함한다. 자동 재가산하지 않는다. 조정은 사전 협의가 필요하다는 안내를 유지한다.
6. 제출 성공은 API가 반환한 접수번호로만 표시한다. RFQ 접수 자체는 PI나 주문 확정이 아니다.

실제 발행 문서는 후속 5단계에서 Proforma Invoice로 구현한다. 최종 Commercial Invoice와 혼동하지 않도록 현재 화면에도 구분 문구를 표시한다.

### 관리자 최소구매 관리

2단계 /admin/pricing 및 상품별 가격·최소구매 링크를 그대로 사용한다. 최소구매단위·수량, 입수, 세금, 가격, Export MOQ, 선적항을 검수하여 가격 버전을 승인하면 고객 화면에서 해당 정보를 사용한다.

가입에 관리자 승인을 추가하지 않았다. 개인·사업자 모두 이메일 인증 후 이용하고 회사 등록·사업자번호는 선택이다. 회사 자료 공유를 위한 기존 소속 권한은 유지한다.

## 3. 저장과 데이터 원칙

- RFQ 브라우저 저장 키: songfood_rfq_v1. 상품 ID와 양의 정수 수량만 보관한다. 최대 100개 품목, 품목당 100,000 CTN이다.
- RFQ 연락처·회사·목적지·요청 내용은 메모리에만 보관한다. 앱 안에서 이동 후 돌아오면 유지되지만 새로고침·탭 종료 시 재입력한다. 계정이 바뀌면 이전 계정의 입력을 표시하지 않는다.
- 국내 구매함의 기존 anatolia_cart 저장을 유지한다. 저장된 가격을 결제 근거로 사용하지 않으며 서버에서 다시 계산한다.
- 구매함·RFQ는 이 브라우저의 선택 자료다. 계정 간/다른 PC 동기화는 아직 없다. 브라우저 저장을 허용하지 않으면 현재 화면 세션에서만 사용할 수 있다.
- RFQ의 기존 ?product= 및 ?products= 링크를 계속 지원한다. 이미 선택한 품목의 수량을 링크 이동이 덮어쓰지 않는다.
- 실제 상품 API는 공개용 필드만 반환한다. 도매가·수출가·기존 소비자가·재고 숫자는 익명 응답에서 제외한다.
- 마이페이지는 기존 /api/account/inquiries의 본인/활성 소속 회사 권한을 재사용한다. 최근 최대 100건이며 비회원 접수는 이메일만으로 자동 연결하지 않는다.
- 국내 선택 상품은 기존 문의 notes에 전달한다. 정형 주문 품목·견적 버전 연결은 4·6단계에서 확장한다.

## 4. 설계 선택과 적용 범위

- URL 쿼리에 검색·필터·페이지·목록 형태·국내/해외 모드를 둔다. Next.js에서 지원하는 history API를 사용해 뒤로 가기와 화면 상태를 맞춘다.
- 현재 카탈로그 규모에 맞춰 서버가 공개 상품을 가져오고 브라우저에서 검색·12개씩 표시한다. DB에 매번 12개를 요청하는 방식은 아니다.
- Supabase 상품 및 공개 최소구매 조회는 500개씩 안정된 순서로 읽어 단일 응답 제한에 따른 누락을 줄였다. 상품이 대규모로 늘면 서버 검색/페이지 API와 캐시를 도입한다.
- 국내 장바구니는 네이티브 dialog를 사용해 초점 이동, Escape 닫기, 모달 내부 키보드 이동을 지원한다.
- 신규 의존성 없이 기존 Context, 가격 API, Supabase 접수 API, Next.js 기능을 재사용했다.
- 기존 홈 히어로·딜 CMS 자료는 삭제하지 않았다. 새 홈은 B2B 구매 동선 중심의 고정 레이아웃을 사용한다. 홈 편집 메뉴와 새 레이아웃의 운영 연결 정리는 7단계에서 다룬다.
- 핵심 해외 CTA·RFQ 입력은 영어/한국어를 제공한다. 모든 상품 설명·메뉴·오류의 완전한 다국어 번역은 8단계 검수 대상이다.
- 등록 대상국/인증 필터는 등록 정보 탐색이다. 수출 적합성, 실제 인증서 발급 또는 통관 승인을 보증하지 않는다.

읽은 기준: 설치된 Next.js의 Server and Client Components / Linking and Navigating 문서. search-first, security-review, verification-loop 스킬을 적용했다. URL 상태용 nuqs도 조사했으나 현재 범위는 기본 기능으로 해결하여 추가하지 않았다.

참고: [Next.js navigation](https://nextjs.org/docs/app/getting-started/linking-and-navigating), [nuqs](https://github.com/47ng/nuqs).

## 5. 검증 결과

| 검사 | 결과 | 범위·한계 |
| --- | --- | --- |
| Next.js / Cloudflare Worker 빌드 | PASS | 컴파일·타입·페이지 생성·번들. 배포 실행 아님 |
| 타입 검사 | PASS — 오류 0 | 타입 생성·tsc 검사 및 최종 Next 빌드 TypeScript |
| lint:b2b / lint:pricing / lint:storefront | PASS — 오류 0 / 이미지 최적화 권고 5 | 변경 영역과 1·2단계 경계 회귀 |
| 전체 Jest | PASS — 37개 묶음 / 249개 테스트 | 기존 테스트 + 검색/저장/개인정보 분리/상세 구매 문의 |
| 신규 도메인 커버리지 | Statements 89.60%, Branches 90.69%, Functions 85.29%, Lines 98.61% | src/lib/storefront.ts와 src/context/RFQContext.tsx 두 파일만 측정. 전체 프로젝트 커버리지가 아님 |
| 실제 API 조회 | PASS | 공개 상품 53개, 비공개 금액/재고 제외, 비로그인 계정 API 401 |
| 브라우저 흐름 | PASS — 18개 경로·흐름 확인 | 데스크톱 1440px, 모바일 390px, JavaScript pageerror 0 |
| 비밀키·로그·diff 점검 | PASS — 신규 노출·공백 오류 없음 | 38개 코드/설정 파일 검토, .env.local Git 제외, 클라이언트 번들에 실제 서버 키 없음 |
| 전체 저장소 lint | FAIL — 오류 130 / 경고 91 | 기존 관리자 CMS·라벨·스크립트 등. 이번 범위 통과와 별개 |

브라우저에서 확인한 내용:

- 실제 공개 상품 SKU 검색, 12개 페이지 이동, 브라우저 뒤로 가기, 필터 URL 동기화.
- 국내 BOX 2와 해외 CTN MOQ 3의 서로 다른 단위 기본값.
- 두 페이지에서 선택한 RFQ 두 품목과 수량이 이동·뒤로 가기·새로고침 후 유지.
- FOB 미리보기, 실패 후 재시도 가능한 입력 상태, 상세 구매 문의의 상품 전달.
- 회사/사업자번호 선택 입력, 계정 문의 상태·필터·빈 내역.
- 국내 구매함 모달 Escape 닫기, 모바일 메뉴 이동 후 닫힘.
- 홈·목록·상세·구매함·RFQ·국내 문의·계정의 390px 너비. 페이지와 주요 버튼·입력·제목의 수평 경계를 검사하고 화면을 확인.

가격이 있는 정상 상태와 계정 내역·문의 제출 응답은 별도 브라우저의 모의 응답으로 검증했다. 실제 승인 가격을 생성하거나 실제 고객 계정으로 문의를 제출한 검증은 아니다. 실제 회원 이메일 인증은 1단계 사용자 확인 기록을 유지하며 이번 단계에서 다시 메일을 보내지 않았다.

브라우저 스크립트·JSON·스크린샷은 로컬 .npm-cache/b2b-phase3/에 있다. 캐시 파일은 Git에 포함되지 않는다. 지속 실행하는 브라우저 CI 및 실제 계정 인수는 8단계에서 정식 구성한다.

OpenNext는 Windows에서 완전한 호환을 보장하지 않는 경고를 출력한다. 로컬 빌드 결과가 운영 Worker 런타임 검증을 대신하지 않는다.

검증 종합: 이번 단계 변경은 개발 검증을 통과했다. 저장소 전체 출시 준비 판정은 **NOT READY**다. 기존 전체 lint 오류, 실제 가격·회원 인수, 후속 거래 기능과 운영 배포가 남아 있다.

## 6. 주요 변경 파일

- 홈·레이아웃: src/app/page.tsx, src/app/layout.tsx, src/app/globals.css, src/components/layout/HeaderClient.tsx, FooterClient.tsx
- 목록·상세: src/app/collections/CollectionShowcaseClient.tsx, src/app/products/[id]/ProductDetailClient.tsx 및 page.tsx, 각 loading/error 경로
- 구매·RFQ: src/context/RFQContext.tsx, src/lib/storefront.ts, src/app/rfq/page.tsx, src/app/wholesale/page.tsx, src/components/storefront/ExportSelection.tsx
- 계정: src/app/account/page.tsx, src/components/storefront/AccountActivity.tsx
- 공통 가격·구매함: src/components/pricing/ProductPrice.tsx, src/components/cart, src/context/CartContext.tsx, src/components/providers/AppProviders.tsx
- 서버 조회: src/lib/products-db.ts, src/lib/pricing/repository.ts, engine.ts, types.ts
- 회귀 테스트: src/__tests__/b2b-storefront.test.ts, b2b-storefront-rfq.test.tsx, b2b-storefront-purchase.test.tsx
- 검사 설정: package.json의 lint:storefront, .github/workflows/deploy.yml

이전 1·2단계의 미커밋 변경을 보존했다. 이전 변경까지 포함된 전체 git diff를 이번 3단계 단독 변경으로 취급하면 안 된다. 수정 전 사본과 단계별 파일 목록은 로컬 .npm-cache/b2b-phase3/before 및 manifest.json을 참고한다.

## 7. 실행·재검증

~~~powershell
Set-Location 'C:/Users/Microsoft/Projects/songfood'
./npm-local.cmd run dev -- --hostname 127.0.0.1
~~~

다른 터미널에서:

~~~powershell
./npm-local.cmd run typecheck
./npm-local.cmd run lint:b2b
./npm-local.cmd run lint:pricing
./npm-local.cmd run lint:storefront
./npm-local.cmd test -- --runInBand
./npm-local.cmd run check:b2b-env
~~~

배포 빌드를 확인할 때는 개발 서버를 중지한 뒤 ./npm-local.cmd run build:worker를 실행한다. 빌드 후 개발 서버를 재시작한다.

개발 서버가 이전 라우트 캐시 때문에 새 계정 API를 404로 인식한 경우, 서버를 중지하고 프로젝트 내부 .next/dev를 별도 캐시 경로로 옮긴 후 재시작해 복구했다. 인증 권한 검사를 우회하는 수정은 하지 않았다.

## 8. 출시 전 남은 일과 다음 단계

1. **실제 SKU 검수:** 가격의 VAT 포함/별도, 과세/면세, 포장 입수, 국내 최소단위·수량, 수출 MOQ, 선적항, 가격/환율 유효기간을 운영자가 승인해야 한다. 2단계의 53개 초안·승인 0건 기록을 이번 작업에서 임의 변경하지 않았다.
2. **실제 계정 인수:** 승인한 테스트 SKU와 실제 개인/회사 계정으로 가격·최소수량·접수·마이페이지 권한을 통합 확인한다. 운영 문의를 만들 수 있는 실접수 검증은 별도 대상과 정리 방법을 정해 수행한다.
3. **4단계:** 중복 접수 방지, 필드별 오류, 담당자 배정·내부 메모·활동 이력, 가격/환율/FOB 조건을 고정한 견적 초안 연결.
4. **5·6단계:** Proforma Invoice 버전·PDF·전달 및 실제 국내 주문·입금·배송.
5. **7·8·9단계:** 관리자 운영 메뉴 정리, 전체 lint 잔여 오류·다국어·상품 실자료 검수, Worker 운영 인수·배포·모니터링.
6. 기존 운영 브라우저 직접 DB 접근 차단 마이그레이션 20260930_b2b_legacy_access_lockdown.sql은 새 앱 배포와 함께 전환해야 한다. 이번 단계에서 원격 적용하지 않았다.

다음 요청 문장:

> B2B 개발계획의 4단계를 진행해 주세요. 3단계의 구매함·RFQ·계정 화면을 기반으로 중복 접수 방지와 관리자 CRM·견적 초안을 연결해 주세요.
