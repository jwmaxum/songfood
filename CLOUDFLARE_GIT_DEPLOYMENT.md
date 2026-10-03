# GitHub push → Cloudflare 자동 배포

2026-10-03 사용자 지정 배포 방식. 기존 운영 Worker `song-food`에 Cloudflare **Workers Builds**를 연결한다. GitHub Actions는 별도의 CI 검사다. 과거 Pages Git 빌드를 다시 켜지 않는다.

## Cloudflare에서 한 번 설정

Workers & Pages → song-food → Settings → Builds → Connect Git.

| 설정 | 값 |
| --- | --- |
| 저장소 | jwmaxum/songfood |
| 운영 브랜치 | main |
| Root directory | / |
| Build command | npm ci --legacy-peer-deps && npm run build:cloudflare |
| Deploy command | npm run deploy:worker |
| 비운영 브랜치 배포 | 초기에는 비활성화. 준비된 별도 환경 없이 운영 DB에 preview를 연결하지 않음 |

### Build variables and secrets

| 이름 | 값 |
| --- | --- |
| NODE_VERSION | 24.19.0 |
| SKIP_DEPENDENCY_INSTALL | 1 |
| NEXT_PUBLIC_APP_URL | https://song-food.jwmaxum.workers.dev |
| NEXT_PUBLIC_SUPABASE_URL | 로컬 앱 환경 파일에 설정된 songfood 프로젝트 URL |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | 같은 프로젝트의 publishable 또는 anon 키 |

로컬 앱 환경 파일: C:/Users/Microsoft/Projects/songfood/.env.local. 환경 파일 자체는 Git에 올리지 않는다. Cloudflare 빌드 환경에 localhost 주소를 사용하지 않는다. 공개 변수에 service-role/secret/관리 API 키를 넣으면 안 된다. GitHub 저장소는 public이며 사용자 토큰·SMTP 비밀번호·R2 비밀키는 커밋하지 않는다.

### Runtime variables and secrets

Worker Settings → Variables and Secrets에서 기존 다음 값을 유지/확인한다.

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY: **Secret**, 서버 전용
- NEXT_PUBLIC_APP_URL: 위 운영 주소. wrangler.jsonc에도 고정
- TRUST_CLOUDFLARE_IP: 1. Cloudflare Worker에서만 설정

Build 변수와 Runtime 변수는 서로 별개다. 빌드에 들어가는 NEXT_PUBLIC 값은 번들에 고정되므로 변경하면 다시 빌드해야 한다. 서버 서비스 키는 이번 동적 페이지 빌드에 필요하지 않아 Build secret으로 추가하지 않는다.

배포 명령은 로컬 .env.local을 읽거나 로컬 키를 업로드하지 않고 OpenNext 공식 deploy를 사용한다. --keep-vars로 대시보드 변수를 보존한다. 기존 scripts/deploy-worker.cjs는 과거 수동 배포 기록으로 남아 있으며 현재 npm deploy:worker는 호출하지 않는다.

## 매번 진행하는 흐름

1. 로컬 변경 구현 → 관련 테스트·보안/비밀값 검사.
2. Git commit → git push origin main. 강제 push는 사용하지 않는다.
3. Cloudflare가 Git push를 감지해 잠금파일 설치·B2B 범위 lint·전체 Jest·Next/Worker 빌드를 수행한다.
4. 앞 검사가 모두 통과해야 Deploy command가 실행된다. GitHub Actions도 독립적으로 검사한다.
5. Cloudflare Builds의 배포 커밋 SHA와 성공 상태를 확인하고 운영 URL에서 기능을 검증한다.

Cloudflare와 GitHub Actions는 각각 시작되므로 GitHub CI 결과를 기다리는 것으로 오해하지 않는다. 핵심 검사를 Cloudflare Build command 안에도 포함했다.

## 최초 1~5단계 운영 전환

- 회원·가격·CRM·PI 추가형 SQL은 이미 적용돼 있다.
- 기존 직접 DB 접근 차단 파일 supabase/migrations/20260930_b2b_legacy_access_lockdown.sql은 **새 앱 배포 성공과 연동해** 적용해야 한다. 2026-10-03 새 앱 배포 확인 후 적용 완료했다. 전후 상품 API 200, 비로그인 PI API 401 및 직접 접근 차단을 검증했다.
- 먼저 새 앱 배포와 실제 API 상태를 확인하고, 권한 차단 적용 후 상품/API·회원/직원 권한을 다시 확인한다.
- Supabase 인증 Redirect URLs에 운영 /account/confirmed 경로가 허용되어 있는지 확인한다.
- 실제 승인 SKU/환율, 판매자/송금정보, 실계정 인수, 기존 lint/의존성 보안 문제는 개발 배포와 별도 출시 과제로 남는다.
- 예시 PI를 실제 고객에게 자동 이메일 발송하지 않는다.

