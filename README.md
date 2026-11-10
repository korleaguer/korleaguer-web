# korleaguer-web — KOR Leaguer 화면

한국 MLB 선수들의 최근 경기 한 줄 기록과 시즌 성적을 보여 주는 Next.js 화면이다.
데이터는 api 서버([korleaguer-server](https://github.com/korleaguer/korleaguer-server), Spring Boot)에서 받는다. 브라우저는 api를 직접 부르지 않고, Next.js 서버가 api를 불러 HTML을 만든다.
선수 사진과 팀 로고는 예외다. 주소(문자열)만 HTML에 넣고, 이미지는 브라우저가 MLB 이미지 서버에서 직접 받는다.

## 실행

```bash
npm install                                   # 처음 한 번
NEXT_TELEMETRY_DISABLED=1 npm run dev         # 개발 서버 → http://localhost:3000
NEXT_TELEMETRY_DISABLED=1 npm run build       # 배포용 빌드
NEXT_TELEMETRY_DISABLED=1 npm run start       # 빌드한 결과 실행
npm run lint
```

api가 꺼져 있어도 화면은 뜬다. 이때는 "데이터 서버에 연결할 수 없습니다" 안내가 나온다.

## 환경변수

| 이름 | 기본값 | 설명 |
|---|---|---|
| `API_BASE_URL` | `http://localhost:8080` | api 서버 주소. 서버 쪽에서만 읽는다 |
| `NEXT_TELEMETRY_DISABLED` | (없음) | `1`로 두면 Next.js 사용 통계 전송을 끈다. 항상 붙여서 실행한다 |
| `NEXT_PUBLIC_TEAM_LOGOS` | (켬) | `off`로 두면 팀 로고를 쓰지 않고 팀 색 점만 보여 준다. 로고는 MLB 상표라서 공개 전에 허락을 받거나 이 값으로 끈다. `NEXT_PUBLIC_` 값은 빌드할 때 코드에 박히므로, 바꾸면 다시 빌드(`npm run build`)해야 한다 |

예: `API_BASE_URL=http://localhost:8089 NEXT_TELEMETRY_DISABLED=1 npm run dev`
로고 끄기: `NEXT_PUBLIC_TEAM_LOGOS=off NEXT_TELEMETRY_DISABLED=1 npm run build`

## 화면

| 주소 | 내용 |
|---|---|
| `/` | 샘플·기록 미수신 안내 띠, 최근 경기(선수당 한 줄), 순위판(타율·홈런), 시즌 성적 표(타자·투수). 이름 옆에 선수 사진, 팀 이름 옆에 팀 로고 |
| `/players` | 선수 목록 카드(사진, 이름, 팀, 포지션·나이·등번호, 시즌 한 줄). `/api/players`와 `/api/home`을 playerId로 합친다 |
| `/players/[id]` | 선수 사진·이름·팀 로고, 정보 칸(포지션, 등번호, 나이, 키·몸무게, 투타, MLB 데뷔, 출생지, 한국 시절), MLB 공식 페이지 링크, 시즌 요약, 경기 기록 |

- 데이터는 요청마다 api에서 새로 받는다(캐시하지 않음).
- 다크 모드는 운영체제 설정을 따른다.
- 사진이 없거나 안 뜨면 팀 색 동그라미 + 이름 첫 글자로, 로고가 없거나 안 뜨면 팀 색 점으로 대신한다.
- 상단 메뉴(홈, 선수)는 지금 보는 화면을 `aria-current`로 표시한다. 선수 페이지(`/players/1`)에서는 "선수"가 하위 화면(`aria-current="true"`)으로 표시된다.

## 공개 전 점검

- 공식 선수 사진·팀 로고(MLB 이미지 서버)는 허락을 받았는지 확인한다. 허락이 없으면 로고는 `NEXT_PUBLIC_TEAM_LOGOS=off`로 끄고 다시 빌드한다. 선수 사진은 api가 주는 `photoUrl`을 비우면 쓰이지 않는다.
- 바닥글의 권리 문구("선수 사진과 팀 로고의 권리는 MLB와 각 구단에 있습니다.")를 유지한다.

## 배포

develop에 병합되면 Actions(`.github/workflows/deploy.yml`)가 검사 → 버전 정하기 → 이미지(`Dockerfile`, Next.js `standalone` 출력,
GHCR `ghcr.io/korleaguer/korleaguer-web`) → SSH로 서버(pigeon.ddns.net)에 접속해 새 컨테이너로 바꾸기(끊김 없이, 실패하면 옛 버전 유지) →
공개 주소의 `/healthz`가 새 버전을 주는지 확인 → 태그·릴리스 노트까지 알아서 한다(지속 배포).
서버 구성(Caddy·web·api·MySQL), 처음 준비, 되돌리기는 korleaguer-server 저장소의 `deploy/README.md`.

- 서버에서는 `API_BASE_URL=http://api:8080`(Docker 내부망)으로 API를 부른다. 브라우저는 API를 직접 부르지 않는다.
- 컨테이너 헬스체크는 `/healthz`(API 상태와 상관없이 웹 서버가 떠 있으면 200, 본문은 `ok 0.2.0`처럼 배포 버전. 개발 서버는 `ok dev`).
- 팀 로고를 끄려면 저장소 Actions variable `NEXT_PUBLIC_TEAM_LOGOS`를 `off`로 두고 다음 병합으로 새로 배포한다. 빌드할 때 박히는 값이라 수동 재배포(롤백)만으로는 바뀌지 않는다.

```bash
docker build -t korleaguer-web:local .   # 이미지만 만들어 보기
```

## 구조

```
src/
├── app/                      화면(라우트)
│   ├── layout.tsx            공통 틀: 머리글, 바닥글, 기본 <title>
│   ├── page.tsx              홈 (/)
│   ├── players/page.tsx      선수 목록 (/players)
│   ├── players/[id]/page.tsx 선수 페이지, <title> 생성
│   ├── not-found.tsx         없는 주소 (404)
│   ├── error.tsx             예상 못 한 오류 안내
│   └── globals.css           색(라이트/다크)과 Tailwind 설정
├── components/               화면 조각
│   ├── home/                 최근 경기, 순위판, 시즌 성적 표
│   ├── players/              선수 목록의 카드
│   ├── player/               선수 머리, 시즌 요약, 경기 기록
│   └── *.tsx                 여러 화면이 같이 쓰는 조각(띠, 카드, 표 칸, 승패 표시, 선수 사진, 팀 로고, 상단 메뉴 등)
└── lib/
    ├── api.ts                API 계약 타입 + api 호출 함수
    ├── format.ts             숫자·날짜 표시(.276, 4.76, 9월 27일(일) 05:05). 값이 없거나 이상하면 "-"
    ├── stats.ts              순위·1위 계산
    ├── teams.ts              팀 색·팀 로고 주소(팀 약어 teamAbbr 기준)
    └── useImageFailed.ts     사진·로고가 안 뜬 것을 알아내는 훅 (client 컴포넌트 전용)
```

API 응답 모양(계약 v2.1)은 `src/lib/api.ts`에 있다. api 계약이 바뀌면 이 파일부터 고친다.
같은 파일의 보정 함수가 빠진 배열·필드를 빈 값으로 채워서, 응답이 조금 어긋나도 화면이 죽지 않는다.
문장(한 줄 기록, 경기 상태, 포지션 번역)은 api가 만들고 web은 그대로 보여 준다.

## 알려진 한계

- 없는 선수(`/players/999`)도 HTTP 상태는 200이다. 화면은 스트리밍으로 그려져서, 선수가 없다는 걸 알 때는 이미 200을 보낸 뒤다. 대신 "찾는 페이지나 선수가 없습니다" 안내와 `noindex` 메타 태그를 넣는다. 어느 화면에도 맞지 않는 주소(`/abc`)는 404다.
- 같은 이유로 일반 브라우저에서는 `<title>`이 본문 쪽으로 늦게 붙는다. 검색 봇에게는 Next.js가 `<head>`에 넣어 준다.
- 팀 색과 로고는 30개 팀 약어 표로만 찾는다. 표에 없는 약어면 회색 점이고 로고는 없다.
- 사진·로고 주소가 틀리거나 막히면(404, 광고 차단 등) 대체 모양으로 바뀐다. 이미지 서버를 우리가 확인하지 않으므로, 실제로 뜨는지는 브라우저로 직접 봐야 한다.

## 참고

- Next.js 16은 Cache Components가 켜져 있다(`next.config.ts`). api 호출 함수는 `connection()`을 먼저 불러, 빌드 때가 아니라 요청이 올 때 실행된다.
- 선수 사진·팀 로고는 `<img>`로 브라우저가 직접 받는다(`next/image`를 쓰지 않아서 우리 서버가 대신 받아 오지 않는다). 외부 글꼴은 쓰지 않고, 글꼴은 기기에 깔린 한글 글꼴을 쓴다.
