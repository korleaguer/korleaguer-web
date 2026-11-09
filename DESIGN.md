---
name: KOR Leaguer
description: 한국 MLB 선수들의 최근 경기 한 줄 기록. 경기 하나는 카드 하나.
colors:
  background: "#eef0f3"
  foreground: "#111827"
  surface: "#ffffff"
  surface-2: "#f4f5f7"
  line: "#eceef1"
  avatar-bg: "#e8ebef"
  muted: "#5b6270"
  accent: "#2563eb"
  accent-fg: "#ffffff"
  accent-ink: "#1d4ed8"
  accent-soft: "#e8efff"
  neutral-pill: "#e5e7eb"
  neutral-pill-fg: "#374151"
  notice-bg: "#fff4dc"
  notice-fg: "#6b4300"
  notice-mark: "#b45309"
  background-dark: "#0e1116"
  foreground-dark: "#e8eaee"
  surface-dark: "#191d24"
  surface-2-dark: "#222731"
  line-dark: "#2a303a"
  avatar-bg-dark: "#2c323c"
  muted-dark: "#9aa3b0"
  accent-ink-dark: "#8db1ff"
  accent-soft-dark: "#1d2a47"
  neutral-pill-dark: "#2e3440"
  neutral-pill-fg-dark: "#d3d8e0"
  notice-bg-dark: "#33260b"
  notice-fg-dark: "#ffe2a3"
  notice-mark-dark: "#f5b94a"
typography:
  display:
    fontFamily: "Pretendard Variable, Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Apple SD Gothic Neo, Noto Sans KR, Malgun Gothic, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 800
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  stat-hero:
    fontFamily: "Pretendard Variable, Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Apple SD Gothic Neo, Noto Sans KR, Malgun Gothic, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 800
    lineHeight: 1.25
    letterSpacing: "-0.02em"
    fontFeature: "tnum"
  stat-form:
    fontFamily: "Pretendard Variable, Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Apple SD Gothic Neo, Noto Sans KR, Malgun Gothic, sans-serif"
    fontSize: "2.75rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.03em"
    fontFeature: "tnum"
  score:
    fontFamily: "Pretendard Variable, Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Apple SD Gothic Neo, Noto Sans KR, Malgun Gothic, sans-serif"
    fontSize: "1.3125rem"
    fontWeight: 800
    lineHeight: 1.25
    letterSpacing: "0.02em"
    fontFeature: "tnum"
  headline:
    fontFamily: "Pretendard Variable, Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Apple SD Gothic Neo, Noto Sans KR, Malgun Gothic, sans-serif"
    fontSize: "1.1875rem"
    fontWeight: 800
    letterSpacing: "-0.02em"
  card-name:
    fontFamily: "Pretendard Variable, Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Apple SD Gothic Neo, Noto Sans KR, Malgun Gothic, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 800
    lineHeight: 1.375
    letterSpacing: "-0.02em"
  wordmark:
    fontFamily: "Pretendard Variable, Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Apple SD Gothic Neo, Noto Sans KR, Malgun Gothic, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 800
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Pretendard Variable, Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Apple SD Gothic Neo, Noto Sans KR, Malgun Gothic, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.5
  summary-line:
    fontFamily: "Pretendard Variable, Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Apple SD Gothic Neo, Noto Sans KR, Malgun Gothic, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
    lineHeight: 1.45
  body:
    fontFamily: "Pretendard Variable, Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Apple SD Gothic Neo, Noto Sans KR, Malgun Gothic, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
  label:
    fontFamily: "Pretendard Variable, Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Apple SD Gothic Neo, Noto Sans KR, Malgun Gothic, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.25
  caption:
    fontFamily: "Pretendard Variable, Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Apple SD Gothic Neo, Noto Sans KR, Malgun Gothic, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.33
  micro:
    fontFamily: "Pretendard Variable, Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Apple SD Gothic Neo, Noto Sans KR, Malgun Gothic, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 400
    fontFeature: "tnum"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  full: "9999px"
spacing:
  xxs: "4px"
  xs: "6px"
  sm: "10px"
  md: "12px"
  lg: "16px"
  xl: "28px"
  header: "56px"
  container: "1080px"
