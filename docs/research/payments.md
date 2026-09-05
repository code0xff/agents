# x402 결제 / Facilitator 리서치

날짜: 2026-09-05

## 목표
메이저 facilitator 기준으로 실제 에이전트 결제가 일어나는 흐름(payer → facilitator → 수취 서비스)을 브라우저에서 직접 관측해 그래프로 표시한다.

## 결제 메커니즘 (온체인 식별 방법)
- x402 `exact` 스킴은 EIP-3009 `transferWithAuthorization` / `receiveWithAuthorization`을 **facilitator EOA가 USDC 컨트랙트에 호출**해 정산한다.
- 따라서 결제 1건 = `tx.to == USDC && selector ∈ {transferWithAuthorization, receiveWithAuthorization}` 인 트랜잭션. `tx.from` = facilitator, calldata의 `(from, to, value)` = payer, 수취 서비스, 금액.
- USDC(Base): `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`. Transfer 이벤트 topic0 `0xddf252ad…`.
- 로그(getLogs)만으로는 tx 발신자를 알 수 없으므로 **블록을 full tx로 가져와 필터링**해야 한다.

### 실측 (Base, `mainnet.base.org`, 61블록 ≈ 2분)
| 항목 | 값 |
|---|---|
| 블록당 fetch 시간 | ~350ms (31블록 10.7s) |
| 61블록 내 EIP-3009 USDC 호출 | 38건 (≈ 0.3건/s) |
| 최다 발신자 | `0x97acce27…` (누적 3.16M tx, 라벨 없음), `0x13600897…`, `0xa32ccda9…` |
| 알려진 facilitator 목록과 일치 | **0건** |

→ 현재 실제 볼륨을 내는 facilitator 주소들은 공개 목록(x402.watch, @swader/x402facilitators, BaseScan 라벨)에 **없다**. Coinbase 등이 주소를 로테이션하거나 신규 facilitator일 가능성. 따라서 "알려진 라벨"과 "미라벨 고빈도 발신자"를 모두 노드로 취급해야 실제 흐름이 보인다.

## Facilitator 디렉토리
| 소스 | 형태 | 브라우저 직접 | 내용 |
|---|---|---|---|
| `https://facilitators.x402.watch/` | GitHub Pages 정적 HTML | OK (`ACAO: *`) | 19개 facilitator, URL·네트워크·온체인 주소 (Base 57개 주소) |
| `@swader/x402facilitators` (npm 0.0.14, 2025-11) | TS 패키지 | 번들 가능 (jsDelivr OK) | 같은 데이터의 타입드 소스. 의존성 `x402`, `@coinbase/x402` 무거움 → 주소만 `src/data/facilitators.json`으로 복사해 사용 |
| BaseScan 라벨 `x402` | HTML | 스크랩 불가 | 19개 주소 (Coinbase 1~10, Daydreams, X402rs 2·4, Canza) — 수동 반영 |
| agenteconomy `data.json` `x402.*` | JSON | **OK** | 누적 tx 183M, 볼륨 $41.6M, 18개 facilitator 추적, 월별/일별(60일)/체인별/프로토콜 점유율(PayAI 26%, Coinbase, Daydreams…) |

### 메이저 facilitator (Base 기준, 주소는 `src/data/facilitators.json`에 전량 기록)
Coinbase(10), Daydreams(1, `0x279e08f7…`), X402rs(6), PayAI(5), Questflow(10), Heurist(9), CodeNut(4), AurraCloud(3), OpenX402(2), Thirdweb(1), Virtuals ACP(1), KAMIYO(1), Ultravioleta(1), Mogami, 402104, xEcho. Polygon Facilitator 24개(Polygon).
web3trackers 집계: Daydreams 8.1M, Coinbase 7.6M, X402rs 411k tx.

## 리소스/서비스 디스커버리 (Bazaar)
| 엔드포인트 | curl | 브라우저 | 내용 |
|---|---|---|---|
| `https://api.cdp.coinbase.com/platform/v2/x402/discovery/resources?limit=100&offset=N` | 200, 무인증 | **CORS 차단** | 16,161개 리소스. `accepts[]{network,payTo,amount,asset}`, `resource`, `type`, `lastUpdated`. 네트워크 분포: Base 대부분, Solana, Arbitrum, Polygon, Monad |
| `https://facilitator.payai.network/discovery/resources` | 200 | 차단 | PayAI 등록 리소스 |
| `https://facilitator.daydreams.systems/supported` | 200 | 차단 | 지원 네트워크(eip155:1/8453, solana), `upto` 스킴 |

→ Bazaar는 **CI 스냅샷**으로 수집 (payTo 주소 → 서비스 URL 매핑 테이블을 만들면 결제 그래프의 수취 노드에 이름을 붙일 수 있다).

## 결론 / 채택
1. **실시간 결제 스트림**: Base `mainnet.base.org`에서 10초마다 최신 블록(≈5개)을 full tx로 가져와 USDC EIP-3009 호출을 추출. viem `decodeFunctionData`로 payer/payTo/amount 복원.
2. **facilitator 식별**: `src/data/facilitators.json`(x402.watch + BaseScan 라벨) 매칭 → 이름. 미매칭 발신자는 세션 내 카운트가 3건 이상이면 "Unlabeled facilitator" 노드로 승격.
3. **수취 서비스 이름**: CI가 수집한 Bazaar 스냅샷의 `payTo → resource` 매핑으로 보강.
4. **집계 카드**: agenteconomy `data.json`의 x402 총계·일별·점유율.
5. 그래프: D3 force. 중앙 facilitator 노드, 결제마다 payer→facilitator→payTo 엣지 파티클.

## 미해결
- 블록 full fetch 부하: 5블록/10s ≈ 2.5MB/10s. 모바일 고려해 폴링 간격 조절 옵션.
- Solana 측 결제(전체의 ~26%)는 범위 밖(EVM만).
- `upto` 스킴(Daydreams)이 다른 컨트랙트 경로를 쓰는지 확인 필요.
