# 관리자 이미지 업로드·상품 갤러리 구현 기록

2026-10-15 · 기반 커밋 2524339 · 배포 소스 `1c9a9b9841f6c81b6215b1d5d072acff6c4e8ce0` · 실제 개발 폴더 C:/Users/Microsoft/Projects/songfood

## 결과와 범위

관리자 이미지 입력을 공통 파일 업로드·기존 이미지 선택으로 바꾸고, 상품의 대표 사진과 최대 6장 갤러리를 기존 비공개 초안·카탈로그 반영 절차에 연결했다. [실사용 절차](B2B_IMAGE_UPLOAD_GUIDE.md)와 [상품 등록 가이드](B2B_PRODUCT_REGISTRATION_GUIDE.md)를 따른다.

적용 화면은 상품 등록·수정, 히어로 이미지·동영상 대기 이미지, 콘텐츠 블록·사이트 메뉴 이미지, 저널 표지, 미디어 라이브러리, 공통 로고·9개 대분류 사진이다. 공통 로고는 사이트와 `/logo.png` 경로를 사용하는 기존 인증메일·알림 템플릿에 연결한다. 기존 동영상 기능은 유지한다. 미리보기와 서버 저장 완료를 구분하고 업로드 중 저장·닫기 잠금, 실패 시 기존 선택·입력 보존, 재시도, 파일명 검색·기존 이미지 선택을 제공한다.

이번 구현에서 실제 상품 사진 변경은 0건이다. 기존 53개 상품과 운영 중 초안·감사·승인 가격·판매 검수를 보존했다. 가격·실거래 인수 상태를 완료로 바꾸지 않았고 주문·입금·출고·PI 수락·메일 수신 검수를 대신하지 않는다.

## 파일 처리와 자료 보호

- `src/lib/image-upload-client.ts`: 원본 20MB 이하 JPEG/PNG/WebP/GIF를 브라우저에서 디코딩하고 긴 변 1,400px·2백만 픽셀·2MB 이하 JPEG/PNG로 변환한다. 투명 배경 유지 선택과 흰 배경 JPEG, GIF 첫 프레임을 지원한다. PC 원본을 바꾸지 않고 변환 사본을 전송한다.
- `POST /api/upload`: 현재 관리자·상품 담당자 신원과 same-origin, 사용자별 15분 60회 제한을 검사한다. Content-Length와 실제 multipart 스트림을 파일 파싱 전에 제한하고 파일 1개만 받는다. 빈 파일·허위 MIME·시그니처·픽셀·크기를 검증한다. 서버 제한은 이미지 5MB/2백만 픽셀, 동영상 50MB이며 이미지 UI는 더 작은 2MB로 변환한다.
- 파일은 기존 Supabase `media` 공개 버킷에 새 UUID 경로로 저장한다. 서비스 키는 서버에서만 사용하며 `upsert:false`로 기존 파일을 덮어쓰지 않는다. 파일 Blob과 최대 256KB 헤더를 사용해 전체 파일의 추가 arrayBuffer 복사를 피한다.
- 미디어 DB 등록에는 이름·공개 URL·형식·표시 크기만 전달한다. Storage 공개 URL은 프로젝트 origin·공개 media 경로와 일치하고 사용자정보·쿼리·fragment가 없는지 확인한다. Storage 또는 DB 오류에서 공급자 상세·토큰을 반환하지 않는다. 파일 업로드 후 DB 등록 실패 시 그 요청의 새 경로만 정리하고 기존 공유 파일은 삭제하지 않는다.
- `GET /api/media`는 관리자·상품 담당자만 호출하며 id/name/url/type/size/created_at 6개 필드로 투영한다. 기존 수동 등록 API는 허용 키·길이·HTTPS·사용자정보 없는 URL·실제 문자열 형식을 검증한다. 라이브러리 DELETE는 DB 항목만 제거하며 공유 Storage 객체를 보존한다.
- 공개 이미지 업로드와 비공개 기준자료 메모는 다른 저장 경로다. Storage 업로드 직후 파일은 공개 URL로 제공되므로 비공개 공급사 문서·PI·개인정보를 보관하는 기능으로 사용하지 않는다. 기존 PI 전용 비공개 버킷을 변경하지 않았다.

