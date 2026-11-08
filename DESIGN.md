---
name: 코리거
description: 해외로 나간 한국 선수들의 여권. 경기 하나는 입국 도장 하나.
colors:
  visa-paper: "#eef2f3"
  ink-navy: "#121a2b"
  page-white: "#ffffff"
  page-white-2: "#f3f6f7"
  hairline: "#dce3e7"
  muted-ink: "#566173"
  link-navy: "#213a7a"
  cover-navy: "#16244b"
  cover-fg: "#f3f5fa"
  cover-muted: "#aeb8d0"
  gold-foil: "#c9a55a"
  gold-ink: "#8a6514"
  ink-win: "#1f7a55"
  ink-loss: "#b42318"
  ink-tie: "#6b4fa0"
  notice-bg: "#fbedeb"
  notice-fg: "#7a1a12"
typography:
  display:
    fontFamily: "Hahmlet, Nanum Myeongjo, AppleMyungjo, serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.25
  display-name:
    fontFamily: "Hahmlet, Nanum Myeongjo, AppleMyungjo, serif"
    fontSize: "2rem"
    fontWeight: 700
    lineHeight: 1.25
  wordmark:
    fontFamily: "Hahmlet, Nanum Myeongjo, AppleMyungjo, serif"
    fontSize: "1.375rem"
    fontWeight: 700
    lineHeight: 1
  stat-hero:
    fontFamily: "-apple-system, BlinkMacSystemFont, Apple SD Gothic Neo, Pretendard, Noto Sans KR, Malgun Gothic, system-ui, sans-serif"
    fontSize: "2.5rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.025em"
    fontFeature: "tnum"
  summary-line:
    fontFamily: "-apple-system, BlinkMacSystemFont, Apple SD Gothic Neo, Pretendard, Noto Sans KR, Malgun Gothic, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.375
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, Apple SD Gothic Neo, Pretendard, Noto Sans KR, Malgun Gothic, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.5
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, Apple SD Gothic Neo, Pretendard, Noto Sans KR, Malgun Gothic, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, Apple SD Gothic Neo, Pretendard, Noto Sans KR, Malgun Gothic, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.33
  name-latin:
    fontFamily: "-apple-system, BlinkMacSystemFont, Apple SD Gothic Neo, Pretendard, Noto Sans KR, Malgun Gothic, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    letterSpacing: "0.14em"
rounded:
  photo-sm: "3px"
  photo-md: "4px"
  stamp: "6px"
  panel: "10px"
  pill: "9999px"
spacing:
  row-gap: "14px"
  panel-pad: "16px"
  id-page-pad: "20px"
  section-gap: "32px"
  header-height: "56px"
  content-max: "1024px"
  rail: "320px"
components:
  site-header:
    backgroundColor: "{colors.cover-navy}"
    textColor: "{colors.cover-fg}"
    height: "{spacing.header-height}"
  nav-link:
    textColor: "{colors.cover-muted}"
    typography: "{typography.label}"
  nav-link-current:
    textColor: "{colors.cover-fg}"
  panel:
    backgroundColor: "{colors.page-white}"
    rounded: "{rounded.panel}"
    padding: "{spacing.panel-pad}"
  panel-hover:
    backgroundColor: "{colors.page-white-2}"
  stamp-win:
    textColor: "{colors.ink-win}"
    rounded: "{rounded.stamp}"
    height: "44px"
  stamp-loss:
    textColor: "{colors.ink-loss}"
    rounded: "{rounded.stamp}"
    height: "44px"
  stamp-tie:
    textColor: "{colors.ink-tie}"
    rounded: "{rounded.stamp}"
    height: "44px"
  stamp-empty:
    textColor: "{colors.muted-ink}"
    rounded: "{rounded.stamp}"
    height: "44px"
  notice-banner:
    backgroundColor: "{colors.notice-bg}"
    textColor: "{colors.notice-fg}"
    rounded: "{rounded.panel}"
    padding: "12px 16px"
  table-head:
    backgroundColor: "{colors.page-white-2}"
    textColor: "{colors.muted-ink}"
    typography: "{typography.label}"
    padding: "8px 12px"
  player-photo-lg:
    backgroundColor: "{colors.page-white-2}"
    rounded: "{rounded.stamp}"
    width: "96px"
    height: "128px"
  text-link:
    textColor: "{colors.link-navy}"
