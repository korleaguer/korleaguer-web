// api 서버 응답 모양(서버 명세 openapi/server.json에서 만든 타입의 별칭), 받은 응답을 다듬는 함수, 호출 함수를 모아 둔 파일.
import { cache } from "react";
import { cacheLife } from "next/cache";
import { connection } from "next/server";
import { apiUrl } from "@/lib/apiUrl";
import { PHOTO_PATH } from "@/lib/photo";
import type { components } from "@/lib/api-schema";

/** 서버 응답 모양(서버 저장소 openapi.json에서 만든 타입, npm run api:types). 아래 타입은 모두 이것의 별칭이다 */
type S = components["schemas"];

/** mlb: MLB 공식 Stats API에서 받은 실제 데이터, sample: 테스트·오프라인용 지어낸 데이터 */
export type DataMode = S["HomeResponse"]["dataMode"];
export type Role = S["PlayerSummary"]["role"];
export type GameResult = S["GameLine"]["result"];

/**
 * 경기 카드 안 화제 문구 한 줄(선수 × 경기마다 최대 하나, 서버가 우선순위로 골라 준다).
 * kind: PASSED 한국인 통산 기록 넘음 / FIRST 메이저 데뷔·올 시즌 처음 / STREAK 연속 안타 / SEASON_BEST 올 시즌 최고 경기.
 * stat은 문구가 이미 말하는 활약(homeRuns·hits·rbi·stolenBases·wins·saves·strikeouts)이라 같은 뜻의 활약 배지는 카드에서 뺀다.
 * 활약을 말하지 않는 문구(연속·최고 경기)는 null이다.
 */
export type GameBuzz = S["GameBuzz"];

/** 활약 배지(Highlights)가 있는 기록 이름. 서버 GameBuzz.stat과 배지의 stat이 같으면 같은 뜻이라 배지를 뺀다 */
export type BuzzStat = NonNullable<S["GameBuzz"]["stat"]>;

/** 선수 × 경기 한 줄 */
export type GameLine = S["GameLine"];

export type Lineup = NonNullable<S["GameLine"]["lineup"]>;
export type SeasonType = NonNullable<S["GameLine"]["seasonType"]>;

export type GameBatting = S["GameBatting"];

export type GamePitching = S["GamePitching"];

export type HitterSeason = S["HitterSeason"];

export type PitcherSeason = S["PitcherSeason"];

/**
 * 시즌 순위(타율·OPS·평균자책점)에 넣는 최소 표본. 몇 타석만 뛴 선수가 1위가 되지 않게 거른다.
 * 타자는 팀 경기 수 × 0.5타석(최소 10), 투수는 팀 경기 수 × 0.2이닝(최소 5이닝). 홈런·타점처럼 쌓이는 기록에는 쓰지 않는다.
 */
export type RankingMinimums = S["RankingMinimums"];

/** GET /api/home */
export type HomeResponse = S["HomeResponse"];

/** 포스팅 선수 상태: 협상 시작 전·협상 중·계약·결렬·마감 지남(결과 확인 중) */
export type PostingStatus = S["PostingSummaryPlayer"]["status"];

export type PostingDeal = S["PostingSummaryDeal"];

export type NewsHeadline = S["PostingSummaryHeadline"];

/** GET /api/news/{id}: 우리 기사 페이지 한 건. 원문은 url(언론사)에 있고, 우리는 제목·대표 사진·요약과 출처만 보여 준다 */
export type NewsPage = S["NewsPageResponse"];

/** GET /api/news의 선수 고르기 한 칸(korleaguer-server#153) */
export type NewsListPlayer = S["NewsListResponseSubject"];

/** 뉴스 탭 기사 한 줄. 목록에는 요약을 보이지 않아 서버가 요약·첫머리를 싣지 않는다(lead·summary는 늘 null) */
export type NewsListItem = S["NewsListResponseItem"];

/** GET /api/news: 뉴스 탭 한 쪽 */
export type NewsList = S["NewsListResponse"];

export type NewsTopic = S["NewsTopic"];

export type PostingPlayer = S["PostingSummaryPlayer"];

/** 최근 days일(한국 날짜, 오늘 포함) 기사에서 행선지로 거론된 구단. teams는 거론이 많은 순 → 오늘 → 최근 순 */
export type LinkedTeams = S["PostingSummaryLinkedTeams"];

export type LinkedTeam = S["PostingSummaryLinkedTeam"];

/** 구단을 행선지로 거론한 기사 한 건 */
export type LinkedArticle = S["PostingSummaryLinkedArticle"];

/** 지금 포스팅 제도(2018~)의 지난 기록. 결렬이면 deal·daysBeforeDeadline이 null */
export type PostingPast = S["PostingSummaryPast"];

export type PostingSummary = S["PostingSummary"];

