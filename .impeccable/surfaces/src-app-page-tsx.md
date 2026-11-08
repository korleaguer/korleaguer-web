---
version: 1
slug: "src-app-page-tsx"
primary_target: "src/app/page.tsx"
related_targets: ["src/app/players/page.tsx","src/app/players/[id]/page.tsx"]
---

# 코리거 웹 화면 (홈 · 선수 목록 · 선수 페이지)

## Scope and mode

- 대상: `src/app/page.tsx`(홈), `src/app/players/page.tsx`(선수 목록), `src/app/players/[id]/page.tsx`(선수 페이지)와 공용 컴포넌트.
- Visitor mode: **Operate.** 방문자는 "우리 선수들 오늘 뭐 했지?"를 몇 초 안에 확인하고, 궁금하면 선수 페이지로 들어간다.
- 작업 종류: 시각 세계 교체(redesign). 내용·기능·문구·데이터 흐름·접근성 문구는 그대로 두고, 기존 회색 카드 + 파란 강조색 모양은 버린다.
- 2026-11-08 사용자가 "알아서 분석·계획·개선 다 해봐"라고 맡겨, 방향 선택 화면 없이 뽑힌 방향(assigned)으로 진행했다.

## Audience, job, constraints

- 휴대폰으로 출근길·점심에 훑는 야구 팬, 한 선수를 챙기는 팬.
- 샘플 데이터 띠, 요금제 없음 안내, 빈 기록 안내는 반드시 눈에 띄게 유지한다.
- 사진·로고는 꺼질 수 있다(이니셜 + 팀 색으로 대체). 다크 모드는 OS 설정을 따른다.

## Direction contract

THESIS: 코리거는 해외로 나간 한국 선수들의 '여권'이다. 경기 하나는 입국 도장 하나, 선수 페이지는 여권 신원 면. 회색 카드를 같은 무게로 늘어놓는 스포츠 대시보드 기본형을 거부한다.

OWN-WORLD: 여권 표지 남색(#16244B 계열)이 머리띠와 다크 모드 바탕, 금박색은 워드마크·현재 메뉴·1위 표시에만 쓴다. 밝은 모드 바탕은 사증면처럼 푸른 기가 도는 옅은 바탕(#EEF2F3 계열) 위에 테두리 없는 흰 면. 경기 결과는 이중 테두리 도장: 승 초록 잉크, 패 빨강 잉크, 무 보라 잉크, 경기 전은 점선 빈 자리. 사진은 둥근 원이 아니라 여권 사진처럼 세로 직사각형. 영문 이름은 대문자 자간 넓게. 워드마크와 페이지 제목은 Hahmlet, 나머지는 시스템 한글 고딕 한 가족.

STORY: 들어오자마자 최근 경기 목록이 도장 줄로 보이고, 한 줄씩 "누가 · 팀 결과 · 오늘 한 일"을 읽는다. 위에 '몇 명 출전 · 소속팀 몇 승 몇 패'가 요약된다. 더 궁금하면 이름을 눌러 신원 면(선수 페이지)으로 간다.

FIRST VIEWPORT: 맨 위 남색 머리띠(금박 워드마크 '코리거', 홈/선수 탭, 현재 탭 금색 밑줄). 그 아래 '견본' 도장이 찍힌 샘플 데이터 띠. 이어서 큰 제목 '최근 24시간'(없으면 '마지막 경기일 ○월 ○일')과 출전·승패 요약 한 줄, 기준 시각. 왼쪽 넓은 열은 선수별 한 줄 목록: 왼쪽 끝 결과 도장(결과 + 날짜), 사진, 이름·팀·점수, 오른쪽 시각, 아래 한 줄 기록을 본문보다 크게. 오른쪽 좁은 열은 타율·홈런 순위판. 시그니처 동작: 홈 목록의 도장이 처음 그려질 때 위에서부터 차례로 '쾅' 찍히듯 내려앉는다(220ms, 줄마다 40ms 지연, 동작 줄이기 설정이면 없음).

FORM: 후보 순위 7개 중 7번(여권·출입국)을 뽑기로 배정받아 만든다. 1위 후보였던 '중계 타석 자막'은 고르지 않았다. 다른 후보 판정:
- 세로 영상 피드(pop-culture-shelf-vertical-video-feed-surface): competitive. 친숙함은 이기지만 '한 화면에 전원' 원칙과 맞지 않는다.
- 타이포 견본(variable-font-specimen): declined. 빌린 규칙: 위계는 크기 차이로만 만든다 → 핵심 숫자는 크게, 상자·배경 타일로 강조하지 않는다.
- 오리엔티어링 지도(notation-diagram-systems-orienteering-map): declined. 빌린 규칙: 색 하나는 한 가지 일에만 예약한다 → 금색은 1위·현재 위치에만.
- 식물 도감(editorial-sequence-montage-botanical-folio-season): declined. 빌린 규칙: 같은 축척으로 비교한다 → 선수 카드마다 같은 기록 칸이 같은 자리에.
- 동물원 안내도(aww2-zoo-gardens-guide-map): declined. 빌린 규칙: 경계는 선이 아니라 바탕색으로 나눈다 → 면에 테두리를 두르지 않는다.
- 디자인 연감(design-annual-s-plate-section): declined. 빌린 규칙: 한 글꼴 가족이 제목부터 캡션까지 맡고 표는 머리카락 선으로 나눈다.
seed: b70b3dad2b88afa3

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved

- 실제 데이터 연결 후 긴 기록 문장, 마이너 리그 선수(기록 없음) 화면은 다시 본다.
- Hahmlet 글꼴은 next/font/google로 빌드 때 받아 우리 서버에서 준다.