기존 `@supabase/supabase-js`와 브라우저 API를 재사용했다. 새 이미지 처리 패키지·유료 변환 서비스·새 외부 파일 저장 서비스를 도입하지 않았다.

## 상품 DB·동시 수정·공통 이미지

`20261015140000_b2b_product_images.sql`을 실제 프로젝트에 적용했다.

- `products.images` nullable JSONB와 최대 6개 URL·형식·정규화 후 중복 검사 제약을 추가했다. 기존 상품 사진을 일괄 UPDATE하지 않는다.
- 초안 저장에서 입력한 사진 목록만 병합한다. 공개 반영 시 목록 첫 사진을 대표 `image_url`과 동기화한다. 명시적 빈 목록/null은 사진 제외로 처리하고 미입력 항목은 보존한다. 대표 사진만 바꾸는 요청도 기존 추가 사진을 보존하는 범위에서 최대 6장으로 정리한다.
- nullable `images:null` 키 추가만으로 기존 열린 초안의 원본 해시나 판매 검수 지문이 달라지지 않도록 정규화했다. 실제 사진 값이 바뀌면 원본 비교·판매 재검수에 포함된다. 역할·원본 해시·초안 버전 검사와 변경 사유·불변 감사 기록을 유지한다.
- 미디어 버킷은 기존 공개 다운로드를 유지하면서 50MB·허용 MIME 제한과 anon/authenticated 서버 전용 쓰기·목록 보호를 적용했다. 미디어 라이브러리 직접 접근 권한도 회수하고 인증된 서버 API로 제한했다. 내부 검증 helper의 PUBLIC/anon/authenticated 실행 권한을 회수했다.
- 공통 로고·분류 사진은 기존 content_blocks의 정해진 키를 사용한다. 공개 화면에는 이 프로젝트의 업로드 이미지와 허용 키만 투영한다. `/logo.png`는 설정한 업로드 이미지 또는 기본 로고로 연결하며 임의 외부 주소로 전환하지 않는다.

적용 전 사전 트랜잭션과 적용 후 실제 스키마에서 `b2b_product_drafts.sql`, `b2b_product_partial_publication.sql`, `b2b_product_images.sql` 3개 SQL 회귀 묶음을 ROLLBACK으로 통과했다. 실제 migration COMMIT 전후 products·drafts·draft events·price revisions·product releases 5개 테이블의 기존 행 수·값 체크섬과 모든 상품의 판매 검수 지문이 동일했다. products 비교는 새 nullable images 키를 제외한 기존 열 기준이며 나머지 4개 테이블은 전체 행을 비교했다. 회귀용 사용자·상품·이벤트는 남기지 않았다.

## 검증 상태

