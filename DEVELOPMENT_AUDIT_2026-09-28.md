# 송영민푸드 사이트 개발 현황 및 개선 일정

> 상품 카탈로그는 이 평가 이후 2026-09-28에 45개 원본과 시연 상품 8개를 포함한 53개로 정비했다. 최신 분류·DB 반영·후속 일정은 [제품 카탈로그 정비 결과](PRODUCT_CATALOG_AUDIT_2026-09-28.md)를 참조한다.

- 평가일: 2026-09-28 (KST)
- 평가 기준: 현재 로컬 작업 트리. `src/lib/i18n/dictionaries.ts`, 장바구니·결제·헤더·푸터 등에 기존 미커밋 변경이 있으며 본 평가는 그 변경을 포함한다. 기존 변경은 수정하지 않았다.
- 범위: 소스·설정·정적 빌드 결과·테스트·lint·로컬 브라우저에서 확인한 홈/회사 소개와 언어 전환. 실제 운영 인프라, 결제사 계정, Supabase 권한, 법규 적합성, 상품·인증 증빙은 검증하지 않았다.

## 1. 종합 평가

**초기 평가 시점: 화면과 도메인 로직이 풍부한 시연용 프로토타입.** 아래 표는 개선 전 발견 사항의 기록이다. 2026-09-28 후속 작업에서 정적 export를 Worker 서버 빌드로 바꾸고, 관리자 인증 및 해외 RFQ·국내 도매 접수의 Supabase 저장을 구현했다. Worker 운영 주소에 배포했고 기존 Pages 주소는 그곳으로 이동한다. 주문·결제 운영, 견적 승인·회신 및 다국어 전체 검수도 남아 있다. 최신 반영 상태는 `DEPLOYMENT_SECURITY_REPORT_2026-09-28.md`를 참조한다. 기존 `PROJECT_DEVELOPMENT_SUMMARY.md`의 “개발 완료”, “7개 국어 완벽 구현” 평가는 현 코드와 맞지 않는다.

| 영역 | 현재 확인한 상태 | 출시 판단 |
| --- | --- | --- |
| 화면·상품 탐색 | 홈, 상품, RFQ, 국내 도매, 관리자, 라벨 스튜디오 화면 존재. `data/products.json` 45건, 메뉴 19건, 저널 3건을 확인. | 시연 가능. 실제 상품·가격·재고·이미지·인증 자료 검증 필요. |
| 해외 RFQ | 품목·수량·CBM·환율 기반 견적 화면과 출력 흐름 존재. 제출 시 React 상태에만 견적을 생성하고 관리자 CRM은 별도 예시 리드를 사용. | 실제 리드 접수/후속 영업 불가. |
| 국내 도매 | 신청 양식과 제출 완료 UI 존재. 제출 함수가 서버 저장 없이 `submitted`만 변경. | 실제 접수 불가. |
| 국내 주문·결제 | 장바구니·주문 UI 존재. 브라우저에서 임의 결제키를 만들고 주문을 즉시 `PAID` 처리. 성공 페이지는 URL 값만으로 승인 문구 표시. | 실제 결제/출고에 사용 금지. |
| 관리자·CMS | 상품·메뉴·히어로·라벨 등 화면과 일부 DB/API 구현 존재. 관리자 PIN은 클라이언트에 있고 다수 쓰기 API에 서버 권한 검사가 보이지 않음. | 권한 체계와 운영 저장소 정비 필요. |
| 수출 라벨/OEM | 국가별 라벨 규칙·성분 사전 및 관련 테스트 존재. OEM은 홍보 문구와 RFQ 선택지만 확인. | 라벨은 전문가 검수 필요. OEM 제품 기획·승인·출시 워크플로 미구현. |
| 문구·브랜드 | `/about`와 홈 일부 섹션에 과거 Anatolia/이탈리아 식품 문구가 남음. 인증·물류·규제 “100%” 주장도 증빙 여부 미확인. | 공개 전 전수 정리 필요. |

### 검증 결과

- `npm run build`: 성공. 218개 정적 페이지 생성. 빌드가 **정적 export에서는 API 라우트와 middleware/Proxy가 비활성화**된다고 경고함. `out/api`에는 정적 GET 산출물 3개만 확인됨.
- `npm test -- --runInBand`: 23개 스위트, 176개 테스트 모두 통과. 테스트는 주로 라벨·규칙 엔진이며 실주문/RFQ·전체 사이트 다국어 E2E의 증거는 아님.
- `npm run lint`: 실패, 오류 125건·경고 147건. React effect·순수성 규칙, `any`, 미사용 코드 등이 포함됨.
- 로컬 브라우저: `ko`에서 `en`, `ja`, `zh`, `ar`로 전환 시 헤더·푸터 번역은 바뀜. `ar`에서 RTL 전환 확인. 홈 핵심 문구·상품명은 변경되지 않았고 `/about` 본문·SEO 제목은 Anatolia 영어 내용 그대로 노출됨. 페이지 이동 후 저장 언어는 클라이언트 하이드레이션 뒤 다시 적용됨.
- `npm run dev`: 페이지 접근은 가능했으나 `Middleware cannot be used with "output: export"` 오류 출력.

