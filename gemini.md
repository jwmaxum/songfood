# 송영민푸드 (Song Youngmin Food) K-Food Project Guide & Specification (gemini.md)

## 프로젝트 개요
- **브랜드명**: **송영민푸드 (Song Youngmin Food)**
- **SEO 키워드**: `K-Food`, `Korea Food`, `K-Fresh Food`, `송영민푸드`, `Song Youngmin Food`, `K-Frozen Food`, `K-Liquor`
- **목적**: 송영민푸드 브랜드의 럭셔리 K-Food 마켓플레이스 레이아웃, 2-Tier Header, Dynamic Layout & Menu Engine, Page Section CMS, Integrated Admin Dashboard, Product CRUD, Journal Editor, Supabase DB Integration 및 7개 국어 다국어 지원 (i18n).
- **기술 스택**: Next.js 16.3.0 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS, Lucide Icons, @dnd-kit, Supabase, Jest

---

## 핵심 UI/UX 스타일 가이드라인 (Song Youngmin Food Style)
- **Colors**: Primary Green `#14532D`, Secondary Amber `#EAB308`, Accent Red `#DC2626`, Background Off-White `#FAFAF8`, Dark Charcoal `#0A0A0C` (Admin CMS).
- **Typography**: `Inter`, `Plus Jakarta Sans`, `DM Sans` (Headings 700~800, Body 400~500).
- **Header**: 2-Tier Header (Row 1: Logo image + Centered Search + Actions / Row 2: Clean GNB Navigation bar).
- **Layout & Animations**:
  - Full-bleed 메인 비주얼
  - 여유로운 여백 (Padding/Margin)
  - 마우스 호버 시 약간의 줌인 (`scale-105`) 및 페이드인 Animation 효과

---

## 다국어 지원 (7개 국어 i18n & RTL)
- **기본 언어**: 한국어 (`ko`)
- **구현 방식**: `src/lib/i18n/LanguageContext.tsx` (Context API) + `src/lib/i18n/dictionaries.ts`
- **지원 언어**:
  1. 한국어 (`ko` - 기본)
  2. 영어 (`en` - English)
  3. 중국어 (`zh` - 中文)
  4. 일본어 (`ja` - 日本語)
  5. 아랍어 (`ar` - العربية, **RTL 오른쪽->왼쪽 레이아웃 방향 지원**)
  6. 스페인어 (`es` - Español)
  7. 인도네시아어 (`id` - Bahasa Indonesia)
- **번역 키 카테고리**: hero, categories, collections, brand_story, nav, product_detail, journal, cart, common (총 50개 이상 키)
- **RTL 처리**: `document.documentElement.dir` 자동 전환, `localStorage`에 언어 설정 저장

---

## 관리자 기능 체크리스트 (Admin Checklist)
- [x] **Header GNB 메뉴 관리**: 추가 / 수정 / 순서 변경 / On-Off 토글 (`/admin/navigation`)
- [x] **Footer 링크 그룹 관리**: 회사 소개, 고객 지원, SNS 등 온오프 토글 (`/admin/navigation`)
- [x] **메인 히어로 뱅크 비디오 및 메인 카피 실시간 변경**: 비디오 MP4 & HD 이미지 CMS (`/admin/hero`, `/admin/content-blocks`)
- [x] **컬렉션/제품 카테고리 CRUD & 이미지 업로드**: 제품 추가/수정/삭제 & 4대 특성 (`/admin/products`)
- [x] **뉴스/이벤트/블로그 게시글 Editor**: WYSIWYG / Markdown 게시글 편집기 (`/admin/journal` & `/journal`)
- [x] **사용자 권한 관리**: admin/editor/viewer 역할 CRUD, 활성화 상태 토글 (`/admin/users`)
- [x] **실시간 KPI 대시보드**: 주문/매출/제품/회원 실제 DB 집계 연동 (`/admin`)

---

## 관리자 백오피스 CMS 상세 (Admin CMS)

### 1. 접속 방식 및 라우팅
- 퍼블릭 UI에서는 숨김 처리되어 있으며, 주소창에 `도메인/admin` 입력으로 직통 접속.
- **관리자 계정 아이디**: `siteadmin` (입력창에 기본값 표시 안함, 직접 입력)
- **초기 임시 비밀번호**: `!admin1004`
- **비밀번호 변경**: 로그인 후 사이드바 하단 `Change Password` 모달을 통해 변경 가능 (`localStorage` 저장).
- 세션 유지(`sessionStorage` 검증) → 인증 완료 시 대시보드 진입.

### 2. 럭셔리 다크 테마 디자인 시스템
- `#0a0a0c` 배경 + `#0d0d12` Sidebar + Gold(`#c5a880`) Active Indicator
- `#121218` Dark KPI Cards + `font-serif-luxury` 헤딩 폰트

