# 기능 2: ERC-8004 에이전트 등록 이벤트 로그

## 목표
메이저 체인의 ERC-8004 Identity Registry에서 최근 등록된 에이전트를 실시간 로그로 표시.

## 데이터
- 체인별 registry 컨트랙트 → `getLogs` (등록/갱신 이벤트)
- 에이전트 메타데이터(agent URI / registration file) fetch — CORS 여부 확인
- 폴링 간격: 15~30s, 블록 범위 청크 처리

## UI / 모션
터미널 느낌의 로그 스트림. 새 항목 상단 슬라이드-인, 체인 배지, 주소 mono 축약, 상대 시간.

## 리서치
`docs/research/registry.md` (작성 전) — 컨트랙트 주소, ABI, 이벤트 시그니처, 배포 체인 확정