/**
 * 비시즌 정보(GET /api/home의 offseason). 최근 7일 안에 시작한 우리 선수 구단 경기가 없고
 * 정규시즌 기간도 아니면 api가 채운다(시즌 끝, 스프링캠프, 포스트시즌 탈락).
 */
export type OffSeason = S["OffSeason"];

/**
 * 시즌 판정. GOOD 좋은 시즌 · SHORT_GOOD 짧았지만 좋았던 시즌 · SOLID 제 몫 한 시즌 · MINORS 트리플A(마이너)에서 보낸 시즌 ·
 * SHORT 출전이 적었던 시즌 · POOR 아쉬운 시즌(혹평 대신, 이유 한 줄과 함께)
 */
export type SeasonTier = S["SeasonReport"]["tier"];

/** 선수 한 명의 시즌 성적표(GET /api/home의 offseason.report) */
export type SeasonReport = S["SeasonReport"];

/**
 * 성적표 달 한 칸. kind: MLB 메이저 · MINORS 마이너(levelKo 단계) · INJURED 부상(재활 경기만 뛰었거나 경기 없이 부상자 명단) ·
 * FREE_AGENT 팀 없음 · NONE 기록 없음. 기록(avg·era)은 MLB·MINORS에만 있다
 */
export type SeasonMonth = S["SeasonReportMonth"];

/** GET /api/players 의 한 항목. 매칭 전 선수는 이름(한글)·역할 말고는 null일 수 있다 */
export type PlayerSummary = S["PlayerSummary"];

export type Level = S["SeasonReport"]["level"];

/** 선수 이동 기록 한 줄(콜업, 마이너 강등, 부상자 명단 등) */
export type RosterMove = S["MoveEntry"];

/** 이동 연표 띠 구간 종류: 메이저 · 마이너 · 부상(재활 경기만 뛰었거나 경기 없이 부상자 명단) · 팀 없음(방출·FA) */
export type TimelineKind = S["TimelineSegment"]["kind"];

/** 띠 한 구간(양 끝 날짜 포함). 같은 종류가 이어지면 서버가 합쳐 준다 */
export type TimelineSegment = S["TimelineSegment"];

/** 그 시즌 선수 숫자(경기 수·wRC+·타율, 투수는 ERA+·평균자책점). 보이는 단계(level)의 합계 */
export type TimelineStat = S["PlayerTimelineResponseStat"];

export type TimelinePlayer = S["PlayerTimelineResponsePlayerTimeline"];

/** GET /api/players/timeline?season=: 선수 탭 '어디서 뛰었나' 연표 */
export type Timeline = S["PlayerTimelineResponse"];

export type PlayerDetail = S["PlayerPageResponsePlayerInfo"];

/** 과거 소속팀 시절 사진 한 장(그 팀 마지막 시즌 KBO 공식 사진, 우리가 호스팅하는 주소) */
export type CareerPhoto = S["PastTeamPhoto"];

/**
 * 선수 화면 'MLB 타자(투수) 중에서'의 백분위(1~99, 높을수록 좋다): 같은 시즌 MLB 선수(타자 100타석·투수 30이닝 이상) 중
 * 이 선수보다 값이 나쁜 비율. 견줄 선수가 아직 없거나(시즌 초) 이 선수의 그 값이 없으면 null
 */
export type HitterPercentiles = S["PlayerSaberHitterPercentiles"];

export type PitcherPercentiles = S["PlayerSaberPitcherPercentiles"];

/**
 * GET /api/players/{id}의 saber(korleaguer-server#133): 지금 시즌 MLB 공식 세이버 지표와 MLB 선수 중 위치(백분위).
 * 득점(batting·baseRunning·fielding)은 리그 평균 대비(+면 평균보다 낫다). percentiles는 표본이 적으면(타자 50타석·투수 10이닝 미만) null
 */
export type PlayerSaber = S["PlayerSaber"];

/** 지난 시즌 표 한 줄(MLB 정규시즌, 최신부터). 한 시즌 여러 팀이면 합친 한 줄이고 teamKo는 "탬파베이·애틀랜타" */
export type CareerSeason = S["CareerSeason"];

/** GET /api/players/{id} */
export type PlayerResponse = S["PlayerPageResponse"];

/**
 * 선수의 마이너리그 경기 한 번(GET /api/players/{id}의 minorGames). 경기 기록에서 메이저 경기와 날짜순으로 섞어 보여 준다.
 * 팀 이름은 한국어 도시 이름(모르는 팀이면 영어 지명), 로고는 teamId·opponentId로 MLB 공식 로고 주소에서 받는다.
 */
export type MinorGameLine = S["MinorGameLine"];

/**
 * 선수 한 명의 경기 한 개 상세(GET /api/players/{id}/games/{gamePk}, korleaguer-server#159).
 * 경기 달력에서 날짜를 누르면 뜨는 창에 쓴다. 서버가 404를 주면 창이 '불러오지 못했어요'를 보인다.
 */
export type GameDetail = S["GameDetail"];