### 3. 핵심 관리 모듈
| 모듈 | 경로 | 파일 | 기능 |
|------|------|------|------|
| 대시보드 | `/admin` | `src/app/admin/page.tsx` | 실시간 KPI (주문/매출/제품/회원) + CMS 현황 |
| 메뉴 엔진 | `/admin/navigation` | `NavigationManager.tsx` | GNB/Footer 메뉴 Drag&Drop 정렬, is_active 토글 |
| 히어로 슬라이더 | `/admin/hero` | `HeroManager.tsx` | MP4 비디오/이미지 슬라이드 추가·수정·삭제 |
| 제품 관리 | `/admin/products` | `ProductManager.tsx` | 제품 CRUD, 4대 특성(format/finish/color/look), 이미지 |
| 콘텐츠 블록 | `/admin/content-blocks` | `ContentBlockManager.tsx` | 페이지별 섹션 텍스트/미디어 편집 |
| 저널 편집기 | `/admin/journal` | `JournalManager.tsx` | 뉴스/이벤트/블로그 게시글 Markdown 편집기 |
| 미디어 라이브러리 | `/admin/media` | `MediaManager.tsx` | 이미지·영상 업로드, CDN URL 등록, URL 복사 |
| 사용자 권한 | `/admin/users` | `src/app/admin/users/page.tsx` | 역할(admin/editor/viewer) CRUD, 상태 토글 |
| 바이어 CRM | `/admin/crm` | `src/app/admin/crm/page.tsx` | 해외 바이어 파이프라인 (Lead ➔ Export), 가격 Markup/Discount Slider |

---

## 구현된 파일 구조 (src/)

```
src/
├── __tests__/
│   ├── admin-auth.test.ts        # Admin PIN 검증 단위 테스트
│   ├── api-kpi.test.ts           # KPI API 응답 형식 + 통화 포맷 테스트
│   └── upload-validation.test.ts # 파일 업로드 MIME/크기/sanitize 테스트
├── app/
│   ├── admin/
│   │   ├── layout.tsx            # Admin 사이드바 + PIN 인증 가드
│   │   ├── page.tsx              # 대시보드 (KPI API 연동)
│   │   ├── crm/                  # 해외 바이어 CRM & RFQ 파이프라인 (/admin/crm)
│   │   ├── navigation/           # 메뉴 관리 (NavigationManager)
│   │   ├── hero/                 # 히어로 슬라이더 CMS (HeroManager)
│   │   ├── products/             # 제품 CRUD (ProductManager)
│   │   ├── content-blocks/       # 콘텐츠 블록 편집기
│   │   ├── journal/              # 저널 편집기 (JournalManager)
│   │   ├── media/                # 미디어 라이브러리 (MediaManager)
│   │   └── users/
│   │       └── page.tsx          # 사용자 권한 관리 UI
│   ├── api/
│   │   ├── kpi/route.ts          # KPI 집계 API (force-dynamic)
│   │   ├── upload/route.ts       # 파일 업로드 API (보안 강화)
│   │   ├── menus/route.ts        # 메뉴 CRUD API
│   │   ├── hero/route.ts         # 히어로 슬라이드 API
│   │   ├── products/route.ts     # 제품 API
│   │   ├── journal/route.ts      # 저널 API
│   │   ├── content-blocks/       # 콘텐츠 블록 API
│   │   └── media/route.ts        # 미디어 API
│   ├── global/                   # 해외 B2B 수출 전용 카탈로그 & 인증 필터 (/global)
│   ├── rfq/                      # 대화형 RFQ 7단계 위저드 & FOB 견적 계산기 (/rfq)
│   ├── wholesale/                # 국내 B2B 도매 & 식자재 공급 문의 (/wholesale)
│   ├── why-kfood/                # Why K-Food & Why Us 브랜딩 페이지 (/why-kfood)
│   ├── (public pages)/           # /, /shop, /collections, /journal, /products, /cart 등
│   └── account/                  # 로그인, 마이페이지
├── components/                   # 공통 컴포넌트 (Header, Footer, Hero, etc.)
├── context/                      # CartContext 등 전역 상태
├── lib/
│   ├── supabase.ts               # Supabase client (public + admin)
│   ├── types.ts                  # 공통 TypeScript 인터페이스
│   ├── menus-db.ts               # 메뉴 DB 헬퍼
│   ├── cms-db.ts                 # 히어로 슬라이드 DB 헬퍼
│   ├── products-db.ts            # 제품 DB 헬퍼
│   ├── journal-db.ts             # 저널 DB 헬퍼
│   ├── content-blocks-db.ts      # 콘텐츠 블록 DB 헬퍼
│   ├── media-db.ts               # 미디어 DB 헬퍼
│   └── i18n/
│       ├── LanguageContext.tsx   # 언어 Context + localStorage 저장
│       └── dictionaries.ts       # 7개 언어 번역 딕셔너리 (50+ 키)
└── proxy.ts                      # Next.js 보안 헤더 미들웨어 (proxy 규격)
```

