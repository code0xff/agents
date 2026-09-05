# 아키텍처

## 디렉토리

```
src/
  main.tsx              # 진입, QueryClientProvider
  App.tsx               # 레이아웃 셸
  index.css             # Tailwind + @theme 토큰
  components/           # 공용 UI (Panel, Badge, AnimatedNumber ...)
  lib/                  # chains.ts(viem 클라이언트), format.ts, 공통 fetch 유틸
  data/                 # 정적 JSON (마켓플레이스 목록, 컨트랙트 주소 등)
  features/
    marketplaces/       # 기능 1
    registry/           # 기능 2
    payments/           # 기능 3
docs/                   # 문서
public/404.html         # GH Pages SPA fallback
```

## 데이터 흐름

브라우저 → (viem) 공개 RPC `getLogs` / `readContract`
브라우저 → (fetch) 공개 REST API (CORS 허용된 것만)
정적 JSON (`src/data/`) → 빌드에 포함

모든 원격 호출은 TanStack Query로 감싼다. 폴링 간격은 기능 문서에 정의.

## 상태

서버 상태: TanStack Query. UI 상태: React 로컬 상태. 전역 스토어 도입은 필요할 때만.

## 체인 클라이언트

`src/lib/chains.ts`에서 체인별 viem `PublicClient`를 생성. RPC URL은 `VITE_RPC_*` 환경변수,
기본값은 공개 엔드포인트. 여러 RPC를 fallback으로 묶는다.
