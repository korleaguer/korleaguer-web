---
version: 1
slug: "src-app-page-tsx"
primary_target: "src/app/page.tsx"
related_targets: ["src/app/players/page.tsx","src/app/players/[id]/page.tsx"]
---

# KOR Leaguer 웹 화면 (홈 · 선수 목록 · 선수 페이지)

## Scope and mode

- 대상: `src/app/page.tsx`(홈), `src/app/players/page.tsx`(선수 목록), `src/app/players/[id]/page.tsx`(선수 페이지)와 공용 컴포넌트.
- Visitor mode: **Operate.** 방문자는 "우리 선수들 오늘 뭐 했지?"를 몇 초 안에 확인하고, 궁금하면 선수 페이지로 들어간다.
- 작업 종류: 시각 세계 교체(redesign). 내용·기능·접근성 문구·데이터 흐름은 그대로 두고, 여권 콘셉트(#3)는 버린다.
- 2026-11-08 사용자가 26개 방향 후보에서 26번 '깔끔한 스포츠 앱 기본형'을 고르고, 실제 화면 견본 A·B·C(`../plan/2026-11-08-26번-실제화면-견본.html`) 중 **B 카드형**을 골랐다. 글꼴은 Pretendard(자체 제공)로 정했다. 견본 B가 이 화면의 구도 기준이다.

## Audience, job, constraints

- 휴대폰으로 출근길·점심에 훑는 야구 팬, 한 선수를 챙기는 팬. 비교 대상: 네이버 스포츠, FotMob.
- 샘플 데이터 띠, 기록 미수신 안내, 빈 기록 안내는 반드시 눈에 띄게 유지한다.
- 사진·로고는 꺼질 수 있다(이니셜 + 팀 색으로 대체). 다크 모드는 OS 설정을 따른다.

## Direction contract

THESIS: 처음 온 야구 팬도 설명 없이 읽는 스포츠 앱의 정석. 경기 하나는 카드 하나다: 위에 팀 대 팀 점수 띠, 아래에 우리 선수와 한 줄 기록. 세계관 장식(여권·도장)과 같은 무게 회색 표만 늘어놓는 관리자 화면을 거부한다.

OWN-WORLD: 차가운 회색 바탕(#EEF0F3) 위 흰 카드(모서리 16px, 아주 옅은 그림자, 테두리 없음). 강조색은 파랑 하나: 채운 파랑(#2563EB)은 로고 'K' 상자와 '승' 알약에만, 진한 파랑 글자(#1D4ED8)는 1위 숫자·현재 메뉴·링크에만. 패·무는 회색 알약. 카드 안 경기 띠는 한 단계 진한 회색 둥근 띠(12px). 선수 사진은 원형, 선수 페이지 머리 카드는 팀 색 띠 위에 흰 테두리 원형 사진이 걸친다. 글꼴은 Pretendard 한 가족, 굵기 차이(800/600/400)와 크기로 위계를 만들고 숫자는 고정폭.

STORY: 들어오면 '최근 24시간' 제목과 '6명 중 5명 출전 · 팀 결과 3승 3패' 알약이 보이고, 바로 경기 카드가 이어진다. 점수 띠로 팀 결과를, 그 아래 굵은 한 줄로 선수가 한 일을 읽는다. 카드를 누르면 선수 페이지. 아래로 내리면 시즌 1위 카드 4장, 타자·투수 시즌 기록 표.

FIRST VIEWPORT: 흰 머리글 56px(왼쪽 파란 'K' 상자 + 'KOR Leaguer', 알약 메뉴 홈/선수, 현재 메뉴는 연파랑 알약). 샘플 데이터 띠(호박색 카드). 섹션 제목(19px 800)과 오른쪽 기준 시각, 흰 알약 요약 둘. 경기 카드: 휴대폰 1열, 태블릿 2열, 데스크톱 3열. 카드 = 회색 점수 띠(팀 로고·이름 | 21px 점수 + '종료 · 홈 · 05:05' | 상대) + 44px 원형 사진 · 이름 · 오른쪽 결과 알약 + 15px 600 한 줄 기록. 시그니처: 점수 띠 + 선수 줄 카드. 동작: 처음 그릴 때 카드가 위에서부터 차례로 살짝 떠오른다(260ms, 카드마다 35ms, 동작 줄이기 설정이면 없음). 마우스를 올리면 그림자가 짙어진다.

FORM: 사용자 지정 방향(26번 정석, 견본 B). concept-seed를 돌리지 않았다: 사용자가 고른 방향이 뽑기보다 우선한다. 비교 기준은 네이버 스포츠·FotMob의 완성도.
seed: none (user-pinned direction 26, concept-seed not run this round)

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved

- 실제 데이터 연결 후 긴 기록 문장, 마이너 리그 선수(기록 없음) 화면은 다시 본다.
- 시즌 1위 카드는 규정 타석을 따지지 않는다(샘플 단계). 실제 데이터에서 다시 본다.