## 현 시점 검증 범위

- 작업 전 로컬 main과 GitHub main의 기준 SHA는 6885018이며 GitHub 쓰기 권한을 확인했다.
- 2026-10-03 사용자 대시보드 화면에서 Workers Builds의 jwmaxum/songfood 저장소 연결과 main 브랜치를 확인했다. 이후 화면의 Recent builds에는 No builds exist yet for this worker가 표시되어 첫 Git 빌드는 아직 실행되지 않은 상태다.
- 계정 소유 Cloudflare 토큰은 Workers Builds API에서 지원되지 않는다. 대시보드 연결 방식이면 별도 사용자 API 토큰을 받을 필요가 없다.
- 따라서 Git push 성공과 Cloudflare 자동 배포 성공은 각각 확인해 기록한다. 저장소 변경만으로 Cloudflare Git 연결 완료라고 판정하지 않는다.

## Git 연결 후 첫 빌드가 없는 경우

1. Settings → Builds에서 Git repository가 jwmaxum/songfood, Branch control이 main인지 확인한다.
2. 같은 Builds 영역의 Variables and secrets에 위 표의 다섯 변수를 모두 저장한다. Runtime variables and secrets에 등록한 값은 Build 환경으로 자동 전달되지 않는다. 특히 NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_ANON_KEY가 없으면 저장소의 빌드 사전 검사가 실패한다.
3. Version History의 Add variable 등 Dashboard 변경 기록은 Git 소스를 빌드했다는 증거가 아니다. Deployments 아래 Recent builds의 Go to build history에서 Git 빌드 기록을 확인한다.
4. No builds exist yet for this worker이면 재시도할 빌드가 없다. 저장소 연결 후 main에 새 커밋을 push하여 첫 빌드를 유발하고, 해당 커밋의 Cloudflare 검사 및 빌드 실행 상태를 확인한다.
5. 빌드 기록이 생기면 실패 로그에 따라 수정한 뒤 Retry build를 사용한다. 새 push 후에도 기록이 없으면 GitHub 앱의 저장소 접근 권한, Branch control, Build watch paths를 확인한다.

API token의 표시 이름만으로 권한 오류를 단정하지 않는다. 실제 빌드 로그에 토큰 만료 또는 권한 오류가 있을 때 권한을 확인한다. 빌드 시작 확인과 운영 배포 성공 확인은 별도로 기록한다.

## 공식 자료

