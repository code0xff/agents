# 기능 3: Facilitator 기준 x402 결제 흐름 그래프

## 목표
메이저 facilitator를 중심으로 실제 에이전트 결제가 일어나는 모습을 그래프(노드-엣지)로 시각화.

## 데이터
- facilitator 주소 목록 (리서치)
- USDC `Transfer` 이벤트 중 facilitator 관련 트랜잭션, 또는 facilitator 공개 API
- payer → facilitator → resource server 흐름 재구성

## UI / 모션
D3 force graph. facilitator 중앙 노드, 결제 발생 시 엣지 따라 파티클 이동, 노드 명도 펄스.
최근 결제 목록을 사이드에 병행 표시.

## 리서치
`docs/research/payments.md` (작성 전) — facilitator 목록/주소, 온체인 식별 방법, 공개 API 존재 여부
