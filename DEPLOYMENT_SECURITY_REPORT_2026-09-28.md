# 배포 아키텍처·관리자 인증 반영 기록

작성일: 2026-09-28 · 공개 주소: https://songfood-96j.pages.dev/ → https://song-food.jwmaxum.workers.dev/

## 구현 상태

| 항목 | 반영 결과 |
| --- | --- |
| 서버 아키텍처 | Next.js 정적 export 제거. OpenNext Cloudflare Worker 설정과 `build:worker`, `deploy:worker` 명령 추가. `/api/*`와 관리자 화면은 서버에서 실행. |
| 공개 상품 반영 | 홈·목록·상세·공통 메뉴·저널을 동적 렌더링으로 전환. 상품 53개의 권위 원본은 Supabase. `data/products.json`은 저장소 사본이며 `npm run sync:products:snapshot`으로 갱신. |
| CMS 저장 | 메뉴 19개, 히어로 3개, 콘텐츠 블록 2개, 저널 3개, 미디어 5개를 Supabase 테이블로 이관. CMS 생성·수정·삭제에서 서버 파일 쓰기를 제거. 미디어 업로드용 Supabase Storage `media` 버킷 생성. |
| 관리자 인증 | Supabase Auth 토큰과 `user_profiles.role/status`를 서버에서 확인. 활성 직원만 `/admin`에 진입하고 상품·CMS 쓰기 API를 호출할 수 있음. 세션 쿠키는 HttpOnly·SameSite Strict. 직원 권한 화면은 실제 DB를 조회. |
| 고객 문의 | `contact_inquiries` 테이블에 저장하며 목록 조회는 `admin`/`inquiry_staff`만 허용. 서버 오류 시 접수 성공을 표시하지 않음. |
| 결제 | Toss 서버 키가 없거나 승인 요청이 실패하면 503/오류를 반환. 종전의 가짜 성공 응답 제거. 웹훅은 서명 검증과 주문 영속화 전까지 503으로 차단. |
| RFQ·도매 접수 | `commercial_inquiries` 테이블을 Supabase에 생성. 해외 RFQ와 국내 도매 양식은 접수 성공 시 실제 DB 접수번호를 표시. 관리자 CRM에서 조회·상태 변경 가능. 임의 견적번호, 수출 금액, 가상 바이어 리드를 제거. |

## 배포 결과

- 갱신된 Cloudflare 토큰으로 `song-food` Worker를 배포했다. 운영 주소는 `https://song-food.jwmaxum.workers.dev/`, 버전 ID는 `b653d860-8669-4b9f-8713-c6711b1515d0`이다.
- 기존 Pages 프로젝트 `songfood`에 `pages-bridge/_worker.js`를 미리보기로 검증한 뒤 production 배포했다. `songfood-96j.pages.dev`의 모든 경로와 검색어는 308로 Worker에 이동한다. Pages Git 자동 production/preview 배포를 중지해 과거 정적 빌드가 리다이렉트를 덮어쓰지 않도록 했다.
- 운영 Worker에서 상품 API 53건 200, 관리자 로그인 화면 200, 비인증 세션 401, 비인증 직원·문의 목록·상품 쓰기·업로드 403을 확인했다. Pages 주소를 따라간 상품 API도 200·53건이었다.
- Supabase Auth의 Site URL과 허용 리다이렉트를 운영 주소로 변경하고 `jwmaxum@gmail.com`에 초대 메일을 발송했다. `user_profiles`의 활성 `admin` 역할과 연결했다. 메일 링크를 통한 실제 로그인·비밀번호 설정은 계정 소유자의 완료가 필요하다.
- 로컬 Worker 미리보기에서 RFQ·도매 문의는 유효성 실패 400, 실제 접수 201 및 DB 저장을 확인했고 시험 접수 2건은 삭제했다. Worker 빌드와 타입 검사, 대상 코드 lint가 통과했고 Jest 24개 스위트·175개 테스트가 통과했다.
- 현재 상품 데이터와 CMS 데이터의 일부 판매·배송·인증·브랜드 문구는 증빙 검수가 필요함. 배포 권한을 얻더라도 실거래 출시는 별도 승인 대상으로 유지.

## 다음 실행 순서

1. `jwmaxum@gmail.com`의 초대 링크에서 비밀번호를 설정하고 관리자 로그인 후 상품 저장·삭제, CMS 저장, 직원 권한 차단을 사용자 계정으로 검증한다.
2. 이후 코드 배포는 `npm run build:worker` → `npm run deploy:worker` 순서로 한다. Worker 주소 변경 시 `pages-bridge/_worker.js`를 고친 뒤 `npm run deploy:pages-bridge`도 실행한다. 현재 GitHub Actions는 빌드 검증만 하며 자동 배포는 하지 않는다.
3. RFQ·도매 문의의 담당자 회신 이력·알림, 가격 검증, 견적 승인·발행을 구현한다. 주문·결제 영구 저장, 외부 결제 웹훅·금액 검증, 상품 원본 자료 검수는 별도 후속 단계다.