components:
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.xl}"
    padding: "16px"
  game-card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.xl}"
    padding: "12px"
  score-band:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.foreground}"
    typography: "{typography.score}"
    rounded: "{rounded.lg}"
    padding: "10px 12px"
  result-pill-win:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-fg}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  result-pill-loss:
    backgroundColor: "{colors.neutral-pill}"
    textColor: "{colors.neutral-pill-fg}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  result-pill-tie:
    backgroundColor: "{colors.neutral-pill}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  nav-pill:
    textColor: "{colors.muted}"
    rounded: "{rounded.full}"
    padding: "6px 12px"
  nav-pill-hover:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.foreground}"
  nav-pill-current:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.full}"
    padding: "6px 12px"
  info-chip:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.neutral-pill-fg}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
  summary-pill:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.neutral-pill-fg}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  notice-banner:
    backgroundColor: "{colors.notice-bg}"
    textColor: "{colors.notice-fg}"
    rounded: "{rounded.xl}"
    padding: "12px 16px"
  notice-mark:
    backgroundColor: "{colors.notice-mark}"
    textColor: "{colors.notice-bg}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  logo-mark:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-fg}"
    rounded: "{rounded.md}"
    size: "26px"
  site-header:
    backgroundColor: "{colors.surface}"
    height: "{spacing.header}"
  avatar:
    backgroundColor: "{colors.avatar-bg}"
    rounded: "{rounded.full}"
    size: "44px"
  period-pill:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.muted}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "4px 12px"
  period-pill-current:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "4px 12px"
  picker-button:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "6px 14px"
  form-card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.xl}"
    padding: "12px 16px 8px"
  player-stage:
    height: "92px"
  streak-chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  stat-tile:
    backgroundColor: "{colors.surface-2}"
    rounded: "{rounded.lg}"
    padding: "8px 0"
  game-bar:
    backgroundColor: "{colors.accent}"
    rounded: "{rounded.sm}"
    height: "72px"
    width: "72%"
  selected-game-line:
    backgroundColor: "{colors.surface-2}"
    typography: "{typography.summary-line}"
    rounded: "{rounded.lg}"
    padding: "10px 12px"
  my-toggle-pill:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.neutral-pill-fg}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "6px 14px"
  my-toggle-pill-on:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent-ink}"
  my-toggle-icon:
    textColor: "{colors.muted}"
    rounded: "{rounded.full}"
    size: "36px"
  my-toggle-icon-on:
    textColor: "{colors.accent-ink}"
---

# Design System: KOR Leaguer

## Overview

**Creative North Star: "점수 띠 위의 한 줄"**

처음 온 야구 팬도 설명 없이 읽는 스포츠 앱의 정석이다. 차가운 회색 바탕 위에 흰 카드가 놓이고, 경기 하나는 카드 하나다. 카드 위쪽은 팀 대 팀 점수 띠, 아래쪽은 우리 선수 사진·이름과 굵은 한 줄 기록. 비교 기준은 네이버 스포츠·FotMob의 완성도다.

장식은 없다. 위계는 글꼴 굵기(800/600/400)와 크기, 바탕색 차이, 아주 옅은 그림자로만 만든다. 색은 거의 회색이고, 강조는 파랑 하나뿐이다. 팀 색은 데이터로만 들어온다(팀 로고, 선수 페이지 머리 띠, '내 선수' 카드의 팀 색 무대, 사진이 없을 때 이니셜 원). 다크 모드는 운영체제 설정을 따르며, 밝은 모드와 같은 구조를 색만 바꿔 쓴다.

예전의 여권 세계(명조 글꼴, 금박, 도장, 무늬)는 사용자가 버렸다(11-08). 다시 쓰지 않는다.

**Key Characteristics:**
- 회색 바탕 + 흰 카드(16px 모서리, 테두리 없음, 옅은 그림자)
- 파랑 하나: 채운 파랑은 로고 상자·'승' 알약·경기별 막대, 진한 파랑 글자는 1위 숫자·현재 메뉴·링크·시즌 비교·켜진 별
- Pretendard 한 가족, 숫자는 모두 고정폭
- 알약 모양(완전히 둥근) 메뉴·결과·정보 칩
- 휴대폰 1열 → 태블릿 2열 → 데스크톱 3열 카드 격자

## Colors

거의 무채색인 차가운 회색 위에 파랑 하나, 안내용 호박색 하나.

