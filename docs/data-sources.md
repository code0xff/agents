# 데이터 소스 총람

> 각 항목은 리서치(`docs/research/`)로 검증 후 채워 넣는다. 미검증 항목은 `(미검증)` 표기.

## 온체인

| 체인 | RPC(기본) | 용도 |
|---|---|---|
| Base | `VITE_RPC_BASE` | ERC-8004 registry, x402 결제 (USDC) — 주력 |
| Ethereum | `VITE_RPC_ETHEREUM` | ERC-8004 registry |
| Polygon | `VITE_RPC_POLYGON` | (미검증) |

### ERC-8004 (Trustless Agents)
- Identity Registry / Reputation Registry / Validation Registry 컨트랙트 주소: (미검증, 리서치 필요)
- 이벤트: 에이전트 등록/갱신 — 시그니처 확인 필요

### x402 Facilitator
- Coinbase facilitator (`x402.org`) 등 메이저 facilitator 목록: (미검증)
- 결제는 EIP-3009 `transferWithAuthorization` → USDC `Transfer` 이벤트 + facilitator 주소로 필터링 가능성 검토

## 공개 API / 마켓플레이스
(리서치 후 기입) — 각 마켓플레이스별 목록/신규 에이전트/활동 지표 API 여부

## 제약
- 공개 RPC `eth_getLogs` 블록 범위 제한 (보통 1k~10k 블록) → 청크 분할 필요
- CORS 미허용 API는 사용 불가(프록시 금지) → 정적 스냅샷 대안
