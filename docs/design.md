# 디자인 시스템

## 톤
모노톤, 세련됨, 미래지향. 다크 기본. 컬러 강조 금지 — 명도, 굵기, 모션으로 위계를 만든다.

## 색 토큰 (`src/index.css` `@theme`)
`ink-950`(배경) … `ink-50`(최고 강조 텍스트). 배경 `ink-950`, 패널 `ink-900/60 + backdrop-blur`,
경계 `ink-800`, 본문 `ink-100`, 보조 텍스트 `ink-400`, 비활성 `ink-500`.
상태(성공/실패)도 색이 아니라 아이콘·명도·모션으로 표현.

## 타이포
Inter(본문), JetBrains Mono(수치·주소·로그). 라벨은 mono + 넓은 자간 + 대문자.

## 배경
`.bg-grid` 미세 격자. 필요 시 GSAP로 느린 패럴랙스.

## 모션 원칙
- 진입: motion `initial/animate`, 짧은 stagger (0.1~0.15s)
- 스크롤: Lenis 부드러운 스크롤 + GSAP ScrollTrigger
- 실시간 이벤트(로그·결제): 새 항목은 위에서 슬라이드-인, 기존 항목은 `layout` 애니메이션
- 그래프: D3 트랜지션, 노드 펄스는 명도 변화만
- 숫자: 카운트업 애니메이션 (motion `animate` 또는 GSAP)
- 절대 직접 keyframe을 대량 작성하지 않는다. 라이브러리 우선.

## 컴포넌트 규칙
- 둥근 모서리 `rounded-lg`, 경계 1px, 그림자 없음(glow 대신 blur 배경)
- 밀도 높은 데이터는 mono 폰트 + 작은 크기(`text-xs`)