### Primary
- **스코어보드 파랑** (`accent`): 채운 파랑. 머리글 'K' 로고 상자, '승' 알약, '내 선수' 카드의 경기별 막대와 연속 기록 딱지의 작은 점에만 칠한다. 포커스 테두리, 선택 영역(22% 섞음), 체크박스·커서 색도 이 파랑이다. 다크 모드에서도 같은 값을 쓴다.
- **진한 파랑 글자** (`accent-ink`): 1위 숫자, 현재 메뉴 글자, 링크('경기별 기록 모두 보기' 포함). '내 선수' 카드에서는 큰 숫자 아래 시즌 비교 글자, 고른 막대의 날짜, 홈런 점, 켜진 별에도 쓴다. 다크 모드에서는 밝은 파랑(`accent-ink-dark`)으로 바뀐다.
- **연파랑 알약** (`accent-soft`): 현재 메뉴·현재 기간 알약, 켜진 '내 선수' 알약 바탕, 별 버튼에 마우스를 올렸을 때(켜진 상태)의 원.

### Secondary
- **안내 호박색** (`notice-bg`, `notice-fg`, `notice-mark`): '샘플 데이터'와 '유료 요금제 필요' 안내 띠에만 쓴다. 바탕은 옅은 호박, 글자는 진한 갈색, 앞의 작은 알약은 진한 호박.

### Neutral
- **차가운 회색 바탕** (`background`): 페이지 바탕. 섹션 제목은 카드 밖 이 바탕 위에 둔다.
- **흰 카드** (`surface`): 모든 카드와 머리글.
- **한 단계 진한 회색** (`surface-2`): 카드 안 점수 띠, 정보 칩, 메뉴 마우스 올림, '내 선수' 카드의 작은 숫자 칸과 고른 경기 한 줄 칸.
- **구분선** (`line`): 카드 안 구분선, 표 머리 밑줄, 머리글 아래 1px 선.
- **사진 원 바탕** (`avatar-bg`): 흰 유니폼이 묻히지 않을 만큼만 진한 회색.
- **흐린 글자** (`muted`): 기준 시각, 표 머리, 라벨, 안 뛴 선수의 한 줄.
- **회색 알약** (`neutral-pill`, `neutral-pill-fg`): '패'·'무' 알약. `neutral-pill-fg`는 정보 칩과 요약 알약 글자에도 쓴다.
- **본문 글자** (`foreground`).

### Named Rules
**The One Blue Rule.** 채운 파랑은 로고 상자, '승' 알약, 경기별 막대(와 연속 기록 딱지 점)뿐이다. 진한 파랑 글자는 1위 숫자, 현재 메뉴, 링크, 그리고 '내 선수'에서 '나아졌는지·고른 것'을 가리키는 표시(시즌 비교, 고른 막대 날짜, 홈런 점, 켜진 별)뿐이다. 버튼이나 제목을 파랗게 칠하지 않는다.

**The Grey Loss Rule.** '패'와 '무'는 빨강·초록 없이 회색 알약이다. 이긴 경기만 파랑으로 튄다.

**The Amber Is For Honesty Rule.** 호박색은 샘플 데이터·요금제 한계 안내에만 쓴다. 꾸밈이나 강조에 빌려 쓰지 않는다.

**The Team Color Is Data Rule.** 팀 색은 팀을 가리킬 때만 나온다(로고, 머리 띠, '내 선수' 카드 무대, 이니셜 원, 색 점). 화면 강조색으로 쓰지 않는다.

**The 4.5:1 Rule.** 글자는 밝은·어두운 모드 모두 바탕 대비 4.5:1 이상이다.

## Typography

**Display Font:** Pretendard Variable (with -apple-system, Apple SD Gothic Neo, Noto Sans KR)
**Body Font:** Pretendard Variable (같은 가족)

**Character:** 한 가족으로 끝낸다. 제목은 800으로 단단하게, 한 줄 기록은 600으로 또렷하게, 설명은 400으로 조용하게. 글꼴 파일은 `pretendard` 패키지에서 우리 서버가 주고, 화면에 쓴 글자 조각만 받는다.