## 2. 수정 사항: 우선순위와 근거

| 우선순위 | 항목 | 근거 | 필요한 수정과 완료 기준 |
| --- | --- | --- | --- |
| P0 | 배포 아키텍처 불일치 | [`next.config.ts`](next.config.ts) `output: "export"`, [`wrangler.toml`](wrangler.toml) `out` 배포. [`src/proxy.ts`](src/proxy.ts), [`src/app/api/products/route.ts`](src/app/api/products/route.ts), [`src/app/api/contact/route.ts`](src/app/api/contact/route.ts) 등 런타임 기능과 충돌. | 권고안은 `output: "export"`를 제거하고 Next 서버/API 지원 환경에 배포하는 것. 정적 호스팅을 유지할 경우 모든 쓰기/인증/결제를 별도 서버로 분리. `POST /api/contact`, 상품 관리, 관리자 접근을 실제 배포 환경에서 통합 테스트. |
| P0 | 관리자 인증·쓰기 API 보호 | [`src/app/admin/layout.tsx`](src/app/admin/layout.tsx) 25~26, 48, 90~91: 고정 ID/PIN과 브라우저 세션. [`src/proxy.ts`](src/proxy.ts)는 쿠키가 없어도 통과. 상품·메뉴 등 API에 관리자 검증이 없음. | 서버 인증, 역할별 권한, 모든 쓰기 API 인가, 감사 로그 적용. 비로그인 요청과 역할 밖 요청이 401/403인지 검증. 예시 PIN 제거. |
| P0 | 결제·주문 상태 허위 성공 | [`src/app/checkout/page.tsx`](src/app/checkout/page.tsx) 92~123, [`src/app/checkout/success/page.tsx`](src/app/checkout/success/page.tsx) 13~39, [`src/app/api/payments/confirm/route.ts`](src/app/api/payments/confirm/route.ts) 47~77. 결제 실패/네트워크 오류도 모의 성공 응답 가능. | 실제 결제사 승인 확인 후 서버에 주문·금액·상태 기록. 실패는 실패로 표시. 웹훅 검증·중복 처리·재고/취소 흐름 테스트. 완료 전 결제 버튼/승인 문구를 시연용으로 명시하거나 공개 차단. |
| P0 | 접수 실패를 성공으로 표시 | [`src/app/contact/page.tsx`](src/app/contact/page.tsx) 43~45, [`src/app/api/contact/route.ts`](src/app/api/contact/route.ts) 18, 64: 오류 시 성공 UI, 서버 메모리에만 문의 저장. | 영속 DB에 접수 후 서버 확인 응답을 받은 경우에만 완료 표시. 실패 시 재시도 안내. 관리자에서 신규 문의 조회까지 검증. |
| P1 | RFQ·도매·CRM 단절 | [`src/app/rfq/page.tsx`](src/app/rfq/page.tsx) 331~363, [`src/app/wholesale/page.tsx`](src/app/wholesale/page.tsx) 21~24, [`src/app/admin/crm/page.tsx`](src/app/admin/crm/page.tsx) 8, 75. | 해외 RFQ/국내 도매 신청을 서버에 저장하고 담당자 상태 관리·알림·견적 승인·이력 연결. 사용자 제출 → CRM 확인 → 상태 변경 → 고객 회신을 E2E 검증. |
| P1 | 데이터·가격·계정 신뢰성 | [`src/context/AuthContext.tsx`](src/context/AuthContext.tsx) 예시 계정/주문 및 localStorage 사용, [`src/app/admin/orders/page.tsx`](src/app/admin/orders/page.tsx) 예시 주문, [`src/app/rfq/page.tsx`](src/app/rfq/page.tsx) 기본 환율·가격 대체값. | 예시 데이터와 운영 데이터를 명확히 분리. 재고·가격·환율 출처와 갱신 주기, 견적 유효기간·승인 주체를 정의하고 서버 기준으로 계산. |
| P1 | 브랜드·연락처·인증 주장 정리 | [`src/app/about/page.tsx`](src/app/about/page.tsx) 8~9, 68; [`src/components/home/FreshToday.tsx`](src/components/home/FreshToday.tsx), [`src/components/home/PartnerBrands.tsx`](src/components/home/PartnerBrands.tsx); [`src/app/labeling/page.tsx`](src/app/labeling/page.tsx) 22. | 모든 화면·메타데이터·CMS·샘플 연락처와 인증/배송/규제 문구를 실제 확인 자료에 맞춤. 증빙 없는 “100% 준수/보장” 문구 제거. 상품별 인증서·유효기간·국가별 적용 범위는 담당자 확인 후 게시. |
| P2 | 코드 품질·테스트 게이트 | lint 125 오류/147 경고, 주요 거래·다국어 E2E 없음. | lint 오류 0, 테스트/빌드/타입 검사를 CI 필수 단계로 지정. 거래·권한·언어 전환·RTL 회귀 테스트 추가. |