export type GamePlay = S["GameDetailGamePlay"];

export type GameHighlight = S["GameDetailGameHighlight"];

/** 내 선수 카드의 기간 합계(타자). avg는 타수가 없으면 null */
export type HitterPeriod = S["PeriodHitting"];

/** 내 선수 카드의 기간 합계(투수). era는 이닝이 없으면 null */
export type PitcherPeriod = S["PeriodPitching"];

/** 내 선수 한 명: 선수 정보 + 기간 합계 + 연속 기록 + 기간 안 경기(최신부터) */
export type MyPlayer = S["MyPlayersResponseMyPlayer"];

/**
 * 상태 배지 종류. IL 부상자 명단 · RETURNED 부상 복귀(7일 안) · CALLED_UP 콜업(7일 안) · MINORS 마이너 ·
 * MINORS_IL 마이너 부상자 명단 · SUSPENDED 출장 정지 · DFA 지명 할당 · FA · SEASON_OVER 시즌 끝 ·
 * KBO 국내 리그로 돌아감(teamName에 그 팀, lastGameDate·lastGameLevel은 해외 마지막 경기)
 */
export type CardStatusKind = S["CardStatus"]["kind"];

export type CardStatus = S["CardStatus"];

/** 팀 경기 하나에서의 출전: 선발 · 교체 · 출전(선발·교체 모름) · 결장 */
export type PlayCode = NonNullable<S["CardPlay"]["recent"]>[number];

/**
 * 출전 줄. 타자는 recent(지금 단계 기간이 시작된 뒤 팀 최근 10경기, 오래된 것부터)와
 * after(10경기가 안 되고 복귀·콜업 뒤면 그 시작), 투수는 최근 14일 등판 수와 마지막 등판이 며칠 전인지.
 */
export type PlayLine = S["CardPlay"];

/** 한 줄 소식. HOT은 좋은 일(주황), COLD는 안 좋은 일(본문 글자, 파랑은 쓰지 않는다) */
export type FormFact = S["CardFact"];

/**
 * RECENT 오늘까지 · LAST_PLAYED 마지막으로 뛴 날까지 · BEFORE_INJURY 다치기 전 ·
 * SEASON 시즌 합계(seasonTotals) · NONE 보여 줄 기록 없음
 */
export type CardBasis = S["MyPlayersResponseMyPlayer"]["basis"];

/** 한 단계의 시즌 합계. 타자는 atBats·hits·homeRuns·avg, 투수는 outs·inningsText·era·strikeouts·saves·holds */
export type LevelTotals = S["LevelTotals"];

export type SeasonTotals = S["MyPlayersResponseSeasonTotals"];

/** GET /api/my?ids=1,2&days=7 */
export type MyPlayersResponse = S["MyPlayersResponse"];

// ---- 응답 다듬기 ----
// 응답 모양은 서버 명세가 보장한다(타입이 곧 명세다). 여기서는 표시·보안 규칙만 적용한다:
// 링크·사진으로 쓸 수 없는 주소 거르기, https 사진만 쓰기, 빈 이름·빈 글자 거르기. 모양이 아예 틀리면 예외가 나고
// requestApi가 badResponse로 바꾼다. 다듬을 것이 없는 응답(선수 연표)은 받은 그대로 쓴다.

/** http(s) 주소만 통과시킨다. 사진·링크 주소로 쓰므로 javascript: 같은 것은 버린다 */
function httpUrl(value: string | null | undefined): string | null {
  return value && /^https?:\/\//i.test(value) ? value : null;
}

/** 선수 사진 주소: 우리가 호스팅하는 사진(/photos/mlb-808982, 내용 버전이 붙은 /photos/mlb-808982?v=1a2b3c4d)이나 http(s) 주소. 그 밖에는 null */
function photoUrl(value: string | null | undefined): string | null {
  return value && PHOTO_PATH.test(value) ? value : httpUrl(value);
}

function normalizeLine(line: GameLine): GameLine {
  return {
    ...line,
    photoUrl: photoUrl(line.photoUrl),
    // 팀 이름은 서버에서 빌 수 있다(팀 표에 이름이 없을 때). 글자 틀에 'null'이 들어가지 않게 빈 글자로 둔다
    teamKo: line.teamKo ?? "",
    opponentKo: line.opponentKo ?? "",
  };
}

/** 시즌 성적 한 줄(타자·투수 공통) */
function normalizeSeason<T extends { photoUrl: string | null }>(row: T): T {
  return { ...row, photoUrl: photoUrl(row.photoUrl) };
}