### Hierarchy
- **Display** (800, 1.5rem, 1.25): 선수 페이지 이름, '선수'·'내 선수' 페이지 제목.
- **Stat hero** (800, 1.75rem, 1.25, 고정폭): 선수 시즌 큰 숫자 칸. 시즌 1위 카드 숫자도 같은 역할이다.
- **Stat form** (800, 2.75rem, 1, -0.03em, 고정폭): '내 선수' 카드의 큰 숫자 하나(최근 N일 타율·평균자책점). 화면에서 가장 큰 글자이고, 카드마다 하나뿐이다.
- **Score** (800, 1.3125rem, 고정폭, 0.02em): 점수 띠 가운데 "5 - 3".
- **Headline** (800, 1.1875rem, -0.02em): 섹션 제목. 카드 밖 회색 바탕 위.
- **Card name** (800, 1.25rem, 1.375, -0.02em): '내 선수' 카드 선수 이름. 회색 칸 작은 숫자 셋도 같은 크기·굵기(고정폭, 1.25)다.
- **Wordmark** (800, 1.125rem, -0.03em): 머리글 'KOR Leaguer'.
- **Title** (700, 1rem): 경기 카드 선수 이름.
- **Summary line** (600, 0.9375rem, 1.45): 한 줄 기록. 카드 안에서 가장 굵은 본문이다. 안 뛰었으면 500 + 흐린 글자.
- **Body** (400, 0.875rem): 표, 빈 상태 문구.
- **Label** (600, 0.8125rem): 팀 이름, 정보 칩, 요약 알약, 시즌 1위 카드 제목.
- **Caption** (400, 0.75rem): 기준 시각, 표 머리(600), 알약 글자(700), 바닥글.
- **Micro** (400, 0.6875rem, 고정폭): 점수 아래 '종료 · 홈 · 05:05'.

### Named Rules
**The Tabular Numbers Rule.** 점수, 기록, 시각 등 숫자는 모두 고정폭(`tabular-nums`)이다. 줄이 바뀌어도 자릿수가 흔들리지 않는다.

**The Weight Ladder Rule.** 위계는 굵기와 크기로만 만든다. 두 번째 글꼴(명조, 장식체)을 들이지 않는다.

**The Keep-All Rule.** 한국어는 낱말 중간에서 줄을 바꾸지 않는다(`word-break: keep-all`). 너무 긴 낱말만 쪼갠다.

## Layout

본문은 가운데 정렬된 최대 1080px 폭이고, 좌우 여백은 휴대폰 12px, 640px 이상에서 24px이다. 머리글은 높이 56px 흰 띠이며 아래에 1px 구분선만 있다.

카드 격자는 같은 줄 간격 10px로 휴대폰 1열, 640px 이상 2열, 1024px 이상 3열이다(시즌 1위 카드는 2열 → 768px 이상 4열). 섹션 제목은 카드 밖에 좌우 4px 들여 놓고 아래 10px을 띄운다. 홈의 큰 묶음 사이는 28px, 다른 페이지는 16px(640px 이상 선수 페이지 20px).

카드 안쪽 여백은 경기 카드 12px, 시즌 1위 카드 14px, 선수 카드·정보 카드 16px. 표는 좁은 화면에서 표 안에서만 가로로 밀리고, 이름 칸은 왼쪽에 고정되며, 밀 내용이 남은 쪽 끝에 옅은 그림자가 생긴다. 표 첫 칸과 끝 칸은 카드 가장자리에서 16px 띄운다.

'내 선수' 화면은 제목 줄, 기간 알약, 카드 격자를 16px 간격으로 쌓는다. 카드 격자는 같은 1·2·3열이지만 간격이 12px이고, 카드 높이는 내용대로 둔다(위로 맞춤). 카드 안은 위 92px 무대, 아래 좌우 16px · 위 12px · 아래 8px 여백. 경기별 막대는 칸 수만큼 같은 폭으로 나누고, 칸 사이는 7일 6px · 14일 4px · 30일 2px로 좁아진다.

## Elevation & Depth

거의 평평하다. 카드는 바탕색 차이와 아주 옅은 두 겹 그림자로 떠 있고, 테두리는 없다. 누를 수 있는 카드는 마우스를 올리면 그림자가 짙어진다(160ms). 다크 모드에서는 그림자 대신 1px 흰빛 테두리(5%)로 가장자리를 잡고, 올리면 12%로 밝아지며 아래에 그림자가 생긴다.