---

## 환경 변수 (.env.local)

```env
# Supabase 연결
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# 앱 설정
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Admin CMS 접근 코드 (운영 환경에서 반드시 변경!)
NEXT_PUBLIC_ADMIN_PIN=admin2026

# Supabase CLI
SUPABASE_ACCESS_TOKEN=sbp_...
```

---

## API 라우트 목록

| 메서드 | 경로 | 설명 | 인증 |
|--------|------|------|------|
| GET | `/api/kpi` | 대시보드 KPI 집계 (주문/매출/제품/회원 수) | supabaseAdmin |
| GET/POST | `/api/menus` | 메뉴 목록 조회 및 생성 | supabaseAdmin |
| PATCH | `/api/menus/reorder` | 메뉴 순서 변경 | supabaseAdmin |
| GET/POST | `/api/hero` | 히어로 슬라이드 조회/생성 | supabaseAdmin |
| GET/POST | `/api/products` | 제품 목록 조회/생성 | supabaseAdmin |
| GET/POST | `/api/journal` | 저널 게시글 조회/생성 | supabaseAdmin |
| GET/POST | `/api/content-blocks` | 콘텐츠 블록 조회/생성 | supabaseAdmin |
| GET | `/api/media` | 미디어 파일 목록 | supabaseAdmin |
| POST | `/api/upload` | 파일 업로드 (보안 검증 포함) | — |

---

## 파일 업로드 보안 정책

