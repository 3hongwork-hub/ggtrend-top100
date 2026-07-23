# 프로젝트 컨텍스트 노트 (Context Notes)

## gitblog-agent 아키텍처 적용 Rationale
- **블로그 포스트 자동 발행**: `proud-bohr` (GitBlog Agent) 아키텍처를 계승합니다. 매일 수집된 구글 트렌드 상위 100개 데이터와 이슈 요약본을 `_posts/YYYY-MM-DD-google-trends-top100.md` 형태의 Jekyll/GitHub Pages 호환 블로그 포스트로 자동 생성합니다.
- **README 및 포스트 목록 자동 갱신**: 생성된 마크다운 포스트를 바탕으로 레포지토리 `README.md`의 발행 포스트 목록 테이블을 자동으로 업데이트합니다.
- **인터랙티브 웹 대시보드**: 정적 블로그 포스트뿐만 아니라 `index.html`을 통해 글래스모피즘 기반의 상위 100개 순위, 실시간 검색, 요약본 모달, 뷰 모드 전환(카드/테이블) 기능을 제공합니다.
- **자동화 CI/CD**: `.github/workflows/daily_trends_post.yml`을 통해 GitHub Actions에서 매일 아침(KST 09:00 / UTC 00:00) 데이터를 수집, 포스트 작성, Git auto-commit 및 GitHub Pages 배포까지 전과정을 자율 처리합니다.