function normalizeHome(raw: HomeResponse): HomeResponse {
  return {
    ...raw,
    recent: { ...raw.recent, lines: raw.recent.lines.map(normalizeLine) },
    hitters: raw.hitters.map(normalizeSeason),
    pitchers: raw.pitchers.map(normalizeSeason),
    minorHitters: raw.minorHitters.map(normalizeSeason),
    minorPitchers: raw.minorPitchers.map(normalizeSeason),
    offseason: raw.offseason && { ...raw.offseason, report: raw.offseason.report.map(normalizeReport) },
    posting: raw.posting && {
      players: raw.posting.players.map((p) => ({
        ...p,
        photoUrl: photoUrl(p.photoUrl),
        news: p.news.flatMap((n) => normalizeHeadline(n) ?? []),
        linkedTeams: p.linkedTeams && normalizeLinkedTeams(p.linkedTeams),
      })),
      history: raw.posting.history.map((h) => ({ ...h, photoUrl: photoUrl(h.photoUrl) })),
    },
  };
}

/**
 * 성적표 한 장. 단계 이름이 빈 글자면 없는 것으로 본다. MLB 안 위치가 null이면 메이저 기록이 없거나 서버가 위치를
 * 못 읽은 것이라, 화면은 메이저 경기가 없을 때만 '위치는 없어요'를 쓰고 메이저에서 뛴 선수면 줄을 뺀다(SeasonReportList).
 * 기사는 관련 기사와 같은 규칙으로 다듬는다(원문 주소가 http(s)가 아닌 기사는 링크로 쓸 수 없어 뺀다)
 */
function normalizeReport(r: SeasonReport): SeasonReport {
  return {
    ...r,
    statLevelKo: r.statLevelKo?.trim() ? r.statLevelKo : null,
    linkedTeams: r.linkedTeams && normalizeLinkedTeams(r.linkedTeams),
    news: r.news.flatMap((n) => normalizeHeadline(n) ?? []),
  };
}

/**
 * 기사 한 건(관련 기사, 뉴스 탭 목록 한 줄). 원문 주소가 http(s)가 아니면 링크로 쓸 수 없어 뺀다(null).
 * 뉴스 탭 목록 한 줄은 첫머리·요약 칸이 없어 그 둘은 받은 그대로 둔다
 */
function normalizeHeadline<T extends Omit<NewsHeadline, "lead" | "summary">>(n: T): T | null {
  const url = httpUrl(n.url);
  if (!url) return null;
  return {
    ...n,
    url,
    // 기사 사진은 언론사 서버에서 브라우저가 직접 받는다. https 주소만 쓴다
    imageUrl: n.imageUrl?.startsWith("https://") ? n.imageUrl : null,
    alsoBy: alsoByOf(n.alsoBy),
  };
}

/** 거론 구단마다의 기사. 기사 사진은 언론사 서버에서 브라우저가 직접 받으므로 https 주소만 쓴다 */
function normalizeLinkedTeams(linked: LinkedTeams): LinkedTeams {
  return {
    ...linked,
    teams: linked.teams.map((t) => ({
      ...t,
      articles: t.articles.map((a) => ({ ...a, imageUrl: a.imageUrl?.startsWith("https://") ? a.imageUrl : null })),
    })),
  };
}

/** 같은 글을 실은 다른 언론사 이름. 빈 이름은 뺀다 */
function alsoByOf(names: string[]): string[] {
  return names.filter((p) => p.trim() !== "");
}

function normalizeNewsPage(raw: NewsPage): NewsPage {
  const url = httpUrl(raw.url);
  // 원문 링크를 걸 수 없는 기사는 보여 주지 않는다(badResponse)
  if (!url) throw new Error("원문 주소가 http(s)가 아님");
  return {
    ...raw,
    url,
    playerPhotoUrl: photoUrl(raw.playerPhotoUrl),
    imageUrl: raw.imageUrl?.startsWith("https://") ? raw.imageUrl : null,
    alsoBy: alsoByOf(raw.alsoBy),
    more: raw.more.flatMap((n) => normalizeHeadline(n) ?? []),
  };
}

/** MLB 서버 주소만 받는다(영상·사진). 다른 곳이면 null */
function mlbMediaUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname === "mlb.com" || url.hostname.endsWith(".mlb.com") || url.hostname.endsWith(".mlbstatic.com"))
      ? value
      : null;
  } catch {
    return null;
  }
}

/** 경기 상세. 공 번호는 영상 주소를 물을 때 주소에 넣으므로 모양을 본다. 영상은 MLB 주소만, 둘 다 없으면 뺀다 */
function normalizeGameDetail(raw: GameDetail): GameDetail {
  return {
    ...raw,
    plays: raw.plays.map((p) => ({ ...p, playId: p.playId && /^[0-9a-f-]{36}$/.test(p.playId) ? p.playId : null })),
    highlights: raw.highlights.flatMap((h) => {
      const mp4Url = mlbMediaUrl(h.mp4Url);
      const hlsUrl = mlbMediaUrl(h.hlsUrl);
      if (!mp4Url && !hlsUrl) return [];
      return [
        {
          ...h,
          title: h.title ?? "",
          titleKo: h.titleKo?.trim() || null,
          mp4Url,
          hlsUrl,
          imageUrl: mlbMediaUrl(h.imageUrl),
        },
      ];
    }),
  };
}