---

# Design System: 코리거

## Overview

**Creative North Star: "해외파 여권"**

코리거는 해외로 나간 한국 선수들의 여권처럼 보인다. 경기 하나는 입국 도장 하나, 선수 페이지는 사진이 붙은 신원 면, 맨 위 머리띠는 여권 표지다. 밝은 모드는 여권 속지(푸른 기가 도는 옅은 바탕 위에 테두리 없는 흰 면), 다크 모드는 여권 표지(남색 바탕)다. 운영체제 설정을 따라 바뀐다.

화면은 빽빽하게 정보를 담되 무게는 고르지 않다. 가장 중요한 것(한 줄 기록, 시즌 핵심 숫자)은 크기로 세우고, 상자나 배경 타일로 강조하지 않는다. 면과 면은 바탕색 차이로만 나누고, 면 안의 줄은 머리카락 선으로 나눈다. 테두리를 두른 물건은 도장뿐이다. 그래서 도장이 눈에 띈다.

회색 카드를 같은 무게로 늘어놓는 스포츠 대시보드 기본형은 쓰지 않는다.

**Key Characteristics:**
- 여권 표지 남색 머리띠 + 금박 워드마크
- 경기 결과는 이중 테두리 도장(승 초록, 패 빨강, 무 보라, 경기 전은 점선 빈 자리), 조금 비뚤게 찍힘
- 선수 사진은 여권 사진처럼 세로 직사각형(3:4), 둥근 원이 아님
- 선수 신원 면 바탕에 가는 보안 무늬(guilloche)
- 제목만 명조(Hahmlet), 나머지는 시스템 한글 고딕 한 가족
- 영문 이름은 대문자, 자간 넓게

## Colors

여권 남색과 옅은 속지색이 바탕을 맡고, 금박은 아주 드물게, 세 가지 잉크색은 경기 결과에만 쓴다.

### Primary
- **Cover Navy** (cover-navy): 머리띠 바탕. 다크 모드에서는 페이지 바탕 자체가 이 남색이고, 머리띠는 한 단계 더 짙은 `#0f1a3a`로 내려가 아래 금색 선으로 구분된다.
- **Link Navy** (link-navy): 링크, 포커스 테두리, 커서·체크박스 색(`accent-color`). 다크 모드 `#9db7ff`.

### Secondary
- **Gold Foil** (gold-foil): 남색 위의 금박. 워드마크, 현재 메뉴 밑줄, 머리띠 아래 선(40% 투명), 남색 안 포커스 테두리. 다크 모드 `#d6b46a`.
- **Gold Ink** (gold-ink): 흰 면 위의 금색 글자. 표·순위판의 1위 값에만. 다크 모드 `#e2c27c`.

### Tertiary (도장 잉크)
- **Win Green** (ink-win): 승 도장. 다크 `#4fc48e`.
- **Loss Red** (ink-loss): 패 도장. 다크 `#ff7b6e`.
- **Tie Violet** (ink-tie): 무 도장. 다크 `#b79cf0`.

### Neutral
- **Visa Paper** (visa-paper): 밝은 모드 페이지 바탕. 다크 모드는 `#16244b`.
- **Page White** (page-white): 내용이 놓이는 면. 다크 `#1e2e5c`.
- **Page White 2** (page-white-2): 표 머리, 사진 자리 표시, 카드 hover. 다크 `#24366a`.
- **Hairline** (hairline): 줄 사이 머리카락 선, 순위 막대 바탕. 다크 `#2f4278`.
- **Muted Ink** (muted-ink): 보조 글자(시각, 팀·점수 줄, 항목 이름). 다크 `#a3aecb`.
- **Ink Navy** (ink-navy): 본문 글자. 다크 `#e9edf6`.
- **Cover Fg / Cover Muted**: 머리띠 안 글자(현재 메뉴 / 나머지 메뉴·설명).
- **Notice** (notice-bg / notice-fg): 샘플 데이터·요금제 안내 띠. 다크 `#3b1714` / `#ffd2cc`.