## 3. 다국어 평가

### 현재 구현

- [`src/lib/i18n/dictionaries.ts`](src/lib/i18n/dictionaries.ts): `ko/en/zh/ja/ar/es/id` 7개 언어, 언어별 키 154개. 이번 점검에서 7개 사전은 한국어 기준 **키 수와 키 목록이 동일**했다. 이는 화면 번역 완성도나 번역 품질을 보증하지 않는다.
- [`src/lib/i18n/LanguageContext.tsx`](src/lib/i18n/LanguageContext.tsx): 언어를 `localStorage`에 저장하고 클라이언트에서 `html`의 `lang`·`dir`을 변경한다. [`LanguageSelector.tsx`](src/components/layout/LanguageSelector.tsx)에서 선택 가능하다.
- 브라우저에서 영어·일본어·중국어·아랍어의 공통 헤더/푸터 전환을 확인했다. 아랍어 RTL도 적용되지만, 기존 `left/right`, `space-x-*`, `text-left/right` 기반 요소의 전체 시각·키보드 사용성은 별도 검증이 필요하다.
- 수출 라벨의 [`src/lib/label-i18n`](src/lib/label-i18n)은 **사이트 UI 번역과 별개**인 성분·표시문구 치환 기능이다. 관련 테스트 통과를 전 사이트 번역이나 법규 적합성으로 해석하면 안 된다.

### 언어별 판정

| 언어 | 선택·공통 메뉴 | 홈·상품·RFQ·정책 등 전체 콘텐츠 | 판정 |
| --- | --- | --- | --- |
| 한국어 `ko` | 동작 | 일부 영어·과거 브랜드 콘텐츠 잔존 | 부분 구현 |
| 영어 `en` | 동작 확인 | 홈/회사 소개/상품과 일부 RFQ는 영어·한국어 혼재 | 부분 구현 |
| 일본어 `ja` | 동작 확인 | 공통 메뉴 외 상품·상세·RFQ·회사 소개 다수 미번역 | 부분 구현 |
| 중국어 `zh` | 동작 확인 | 공통 메뉴 외 상품·상세·RFQ·회사 소개 다수 미번역 | 부분 구현 |
| 아랍어 `ar` | 동작 및 RTL 확인 | 본문·상품·RFQ 다수 미번역, 혼합 스크립트/레이아웃 재검증 필요 | 부분 구현 |
| 스페인어 `es`·인도네시아어 `id` | 사전과 선택지 존재 | 이번 브라우저 범위에서는 전체 경로를 검증하지 않음 | 출시 지원 여부 미확정 |

### 구조적 결함과 개선 기준

1. [`src/app/layout.tsx`](src/app/layout.tsx) 9~26, 40은 정적 한국어 메타데이터와 `<html lang="ko">`를 생성한다. 언어 선택은 URL을 변경하지 않아 언어별 서버 HTML·메타데이터·`hreflang`·공유 링크를 제공하지 않는다. 첫 화면은 한국어로 보이다가 하이드레이션 후 선택 언어로 바뀐다.
2. 홈 배너·상품 카드·상세·회사 소개·RFQ·국내 도매·정책/문의의 텍스트는 사전 밖의 직접 문자열이 많다. [`src/app/products/[id]/ProductDetailClient.tsx`](src/app/products/%5Bid%5D/ProductDetailClient.tsx) 174, 207, [`src/components/home/BestSellers.tsx`](src/components/home/BestSellers.tsx) 108, [`src/app/rfq/page.tsx`](src/app/rfq/page.tsx) 등은 언어 선택과 무관한 상품/문구를 표시한다.
3. 상품 모델은 [`src/lib/types.ts`](src/lib/types.ts) 69~70의 `name`/`name_en` 정도만 지원한다. 일본어·중국어·아랍어 상품명/설명, 알레르겐·보관법·규격, CMS 배너/메뉴/저널의 현지화 데이터 구조가 필요하다.
4. 우선 출시 언어를 `ko/en/ja/zh/ar`로 확정하고, URL 기반 로케일·사전·상품/CMS 번역·언어별 SEO를 구현한다. 번역 누락 시 승인된 대체 언어를 명시하고, 결제/안전/규제 문구는 전문 검수한다. `es/id`는 완성·검수·E2E 통과 후 노출하거나 출시 범위에서 제외한다.
5. 언어별 검수 표: 홈 → 상품 검색/상세 → RFQ/도매 → 장바구니/결제 → 문의/정책 → 이메일/견적서/라벨. 날짜·통화·중량·주소·전화번호 형식과 RTL, 모바일 360px/태블릿/데스크톱을 포함한다.

