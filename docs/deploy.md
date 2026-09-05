# 배포 (GitHub Pages)

- 워크플로: `.github/workflows/deploy.yml` — `main` push 시 빌드 후 Pages 배포
- 리포 설정에서 Pages Source를 **GitHub Actions**로 지정
- `base` 경로: `vite.config.ts`가 `VITE_BASE` (기본 `/agents/`)를 사용. CI는 리포 이름으로 자동 주입.
  커스텀 도메인/`<user>.github.io` 리포면 `VITE_BASE=/`
- SPA fallback: `public/404.html`이 경로를 `?p=`로 넘겨 리다이렉트. 라우터 도입 시 이를 복원하는 코드 필요.
- 환경변수는 `VITE_` 접두사만 번들에 포함. 비밀 값 절대 금지.
- 스냅샷 워크플로 `.github/workflows/snapshot.yml`: 6시간마다 `scripts/snapshot.mjs` 실행 후 `public/snapshots`, `data/snapshot-state` 커밋 → push가 배포 워크플로를 트리거. 리포 Settings → Actions → Workflow permissions를 **Read and write**로 설정해야 한다.
- 로컬 확인: `VITE_BASE=/agents/ npm run build && npm run preview`