/** 뉴스 탭 한 쪽. 링크를 걸 수 없는 기사(원문 주소가 http(s)가 아님)와 이름이 빈 선수·빈 낱말은 뺀다 */
function normalizeNewsList(raw: NewsList): NewsList {
  return {
    ...raw,
    players: raw.players
      .filter((p) => p.nameKo.trim() !== "")
      .map((p) => ({ ...p, photoUrl: photoUrl(p.photoUrl) })),
    items: raw.items.flatMap((n) => {
      const headline = normalizeHeadline(n);
      if (!headline) return [];
      return [{ ...headline, who: n.who.filter((w) => w.trim() !== "") }];
    }),
    // 빈 글자는 없는 것으로 본다(빈 커서로 '더 보기'를 만들지 않는다)
    next: raw.next || null,
    query: raw.query || null,
    topics: raw.topics.filter((t) => t.word !== ""),
  };
}

/** 목록·상세가 같이 쓰는 선수 정보. 빈 등번호는 없는 것으로 본다 */
function normalizeSummary<T extends PlayerSummary>(p: T): T {
  return {
    ...p,
    photoUrl: photoUrl(p.photoUrl),
    jersey: String(p.jersey ?? "").trim() || null,
  };
}

function normalizePlayer(raw: PlayerResponse): PlayerResponse {
  const p = raw.player;
  return {
    ...raw,
    player: {
      ...normalizeSummary(p),
      mlbUrl: httpUrl(p.mlbUrl),
      // 팀 이름이 빈 사진은 이름표를 달 수 없어, 쓸 수 없는 주소의 사진은 그릴 수 없어 뺀다
      careerPhotos: p.careerPhotos.flatMap((c) => {
        const url = photoUrl(c.photoUrl);
        return c.teamKo && url ? [{ ...c, photoUrl: url }] : [];
      }),
    },
    hitting: raw.hitting && normalizeSeason(raw.hitting),
    pitching: raw.pitching && normalizeSeason(raw.pitching),
    minorHitting: raw.minorHitting && normalizeSeason(raw.minorHitting),
    minorPitching: raw.minorPitching && normalizeSeason(raw.minorPitching),
    games: raw.games.map(normalizeLine),
    news: raw.news.flatMap((n) => normalizeHeadline(n) ?? []),
    minorGames: raw.minorGames.flatMap((m) => normalizeMinorGame(m) ?? []),
  };
}

/** 마이너 경기 한 줄. 상대 팀 이름이 없으면 쓸 수 없어 뺀다. 단계 이름이 비면 '마이너', 팀 이름이 비면 빈 글자 */
function normalizeMinorGame(m: MinorGameLine): MinorGameLine | null {
  if (!m.opponentKo) return null;
  return { ...m, levelKo: m.levelKo || "마이너", teamKo: m.teamKo ?? "" };
}

function normalizeRecords(raw: RecordsResponse): RecordsResponse {
  return {
    ...raw,
    categories: raw.categories.map((c) => ({
      ...c,
      leaders: c.leaders.map((l) => ({ ...l, photoUrl: photoUrl(l.photoUrl) })),
    })),
    next: raw.next.map((n) => ({ ...n, photoUrl: photoUrl(n.photoUrl) })),
    passed: raw.passed.map((p) => ({ ...p, photoUrl: photoUrl(p.photoUrl) })),
  };
}

function normalizeSameGames(raw: SameGamesResponse): SameGamesResponse {
  return {
    ...raw,
    pairs: raw.pairs.map((p) => ({
      ...p,
      other: { ...p.other, photoUrl: photoUrl(p.other.photoUrl) },
      meetings: p.meetings.map((m) => ({ mine: normalizeLine(m.mine), other: normalizeLine(m.other) })),
    })),
  };
}

function normalizeCompareLine(l: CompareLine): CompareLine {
  return { ...l, player: normalizeSummary(l.player) };
}

function normalizeCompare(raw: CompareResponse): CompareResponse {
  return { ...raw, me: raw.me && normalizeCompareLine(raw.me), others: raw.others.map(normalizeCompareLine) };
}

function normalizeMy(raw: MyPlayersResponse): MyPlayersResponse {
  return {
    ...raw,
    players: raw.players.map((p) => ({
      ...p,
      player: normalizeSummary(p.player),
      games: p.games.map(normalizeLine),
    })),
  };
}

// ---- 호출 ----

/** 한국인 메이저리거 역대 기록(GET /api/records, 기록 화면). 모두 MLB 정규시즌 기록 */
export type RecordsResponse = S["RecordsResponse"];

export type RecordGroup = S["RecordCategory"]["group"];

export type RecordCategory = S["RecordCategory"];

export type RecordLeader = S["RecordLeader"];

export type RecordNext = S["RecordNext"];

export type RecordPassed = S["RecordPassed"];

