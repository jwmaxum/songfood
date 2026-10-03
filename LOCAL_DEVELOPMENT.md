# Windows 로컬 개발 안내

## 소스 위치

- 작업 폴더: `C:\Users\Microsoft\Projects\songfood`
- 원격 저장소: https://github.com/jwmaxum/songfood
- 시작 브랜치: `main`
- 복제 시점 커밋: `6885018`

## 개발 서버 실행

프로젝트의 `dev.cmd`를 실행하거나 PowerShell에서 다음 명령을 사용합니다.

```powershell
Set-Location 'C:\Users\Microsoft\Projects\songfood'
.\dev.cmd
```

기본 주소는 http://localhost:3000 입니다. 사용 중인 포트가 있으면 터미널에 표시되는 주소를 확인하세요. 서버 중지는 해당 터미널에서 `Ctrl+C`입니다. 화면 코드는 `src/app`, 공통 UI는 `src/components`, 데이터 접근과 도메인 로직은 `src/lib`에서 수정합니다.

## 개발 명령

이 PC에는 Codex에 포함된 Node.js가 있고 npm은 별도로 설치되어 있지 않아, 프로젝트 전용 npm 11.6.2 실행 도구를 준비했습니다. 전역 PATH를 변경하지 않았습니다.

```powershell
.\npm-local.cmd run dev -- --hostname 127.0.0.1
.\npm-local.cmd test -- --runInBand
.\npm-local.cmd run lint
.\npm-local.cmd run build
```

`npm-local.cmd`는 PATH의 Node.js를 우선 사용하고, 없으면 이 PC의 Codex Node.js를 사용합니다. npm 파일과 다운로드 캐시는 `%LOCALAPPDATA%\SongfoodDevelopment\npm-cache`에 있습니다. 이 실행 도구는 현재 PC용입니다. 다른 PC에서는 Node.js와 npm을 설치한 뒤 일반 `npm` 명령을 사용하세요.

의존성을 다시 설치할 때는 기존 `package-lock.json`을 사용하는 다음 명령을 실행합니다.

```powershell
.\npm-local.cmd ci --cache "$env:LOCALAPPDATA\SongfoodDevelopment\npm-cache" --no-audit --no-fund
```

Google Drive 폴더는 많은 작은 파일을 읽고 쓸 때 설치와 빌드가 느릴 수 있습니다.

## 환경변수와 동작 범위

프로젝트의 `.env.local`은 Git에서 제외됩니다. 현재 NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000 및 songfood Supabase 공개/서버 키가 연결되어 있습니다. 결제는 비활성 상태입니다.

