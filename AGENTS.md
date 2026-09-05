# Agent Economy Observatory — AGENTS.md

AI 에이전트 경제(마켓플레이스 · ERC-8004 등록 · x402 결제)를 **백엔드 없이** 브라우저에서 직접
공개 데이터에 접근해 시각화하는 대시보드. GitHub Pages로 배포한다.

## 대전제 (반드시 지킬 것)

1. **백엔드 없음.** 모든 데이터는 브라우저에서 공개 RPC / 공개 API / 정적 JSON으로 직접 가져온다.
   서버, DB, 서버리스 함수 금지. 비밀 키 사용 금지(번들에 노출됨).
2. **기능 개발 전 리서치 필수.** 어떤 기능이든 구현 전에 `docs/research/`에 조사 결과를 남기고,
   데이터 소스·접근 방식·제약(CORS, rate limit, 인증)을 확인한 뒤 시작한다.
   리서치 없이 코드를 쓰지 않는다. 절차는 `docs/workflow.md` 참고.
3. **마켓플레이스는 목록 이상을 노린다.** 이름/URL만 보여주는 데 그치지 말고, 각 마켓플레이스에서
   신규 에이전트 추가, 거래/결제 이벤트, 카테고리, 평판 등 **추가로 긁어올 수 있는 데이터가 있는지**
   반드시 확인하고(API, 온체인 이벤트, RSS, 공개 페이지 등), 가능한 것은 대시보드에 반영한다.
4. **UI는 모노톤 · 세련됨 · 미래지향.** 색은 무채색 토큰(`ink-*`)만 사용, 강조도 명도 차이로.
   가이드는 `docs/design.md`.
5. **애니메이션은 직접 만들지 말고 라이브러리를 쓴다.** motion(Framer Motion), GSAP, Lenis, D3
   트랜지션을 적극 활용. 커스텀 keyframe은 최소화.
6. **Tailwind v4 우선.** 별도 CSS 파일/CSS-in-JS 지양. 토큰은 `src/index.css`의 `@theme`에서 관리.
7. **정적 배포 호환.** 라우팅·경로·환경변수는 GitHub Pages(`base` 경로) 기준으로 동작해야 한다.

## 기술 스택

Vite 8 · React 19 · TypeScript · Tailwind v4 · motion · GSAP · Lenis · D3 · viem/wagmi · TanStack Query

## 문서 인덱스 (상세는 여기서 찾는다)

| 파일 | 내용 |
|---|---|
| `docs/workflow.md` | 개발 절차: 리서치 → 설계 → 구현 → 검증. 리서치 문서 템플릿 |
| `docs/architecture.md` | 디렉토리 구조, 데이터 흐름, 상태 관리, 모듈 경계 |
| `docs/design.md` | 디자인 시스템: 색 토큰, 타이포, 모션 원칙, 컴포넌트 규칙 |
| `docs/data-sources.md` | 데이터 소스 총람: 체인 RPC, 컨트랙트 주소, 공개 API, 제약 사항 |
| `docs/deploy.md` | GitHub Pages 배포, `base` 경로, SPA fallback, 환경변수 |
| `docs/features/marketplaces.md` | 기능 1: 마켓플레이스 디렉토리 + 추가 데이터 수집 |
| `docs/features/registry.md` | 기능 2: ERC-8004 에이전트 등록 이벤트 로그 |
| `docs/features/payments.md` | 기능 3: Facilitator 기준 x402 결제 흐름 그래프 |
| `docs/research/` | 기능별 사전 리서치 결과 (구현 전 필수 작성). registry / payments / marketplaces 완료 |

## 명령

```
npm run dev      # 로컬 개발
npm run build    # tsc + vite build → dist/
npm run preview  # 빌드 결과 미리보기
npm run lint     # oxlint
```
