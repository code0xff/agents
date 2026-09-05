# Agent Marketplace 리서치

날짜: 2026-09-05

## 목표
마켓플레이스 목록 + URL을 넘어, 각 플랫폼에서 **신규 에이전트/서비스 추가와 활동 지표를 긁어올 수 있는지** 확인한다.

## 후보와 수집 가능 데이터
| 마켓플레이스 | URL | 유형 | 브라우저 직접 | 긁어올 수 있는 것 | 판정 |
|---|---|---|---|---|---|
| x402 Bazaar (Coinbase CDP) | `https://api.cdp.coinbase.com/platform/v2/x402/discovery/resources` | x402 서비스 디스커버리 | CORS 차단 | 16,161개 유료 API/MCP 리소스, `lastUpdated`로 신규 감지, 가격·네트워크·payTo | **CI 스냅샷** (핵심) |
| PayAI Bazaar | `https://facilitator.payai.network/discovery/resources` | 동상 | 차단 | PayAI 등록 리소스(Avalanche 등) | CI 스냅샷 |
| ERC-8004 Identity Registry | 온체인 (Base/Eth/BNB) | 에이전트 레지스트리 | **OK** (RPC) | 신규 등록 실시간 | 실시간 (`registry.md`) |
| agentscan.info | `https://agentscan.info/api/agents?page_size=N`, `/api/activities`, `/api/stats` | 8004 탐색기 | 차단 | 22네트워크 541k 에이전트, 신규순 정렬, 이름/스킬/평판, 활동 피드 | CI 스냅샷 |
| RNWY | `https://rnwy.com/api/agents` | 8004 트러스트 인덱스 | 차단 | 12체인 신규 등록, 스코어, MCP/A2A 엔드포인트 | CI 스냅샷(보조) |
| On-Chain Agent Intel | `https://api.onchainagentintel.io/v1/public/*` | 8004 인덱스 (Base/Eth) | **OK** | stats, top MCP/OpenAPI/most-recent 리더보드, 체인별 ready 에이전트 | 실시간 |
| agenteconomy.to | `https://dashboard.agenteconomy.to/data.json` | 집계 대시보드 | **OK** | x402·8004·Olas·Virtuals ACP·Tempo MPP 총계/일별 | 실시간(집계) |
| Virtuals ACP | `https://app.virtuals.io`, `acpx.virtuals.io` (facilitator) | 에이전트 커머스 | 미확인 | 일별 memo 수는 agenteconomy에 있음 (12.3M 누적) | 링크 + 집계 |
| Olas Mech Marketplace | `https://olas.network/mech-marketplace` | 에이전트 간 작업 시장 (Gnosis 주력) | 미확인 | 주간 tx는 agenteconomy에 있음 (19.2M 누적) | 링크 + 집계 |
| 8004scan (AltLayer) | `https://8004scan.io` | 탐색기 | API 없음(404) | — | 링크만 |
| Quicknode ERC-8004 Explorer | `https://erc-8004.quicknode.com` | 탐색기 | API 없음 | — | 링크만 |
| Agent Arena | `https://agentarena.site` | 서비스 카탈로그 | API 없음 | — | 링크만 |
| 2s | `https://2s.io` | 570+ x402 엔드포인트 | API 없음 | — | 링크만 |
| ClawHub | `https://clawhub.com` | OpenClaw 스킬 레지스트리(오프체인) | 미확인 | 3,000+ 스킬 | 링크만(범위 밖) |
| Moltbook | `https://moltbook.com` | 에이전트 소셜(Meta 인수) | 미확인 | — | 링크만(범위 밖) |
| 8k4 Protocol | — | — | 410 Gone | 서비스 종료 | 제외 |

## 응답 샘플 (요약)
- CDP Bazaar: `{items:[{accepts:[{network:"eip155:8453",payTo,amount,asset}],resource,type:"http"|"mcp",lastUpdated,x402Version:2}],pagination:{limit,offset,total:16161}}`
- agentscan `/api/agents`: `{items:[{name,address,description,network_id,token_id,owner_address,reputation_score,skills[],created_at}],total,page,page_size}`
- onchainagentintel `/v1/public/stats`: `{agents_indexed:25708,mcp_agents,openapi_agents,chains_breakdown:{base,eth}}`

## 결론 / 채택
1. 마켓플레이스 카드는 `src/data/marketplaces.json` 정적 목록(이름, URL, 유형, 체인, 프로토콜, 수집 방식 배지).
2. **CI 스냅샷 파이프라인**: GitHub Actions 스케줄(6시간)로 아래를 fetch → `public/snapshots/*.json` 커밋 → Pages 재배포. 백엔드 없이 CORS 차단 소스를 우회한다.
   - `bazaar-cdp.json`: 전체 페이지네이션(100씩, 429 백오프) → resource, payTo, network, price, lastUpdated
   - `bazaar-payai.json`
   - `agentscan-newest.json`: 신규순 200건 + `/api/stats`
   - 각 스냅샷 diff로 "신규 추가" 피드 생성 (이전 스냅샷과 비교, `addedAt` 기록)
3. 브라우저 실시간: 8004 온체인 이벤트, onchainagentintel, agenteconomy.
4. 카드에 표시할 활동 지표: 리소스 수, 최근 24h 신규, 체인 분포, (있으면) 누적 tx.

## 미해결
- CDP Bazaar rate limit(429) 실측 — 16k건/100 = 162 요청, CI에서 백오프로 처리.
- Virtuals/Olas 자체 공개 API 존재 여부는 2차 리서치.