팀 색(`teamColor`)은 디자인 토큰이 아니라 데이터다. 사진 대신 쓰는 이니셜 칸과 순위 막대에만 쓰고, 다크 모드 막대에는 흰색을 40% 섞는다.

### Named Rules
**The Gold Means First Rule.** 금색 글자는 세 가지 뜻만 가진다: 이 서비스(워드마크), 지금 여기(현재 메뉴), 1위. 그 밖의 강조에 금색을 쓰지 않는다. 머리띠 아래 선·글자 선택 색·다크 모드 보안 무늬의 옅은 금빛은 재질이지 강조가 아니다.

**The Ink Is Only For Results Rule.** 초록·빨강·보라 잉크는 승·패·무에만 쓴다. 오류나 안내는 Notice 색을 쓴다.

**The 4.5:1 Rule.** 모든 글자색은 놓인 바탕 대비 4.5:1 이상이다. 그래서 흰 면 위 금색은 Gold Foil이 아니라 Gold Ink를 쓴다.

## Typography

**Display Font:** Hahmlet (Nanum Myeongjo, AppleMyungjo, serif로 대체). `next/font`로 우리 서버가 준다.
**Body Font:** 시스템 한글 고딕 (-apple-system, Apple SD Gothic Neo, Pretendard, Noto Sans KR, Malgun Gothic …)

**Character:** 명조 제목은 여권에 인쇄된 국가명처럼 격식을 주고, 나머지는 고딕 한 가족이 숫자부터 캡션까지 맡는다.

### Hierarchy
- **Display** (display): 페이지 제목('최근 24시간', '선수'). 휴대폰 1.75rem, 넓은 화면 1.875rem.
- **Display Name** (display-name): 선수 페이지의 한글 이름.
- **Wordmark** (wordmark): 머리띠의 '코리거'. 옆에 작은 영문 'KORLEAGUER'(0.625rem, 자간 0.22em)가 붙어 한 덩어리 로고가 된다.
- **Stat Hero** (stat-hero): 선수 시즌 핵심 숫자(타율·OPS 등). 휴대폰 1.875rem. 목록 카드의 기록 칸은 1.25rem 같은 굵기.
- **Summary Line** (summary-line): 최근 경기의 한 줄 기록. 휴대폰 1.0625rem. 줄 안에서 이름보다 크고 굵다. 이 서비스의 핵심 문장이다.
- **Title** (title): 묶음 제목('순위판', '2026 시즌 성적').
- **Body** (body): 이름, 표 칸, 설명.
- **Label** (label): 항목 이름, 표 머리, 시각, 팀·점수 줄. 대부분 Muted Ink.
- **Name Latin** (name-latin): 영문 이름. 대문자, 자간 0.14em(선수 페이지는 0.75rem, 0.16em).

숫자는 늘 `tabular-nums`로 자릿수를 맞춘다. 한국어는 낱말 중간에서 줄을 바꾸지 않는다(`word-break: keep-all`).

### Named Rules
**The Size Not Boxes Rule.** 위계는 글자 크기와 굵기로만 만든다. 중요한 숫자에 색 타일·테두리 상자를 씌우지 않는다.

**The Two Faces Rule.** 명조는 워드마크와 페이지 제목·선수 이름에만. 묶음 제목, 숫자, 표는 고딕이다.

## Layout

본문은 가운데 정렬된 한 열(최대 1024px, 좌우 16px 여백)이다. 머리띠 높이는 56px로 고정이다.