### Shadow Vocabulary
- **카드 쉼** (`--shadow-card`): 모든 카드의 기본 상태.
- **카드 올림** (`--shadow-card-hover`): 선수 페이지로 가는 카드에 마우스를 올렸을 때만.
- **머리 사진 걸침** (`0 1px 4px rgb(0 0 0 / 0.14)` + 흰 4px 테두리): 선수 페이지 팀 색 띠 위에 걸친 96px 사진에만.
- **무대 사진 그림자** (`drop-shadow(0 3px 6px rgb(0 0 0 / 0.28))`): '내 선수' 카드 무대 위 배경 없는 사진에만. 사진 윤곽을 따라 져서 팀 색과 떨어져 보이게 한다.
- **무대 바닥** (아래 22px, 투명 → `rgb(0 0 0 / 0.12)`): 무대 아래 끝을 살짝 어둡게 해서 잘린 어깨가 바닥에 닿아 보이게 한다.

떠 있는 작은 조각(무대 위 연속 기록 딱지, '선수 고르기' 버튼)은 카드와 같은 쉼 그림자를 쓰고, 버튼은 올리면 올림 그림자로 바뀐다.

### Named Rules
**The No-Border Card Rule.** 밝은 모드에서 카드 바깥 가장자리에 선을 긋지 않는다. 다크 모드의 1px 흰빛 테두리는 그림자 토큰(`--shadow-card`)이 맡는 가장자리이고, 따로 `border`를 더하지 않는다. 카드 안 구분(표 머리, 기록 칸 위, 경기 목록 사이)에만 `line` 색 1px 선을 쓴다.

**The Rise Once Rule.** 홈 경기 카드는 처음 그려질 때만 위에서부터 차례로 6px 떠오른다(260ms, 카드마다 35ms 늦게). '내 선수' 카드의 경기별 막대는 처음 그려질 때만 바닥에서 자란다(`.bar-rise`, 260ms, 막대마다 30ms 늦게, 10번째부터는 더 늦추지 않음). 동작 줄이기 설정이면 움직임도 그림자 전환도 없다.

## Shapes

둥글고 부드럽다. 큰 덩어리는 16px(카드, 안내 띠), 카드 안 점수 띠는 한 단계 작은 12px, 로고 'K' 상자는 8px, 다크 모드 팀 로고 흰 칸과 포커스 테두리는 6px. 메뉴·결과·칩·요약처럼 짧은 글자 덩어리는 모두 완전히 둥근 알약이다. 선수 사진은 원이다. 예외는 '내 선수' 카드 무대 위 사진 하나로, 원 없이 배경을 지운 모습 그대로 선다. 경기별 막대는 위만 6px로 둥글고 바닥은 거의 각지다. 각진 모서리, 기울인 모양, 잘린 모서리는 없다.

## Components

### Navigation
- **Style:** 흰 머리글(56px). 왼쪽에 파란 'K' 상자(26px) + 'KOR Leaguer' 글자, 이어서 알약 메뉴 '홈'·'선수'·'내 선수'. 데스크톱(768px 이상)에서는 오른쪽 끝에 작은 흐린 소개 글.
- **States:** 기본은 흐린 글자, 마우스 올림은 `surface-2` 바탕 + 본문 글자, 현재 메뉴는 연파랑 알약 + 진한 파랑 글자. 선수 페이지 안에서는 '선수'가 현재 메뉴다.

### Cards / Containers
- **Corner Style:** 16px.
- **Background:** `surface`.
- **Shadow Strategy:** 카드 쉼 그림자, 누를 수 있으면 올림 그림자(Elevation 참고).
- **Border:** 없음.
- **Internal Padding:** 12~16px.
- **Whole-card link:** 이름 링크를 카드 전체로 넓혀 어디를 눌러도 이동한다. 화면 낭독기는 이름만 읽고, 키보드 포커스는 카드 전체에 2px 파란 테두리로 보인다.

### 경기 카드 (Signature)
점수 띠 + 선수 줄. 위는 `surface-2` 12px 둥근 띠에 [우리 팀 로고·이름 | 점수와 '종료 · 홈 · 시각' | 상대 팀 이름·로고]. 경기 전이면 점수 자리에 흐린 'vs'. 아래는 44px 원형 사진, 이름, 오른쪽 끝 결과 알약, 그 아래 굵은 한 줄 기록. 투수면 이름 옆에 흐린 '투수'.