## 4. 단계별 개발 일정(제안)

**가정:** 전담 프론트엔드 1명, 백엔드 1명, QA/콘텐츠·번역 담당 각 1명(필요 시 겸임), 인증/수출 라벨 검수 담당 참여. 날짜는 2026-09-29 착수 기준 영업일 계획이며, 실제 상품·법인·인증 자료 및 배포 환경 제공 시점에 따라 조정한다. P0 완료 전 실거래 공개를 승인하지 않는다.

| 단계·기간 | 작업 | 산출물·완료 기준 |
| --- | --- | --- |
| 0. 사실 확인·출시 범위 (9/29~10/2) | 해외 판매 대상국·국내 도매 운영 방식, 결제 제공 범위, 상품/OEM 구분, 회사/인증/배송 증빙, 우선 언어 확정. 기존 완료 보고서 상태 수정. | 요구사항·데이터 소유자·배포 방식 결정서. 시연 데이터와 실제 데이터 목록, 공개 중단 문구 목록. |
| 1. 기반·보안·거래 차단 해소 (10/5~10/16) | 서버 호스팅/API 경로 정합화, Supabase 스키마·마이그레이션, 서버 인증/권한, 쓰기 API 보호, 결제 승인·웹훅·주문 영속화, 접수 오류 처리. | 스테이징에서 비인가 쓰기 차단, 문의·주문 영속화, 실제 테스트 결제의 성공/실패·중복 검증, 배포 환경의 API 동작. |
| 2. 국내 도매·해외 RFQ (10/19~10/30) | 사업자/바이어 신청 저장, 관리자 CRM 연계, 가격·MOQ·CBM/환율·견적 유효기간 정책, 검토/승인/회신/상태 이력. | 국내 신청과 해외 RFQ 각각 제출→관리자 확인→승인/회신 E2E 통과. 견적 계산 서버 재검증. |
| 3. 다국어 구조·콘텐츠 (11/2~11/13) | `ko/en/ja/zh/ar` URL·서버 HTML/SEO, 상품·CMS 번역 구조, 핵심 고객 여정 번역, RTL·형식화, 번역 누락 탐지. | 5개 언어의 핵심 경로와 직접 URL 새로고침, `html lang/dir`, 언어별 메타데이터/링크, 모바일 RTL E2E 통과. 전문 번역 승인. |
| 4. OEM·신뢰 자료·콘텐츠 (11/16~11/27) | OEM 기획용 제품 유형/브리프·샘플·MOQ·제조사·라벨 승인 단계, 상품별 인증서/원산지/유통기한/콜드체인 자료 연결. 과거 브랜드 문구 전수 교체. | OEM 문의가 CRM에 별도 분류·추적되고, 공개 상품/주장의 근거·승인자·갱신일 기록. 수출 라벨은 권역별 담당자 검수. |
| 5. 통합 QA·출시 판정 (11/30~12/4) | 5개 언어/RTL, 주문·결제·RFQ·도매·권한·장애 복구 E2E, 접근성·모바일·성능·SEO, 운영자 교육. lint 정리와 CI 필수 게이트. | P0 0건, lint 오류 0건, 빌드·테스트·E2E 통과, 실제 운영 계정·연락처·상품/인증 승인 기록, 롤백 절차 확보. |

### 출시 게이트

1. 정적 export/서버 API의 배포 방식이 일치하고 스테이징에서 고객 여정 전체가 동작한다.
2. 관리자 권한, 주문 상태, 결제 승인, 고객 문의/견적의 **서버 영속화와 실패 처리**가 검증된다.
3. `ko/en/ja/zh/ar`에서 주요 경로의 번역·상품 정보·언어별 URL/SEO·아랍어 RTL이 검수된다.
4. 상품·OEM·인증·배송·규제 문구는 실제 계약/자료와 담당자 승인에 근거한다. 법규 적합성은 이 코드 점검만으로 확정하지 않는다.

## 참고: 적용한 로컬 Next.js 16.3 가이드

- `node_modules/next/dist/docs/01-app/02-guides/internationalization.md`: 언어별 경로 및 현지화된 콘텐츠 안내.
- `node_modules/next/dist/docs/01-app/02-guides/static-exports.md`: 정적 export에서 Request 의존 Route Handler, Proxy 등 미지원 명시.