- **홈**: 넓은 화면(lg 이상)에서 왼쪽 넓은 열(최근 경기)과 오른쪽 320px 열(순위판), 사이 24px. 순위판은 subgrid로 최근 경기 목록의 위 끝에 맞춰진다. 그 아래 시즌 성적 표가 전체 폭으로 온다. 좁은 화면에서는 위아래로 쌓인다.
- **선수 목록**: 카드 격자 1열 → 2열(sm) → 3열(lg), 간격 12px. 같은 줄 카드끼리 기록 칸이 같은 높이에 온다(카드 아래 끝에 붙음).
- **선수 페이지**: 신원 면 → 시즌 성적 → 경기 기록이 위아래로. 신원 면은 왼쪽 사진 + 오른쪽 이름, 항목 칸은 넓은 화면에서 이름 아래 3열, 좁은 화면에서 사진 아래 2열.
- **리듬**: 큰 묶음 사이 32px(홈) 또는 16px(선수 페이지), 목록 한 줄 안쪽 여백 14px·16px.
- **넓은 표**: 페이지 전체가 아니라 표 안에서만 가로로 밀리고, 첫 열(선수 이름)은 고정된다. 밀 내용이 남은 쪽 끝에 그림자가 생긴다.

## Elevation & Depth

평평하다. 그림자를 쓰지 않고, 바탕(Visa Paper) → 면(Page White) → 표 머리(Page White 2)의 색 단계로 깊이를 낸다. 다크 모드도 같은 순서로 남색이 한 단계씩 밝아진다.

### Shadow Vocabulary
- **Scroll edge** (`radial-gradient` 끝 그림자, 글자색 16%): 가로로 밀리는 표에서 "옆에 더 있다"를 알리는 용도로만 쓴다.

### Named Rules
**The Ground Not Lines Rule.** 면과 면은 바탕색 차이로만 나눈다. 면에 테두리나 그림자를 두르지 않는다. 면 안의 줄은 1px 머리카락 선(Hairline)으로 나눈다.

**The One White Panel Rule (홈).** 홈에서 흰 면은 최근 경기 목록 하나뿐이다. 순위판과 시즌 성적 표는 페이지 바탕 위에 머리카락 선만으로 놓인다(표 바탕도 `--table-bg`로 페이지 바탕에 맞춘다).

## Shapes

면은 살짝 둥근 모서리(10px). 도장은 6px. 사진은 크기에 따라 3px / 4px / 6px로 작게 둥글린 세로 직사각형(3:4). 완전히 둥근 모양은 머리띠의 '야구' 꼬리표, 순위 막대, 로고가 없을 때의 팀 색 점에만 쓴다. 팀 로고는 흰 바탕 작은 칩(6px) 안에 넣어 다크 모드에서도 보이게 한다.

## Components

### 결과 도장 (Signature)
입국 도장. 이중 테두리(바깥 1.5px 실선 + 안쪽 1px 선, 4.5px 안쪽)와 잉크색 7% 바탕. 색은 모두 글자색(currentColor)을 따른다.
- **크기:** 목록용 44px 높이(결과 + 'M.D' 날짜), 표 안 28px(결과만).
- **기울기:** -2° ~ 2° 사이 여섯 각도 중 하나. 같은 경기는 늘 같은 각도.
- **빈 자리:** 결과가 없으면 점선 한 줄, 안쪽 선·바탕 없음, Muted Ink.
- **찍히는 동작:** 홈 최근 경기 목록에서만, 처음 그려질 때 위에서부터 차례로 찍힌다(1.4배에서 1배로, 220ms, `cubic-bezier(0.16, 1, 0.3, 1)`, 줄마다 40ms 지연). 동작 줄이기 설정이면 없다.
- **견본 도장:** 안내 띠의 '견본'/'안내' 도장은 같은 모양을 -4° 기울여 쓴다.

### 면 (Cards / Containers)
- **Corner Style:** 10px
- **Background:** Page White
- **Shadow Strategy:** 없음 (Elevation 참고)
- **Border:** 없음. 안쪽 구분은 머리카락 선.
- **Internal Padding:** 16px. 선수 신원 면은 20px.
- **선수 카드:** 카드 전체가 링크다. hover 시 Page White 2, 키보드 포커스 시 Link Navy 2px 고리.