export type RecordBest = S["RecordBest"];

/** 같은 경기에 나온 상대 선수 한 명과의 묶음(GET /api/players/{id}/same-games의 pairs) */
export type SamePair = S["SameGamesResponsePair"];

/** GET /api/players/{id}/same-games: 그 시즌 메이저 경기 중 다른 우리 선수와 같이 나온 경기. 많이 만난 순 */
export type SameGamesResponse = S["SameGamesResponse"];

/** 두 선수 비교의 타자 한 줄(GET /api/players/{id}/compare). 숫자는 그 시즌 메이저 정규시즌 것이다 */
export type CompareLine = S["CompareResponseLine"];

/** GET /api/players/{id}/compare: 이 선수(me)와 견줄 수 있는 다른 우리 타자(others, 타석 많은 순). 투수·메이저 타석 없음이면 me가 null */
export type CompareResponse = S["CompareResponse"];

/** 호출 실패 이유. 화면은 이 값을 보고 안내 문구를 고른다. */
export type ApiFailure = "unreachable" | "notFound" | "badResponse";

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; failure: ApiFailure };

const TIMEOUT_MS = 5000;

/**
 * api를 부른다. 결과는 아래 '잠깐 재사용' 함수(use cache)가 30초 동안 서버 메모리에 두고 같은 요청에 다시 쓴다.
 * 운영 서버(라즈베리파이 4)는 이 Mac보다 계산이 약 9배 느려서, 받은 JSON을 다시 읽고 다듬는 일까지 아끼면 화면이 빨라진다.
 */
async function requestApi<T>(
  path: string,
  normalize: (raw: T) => T = (raw) => raw,
  timeoutMs = TIMEOUT_MS,
): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(apiUrl(path), { signal: AbortSignal.timeout(timeoutMs) });
  } catch (e) {
    console.warn(`[api] ${path} 연결 실패:`, e instanceof Error ? e.message : e);
    return { ok: false, failure: "unreachable" };
  }

  if (res.status === 404) return { ok: false, failure: "notFound" };
  if (!res.ok) return { ok: false, failure: "badResponse" };

  try {
    return { ok: true, data: normalize((await res.json()) as T) };
  } catch (e) {
    console.warn(`[api] ${path} 응답 형식 오류:`, e instanceof Error ? e.message : e);
    return { ok: false, failure: "badResponse" };
  }
}

/*
 * 잠깐 재사용(use cache): 같은 주소의 api 결과를 30초 동안 서버 메모리에 두고 다시 쓴다(사람마다 같은 데이터만).
 * - 30초가 지나면 먼저 옛 결과를 주고 뒤에서 새로 받는다. 5분 동안 아무도 안 부르면 버린다.
 * - 실패(연결 안 됨 등)는 1초만 두어, 서버가 돌아오면 바로 다시 받는다.
 * - 빌드 때 미리 그리지 않게, 부르는 쪽(get…)에서 먼저 connection()을 부른다(빌드에는 api가 없다).
 * cacheLife는 함수마다 직접 부른다(Next 권장: 캐시 수명이 그 자리에서 보이게).
 */
async function homeFromApi() {
  "use cache";
  const result = await requestApi("/api/home", normalizeHome);
  cacheLife(result.ok ? { stale: 30, revalidate: 30, expire: 300 } : { stale: 0, revalidate: 1, expire: 2 });
  return result;
}

async function timelineFromApi(season: number) {
  "use cache";
  const result = await requestApi<Timeline>(`/api/players/timeline${season > 0 ? `?season=${season}` : ""}`);
  cacheLife(result.ok ? { stale: 30, revalidate: 30, expire: 300 } : { stale: 0, revalidate: 1, expire: 2 });
  return result;
}

async function playersFromApi() {
  "use cache";
  const result = await requestApi("/api/players", (players: PlayerSummary[]) => players.map(normalizeSummary));
  cacheLife(result.ok ? { stale: 30, revalidate: 30, expire: 300 } : { stale: 0, revalidate: 1, expire: 2 });
  return result;
}

async function playerFromApi(id: number) {
  "use cache";
  const result = await requestApi(`/api/players/${id}`, normalizePlayer);
  cacheLife(result.ok ? { stale: 30, revalidate: 30, expire: 300 } : { stale: 0, revalidate: 1, expire: 2 });
  return result;
}

async function newsFromApi(id: number) {
  "use cache";
  const result = await requestApi(`/api/news/${id}`, normalizeNewsPage);
  cacheLife(result.ok ? { stale: 30, revalidate: 30, expire: 300 } : { stale: 0, revalidate: 1, expire: 2 });
  return result;
}

async function newsListFromApi(player: string, before: string, q: string) {
  "use cache";
  const query = new URLSearchParams();
  if (player) query.set("player", player);
  if (before) query.set("before", before);
  if (q) query.set("q", q);
  const qs = query.toString();
  const result = await requestApi(`/api/news${qs ? `?${qs}` : ""}`, normalizeNewsList);
  cacheLife(result.ok ? { stale: 30, revalidate: 30, expire: 300 } : { stale: 0, revalidate: 1, expire: 2 });
  return result;
}

