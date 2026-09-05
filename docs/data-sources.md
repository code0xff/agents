# 데이터 소스 총람

검증일 2026-09-05. 상세 근거는 `docs/research/`.

## 온체인 (브라우저 → 공개 RPC, CORS 확인됨)
| 체인 | RPC | getLogs 범위 | 용도 |
|---|---|---|---|
| Base (8453) | `https://mainnet.base.org` | 10k | ERC-8004 등록 로그, x402 결제 블록 스캔 (주력) |
| Ethereum (1) | `https://gateway.tenderly.co/public/mainnet` (fallback `https://rpc.mevblocker.io`) | 10k (tenderly는 50k도 OK) | ERC-8004 등록 로그. drpc는 getLogs 라우팅 실패가 잦아 교체 |
| BNB (56) | `https://bsc-rpc.publicnode.com` | 5k | ERC-8004 등록 로그 (CORS 미확인) |

### ERC-8004 (모든 메인넷 동일 주소)
- IdentityRegistry `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`
- ReputationRegistry `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63`
- 이벤트 topic0: Registered `0xca52e62c…`, URIUpdated `0x3a2c7fff…` (전체는 `research/registry.md`)

### x402 결제 (Base)
- USDC `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- 결제 = facilitator EOA → USDC `transferWithAuthorization`/`receiveWithAuthorization` 호출. 블록 full-tx 스캔으로 감지.
- facilitator 주소 목록: `src/data/facilitators.json` (출처 facilitators.x402.watch, BaseScan 라벨)

## 공개 API — 브라우저 직접 (CORS OK)
| 소스 | 내용 |
|---|---|
| `https://dashboard.agenteconomy.to/data.json` | x402/8004/Olas/ACP 집계, 일별 추세 |
| `https://api.onchainagentintel.io/v1/public/{stats,leaderboards}` | Base/Eth 에이전트 인덱스, most-recent |

## 공개 API — CORS 차단 → CI 스냅샷 (`public/snapshots/`, `scripts/snapshot.mjs`, 6시간 주기)
| 소스 | 스냅샷 |
|---|---|
| `https://api.cdp.coinbase.com/platform/v2/x402/discovery/resources` | `bazaar-cdp.json` |
| `https://facilitator.payai.network/discovery/resources` | `bazaar-payai.json` |
| `https://agentscan.info/api/{agents,stats}` | `agentscan.json` (page_size 최대 100) |

스냅샷 파일: `<name>.json`(최근 300건 + 총계, 브라우저용), `<name>.payto.json`(payTo → 서비스 호스트 매핑), `data/snapshot-state/<name>.json`(diff용 전체 키, 배포 제외).

## 정적 데이터 (`src/data/`)
- `marketplaces.json` — 마켓플레이스 카드 목록
- `facilitators.json` — facilitator 이름/URL/네트워크/주소
- `chains.json` — 체인 메타(이름, RPC, 탐색기)

## 제약
- 공개 RPC 범위 제한: 위 표 기준. 청크 분할 + 15s 폴링.
- 에이전트 메타데이터 https 호스트 대부분 CORS 없음 → `data:` URI만 파싱, 나머지 링크.
- Solana 결제는 범위 밖.
