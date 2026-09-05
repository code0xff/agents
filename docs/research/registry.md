# ERC-8004 레지스트리 리서치

날짜: 2026-09-05

## 목표
메이저 체인의 Identity Registry에서 최근 등록 에이전트를 브라우저에서 직접 읽어 실시간 로그로 표시한다.

## 확정 사실

### 컨트랙트 (검증: erc-8004-contracts 리포, agentscan.info `/api/networks`, 온체인 `eth_getCode`)
| 레지스트리 | 주소 (모든 메인넷 동일 싱글톤) |
|---|---|
| IdentityRegistry (ERC-721) | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` |
| ReputationRegistry | `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63` |

- `0x8004A818BFB912233c491871b3d84c89A494BD9e` / `0x8004B663…`은 **Sepolia 테스트넷** 주소. 일부 블로그가 메인넷으로 잘못 표기함. 사용 금지.
- 메인넷 배포 체인(30+): Ethereum, Base, BNB, Arbitrum, Optimism, Polygon, Avalanche, Linea, Scroll, Celo, Gnosis, Mantle, Monad, Abstract 등.
- 등록 수 규모(agenteconomy 2026-09-04): 전체 554k, BNB 328k, Base 86k, Ethereum 68k.

### 이벤트 (EIP 텍스트에서 추출, keccak 직접 계산)
| 이벤트 | 시그니처 | topic0 |
|---|---|---|
| Registered | `Registered(uint256 indexed agentId, string agentURI, address indexed owner)` | `0xca52e62c367d81bb2e328eb795f7c7ba24afb478408a26c0e201d155c449bc4a` |
| URIUpdated | `URIUpdated(uint256 indexed agentId, string newURI, address indexed updater)` | `0x3a2c7fffc2cba7582c690e3b82c453ea02a308326a98a3ad7576c606336409fb` |
| MetadataSet | `MetadataSet(uint256 indexed agentId, string indexed indexedMetadataKey, string metadataKey, bytes metadataValue)` | `0x2c149ed548c6d2993cd73efe187df6eccabe4538091b33adbd25fafdb8a1468b` |
| NewFeedback (Reputation) | `NewFeedback(uint256 indexed agentId, address indexed clientAddress, uint64 feedbackIndex, int128 value, uint8 valueDecimals, string indexed indexedTag1, string tag1, string tag2, string endpoint, string feedbackURI, bytes32 feedbackHash)` | `0x6a4a61743519c9d648a14e6493f47dbe3ff1aa29e7785c96c8326a205e58febc` |

읽기 함수: `tokenURI(uint256)` (= agentURI), `getAgentWallet(uint256)`, `getMetadata(uint256,string)`.

### 공개 RPC 실측 (`eth_getLogs`, Registered 필터, 브라우저 Origin 헤더로 CORS 확인)
| 체인 | RPC | getLogs 범위 | CORS | 비고 |
|---|---|---|---|---|
| Base | `https://mainnet.base.org` | 10,000 블록 OK (78 logs, 350ms) | `*` | **주력**. publicnode/1rpc는 getLogs 거부 |
| Ethereum | `https://gateway.tenderly.co/public/mainnet`, `https://rpc.mevblocker.io` | 10,000 OK (tenderly 50k OK, mevblocker 10k 제한) | `*` | drpc는 "Can't route" 간헐 실패로 제외. publicnode(아카이브 토큰 요구)/ankr(인증)/1rpc(50블록)/blastapi/zan/blockrazor 거부 |
| BNB | `https://bsc-rpc.publicnode.com` | 5,000 OK (27 logs) | 미확인(다음 단계) | binance dataseed는 범위 초과 거부. drpc는 429 |
| Polygon | `https://polygon-bor-rpc.publicnode.com` | 1,000 OK | 미확인 | polygon-rpc.com 401 |
| Arbitrum | `https://arb1.arbitrum.io/rpc` | 5,000 OK | 미확인 | 활동 적음 |
| Optimism | `https://mainnet.optimism.io` | 5,000 OK | 미확인 | 활동 적음 |

→ 1차 구현은 **Base + Ethereum + BNB**. 각 체인은 위 RPC 1개 + fallback으로 구성.

### agentURI 실측 (Base 최근 10k 블록, 78건)
- 빈 URI 27건 (등록 후 setAgentURI 미호출), `data:` URI 45건 (JSON 인라인 — 즉시 파싱 가능), https 5건, ipfs 1건.
- https 메타데이터 호스트(flextrust.io, S3 등)는 **CORS 헤더 없음** → 브라우저 fetch 실패. ipfs.io 게이트웨이는 curl 기준 `ACAO: *`이나 브라우저 실측에서 fetch 실패(게이트웨이 지연/404 추정, 구현 시 재검증).
- 결론: `data:` URI는 디코드해서 이름/설명 표시, `ipfs://`는 게이트웨이 시도 후 실패 시 생략, https는 **시도하지 않고 링크만** 표시.

### 등록 파일 JSON 주요 필드
`type`, `name`, `description`, `image`, `services[]{name,endpoint}`, `active`, `registrations[]{agentId,agentRegistry}`, `supportedTrust[]`, `x402Support`.

## 보조 소스 (브라우저 CORS)
| 소스 | 브라우저 직접 | 내용 |
|---|---|---|
| `https://dashboard.agenteconomy.to/data.json` | **OK** (`ACAO: *`) | 체인별 등록 총계, 90일 일간 등록 수, x402/Olas/ACP 집계. 하루 1~2회 갱신 |
| `https://api.onchainagentintel.io/v1/public/{stats,leaderboards}` | **OK** | Base/Eth 인덱스 통계, most-recent 리더보드 |
| `https://agentscan.info/api/{agents,stats,activities,networks}` | **차단** | 22개 네트워크 541k 에이전트, 신규순 정렬, 활동 피드 — CI 스냅샷 후보 |
| `https://rnwy.com/api/agents` | **차단** | 12체인 트러스트 스코어 — CI 스냅샷 후보 |

## 결론 / 채택
1. 실시간 로그: viem `getLogs`를 Base(10k)·Ethereum(5k)·BNB(5k) 범위로 초기 로드, 이후 15s 폴링으로 `head` 이후 블록만 조회.
2. 메타데이터: `data:` 즉시 디코드, `ipfs://` 게이트웨이 시도, https는 링크만.
3. 총계·추세: agenteconomy `data.json` 사용.
4. 체인별 신규 에이전트 상세(이름/스킬)는 agentscan 스냅샷으로 보강 (CI, `docs/research/marketplaces.md` 참고).

## 미해결
- BNB publicnode는 구현 시 브라우저에서 정상 동작 확인(2026-09-05). Polygon 미구현.
- `Registered`에 URI가 비어 있고 나중에 `URIUpdated`로 채워지는 케이스 → 두 이벤트 모두 구독해 병합.