### Chips
- **결과 알약:** '승' 채운 파랑, '패' 회색, '무' 회색 + 본문 글자. 12px 700, 결과가 없으면 그리지 않는다.
- **정보 칩:** `surface-2` 바탕 알약에 팀 로고·포지션·등번호·나이. 값이 없는 칩은 뺀다.
- **요약 알약:** 홈 섹션 제목 아래 흰 알약('6명 중 5명 출전', '팀 결과 3승 3패'). 회색 바탕 위라 흰색이다.
- **기간 알약:** '내 선수' 제목 아래 7일·14일·30일. 현재 메뉴와 같은 연파랑 알약, 나머지는 흰 알약 + 흐린 글자(13px 600).
- **연속 기록 딱지:** 무대 왼쪽 위 흰 알약, 앞에 7px 파란 점 + 'N경기 연속 안타'/'N경기 연속 무실점'(12px 700). 2경기 이상 이어질 때만.

### 안내 띠
호박색 16px 카드. 앞에 진한 호박 알약('샘플', '안내'), 오른쪽에 굵은 제목 한 줄과 설명 한 줄. 화면 맨 위, 섹션보다 먼저 나온다.

### 선수 사진
원형. 배경을 지운 MLB 사진을 원 안에 조금 작게 아래에 붙인다. 크기는 24(표) / 28(시즌 1위) / 44(경기 카드) / 56(선수 목록) / 96(선수 페이지). 사진이 없거나 안 뜨면 팀 색 원 + 이름 첫 글자.

### 선수 머리 카드
카드 위쪽 68px 팀 색 띠(팀 색에서 카드 색으로 120도 방향으로 옅어짐; 다크 모드는 시작색을 32% 밝힌다). 96px 사진이 흰 4px 테두리를 두르고 띠 아래 끝에 걸친다. 그 아래 이름(Display), 대문자 영문 이름(작고 흐림, 0.08em), 정보 칩.

### 팀 색 무대 (`.player-stage`)
'내 선수' 카드 위쪽 92px. 배경을 지운 선수 사진이 서는 자리다. 사진이 선 오른쪽이 가장 진한 팀 색이고(오른쪽 끝은 18% 어둡게), 왼쪽으로 갈수록 카드 색과 섞여(78%) 옅어진다(100도 방향). 머리 뒤에 흰빛(34%) 둥근 빛을 깔고, 아래 끝은 살짝 어둡다. 다크 모드는 팀 색을 20% 밝혀 남색·갈색 팀이 묻히지 않게 한다. 사진은 112px로 무대보다 크게, 아래 16px을 무대 밖으로 내려 어깨 잘린 선이 무대 끝에서 잘린 것처럼 보이게 한다. 사진이 없거나 안 뜨면 흰 테두리 56px 이니셜 원.

### 내 선수 카드 (Signature)
선수 한 명에 카드 한 장. 위에서 아래로: 팀 색 무대(연속 기록 딱지 + 사진) → 이름(Card name) + 흐린 '팀 · 포지션' + 오른쪽 둥근 별 버튼 → 왼쪽 큰 숫자(Stat form)와 위 흐린 라벨 '최근 N일 타율', 아래 진한 파랑 시즌 비교('시즌 .301보다 ▲.047'), 오른쪽 회색 12px 칸 작은 숫자 셋(안타·홈런·타점 / 등판·이닝·탈삼진) → 경기별 막대 → 고른 경기 한 줄 → '경기별 기록 N개 모두 보기'(진한 파랑 13px 600, 누르면 선수 페이지와 같은 경기 한 줄 목록이 펼쳐짐). 기록을 못 받으면 막대 자리에 회색 칸 안내 한 줄.