- 상품·CMS와 회원 인증은 연결된 songfood Supabase를 사용합니다. 기존 운영 데이터와 같은 프로젝트이므로 테스트 데이터 생성·수정 범위를 구분하세요.
- 회원 DB 마이그레이션과 Gmail SMTP를 적용했고 이메일 링크 가입·로그인을 실제 확인했습니다.
- 필요한 값은 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`입니다.
- 온라인 결제는 B2B 6단계까지 비활성화되어 있으며 TOSS_SECRET_KEY가 있어도 승인되지 않습니다.
- Cloudflare 배포 키는 로컬 화면 개발에는 필요하지 않습니다.

전체 변수 예시는 `.env.example`, DB 스키마와 마이그레이션은 `supabase` 폴더를 참고하세요. 초기 복제 이후 B2B 1단계 회원 DB 마이그레이션을 적용했습니다. 운영 새 앱 배포와 기존 DB 직접 접근 차단 파일은 아직 적용하지 않았습니다.

GitHub 인증 키는 `G:\내 드라이브\apps\.env.local`에 유지하며, 앱의 `.env.local`이나 Git 원격 URL에 복사하지 않았습니다. 이번 복제에 사용한 인증은 해당 프로세스에서만 적용되므로, 이후 비공개 저장소 pull/push에는 별도 GitHub 인증이 필요할 수 있습니다.

## 기존 개발 현황

기능별 남은 작업은 `DEVELOPMENT_AUDIT_2026-09-28.md`, 배포와 관리자 구성은 `DEPLOYMENT_SECURITY_REPORT_2026-09-28.md`에 기록되어 있습니다. 과거의 완료 보고서보다 이 현황 문서를 우선 확인하세요.
## 설정 완료 시 검증 결과 (2026-09-29)

- Node.js 24.19.0 / npm 11.6.2 / Next.js 16.3.6
- `npm ci`: 잠금파일 기준 951개 패키지 설치 완료
- `npm test -- --runInBand`: 24개 테스트 묶음, 175개 테스트 통과
- `npm run build`: 컴파일, TypeScript 검사, 페이지 생성 모두 성공
- 개발 서버 홈: HTTP 200, 송영민푸드 콘텐츠 확인
- 상품 API: HTTP 200, 로컬 스냅샷과 동일한 상품 53개 확인

이 작업에서는 기존 앱 소스와 `package-lock.json`을 변경하지 않았고, 로컬 개발 안내 및 Windows 실행 파일만 추가했습니다. 원격 저장소에 커밋하거나 푸시하지 않았습니다.

## B2B 오픈 개발계획

[단계별 B2B 오픈 개발계획](B2B_LAUNCH_DEVELOPMENT_PLAN.md)을 기준으로 0~9단계를 요청할 수 있습니다. 예: “B2B 개발계획의 1단계를 진행해 주세요.” 현재 구현 상태와 완료 기준은 계획 파일의 진행 기록을 확인하세요.

## B2B 1단계 반영 (2026-09-29)

회원·보안 기반을 구현했습니다. [1단계 연결·검증 안내](B2B_01_IMPLEMENTATION.md)를 확인하세요. 위 설치 완료 당시의 “앱 소스 변경 없음”은 초기 설정 기록이며, 현재는 1단계 앱 변경이 있습니다.

새 로컬 검사: npm-local.cmd run lint:b2b, npm-local.cmd run typecheck, npm-local.cmd run check:b2b-env. 현재 환경 검사는 연결된 Supabase와 최신 회원 스키마 표식을 확인해 통과합니다. Windows 하위 npm 명령은 scripts/local-bin/npm.cmd가 로컬 실행기를 연결합니다.

최신 검증: 전체 30개 묶음·209개 테스트, 보안 린트, Next.js/Worker 빌드, 실제 DB 권한·회원 RPC 검증, 실제 메일 수신·로그인 확인 완료. Gmail SMTP 앱 비밀번호는 G:/내 드라이브/apps/.env.local에 보관하며 앱 폴더로 복사하지 않습니다.


## B2B 2단계 반영 (2026-09-29)

[2단계 구현·운영 안내](B2B_02_IMPLEMENTATION.md)를 추가했습니다. 관리자 /admin/pricing 또는 제품별 가격·최소구매 링크에서 최소구매단위·수량과 가격 초안을 관리합니다. 기존 도매가는 EA 기준이며 53개 상품을 검수 초안으로 이관했습니다. 실제 승인 가격과 환율은 아직 없으므로 고객 화면의 확인 필요·견적 문의가 정상입니다.

새 검사: npm-local.cmd run lint:pricing. check:b2b-env는 회원 및 가격 스키마 표식을 모두 확인합니다. 새 상품 가격 DB는 적용했고 기존 운영 직접 접근 권한 전환과 앱 배포는 대기 중입니다. 다음 요청은 “B2B 개발계획의 3단계를 진행해 주세요”입니다.

2단계 최종 검증: 34개 묶음·237개 테스트, 타입·범위 린트·환경 점검, Next.js/Worker 빌드, 390px 모바일 및 고객 최소구매·장바구니 동작 통과. 실제 판매가격 승인과 운영 배포는 아직 하지 않았습니다.


## B2B 3단계 반영 (2026-10-03)

[3단계 구현·검증 기록](B2B_03_IMPLEMENTATION.md)을 추가했습니다. 홈에서 국내/해외 흐름을 선택하고 /shop에서 SKU·단위·보관조건으로 검색할 수 있습니다. 국내 구매함 /cart와 CTN 해외 견적함 /rfq는 각각 유지됩니다. /account는 실제 문의 API에 연결하고 주문·PI 기능은 준비 상태로 표시합니다.

새 검사: npm-local.cmd run lint:storefront. 전체 테스트·빌드와 모바일 검증 결과 및 미해결 항목은 3단계 문서의 검증표를 확인하세요. 승인 가격과 실제 회원 통합 인수 및 배포는 대기 중입니다. 다음 요청은 “B2B 개발계획의 4단계를 진행해 주세요”입니다.
최종 검증: 37개 묶음·249개 테스트, 범위 린트 오류 0, Next.js/Worker 빌드, 18개 브라우저 경로·흐름 검증 통과. 전체 저장소 lint는 기존 오류 130개가 남아 있습니다.


## B2B 4단계 반영 (2026-10-03)

[4단계 구현·검증·운영 안내](B2B_04_IMPLEMENTATION.md)를 추가했습니다. /rfq는 선적항·출하일·요구 서류 및 중복 방지 접수에 연결되며 /admin/crm에서 담당자·상태·내부 메모·공개 회신·불변 견적 버전을 관리합니다. 공개 회신은 /account에 표시합니다.

Supabase 추가형 CRM 마이그레이션을 적용했습니다. 실제 승인 가격·환율은 아직 0건이며 누락된 금액은 보완 필요로 표시됩니다. 거래 알림은 내부 테스트 수신함 전용입니다. 고객에게 견적 이메일/PI를 발송하지 않습니다.

새 검사: npm-local.cmd run lint:crm. 전체 41개 묶음·288개 테스트, 타입·범위 린트·환경·DB 롤백 통합·브라우저 검증 통과. 전체 저장소의 기존 lint 오류 130건은 남아 있습니다. Next.js/Worker 빌드도 성공했으며 소스·공개 번들의 비밀값 노출 검사도 통과했습니다. 검증 범위와 한계는 4단계 문서의 표를 확인하세요.

다음 요청: **“B2B 개발계획의 5단계를 진행해 주세요.”** 실제 승인 SKU·계정 통합 인수와 운영 앱 배포는 별도 남아 있습니다.


## B2B 5단계 반영 (2026-10-03)

[5단계 구현·검증 안내](B2B_05_IMPLEMENTATION.md)를 추가했습니다. /admin/crm에서 PI 미리보기·발행·판매자 설정·문서 이력을 관리하고 /account에서 PDF 다운로드·수락·수정 요청을 처리합니다. PDF는 Supabase 비공개 버킷에 저장됩니다.

45개 묶음·322개 테스트, 타입·PI 범위 린트·SQL 롤백 통합·실제 Storage 권한·PDF/브라우저 검증과 local workerd 출력을 통과했습니다. 전체 저장소 lint 오류 130건·경고 92건과 실제 계정 인수는 남아 있습니다. 새 검사: npm-local.cmd run lint:pi.

Cloudflare 토큰은 C:/Users/Microsoft/Projects/.env.local에서만 관리합니다. 활성 상태이나 Workers API 401이므로 원격 스테이징 완료 기준은 아직 미충족입니다. R2 비밀키는 이 기능에서 사용하지 않습니다. 실제 판매용 PI에는 승인 가격·환율·판매자/송금정보 입력이 필요합니다.

다음 기능 요청은 “B2B 개발계획의 6단계를 진행해 주세요”입니다. 5단계 원격 검증은 출시 전 필수 과제로 유지합니다.

5단계 의존성 감사에서 기존 영향 패키지 12개(high 10, moderate 2)가 보고됐습니다. 신규 PDF 의존성 관련 보고는 없었으며 기존 xlsx·개발 도구 의존성 개선은 출시 전 품질 작업에 포함합니다.


## 2026-10-03 배포 방식 변경

사용자 지정에 따라 **GitHub main push → Cloudflare Workers Builds 자동 배포**를 사용합니다. [연결·빌드·환경변수 설정](CLOUDFLARE_GIT_DEPLOYMENT.md)을 우선하세요. 기존 수동 배포 명령 안내보다 이 절이 최신입니다. GitHub Actions는 검사 전용이며, Cloudflare 자체 빌드에도 동일 핵심 검사를 포함합니다.