| 항목 | 결과 |
| --- | --- |
| 전체 단위·커버리지 | **PASS: 최종 CI 97개 묶음 901/901**. 원본 CI 로그 ZIP에서 수치를 대조했다. 별도 로컬 커버리지 실행은 97개 묶음 899/899이며 Statements 74.53%·branches 66.50%·functions 75.44%·lines 76.61%다. 이후 추가한 상품 상세 갤러리 2개 회귀까지 최종 CI에 포함됐다. 전체 80% 커버리지 목표는 미달 |
| 업로드·미디어·갤러리 집중 회귀 | **PASS: 111/111**. 실제 라우트·Native Request multipart·권한/Origin·rate·스트림 취소·시그니처/한도·새 객체 정리·공개 필드·공유 객체 보존·부분 저장·NFC 중복 포함 |
| 타입·lint | 전담 테스트 수정 후 전체 `tsc --noEmit` 통과. 전체 lint 오류 0·경고 77개. 최종 Worker 빌드에서도 TypeScript 통과 |
| DB | **PASS**: 사전 검증·운영 COMMIT·적용 후 3개 SQL 회귀. 기존 5개 테이블 값과 판매 검수 지문 보존 |
| Cloudflare Worker 빌드 | **PASS**: `npm run build:worker` 최종 실행. 일반 콘텐츠 편집 경로까지 포함해 Next 컴파일·TypeScript·OpenNext Worker 번들 생성 완료 |
| production 모드 브라우저·접근성 | **PASS: 최종 CI 전체 51/51**, 원본 로그 기준 3.0분. 상품 업로드→Storage bytes/미디어 DB→비공개 초안/재개→명시 반영→상세 갤러리/재교체, 모바일 SVG 차단·503 재시도·접근성·콘텐츠 블록 관리 경로를 포함했다. 격리된 로컬 fixture를 사용하는 production 모드 검증이며 실제 고객 거래를 생성하지 않았다 |
| GitHub CI·Cloudflare 자동 배포 | **PASS**: 정확 소스 `1c9a9b9841f6c81b6215b1d5d072acff6c4e8ce0`의 [Worker CI 38685318619](https://github.com/jwmaxum/songfood/actions/runs/38685318619) 2개 job과 [Cloudflare 6018aa97-6461-4d90-b62d-2752475bd826](https://dash.cloudflare.com/7c88b2d2b3fe9baf32dc744ac0a631b3/workers/services/view/song-food/production/builds/6018aa97-6461-4d90-b62d-2752475bd826)이 모두 성공했다. 2026-10-15 14:15 KST, 원본 CI ZIP 79,767 bytes와 97/901/51 통과 수치를 확인했다 |
| 운영 사이트 실제 파일 업로드·DB 참조 | **PASS**: 2026-10-15 14:16 KST, 기존 브랜드 로고를 실제 업로드한 공개 PNG **2,090,057 bytes·1,254×1,254px**를 읽고 시그니처·변환 한도를 확인했다. 미디어 라이브러리와 branding_logo DB 참조가 일치하고 직원 API는 공개 허용 필드 6개만 반환했다. 익명 미디어 조회·익명 업로드·타 Origin 업로드는 모두 403이었다. 기존 53개 상품의 사진·식별정보를 보존했고 실제 상품 사진 변경은 **0건**이다. 상품 사진 저장/반영은 운영 DB 롤백 회귀와 격리 브라우저 테스트로 검증했다 |
| 로고·인증메일 표시 | **PASS**: 운영 `/logo.png`가 저장된 공개 이미지로 **302·Cache-Control: no-store** 응답하는 것을 확인했다. 공통 경로 연결과 production 브라우저의 기본 로고 복귀도 통과했다. 이번 이미지 검증에서 새 인증메일·고객메일은 **발송하지 않았다**. 실제 메일 앱의 새 로고 수신·캐시 표시는 이번 검증 범위에 포함하지 않았다 |

로컬 비공개 증거는 `.npm-cache/image-upload-2026-10-15/`의 `jest-coverage.log`, `lint.log`, `worker-build-final.log`, `migration-preflight-private.json`, `migration-apply-private.json`, `migration-regression-private.json`, `ci-verification-1c9a9b9841f6c81b6215b1d5d072acff6c4e8ce0.json`·동일 SHA의 원본 CI 로그 ZIP, `production-verification.json`에 보관한다. 운영 확인 도구 `verify-live.cjs`는 로고 302뿐 아니라 저장된 URL과 no-store까지 검사하고, 모든 조건을 통과한 뒤 운영 결과 JSON을 기록했다. 작업용 캐시는 Git에 포함하지 않으며 비밀값·사용자 세션을 문서에 복사하지 않는다. 완료한 자동 검증과 운영 이미지 확인을 실제 거래·메일 수신 인수 완료로 확대 해석하지 않는다.

## 다음 단계

1. 이미지 업로드 기능의 CI·Cloudflare 자동 배포·운영 브랜드 이미지 확인을 완료했다. 이후 실제 자료 변경 시 해당 변경의 저장·카탈로그 반영 결과를 확인한다.
2. 관리자가 실제 상품 사진과 기준자료를 입력하고 고객 상세·새 PDF를 대조한다. 사용 중인 파일 정리는 참조를 확인한 후 별도 작업으로 다룬다.
3. 실제 승인 가격·계좌·PI/환율·회사 정책·대응 목표와 거래 증빙을 갖춘 채널/SKU부터 **15단계 실제 거래 인수**, 이후 **16단계 제한 공개·초기 운영 점검**을 진행한다. **15단계 실제 거래 인수는 미완료**이며 이번 이미지 기능으로 그 상태를 변경하지 않는다.