### 머리띠와 메뉴 (Navigation)
- Cover Navy 바탕, 아래에 금색 40% 선. 왼쪽부터 금박 워드마크, '야구' 꼬리표(가는 고리), 메뉴, 오른쪽 설명(넓은 화면만).
- 메뉴는 0.875rem 굵게. 평소 Cover Muted, hover와 현재 메뉴는 Cover Fg. 현재 메뉴는 아래 2px 금색 밑줄.
- 남색 안에서는 포커스 테두리가 금색이다.

### 기록 표
- 표 머리: Page White 2 바탕, 0.75rem 굵게 Muted Ink, 아래 머리카락 선. 칸 여백 8px 12px.
- 글자는 왼쪽, 숫자는 오른쪽 정렬. 1위 값은 Gold Ink 굵게(화면 낭독기에는 "(1위)").
- 부모가 `--table-bg`, `--table-head-bg`로 바탕을 바꿀 수 있다(홈 시즌 표는 페이지 바탕).

### 순위판
- 판마다 위쪽 머리카락 선. 순위 숫자(1위만 Gold Ink) · 이름 · 6px 높이 팀 색 막대(1위 대비 길이) · 값.

### 선수 사진
- 3:4 세로 직사각형. sm 24×32(이름 옆), md 48×64(카드), lg 96×128(선수 페이지). 위쪽 기준으로 잘림.
- 사진이 없거나 안 뜨면 팀 색 칸 + 한글 이름 첫 글자.
- 사진에는 1px Hairline 고리가 있다(바탕과 사진 경계용, 면 테두리 규칙의 예외).

### 선수 신원 면
- 흰 면 + 보안 무늬(가는 사인 곡선 14줄, 240×120 반복, 밝은 모드 Link Navy 20% / 다크 모드 금색 16%).
- 왼쪽 큰 사진, 오른쪽 명조 이름 + 영문 대문자 이름 + 팀, 오른쪽 위 '문서 번호' 자리에 등번호(No. 51). 항목은 늘 같은 순서로, 위 머리카락 선 아래 작은 이름 + 값.

### 안내 띠
- Notice 바탕, 10px 모서리, 왼쪽에 기운 견본 도장, 굵은 제목 1rem + 설명 0.75rem. 샘플 데이터·요금제 없음 안내는 숨기지 않고 늘 맨 위에 둔다.

### 링크
- Link Navy 굵게, hover 시 밑줄(1px, 3px 띄움). 새 탭 링크는 글자 크기를 따르는 작은 ↗ SVG 아이콘.

## Do's and Don'ts

### Do:
- **Do** 경기 결과는 늘 결과 도장으로 보여 준다. 색은 승·패·무 잉크만 쓴다.
- **Do** 면은 테두리 없는 흰 면(10px)으로, 면 안의 줄은 1px 머리카락 선으로 나눈다.
- **Do** 선수 사진은 3:4 세로 직사각형으로, 정해진 세 크기 중 하나를 쓴다.
- **Do** 핵심 숫자는 크게(최대 2.5rem, 굵게, 자릿수 맞춤) 세운다.
- **Do** 금색 글자는 워드마크·현재 메뉴·1위에만 쓰고, 흰 면 위에서는 Gold Ink를 쓴다.
- **Do** 새 색을 만들면 밝은·다크 두 값을 함께 정하고 4.5:1 대비를 맞춘다.
- **Do** 움직임은 도장 찍힘 하나로 충분하다. 동작 줄이기 설정을 존중한다.

### Don't:
- **Don't** 면에 그림자나 테두리를 두르지 않는다. 테두리를 두른 것은 도장(과 사진의 가는 고리)뿐이다.
- **Don't** 같은 무게의 회색 카드를 늘어놓는 대시보드 모양으로 돌아가지 않는다.
- **Don't** 선수 사진을 둥근 원으로 자르지 않는다.
- **Don't** 강조하려고 색 타일·배경 상자를 씌우지 않는다. 크기로 강조한다.
- **Don't** 명조를 묶음 제목·표·숫자에 쓰지 않는다.
- **Don't** 홈에 흰 면을 더 늘리지 않는다. 최근 경기 목록 하나만 흰 면이다.