### 경기별 막대
왼쪽이 오래된 날. 높이 72px 칸 바닥에 `line` 선, 막대는 칸 폭 72%(최대 28px) 파랑. 꼭대기 기준은 타자 4안타, 투수 6아웃(더 큰 값이 있으면 그 값). 고른 막대는 진하게(100%), 나머지는 옅게(밝은 모드 35%, 다크 모드 55%, 올리면 조금 진해짐).
- **뛰었지만 0:** 바닥에 4px 얇은 회색 막대.
- **결장·등판 없음·경기 전:** 14px 점선 테두리 막대.
- **경기 없는 날:** 빈칸(바닥 선만).
- **홈런:** 막대 위 4px에 8px 진한 파랑 점.
- 아래 날짜(12px 700, 고른 날은 진한 파랑), 7일이면 요일까지. 30일이면 5칸마다만 쓴다. 아래에 작은 범례(홈런 점·점선·빈칸).
- 막대를 누르면 아래 `surface-2` 12px 칸의 한 줄이 그 경기로 바뀐다: '9/27(일) vs 상대 점수 결과 알약', 그 아래 굵은 한 줄 기록(Summary line).

### 내 선수 별표
누르면 바로 바뀌는 넣기·빼기 버튼. 켜지면 칠한 별, 꺼지면 테두리 별.
- **알약** (선수 페이지 머리 카드, 사진 오른쪽): 꺼짐 = 회색 알약 '내 선수에 넣기', 켜짐 = 연파랑 알약 + 진한 파랑 '내 선수'.
- **둥근 버튼** (선수 목록 카드·내 선수 카드 오른쪽 위, 36px): 꺼짐 = 흐린 별(올리면 `surface-2` 원), 켜짐 = 진한 파랑 별(올리면 연파랑 원).
- 20명이 차면 옆에 흐린 글자로 알린다.

### 선수 고르기
'내 선수' 제목 오른쪽 흰 알약 버튼 '선수 고르기' + 흐린 아래 화살표(카드 쉼 그림자, 올리면 올림 그림자). 누르면 아래에 흰 카드가 열리고, 28px 사진 · 이름 · 팀 줄이 1·2·3열로 놓인다. 줄 전체가 버튼이고 오른쪽 끝 별로 상태를 보인다. 아무도 안 골랐으면 처음부터 열려 있다.

### 팀 로고
밝은 모드는 로고만, 다크 모드는 흰 6px 둥근 칸 안에 넣어 어두운 로고가 묻히지 않게 한다. 로고가 없으면 8px 팀 색 점.

### 기록 표
흰 카드 안 표. 숫자는 오른쪽 정렬·고정폭, 머리는 12px 600 흐린 글자 + 아래 `line` 선. 1위 값은 800 진한 파랑, 화면 낭독기에는 "(1위)"를 읽어 준다. 이름 칸은 가로로 밀어도 고정.

## Do's and Don'ts

### Do:
- **Do** 새 화면도 회색 바탕 위 흰 16px 카드로 만들고, 섹션 제목은 카드 밖 바탕 위에 둔다.
- **Do** 경기 하나를 카드 하나로 보여 준다: 점수 띠 위, 선수와 한 줄 기록 아래.
- **Do** 숫자는 모두 고정폭으로 쓴다.
- **Do** 짧은 상태·분류 글자는 완전히 둥근 알약으로 만든다.
- **Do** 새 색은 밝은·어두운 모드 값을 함께 정하고 4.5:1 대비를 확인한다.
- **Do** 움직임은 `cubic-bezier(0.16, 1, 0.3, 1)`로 짧게, 동작 줄이기 설정이면 끈다.

### Don't:
- **Don't** 여권 세계 장식(명조 글꼴, 금박, 도장, 무늬)을 다시 들인다(사용자 결정 11-08).
- **Don't** 파랑을 로고 상자·'승' 알약·경기별 막대·1위 숫자·현재 메뉴·링크·'내 선수' 표시(시즌 비교, 고른 날짜, 홈런 점, 켜진 별) 밖으로 넓힌다.
- **Don't** '패'를 빨강, '승'을 초록으로 칠한다.
- **Don't** 카드 바깥에 `border`를 긋거나, 그림자 토큰 두 개(쉼·올림) 밖의 그림자를 만든다. 예외는 사진 그림자 둘(머리 사진 걸침, 무대 사진 그림자)뿐이다.
- **Don't** 같은 무게의 회색 표만 늘어놓은 관리자 화면을 만든다. 표는 카드와 한 줄 기록 다음이다.
- **Don't** Pretendard 말고 다른 글꼴을 들인다.