- **허용 MIME 타입**: `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `video/mp4`, `video/webm`
- **크기 제한**: 이미지 최대 **5MB** / 동영상 최대 **100MB**
- **파일명 sanitize**: 특수문자 → `_` 치환, 검증된 MIME 기준 확장자 강제 적용
- **저장 위치**: `public/uploads/` (로컬) + Supabase Storage (선택)

---

## 보안 헤더 (proxy.ts)

모든 요청에 자동 적용되는 HTTP 보안 헤더:

| 헤더 | 값 | 효과 |
|------|-----|------|
| `X-Frame-Options` | `DENY` (admin) / `SAMEORIGIN` (public) | Clickjacking 방지 |
| `X-Content-Type-Options` | `nosniff` | MIME 타입 스니핑 방지 |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Referrer 정보 보호 |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | 브라우저 API 차단 |
| `Cache-Control` | `no-store` (admin) | 관리자 페이지 캐시 방지 |

---

## Supabase DB 테이블 구조

| 테이블 | 주요 컬럼 | 용도 |
|--------|-----------|------|
| `menus` | id, title, url, parent_id, sort_order, is_active, position | GNB/Footer 메뉴 |
| `hero_slides` | id, media_type, media_url, poster_url, title, subtitle, cta_label, is_active | 히어로 슬라이더 |
| `products` | id, name, collection, format, finish, color, look, image_url, price, is_featured | 제품 카탈로그 |
| `journal_articles` | id, title, slug, category, content, cover_image, is_published | 저널/블로그 |
| `content_blocks` | id, section_key, page, title, subtitle, description, media_url | 페이지 섹션 CMS |
| `media_library` | id, name, url, type, size, created_at | 미디어 자산 |
| `user_profiles` | id, email, name, role, status, company | 사용자 프로필 & 서브 관리자 직원 권한 |
| `orders` | id, status, items, total, shipping_address, payment_method, payment_key, courier_company, tracking_number | 국내/도매 회원 주문 내역 & 택배 운송장 |
| `rfq_requests` | id, company_name, buyer_name, destination_country, incoterms, items, total_usd | 해외 바이어 RFQ & Pro Forma Invoice |
| `payments` | id, payment_key, order_id, amount, status, method, raw_response | 토스페이먼츠 서버 승인 감도 데이터 |

### RLS (Row Level Security) 정책
- `menus`, `hero_slides`, `products`, `content_blocks`, `media_library`: **공개 읽기** (is_active=true)
- 쓰기 작업: `service_role` 키 전용 (서버 사이드 `supabaseAdmin`)
- `user_profiles`, `orders`, `rfq_requests`: 인증된 사용자 및 담당 권한 직원의 데이터만 읽기/수정

---

## 테스트 (Jest)

```bash
npm run test           # 전체 테스트 실행
npm run test:watch     # Watch 모드
npm run test:coverage  # 커버리지 보고서
```

### 테스트 파일
| 파일 | 테스트 수 | 검증 내용 |
|------|-----------|-----------|
| `admin-auth.test.ts` | 7개 | PIN 검증 로직, 환경변수화, 보안 케이스 |
| `api-kpi.test.ts` | 9개 | KpiData 형식, 음수 방지, 통화 포맷 함수 |
| `upload-validation.test.ts` | 12개 | MIME 타입 화이트리스트, 크기 제한, 파일명 sanitize |
| **합계** | **28개** | **전체 통과** ✅ |

---

## 개발 명령어

```bash
npm run dev            # 개발 서버 (localhost:3000)
npm run build          # 프로덕션 빌드 (53페이지 정적/동적 생성)
npm run test           # Jest 단위 테스트
npm run lint           # ESLint 검사
```

---

## 구현 이력 (Changelog)

### v1.2.0 — 2026-08-08 (K-Food 마켓플레이스 & 엑스포트 RFQ 플랫폼 통합 개편)
- **[이중 가격 엔진]**: 개별 소매가(`개당 ₩10,000원`)와 박스당 대용량가(`10개입 Box ₩85,000원`, 15% 대량할인) 동시 표기 및 모든 일반 가입 회원의 [개별상품/대용량박스] 자유 선택 구매 구축.
- **[토스페이먼츠 실시간 결제]**: 클라이언트 SDK + 서버 인증 승인 API(`/api/payments/confirm`) 및 가상계좌 입금 통보 웹훅(`/api/payments/webhook`) 구현. 관리자 CMS 토스페이먼츠 연동 진단 연동 완료.
- **[배송비 정책]**: 결제 총액 5만원 미만 시 **3,000원 배송비** 자동 청구, 5만원 이상 구매 시 **0원 무료배송** 적용.
- **[택배사 운송장 & 주문 조회]**: CJ대한통운, 로젠택배, 한진택배 운송장 입력 지원 및 마이페이지 실시간 배송 조회 연동.
- **[서브 관리자 직원 권한]**: `inquiry_staff`(문의/바이어 담당), `product_staff`(상품/가격 담당), `order_staff`(주문/송장 담당), `admin`(전체 권한) 역할 분담 구축.
- **[해외 바이어 엑스포트 허브]**: `/global` 카탈로그 내 **수출 상품 이미지 카드 직접 클릭 선택** 기능 및 하단 실시간 플로팅 RFQ 바 구현. 선택 상품 ID가 7단계 RFQ 위저드(`/rfq`) 및 Pro Forma Invoice(PFI)에 즉시 세팅됨.
- **[추천/메인 Featured 결제 연결]**: 메인 베스트셀러 및 특가 상품 카드마다 `[🛒 장바구니]` 및 `[⚡ 바로 결제]` 버튼 적용으로 즉시 `/checkout` 결제 라우팅.
- **[Supabase DDL 점검]**: `supabase/schema.sql` 점검 및 `rfq_requests`, `payments` 신규 테이블 DDL, 인덱스, RLS 정책 및 더미 데이터(₩10,000 / 10개입) 전면 동기화.

### v1.1.0 — 2026-08-04 (보안점검 권고조치 8개 항목)
- **[보안]** Admin PIN 하드코딩 제거 → `NEXT_PUBLIC_ADMIN_PIN` 환경변수화
- **[보안]** `src/proxy.ts` Next.js 보안 헤더 미들웨어 추가 (X-Frame-Options, NOSNIFF 등)
- **[보안]** Supabase RLS 정책 강화 (`OR true` 취약점 제거)
- **[보안]** 파일 업로드 MIME 타입 화이트리스트 + 크기 제한 적용
- **[기능]** `/api/kpi` Route 생성 — DB 실시간 집계 대시보드 연동
- **[기능]** `/admin/users` 사용자 권한 관리 UI (역할 CRUD + 상태 토글)
- **[기능]** i18n 번역 키 7개 언어 × 15개 신규 키 추가 (nav/product/journal/cart/common)
- **[인프라]** Next.js 16.3.0 업그레이드 (`npm audit fix --force`, 취약점 0건)
- **[인프라]** `middleware.ts` → `proxy.ts` Next.js 16.3.0 규격 마이그레이션
- **[인프라]** `next.config.ts` `output: "export"` 제거 (SSR API 라우트와 호환)
- **[테스트]** Jest 27개 단위 테스트 작성 및 전체 통과

### v1.0.0 — 초기 구현
- Next.js 15 기반 Anatolia 럭셔리 푸드 쇼핑몰 초기 구현
- Admin CMS 6개 모듈 (메뉴/히어로/제품/저널/콘텐츠/미디어)
- Supabase DB 연동 및 schema.sql 초기 정의
- 7개 언어 i18n LanguageContext 구현
- @dnd-kit 기반 메뉴 Drag & Drop 정렬
