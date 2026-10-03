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
- 기존 직접 DB 접근 차단 파일 supabase/migrations/20260930_b2b_legacy_access_lockdown.sql은 **새 앱 배포 성공과 연동해** 적용해야 한다. 아직 미적용이며 구 운영 앱에 단독 적용하지 않는다.
- 먼저 새 앱 배포와 실제 API 상태를 확인하고, 권한 차단 적용 후 상품/API·회원/직원 권한을 다시 확인한다.
- Supabase 인증 Redirect URLs에 운영 /account/confirmed 경로가 허용되어 있는지 확인한다.
- 실제 승인 SKU/환율, 판매자/송금정보, 실계정 인수, 기존 lint/의존성 보안 문제는 개발 배포와 별도 출시 과제로 남는다.
- 예시 PI를 실제 고객에게 자동 이메일 발송하지 않는다.

## 현 시점 검증 범위

- 작업 전 로컬 main과 GitHub main의 기준 SHA는 6885018이며 GitHub 쓰기 권한을 확인했다.
- Cloudflare 대시보드 연결 도구가 실행되지 않아 기존 Workers Builds 연결 여부를 확인하지 못했다.
- 계정 소유 Cloudflare 토큰은 Workers Builds API에서 지원되지 않는다. 대시보드 연결 방식이면 별도 사용자 API 토큰을 받을 필요가 없다.
- 따라서 Git push 성공과 Cloudflare 자동 배포 성공은 각각 확인해 기록한다. 저장소 변경만으로 Cloudflare Git 연결 완료라고 판정하지 않는다.

## 공식 자료

- [Cloudflare Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/)
- [Build 설정](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)
- [Build image 환경변수](https://developers.cloudflare.com/workers/ci-cd/builds/build-image/)
- [OpenNext Build/Runtime 환경변수](https://opennext.js.org/cloudflare/howtos/env-vars)
- [Workers Builds API 권한](https://developers.cloudflare.com/workers/ci-cd/builds/api-reference/)

## 저장소 검증

46개 테스트 묶음·334개 테스트를 통과했다. Cloudflare Build의 실제 환경값이 단위 테스트에 유입되어 외부 Supabase를 호출하지 않도록 jest.environment.ts에서 운영 주소/자격증명을 분리했다. 개별 권한/설정 테스트는 명시적인 fixture 값을 사용한다.

운영 URL을 지정한 npm run build:cloudflare 전체 명령도 통과했다. 범위 lint 오류 0, 기존 이미지 경고 5건, 334개 테스트, Next.js/TypeScript/112개 페이지 및 OpenNext Worker 번들 생성 성공을 확인했다.