async function myPlayersFromApi(ids: string, days: number) {
  "use cache";
  const result = await requestApi(`/api/my?ids=${ids}&days=${days}`, normalizeMy);
  cacheLife(result.ok ? { stale: 30, revalidate: 30, expire: 300 } : { stale: 0, revalidate: 1, expire: 2 });
  return result;
}

async function recordsFromApi() {
  "use cache";
  const result = await requestApi("/api/records", normalizeRecords);
  cacheLife(result.ok ? { stale: 30, revalidate: 30, expire: 300 } : { stale: 0, revalidate: 1, expire: 2 });
  return result;
}

async function sameGamesFromApi(playerId: number) {
  "use cache";
  const result = await requestApi(`/api/players/${playerId}/same-games`, normalizeSameGames);
  cacheLife(result.ok ? { stale: 30, revalidate: 30, expire: 300 } : { stale: 0, revalidate: 1, expire: 2 });
  return result;
}

async function compareFromApi(playerId: number) {
  "use cache";
  const result = await requestApi(`/api/players/${playerId}/compare`, normalizeCompare);
  cacheLife(result.ok ? { stale: 30, revalidate: 30, expire: 300 } : { stale: 0, revalidate: 1, expire: 2 });
  return result;
}

// 경기 상세는 처음 열 때 api가 MLB에서 받아(요청 2번, 1초 간격) 조금 오래 걸린다
const DETAIL_TIMEOUT_MS = 15_000;

async function gameDetailFromApi(playerId: number, gamePk: number) {
  "use cache";
  const result = await requestApi(`/api/players/${playerId}/games/${gamePk}`, normalizeGameDetail, DETAIL_TIMEOUT_MS);
  // 아직 못 받았으면(available=false) 실패처럼 짧게만 둔다
  const keep = result.ok && result.data.available;
  cacheLife(keep ? { stale: 30, revalidate: 30, expire: 300 } : { stale: 0, revalidate: 1, expire: 2 });
  return result;
}

async function clipFromApi(playerId: number, gamePk: number, playId: string) {
  "use cache";
  const result = await requestApi<{ mp4Url: string | null }>(
    `/api/players/${playerId}/games/${gamePk}/clips/${playId}`,
    (raw) => ({ mp4Url: mlbMediaUrl(raw?.mp4Url) }),
    DETAIL_TIMEOUT_MS,
  );
  // 영상 주소는 바뀌지 않는다. 찾았으면 하루 두고, 못 찾았으면 짧게
  cacheLife(result.ok && result.data.mp4Url ? { stale: 3600, revalidate: 86400, expire: 86400 } : { stale: 0, revalidate: 1, expire: 2 });
  return result;
}

// connection(): 빌드 때 미리 그리지 않고 요청이 올 때 받는다. 재사용 함수 밖에서 불러야 한다.
// cache: 한 요청 안에서 같은 호출을 여러 번 해도 한 번만 부른다.
export const getHome = cache(async () => {
  await connection();
  return homeFromApi();
});

/** GET /api/players: 선수 목록 */
export const getPlayers = cache(async () => {
  await connection();
  return playersFromApi();
});

/**
 * 선수 번호 → 사진 속 유니폼 팀 약어(없으면 지금 팀, 명단 선수만). 기록·뉴스처럼 응답에 팀이 없는 화면이 사진 원을 팀 색으로 칠하려고 쓴다.
 * getPlayers는 React cache라 같은 요청 안의 다른 호출과 한 번만 부른다. 못 받으면 빈 표(회색 원)
 */
export async function getTeamAbbrById(): Promise<Record<number, string | null>> {
  const result = await getPlayers();
  // 이 표는 사진 원 바탕색에만 쓴다. 사진 속 유니폼 팀(photoTeamAbbr)을 먼저, 없으면 지금 팀
  return result.ok ? Object.fromEntries(result.data.map((p) => [p.id, p.photoTeamAbbr ?? p.teamAbbr])) : {};
}

/** GET /api/players/timeline: 선수 탭 연표. season 0이면 서버가 지금 시즌을 고른다 */
export const getTimeline = cache(async (season: number = 0) => {
  await connection();
  return timelineFromApi(season);
});

export const getPlayer = cache(async (id: number) => {
  await connection();
  return playerFromApi(id);
});

/** GET /api/news/{id}: 우리 기사 페이지 한 건. 없는 기사면 notFound */
export const getNews = cache(async (id: number) => {
  await connection();
  return newsFromApi(id);
});

/**
 * GET /api/news: 뉴스 탭 한 쪽. player(한글 이름)가 null이면 전체, before는 앞 쪽의 next(null이면 첫 쪽),
 * q는 검색어(제목, null이면 거르지 않음)
 */