- [Cloudflare Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/)
- [Build 설정](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)
- [Build image 환경변수](https://developers.cloudflare.com/workers/ci-cd/builds/build-image/)
- [OpenNext Build/Runtime 환경변수](https://opennext.js.org/cloudflare/howtos/env-vars)
- [Workers Builds API 권한](https://developers.cloudflare.com/workers/ci-cd/builds/api-reference/)

## 저장소 검증

46개 테스트 묶음·334개 테스트를 통과했다. Cloudflare Build의 실제 환경값이 단위 테스트에 유입되어 외부 Supabase를 호출하지 않도록 jest.environment.ts에서 운영 주소/자격증명을 분리했다. 개별 권한/설정 테스트는 명시적인 fixture 값을 사용한다.

운영 URL을 지정한 npm run build:cloudflare 전체 명령도 통과했다. 범위 lint 오류 0, 기존 이미지 경고 5건, 334개 테스트, Next.js/TypeScript/112개 페이지 및 OpenNext Worker 번들 생성 성공을 확인했다.

최초 GitHub CI에서 package-lock.json의 선택 의존성 @emnapi/core 1.10.0 및 중첩 @emnapi/runtime 1.10.0 누락을 발견했다. 원래 기준 커밋의 동일 잠금 항목을 복원했으며 버전을 일괄 갱신하지 않았다. 격리 폴더의 npm ci --dry-run --ignore-scripts --legacy-peer-deps 검사도 통과했다. 최종 Linux CI 결과는 GitHub Actions에서 해당 커밋으로 확인한다.

깨끗한 Linux 설치에서 @testing-library/react의 필수 peer인 @testing-library/dom이 빠지는 문제도 확인했다. 로컬 검증에 사용하던 10.4.1을 명시적 devDependency로 고정해 legacy-peer-deps 설치에서도 UI 테스트가 실행되도록 했다. 앱 런타임 의존성 버전은 변경하지 않았다.

4046d33 커밋의 [GitHub Linux CI](https://github.com/jwmaxum/songfood/actions/runs/37110095234)는 최종 성공했다. GitHub CI 성공만으로 Cloudflare 배포 완료를 의미하지 않는다.

## 첫 Cloudflare 빌드 실패 원인과 복구

2026-10-03 main의 7ada669 push로 Workers Builds가 처음 실행되어 Git 자동 연결이 작동함을 확인했다. 사용자 제공 로그에서 패키지 설치는 성공했고, 대시보드 Build command가 build:cloudflar로 저장되어 Missing script 오류로 종료된 사실을 확인했다. 마지막 e가 빠진 설정 오타다.

정식 Build command는 npm ci --legacy-peer-deps && npm run build:cloudflare다. 현재 대시보드 명령에서도 자동 배포를 진행할 수 있도록 package.json의 build:cloudflar를 npm run build:cloudflare로 연결하는 호환 명령을 추가했다. 기존 환경변수 검사, lint, 테스트와 Worker 빌드 전체를 그대로 수행한다. 대시보드 명령을 정식 철자로 수정한 뒤 호환 명령 제거를 검토할 수 있다.

같은 7ada669의 GitHub CI는 성공했다. Cloudflare 빌드 토큰과 별개로 제공된 계정 API 토큰은 유효하지만 Builds 및 Worker 조회에서 401을 반환했다. 계정 토큰이나 런타임 비밀값은 저장소에 포함하지 않았다.

## 관리자 라벨 페이지의 빌드 시 DB 조회 제거

오타 복구 후 ee18747의 Cloudflare 빌드는 Next.js 컴파일과 TypeScript 검사를 통과했으나 /admin/labels/[productId]의 페이지 데이터 수집에서 Invalid API key로 실패했다. 관리자 라벨 편집과 사양서 페이지에 남아 있던 generateStaticParams가 상품 목록을 빌드 중 조회했다. 공개 Supabase 설정이 있어 DB 분기를 탔지만 빌드에는 서버 키가 없어 실패한 것이다.

두 관리자 페이지의 정적 경로 생성 함수를 제거했다. 기존 동적 관리자 레이아웃과 각 페이지의 staffPageAccess 검사는 유지하며, 권한 확인 후 해당 상품과 라벨만 요청 시점에 읽는다. SUPABASE_SERVICE_ROLE_KEY는 계속 Worker Runtime Secret에만 둔다. 빌드 중 Wrangler의 서버 키 누락 경고는 런타임 설정과 구분하며, 경고를 없애기 위해 비밀키를 Build 변수에 추가하지 않는다.

GitHub Worker 빌드에는 공개용 테스트 설정과 실제 연결되지 않는 .invalid Supabase 주소를 주입한다. 이전의 모든 설정이 없는 빌드는 로컬 데이터 대체 경로를 사용해 이 문제를 발견하지 못했다. 앞으로는 공개 설정이 있으면서 서버 키가 없는 조건에서도 빌드 성공을 검증한다. 관리자 페이지 두 곳의 비인가 접근, 허가된 상품별 조회, 없는 상품의 404 처리를 회귀 테스트로 확인한다.

수정 검증: 47개 테스트 묶음·340개 테스트 통과, B2B 범위 lint 오류 0(기존 이미지 경고 5건). 서버 키를 빈 값으로 고정하고 공개 Supabase 설정을 테스트 값으로 주입한 Next.js 컴파일·TypeScript·페이지 데이터 수집·OpenNext Worker 번들 생성까지 성공했다. 관리자 라벨 두 경로는 요청 시 렌더링되는 동적 경로로 확인했다.

## 자동 배포 정상화 및 6단계 연결 (2026-10-03)

08e7aec의 GitHub CI 및 Cloudflare build de79e595-b505-4de5-9202-dec66dcbff28 성공을 확인했다. Build command의 build:cloudflar alias와 서버 비밀키 없는 빌드는 정상 동작하며 Deploy command 앞의 잘못된 파이프(|)가 제거된 뒤 배포됐다. Workers 프로젝트의 표시 형태는 Pages와 다르지만 Git 자동 배포가 정상 동작한다.

6단계는 lint:orders와 주문 권한/금액/상태 테스트를 Cloudflare Build command 및 GitHub CI에 포함한다. 추가 환경변수는 없으며 기존 Supabase 런타임 비밀키를 사용한다. 실제 국내 계좌는 관리자 → 주문·입금·출고 → 국내 계좌입금 설정에서 저장한다. 상세는 [6단계 구현 기록](B2B_06_IMPLEMENTATION.md)을 따른다.
