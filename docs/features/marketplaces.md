# 기능 1: Agent Marketplace 디렉토리

## 목표
존재하는 에이전트 마켓플레이스를 한눈에 보여주고, 각각의 URL과 **현재 활동 데이터**를 제공.

## 최소 범위
이름, 설명, URL, 체인/프로토콜(x402, ERC-8004, MCP 등), 상태(live/beta)

## 확장 범위 (리서치로 가능 여부 확인 — AGENTS.md 대전제 3)
- 신규 에이전트 추가 피드
- 등록 에이전트 수, 거래/호출 수 등 지표
- 카테고리 분포
- 온체인 이벤트로 얻을 수 있으면 실시간, 아니면 정적 스냅샷

## 데이터
`src/data/marketplaces.json` 정적 기본 + 마켓플레이스별 `fetcher`

## UI / 모션
카드 그리드, stagger 진입, 호버 시 명도 상승. 활동 지표는 카운트업.

## 리서치
`docs/research/marketplaces.md` (작성 전)
