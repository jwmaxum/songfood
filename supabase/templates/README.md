# 송영민푸드 인증 메일 템플릿

2026-10-03: 연결된 songfood Supabase 프로젝트에 적용하고 재조회하여 확인했다.

## 제목과 적용 대상

| 파일 | Supabase 대상 | 제목 |
| --- | --- | --- |
| confirmation.html | Confirm sign up | 송영민푸드 회원가입 확인링크 \| SONGFOOD Sign-up Confirmation |
| magic-link.html | Magic link | 송영민푸드 로그인 확인링크 \| SONGFOOD Sign-in Link |
| subjects.json | 위 두 제목의 소스 | API 필드명에 맞춰 저장 |

현재 앱은 signInWithOtp(shouldCreateUser: true)를 사용한다. 신규 가입 확인과 기존 회원 로그인을 모두 브랜드 메일로 준비했다. 기존 회원은 로그인 제목을 받으며, 가입 여부 확인을 위해 별도의 공개 계정 조회 API를 만들지 않는다.

## 본문

- 기존 송영민푸드 로고, 한영 안내, 인증 버튼, 복사 가능한 대체 링크.
- 개인·사업자 가입 허용 및 회사명·사업자번호 선택 안내(회원가입 메일).
- 일회용 링크·만료 시 재요청·본인 요청이 아닐 때 무시할 수 있다는 안내.
- 외부 CSS·스크립트·추적 픽셀 없이 인라인 스타일과 이메일용 표 레이아웃.
- 인증 주소는 기존 Supabase 변수 `{{ .ConfirmationURL }}`을 그대로 사용한다. URL·토큰을 직접 만들거나 로그에 출력하지 않는다.

로고 주소: https://song-food.jwmaxum.workers.dev/logo.png

공개 HTTPS 응답 200, image/png, 로컬 public/logo.png와 해시 일치를 확인했다. 로컬 PC 주소의 이미지를 넣으면 외부 수신자가 볼 수 없으므로 사용하지 않았다. 로고 파일은 약 1.31 MB인 기존 자산을 그대로 사용한다. 향후 작은 이메일 전용 이미지를 배포하면 이 두 템플릿의 src를 함께 갱신할 수 있다.

이메일 앱에서 외부 이미지가 차단되면 이미지 표시 허용이 필요할 수 있다. 이미지가 보이지 않아도 브랜드 텍스트와 인증 버튼은 사용할 수 있다.

## 운영 적용과 검증

Supabase Dashboard → Authentication → Email Templates에서 각 HTML과 제목을 변경할 수 있다. 저장소 파일을 수정하는 것만으로 호스팅된 Supabase 설정이 자동 변경되지는 않는다.

이번에는 Management API로 다음 4개 항목만 PATCH하고 GET으로 값 일치를 검증했다.

- mailer_subjects_confirmation
- mailer_templates_confirmation_content
- mailer_subjects_magic_link
- mailer_templates_magic_link_content

Supabase가 관리하는 custom_contents 필드에서 해당 제목·본문의 사용자 지정 여부 플래그도 활성화된다. SMTP 서버·계정·발신자명, 인증 링크 처리, Site URL, 리다이렉트 허용 목록은 이번 변경 대상이 아니다.

검증 결과:

- 두 템플릿 × 640px/390px 브라우저 미리보기: 로고 로딩 성공, 가로 넘침 없음.
- 인증 버튼과 대체 링크 모두 ConfirmationURL 사용 확인.
- script/form/iframe, 임의 인증 토큰, 추가 추적 코드 없음.
- 원격 템플릿 4개 항목 재조회 일치.
- 실제 테스트 메일은 별도 발송하지 않았다. Gmail/Outlook 앱의 수신·렌더링과 링크 클릭 검증은 다음 인증 메일에서 확인한다.
- 앱 코드·의존성 변경이 없으므로 전체 앱 빌드를 반복하지 않았다.

미리보기 HTML에는 example.invalid의 비활성 예시 주소를 사용했다. 실제 인증 링크가 아니다.

로컬 증거: .npm-cache/auth-email/preview-results.json, confirmation-390.png, confirmation-640.png, magic-link-390.png, magic-link-640.png, apply-result.json. 이전 두 제목·본문은 같은 폴더의 before.json에 백업했다. 이 폴더는 Git에서 제외된다.

## 복구와 후속 개발

이전 제목·본문으로 되돌리려면 before.json의 4개 항목만 다시 적용한다. 전체 Auth 설정으로 덮어쓰지 않는다. 관리 토큰·SMTP 비밀번호를 HTML이나 저장소에 기록하지 않는다.

다음 개발은 [전체 계획](../../B2B_LAUNCH_DEVELOPMENT_PLAN.md)의 4단계(중복 접수 방지·CRM·견적 초안)다. 이번 메일 브랜딩 변경으로 가입 승인 절차를 추가하지 않았다.

공식 근거: [Supabase 이메일 템플릿](https://supabase.com/docs/guides/auth/auth-email-templates), [이메일 링크 인증](https://supabase.com/docs/guides/auth/auth-email-passwordless).