export const getNewsList = cache(async (player: string | null, before: string | null, q: string | null = null) => {
  await connection();
  return newsListFromApi(player ?? "", before ?? "", q ?? "");
});

/** GET /api/my: 고른 선수들의 최근 days일 경기. ids는 "1,5,2"처럼 1명 이상(빈 목록은 api가 400) */
const getMyPlayersCached = cache(async (ids: string, days: number) => {
  await connection();
  return myPlayersFromApi(ids, days);
});

/** /api/my가 한 번에 받는 선수 수(korleaguer-server MyPlayersService.MAX_IDS, 넘으면 400) */
const MY_IDS_PER_REQUEST = 20;

/**
 * GET /api/my. api가 한 번에 20명까지만 받아서, 넘으면 20명씩 나눠 함께 부르고 선수를 준 순서대로 이어 붙인다(전수조사 L426).
 * 예전에는 홈 층이 명단을 20명에서 잘라 21번째부터 말없이 빠지고, 비시즌 성적표는 400으로 통째 오류였다.
 * 하나라도 실패하면 실패로 돌려준다(몇 명만 빠진 화면은 빠진 줄 알 수 없고, 층의 'n명'도 말없이 틀린다. 층은 받지 못하면
 * 예전 '최근 경기'를 보인다). 20명 이하면 예전과 같은 요청 한 번이라
 * 캐시 열쇠도 같다('내 선수'는 쿠키가 20명까지라 늘 한 번). cache는 인자를 값이 아니라 참조로 비교하므로, 배열을 문자열로 바꿔 넘긴다.
 */
export async function getMyPlayers(ids: readonly number[], days: number): Promise<ApiResult<MyPlayersResponse>> {
  // 묶음끼리는 api가 겹친 번호를 걸러 주지 못하니 먼저 거른다(명단·쿠키는 겹치지 않아 보통은 그대로다)
  const unique = [...new Set(ids)];
  if (unique.length <= MY_IDS_PER_REQUEST) return getMyPlayersCached(unique.join(","), days);
  const chunks: number[][] = [];
  for (let i = 0; i < unique.length; i += MY_IDS_PER_REQUEST) chunks.push(unique.slice(i, i + MY_IDS_PER_REQUEST));
  const results = await Promise.all(chunks.map((chunk) => getMyPlayersCached(chunk.join(","), days)));
  const pages: MyPlayersResponse[] = [];
  for (const result of results) {
    if (!result.ok) return result;
    pages.push(result.data);
  }
  // 머리 정보(기준 시각·기간·데이터 상태)는 가장 늦게 만든 묶음 것을 통째로 쓴다(리뷰 지적). 묶음마다 따로 잠깐 재사용(use cache)해서
  // 드물게 다른 때의 응답이 섞이고(한 묶음만 캐시에서 빠졌을 때 등), 섞어 쓰면 기준 시각과 기간이 어긋난다. 가장 늦은 것이 지금 날짜를
  // 맞게 말한다: 층의 '오늘'·'어제'가 이 기준 시각을 따라, 이른 것을 쓰면 새로 받은 묶음의 오늘 경기에 '11월 19일'이 붙는다.
  // 기간을 당긴 선수가 있는지는 어느 묶음이든 하나라도(응답의 기간은 당기지 않은 오늘 기준이고, 당긴 기간은 선수마다 있다)
  const newest = pages.reduce((a, b) => (Date.parse(b.generatedAt) > Date.parse(a.generatedAt) ? b : a));
  return {
    ok: true,
    data: { ...newest, isFallback: pages.some((p) => p.isFallback), players: pages.flatMap((p) => p.players) },
  };
}

/** GET /api/records: 한국인 메이저리거 역대 기록(기록 화면) */
export const getRecords = cache(async () => {
  await connection();
  return recordsFromApi();
});

/** GET /api/players/{id}/same-games: 같은 경기에 나온 우리 선수(선수 페이지 칸·홈 맞대결 카드) */
export const getSameGames = cache(async (playerId: number) => {
  await connection();
  return sameGamesFromApi(playerId);
});

/** GET /api/players/{id}/compare: 두 선수 비교에 쓸 타자 시즌 성적 묶음(선수 페이지 비교 창) */
export const getCompare = cache(async (playerId: number) => {
  await connection();
  return compareFromApi(playerId);
});

/** GET /api/players/{id}/games/{gamePk}: 경기 상세(타석별 기록·하이라이트) */
export const getGameDetail = cache(async (playerId: number, gamePk: number) => {
  await connection();
  return gameDetailFromApi(playerId, gamePk);
});

/** GET /api/players/{id}/games/{gamePk}/clips/{playId}: 공 하나 영상 주소(MLB 서버 mp4). 없으면 notFound */
export const getClip = cache(async (playerId: number, gamePk: number, playId: string) => {
  await connection();
  return clipFromApi(playerId, gamePk, playId);
});
