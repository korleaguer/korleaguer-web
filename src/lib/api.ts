// api 서버와 주고받는 데이터 모양(스펙 2절 'API 계약' v2.1)과 호출 함수를 모아 둔 파일.
import { cache } from "react";
import { connection } from "next/server";

/** mlb: MLB 공식 Stats API에서 받은 실제 데이터, sample: 테스트·오프라인용 지어낸 데이터 */
export type DataMode = "sample" | "mlb";
export type Role = "HITTER" | "PITCHER";
export type GameResult = "W" | "L" | "T" | null;

/** 선수 × 경기 한 줄 */
export interface GameLine {
  playerId: number;
  nameKo: string;
  role: Role;
  gameId: number;
  /** ISO-8601, +09:00 오프셋 */
  startTimeKst: string;
  teamKo: string;
  /** 팀 약어(SF, LAD ...). 팀 색·로고를 찾을 때 쓴다 */
  teamAbbr: string | null;
  /** 선수 사진 주소(우리가 호스팅, /photos/mlb-808982). 없으면 null */
  photoUrl: string | null;
  opponentKo: string;
  /** 상대 팀 약어. 상대 팀 로고를 찾을 때 쓴다 */
  opponentAbbr: string | null;
  home: boolean;
  /** 경기 전이면 null */
  teamScore: number | null;
  opponentScore: number | null;
  /** 경기 전·중이면 null */
  result: GameResult;
  /** 경기 상태 (scheduled, in_progress, final, postponed ...) */
  gameStatus: string;
  played: boolean;
  /** api가 만든 한국어 한 줄 기록. 안 뛰었으면 이유("결장", "경기 전" ...) */
  summary: string;
  /** 이 경기 타격 숫자. 안 뛰었거나 기록을 못 받았으면 null */
  batting: GameBatting | null;
  /** 이 경기 투구 숫자. 안 던졌거나 기록을 못 받았으면 null */
  pitching: GamePitching | null;
  /** 선발(STARTER)인지 교체(SUB)로 나왔는지. 안 뛰었거나 모르면 null (MLB 공식 박스스코어 기준) */
  lineup: Lineup | null;
}

export type Lineup = "STARTER" | "SUB";

export interface GameBatting {
  atBats: number;
  hits: number;
  homeRuns: number;
  rbi: number;
  walks: number;
  stolenBases: number;
}

export interface GamePitching {
  /** 잡은 아웃 수. 모르면 null */
  outs: number | null;
  /** "1⅔". 아웃 수를 모르면 null */
  inningsText: string | null;
  runs: number;
  earnedRuns: number;
  strikeouts: number;
  win: boolean;
  loss: boolean;
  save: boolean;
}

export interface HitterSeason {
  playerId: number;
  nameKo: string;
  teamKo: string | null;
  teamAbbr: string | null;
  photoUrl: string | null;
  games: number;
  /** 같은 시즌 마이너(트리플A ~ 루키)에서 뛴 경기 수. 모르거나 오래된 api면 0 */
  minorGames: number;
  /** 올해 마이너 경기가 메이저 경기(games)보다 많다. 표에서 따로 묶고 1위 비교에서 뺀다 */
  mainlyMinors: boolean;
  /** 마이너 시즌 성적 줄이면 단계("트리플A" 등, teamKo는 마지막 마이너 팀). 메이저 줄이면 null */
  levelKo: string | null;
  /** 타석. 순위 기준(RankingMinimums)과 비교한다 */
  plateAppearances: number;
  atBats: number;
  hits: number;
  doubles: number;
  homeRuns: number;
  rbi: number;
  walks: number;
  strikeouts: number;
  stolenBases: number;
  avg: number | null;
  obp: number | null;
  slg: number | null;
  ops: number | null;
}

export interface PitcherSeason {
  playerId: number;
  nameKo: string;
  teamKo: string | null;
  teamAbbr: string | null;
  photoUrl: string | null;
  games: number;
  /** 같은 시즌 마이너(트리플A ~ 루키) 등판 경기 수. 모르거나 오래된 api면 0 */
  minorGames: number;
  /** 올해 마이너 등판이 메이저 등판(games)보다 많다. 표에서 따로 묶고 1위 비교에서 뺀다 */
  mainlyMinors: boolean;
  /** 마이너 시즌 성적 줄이면 단계("트리플A" 등, teamKo는 마지막 마이너 팀). 메이저 줄이면 null */
  levelKo: string | null;
  outs: number;
  /** "5⅔" 처럼 api가 만든 이닝 표기 */
  inningsText: string;
  era: number | null;
  wins: number;
  losses: number;
  saves: number;
  strikeouts: number;
  walks: number;
  hitsAllowed: number;
}

/**
 * 시즌 순위(타율·OPS·평균자책점)에 넣는 최소 표본. 몇 타석만 뛴 선수가 1위가 되지 않게 거른다.
 * 타자는 팀 경기 수 × 0.5타석(최소 10), 투수는 팀 경기 수 × 0.2이닝(최소 5이닝). 홈런·타점처럼 쌓이는 기록에는 쓰지 않는다.
 */
export interface RankingMinimums {
  /** 시즌이 얼마나 지났는지(우리 선수 구단 중 끝난 정규시즌 경기가 가장 많은 구단의 경기 수) */
  teamGames: number;
  minPlateAppearances: number;
  minOuts: number;
  /** "32⅔" 처럼 api가 만든 이닝 표기 */
  minInningsText: string;
}

/** GET /api/home */
export interface HomeResponse {
  dataMode: DataMode;
  statsAvailable: boolean;
  season: number;
  generatedAt: string;
  recent: {
    isFallback: boolean;
    /** 한국 날짜 "2026-09-27". DB에 경기가 하나도 없으면 null */
    dateKst: string | null;
    /** 선수당 한 줄 */
    lines: GameLine[];
  };
  /** 순위 기준. 없으면(오래된 api) null이고, 그때는 거르지 않는다 */
  ranking: RankingMinimums | null;
  /** 주로 메이저인 선수 먼저(주로 마이너는 맨 아래). 묶음 안에서는 순위 기준을 채운 선수 먼저 타율 순, 그다음 못 채운 선수 타율 순 */
  hitters: HitterSeason[];
  /** 주로 메이저인 투수 먼저(주로 마이너는 맨 아래). 묶음 안에서는 순위 기준을 채운 투수 먼저 평균자책점 낮은 순 */
  pitchers: PitcherSeason[];
  /** 마이너 시즌 성적(마이너 경기별 기록 합산), 마이너 경기 많은 순. 오래된 api면 빈 배열 */
  minorHitters: HitterSeason[];
  minorPitchers: PitcherSeason[];
  /** 비시즌일 때만 있다(다음 개막일 등). 시즌 중이거나 오래된 api면 null */
  offseason: OffSeason | null;
  /** 이번 겨울 KBO 포스팅(MLB 도전). 비시즌일 때만 있다. 시즌 중이거나 오래된 api면 null */
  posting: PostingSummary | null;
}

/** 포스팅 선수 상태: 협상 시작 전·협상 중·계약·결렬·마감 지남(결과 확인 중) */
export type PostingStatus = "UPCOMING" | "NEGOTIATING" | "SIGNED" | "NO_DEAL" | "CLOSED";

export interface PostingDeal {
  mlbTeamId: number | null;
  mlbTeamKo: string | null;
  /** 합의가 처음 보도된 미국 날짜 */
  agreedOn: string | null;
  years: number | null;
  /** 보장액(달러). 옵션·인센티브 제외 */
  guaranteedUsd: number | null;
  /** 합의일 원/달러 환율(1달러당 원, ECB 기준 환율). 화면이 보장액을 원화로 어림한다. 없으면 null */
  krwPerUsd: number | null;
}

export interface NewsHeadline {
  /** 우리 기사 번호. 제목을 누르면 우리 기사 페이지(/news/{id})로 간다. 옛 API면 null(원문을 새 탭으로 연다) */
  id: number | null;
  /** 언론사가 붙인 원래 제목(영어 기사면 영어) */
  title: string;
  /** 원문(언론사) 주소 */
  url: string;
  publisher: string;
  publishedAt: string;
  /** 아래 넷은 옛 API·요약 전이면 null */
  /** 영어 기사 제목을 Claude가 한국어로 옮긴 것 */
  titleKo: string | null;
  /** 기사 첫머리(언론사 피드가 준 글자 200자 안팎) */
  lead: string | null;
  /** Claude가 쓴 한국어 요약(줄마다 한 문장) */
  summary: string | null;
  /** 기사 대표 사진 원본 주소(언론사 서버) */
  imageUrl: string | null;
  /**
   * 같은 글을 실은 다른 언론사(낸 순, 이 기사의 언론사는 빼고). 서버가 언론사만 다른 같은 기사를 한 줄로 묶고
   * 이 기사를 대표로 보낸다(korleaguer-server#113). 묶인 사본이 없거나 옛 API면 빈 목록
   */
  alsoBy: string[];
}

/** GET /api/news/{id}: 우리 기사 페이지 한 건. 원문은 url(언론사)에 있고, 우리는 제목·대표 사진·요약과 출처만 보여 준다 */
export interface NewsPage {
  id: number;
  /** 이 기사의 선수(한글 이름) */
  player: string;
  /** 그 선수 사진(우리가 호스팅). 기사 사진이 없거나 안 뜨면 대신 보인다. 이번 겨울 포스팅 선수가 아니면 null */
  playerPhotoUrl: string | null;
  /** 언론사가 붙인 원래 제목(영어 기사면 영어) */
  title: string;
  /** 영어 기사 제목을 Claude가 한국어로 옮긴 것. 한국어 기사면 null */
  titleKo: string | null;
  /** 원문(언론사) 주소 */
  url: string;
  publisher: string;
  publishedAt: string;
  /** 기사 대표 사진 원본 주소(언론사 서버, https). 없으면 null */
  imageUrl: string | null;
  /** Claude가 쓴 한국어 요약(줄마다 한 문장). 아직 없으면 null */
  summary: string | null;
  /** 기사 첫머리(언론사 피드가 준 글자 200자 안팎). 요약이 없을 때 쓴다. 없으면 null */
  lead: string | null;
  /** 같은 선수의 다른 기사(늦은 순 5건, 이 기사는 빼고) */
  more: NewsHeadline[];
}

export interface PostingPlayer {
  nameKo: string;
  kboTeam: string;
  positionKo: string;
  birthYear: number | null;
  /** 프로필 사진(현 소속 KBO 구단 공식 사진). 없으면 null */
  photoUrl: string | null;
  status: PostingStatus;
  windowOpensAt: string;
  deadlineAt: string;
  /** 한국 날짜로 마감일까지 남은 날(마감 당일 0). 협상 시작 전·협상 중일 때만 */
  daysLeft: number | null;
  /** 협상 기간 중 지난 비율 0~1 */
  elapsedRatio: number;
  deal: PostingDeal | null;
  /** 관련 기사(늦은 순, 최대 5건) */
  news: NewsHeadline[];
}

/** 지금 포스팅 제도(2018~)의 지난 기록. 결렬이면 deal·daysBeforeDeadline이 null */
export interface PostingPast {
  nameKo: string;
  season: number;
  deadline: string;
  daysBeforeDeadline: number | null;
  deal: PostingDeal | null;
  /** 계약 구단 시절 MLB 사진의 흰 바탕 편집본(/photos/posting-673490-2024), 없으면 포스팅 당시 KBO 공식 사진(/photos/kbo-…). 없으면 null */
  photoUrl: string | null;
}

export interface PostingSummary {
  players: PostingPlayer[];
  history: PostingPast[];
}

/**
 * 비시즌 정보(GET /api/home의 offseason). 최근 7일 안에 시작한 우리 선수 구단 경기가 없고
 * 정규시즌 기간도 아니면 api가 채운다(시즌 끝, 스프링캠프, 포스트시즌 탈락).
 */
export interface OffSeason {
  /** 끝난 시즌 */
  season: number;
  nextSeason: number;
  /** 다음 정규시즌 개막일, 미국 날짜 "2027-03-25". 발표 전이면 null */
  nextOpeningDay: string | null;
  /** 오늘(미국 날짜)부터 개막일까지 남은 날. 개막일을 모르면 null */
  daysToOpening: number | null;
  /** 명단의 선수 번호. 이 번호로 /api/my를 불러 선수별 상태·시즌 합계를 받는다 */
  playerIds: number[];
  /** 끝난 시즌의 선수별 성적표(잘한 순). 옛 api면 없다 */
  report?: SeasonReport[];
}

/**
 * 시즌 판정. GOOD 좋은 시즌 · SHORT_GOOD 짧았지만 좋았던 시즌 · SOLID 제 몫 한 시즌 · MINORS 트리플A(마이너)에서 보낸 시즌 ·
 * SHORT 출전이 적었던 시즌 · POOR 아쉬운 시즌(혹평 대신, 이유 한 줄과 함께)
 */
export type SeasonTier = "GOOD" | "SHORT_GOOD" | "SOLID" | "MINORS" | "SHORT" | "POOR";

/** 선수 한 명의 시즌 성적표(GET /api/home의 offseason.report) */
export interface SeasonReport {
  playerId: number;
  tier: SeasonTier;
  /** 판정 이름("제 몫 한 시즌") */
  label: string;
  /** 한 줄 제목("143경기 완주, 타격은 리그 평균") */
  headline: string;
  /** 사실 이유 한 줄. 없으면 null */
  reason: string | null;
  /** 카드 숫자를 어느 단계 시즌 합계로 보일지 */
  level: "MLB" | "MINORS";
  /** 메이저 WAR(소수 한 자리). 좋은·제 몫 시즌에만 보인다 */
  war: number | null;
  /** 자랑 알약(시즌 최장 연속 기록·최고 경기). 아쉬운·출전 적었던 시즌은 빈 목록 */
  stories: string[];
  /** 시즌이 끝난 뒤 이동(FA 선언 등), 최근 순 */
  winterMoves: { date: string; label: string }[];
  /** 시즌이 끝난 뒤 나온 이 선수 기사(늦은 순, 같은 기사는 한 줄, 12건까지). 옛 api면 없다 */
  news?: NewsHeadline[];
}

/** GET /api/players 의 한 항목. 매칭 전 선수는 이름(한글)·역할 말고는 null일 수 있다 */
export interface PlayerSummary {
  id: number;
  nameKo: string;
  nameEn: string | null;
  role: Role;
  position: string | null;
  /** api가 번역한 포지션. 모르는 포지션이면 영어 원문 */
  positionKo: string | null;
  teamKo: string | null;
  teamAbbr: string | null;
  photoUrl: string | null;
  /** 만 나이 */
  age: number | null;
  /** 등번호. 숫자가 아닐 수도 있어서 문자열 */
  jersey: string | null;
  /** 지금 메이저인지 마이너인지(MLB 공식 API 기준). 소속이 없거나 모르면 null */
  level: Level | null;
  /** MLB 공식 API가 알려 준 지금 소속 팀 이름. 마이너면 "St. Paul Saints"처럼 영어 */
  levelTeam: string | null;
  /** MLB 이동 기록상 FA(마지막 'FA 선언' 뒤 새 팀 기록 없음). 그러면 level·levelTeam은 null이고 팀 칸은 마지막 팀이다 */
  freeAgent: boolean;
  /** 국내 리그로 돌아간 팀(명단에 사람이 적은 값, 예: "LG 트윈스"). 해외에서 뛰면 null. 있으면 FA·단계 알약 대신 '… 복귀' */
  returnedKo: string | null;
}

export type Level = "MLB" | "MINORS";

/** 선수 이동 기록 한 줄(콜업, 마이너 강등, 부상자 명단 등) */
export interface RosterMove {
  /** "2026-08-30" */
  date: string;
  /** MLB 거래 종류 코드(OPT, CU, OUT ...) */
  typeCode: string;
  /** "마이너 강등(옵션)"처럼 api가 만든 짧은 한국어 */
  labelKo: string;
  fromTeam: string | null;
  toTeam: string | null;
  /** 옮겨 간 곳이 메이저인지 마이너인지. 모르면 null */
  toLevel: Level | null;
}

export interface PlayerDetail extends PlayerSummary {
  teamEn: string | null;
  birthPlace: string | null;
  /** MLB 공식 선수 페이지 */
  mlbUrl: string | null;
  /** "1998-08-20" */
  birthDate: string | null;
  heightCm: number | null;
  weightKg: number | null;
  /** "우투좌타" */
  batsThrowsKo: string | null;
  debutYear: number | null;
  /** 한국 시절 소속. 예: "넥센·키움 히어로즈 (2017–2023)" */
  careerKo: string | null;
  /** 과거 소속팀(KBO) 시절 공식 사진(오래된 팀부터). 없으면 빈 배열 */
  careerPhotos: CareerPhoto[];
}

/** 과거 소속팀 시절 사진 한 장(그 팀 마지막 시즌 KBO 공식 사진, 우리가 호스팅하는 주소) */
export interface CareerPhoto {
  /** "키움 히어로즈" */
  teamKo: string;
  /** "2017–2023" */
  years: string | null;
  /** "/photos/kbo-67341-2023" */
  photoUrl: string;
}

/** GET /api/players/{id} */
export interface PlayerResponse {
  dataMode: DataMode;
  statsAvailable: boolean;
  season: number;
  player: PlayerDetail;
  hitting: HitterSeason | null;
  pitching: PitcherSeason | null;
  /** 최신 경기부터 */
  games: GameLine[];
  /** 이동 기록, 최신부터. 이동 기록을 주지 않는 오래된 api면 null(없다고 단정하지 않는다) */
  moves: RosterMove[] | null;
}

/** 내 선수 카드의 기간 합계(타자). avg는 타수가 없으면 null */
export interface HitterPeriod {
  games: number;
  atBats: number;
  hits: number;
  homeRuns: number;
  rbi: number;
  walks: number;
  stolenBases: number;
  avg: number | null;
  /** 이번 정규시즌 타율(비교용) */
  seasonAvg: number | null;
}

/** 내 선수 카드의 기간 합계(투수). era는 이닝이 없으면 null */
export interface PitcherPeriod {
  games: number;
  outs: number;
  inningsText: string;
  earnedRuns: number;
  era: number | null;
  strikeouts: number;
  wins: number;
  losses: number;
  saves: number;
  /** 이번 정규시즌 평균자책점(비교용) */
  seasonEra: number | null;
}

/** 내 선수 한 명: 선수 정보 + 기간 합계 + 연속 기록 + 기간 안 경기(최신부터) */
export interface MyPlayer {
  player: PlayerSummary;
  /** 이 선수 카드의 기간 첫날·마지막 날(한국 날짜). 보통은 맨 위 기간과 같다 */
  fromKst: string;
  toKst: string;
  /** 최근 기간에 구단 경기도 본인 출전도 없어(구단 시즌 끝·마이너) 마지막으로 뛴 날까지로 당겼으면 true */
  isFallback: boolean;
  hitting: HitterPeriod | null;
  pitching: PitcherPeriod | null;
  /** 타자는 연속 안타, 투수는 연속 무실점 경기 수. 기록을 못 받았으면 null */
  streak: number | null;
  games: GameLine[];
  /** 상태 배지. 메이저에서 평소대로 뛰면 null */
  status: CardStatus | null;
  /** 출전 줄. 메이저에 있을 때만 */
  play: PlayLine | null;
  /** 한 줄 소식(사실만). 눈에 띄는 일이 없으면 null */
  fact: FormFact | null;
  /** 큰 숫자·막대(hitting·pitching·games)가 어떤 기간인지 */
  basis: CardBasis;
  /** 그 기록의 단계: "MLB" 또는 마이너 약어("AAA" 등). 시즌 합계·기록 없음이면 null */
  level: string | null;
  /** FA·시즌 끝일 때 시즌 합계 */
  seasonTotals: SeasonTotals | null;
}

/**
 * 상태 배지 종류. IL 부상자 명단 · RETURNED 부상 복귀(7일 안) · CALLED_UP 콜업(7일 안) · MINORS 마이너 ·
 * MINORS_IL 마이너 부상자 명단 · SUSPENDED 출장 정지 · DFA 지명 할당 · FA · SEASON_OVER 시즌 끝 ·
 * KBO 국내 리그로 돌아감(teamName에 그 팀, lastGameDate·lastGameLevel은 해외 마지막 경기)
 */
export type CardStatusKind =
  | "IL"
  | "RETURNED"
  | "CALLED_UP"
  | "MINORS"
  | "MINORS_IL"
  | "SUSPENDED"
  | "DFA"
  | "FA"
  | "SEASON_OVER"
  | "KBO";

export interface CardStatus {
  kind: CardStatusKind;
  /** 그 상태가 시작된 미국 날짜("2026-09-20"). 모르면 null */
  since: string | null;
  /** since부터 며칠째인지. 모르면 null */
  days: number | null;
  /** 마이너 단계 약어("AAA" 등) */
  level: string | null;
  /** 마이너 팀 이름(영어) */
  teamName: string | null;
  /** FA·시즌 끝일 때 마지막 경기(미국 날짜)와 단계("MLB" 또는 마이너 약어) */
  lastGameDate: string | null;
  lastGameLevel: string | null;
}

/** 팀 경기 하나에서의 출전: 선발 · 교체 · 출전(선발·교체 모름) · 결장 */
export type PlayCode = "STARTER" | "SUB" | "PLAYED" | "ABSENT";

/**
 * 출전 줄. 타자는 recent(지금 단계 기간이 시작된 뒤 팀 최근 10경기, 오래된 것부터)와
 * after(10경기가 안 되고 복귀·콜업 뒤면 그 시작), 투수는 최근 14일 등판 수와 마지막 등판이 며칠 전인지.
 */
export interface PlayLine {
  recent: PlayCode[] | null;
  after: "RETURNED" | "CALLED_UP" | null;
  appearances14: number | null;
  daysSinceLast: number | null;
}

/** 한 줄 소식. HOT은 좋은 일(주황), COLD는 안 좋은 일(파랑) */
export interface FormFact {
  tone: "HOT" | "COLD";
  text: string;
}

/**
 * RECENT 오늘까지 · LAST_PLAYED 마지막으로 뛴 날까지 · BEFORE_INJURY 다치기 전 ·
 * SEASON 시즌 합계(seasonTotals) · NONE 보여 줄 기록 없음
 */
export type CardBasis = "RECENT" | "LAST_PLAYED" | "BEFORE_INJURY" | "REHAB" | "SEASON" | "NONE";

/** 한 단계의 시즌 합계. 타자는 atBats·hits·homeRuns·avg, 투수는 outs·inningsText·era·strikeouts·saves·holds */
export interface LevelTotals {
  /** "MLB", 마이너 약어("AAA" 등), 여러 마이너 단계면 "MINORS" */
  level: string;
  games: number;
  atBats: number;
  hits: number;
  homeRuns: number;
  avg: number | null;
  outs: number;
  inningsText: string | null;
  era: number | null;
  strikeouts: number;
  saves: number;
  holds: number;
}

export interface SeasonTotals {
  season: number;
  /** 크게 보일 쪽 */
  primary: "MLB" | "MINORS" | null;
  mlb: LevelTotals | null;
  minors: LevelTotals | null;
}

/** GET /api/my?ids=1,2&days=7 */
export interface MyPlayersResponse {
  dataMode: DataMode;
  statsAvailable: boolean;
  season: number;
  generatedAt: string;
  days: number;
  /** 최근 days일의 첫날·마지막 날(한국 날짜, "2026-09-21"). 선수마다 기간은 MyPlayer에 있다 */
  fromKst: string;
  toKst: string;
  /** 한 명이라도 마지막으로 뛴 날까지로 기간을 당겼으면 true */
  isFallback: boolean;
  /** 고른 순서대로. 없는 선수는 빠진다 */
  players: MyPlayer[];
}

// ---- 응답 보정 ----
// api가 계약과 조금 다르게 보내도(필드 빠짐, 배열 대신 null) 화면이 죽지 않게 빈 값을 채운다.
// 모양이 아예 틀리면 여기서 예외가 나고, fetchApi가 badResponse로 바꾼다.

/** http(s) 주소만 통과시킨다. 사진·링크 주소로 쓰므로 javascript: 같은 것은 버린다 */
function httpUrl(value: string | null | undefined): string | null {
  return value && /^https?:\/\//i.test(value) ? value : null;
}

/** 선수 사진 주소: 우리가 호스팅하는 사진(/photos/mlb-808982)이나 http(s) 주소. 그 밖에는 null */
function photoUrl(value: string | null | undefined): string | null {
  return value && /^\/photos\/[a-z0-9-]{1,60}$/.test(value) ? value : httpUrl(value);
}

function normalizeLine(line: GameLine): GameLine {
  return {
    ...line,
    teamAbbr: line.teamAbbr ?? null,
    photoUrl: photoUrl(line.photoUrl),
    opponentAbbr: line.opponentAbbr ?? null,
    teamScore: line.teamScore ?? null,
    opponentScore: line.opponentScore ?? null,
    result: line.result ?? null,
    summary: line.summary ?? "",
    batting: line.batting ?? null,
    pitching: line.pitching ?? null,
    lineup: line.lineup === "STARTER" || line.lineup === "SUB" ? line.lineup : null,
  };
}

/** 시즌 성적 한 줄(타자·투수 공통) */
function normalizeSeason<
  T extends {
    teamKo: string | null;
    teamAbbr: string | null;
    photoUrl: string | null;
    minorGames: number;
    mainlyMinors: boolean;
  /** 마이너 시즌 성적 줄이면 단계("트리플A" 등, teamKo는 마지막 마이너 팀). 메이저 줄이면 null */
  levelKo: string | null;
  },
>(row: T): T {
  return {
    ...row,
    teamKo: row.teamKo ?? null,
    teamAbbr: row.teamAbbr ?? null,
    photoUrl: photoUrl(row.photoUrl),
    // 마이너 경기 수를 주지 않는 오래된 api면 모두 메이저 선수로 본다(지금처럼 한 묶음)
    minorGames: row.minorGames ?? 0,
    mainlyMinors: row.mainlyMinors === true,
    levelKo: row.levelKo ?? null,
  };
}

function normalizeHome(raw: HomeResponse): HomeResponse {
  return {
    ...raw,
    recent: {
      isFallback: raw.recent?.isFallback ?? true,
      dateKst: raw.recent?.dateKst ?? null,
      lines: (raw.recent?.lines ?? []).map(normalizeLine),
    },
    ranking: raw.ranking ?? null,
    hitters: (raw.hitters ?? []).map(normalizeSeason),
    pitchers: (raw.pitchers ?? []).map(normalizeSeason),
    minorHitters: (raw.minorHitters ?? []).map(normalizeSeason),
    minorPitchers: (raw.minorPitchers ?? []).map(normalizeSeason),
    offseason: raw.offseason
      ? {
          ...raw.offseason,
          nextOpeningDay: raw.offseason.nextOpeningDay ?? null,
          daysToOpening: raw.offseason.daysToOpening ?? null,
          playerIds: raw.offseason.playerIds ?? [],
        }
      : null,
    posting: raw.posting
      ? {
          players: (raw.posting.players ?? []).map((p) => ({
            ...p,
            photoUrl: p.photoUrl ?? null,
            news: (p.news ?? []).flatMap((n) => normalizeHeadline(n) ?? []),
            deal: normalizeDeal(p.deal),
          })),
          history: (raw.posting.history ?? []).map((h) => ({
            ...h,
            photoUrl: photoUrl(h.photoUrl),
            deal: normalizeDeal(h.deal),
          })),
        }
      : null,
  };
}

/** 관련 기사 한 건. 옛 API는 번호·요약 칸을 주지 않는다. 원문 주소가 http(s)가 아니면 링크로 쓸 수 없어 뺀다(null) */
function normalizeHeadline(n: NewsHeadline): NewsHeadline | null {
  const url = httpUrl(n.url);
  if (!url) return null;
  return {
    ...n,
    id: typeof n.id === "number" ? n.id : null,
    url,
    titleKo: n.titleKo ?? null,
    lead: n.lead ?? null,
    summary: n.summary ?? null,
    // 기사 사진은 언론사 서버에서 브라우저가 직접 받는다. https 주소만 쓴다
    imageUrl: n.imageUrl?.startsWith("https://") ? n.imageUrl : null,
    // 같은 글을 실은 다른 언론사. 옛 API는 이 칸을 주지 않는다
    alsoBy: Array.isArray(n.alsoBy) ? n.alsoBy.filter((p) => typeof p === "string" && p.trim() !== "") : [],
  };
}

function normalizeNewsPage(raw: NewsPage): NewsPage {
  const url = httpUrl(raw.url);
  // 원문 링크를 걸 수 없는 기사는 보여 주지 않는다(badResponse)
  if (!url) throw new Error("원문 주소가 http(s)가 아님");
  return {
    ...raw,
    url,
    playerPhotoUrl: photoUrl(raw.playerPhotoUrl),
    titleKo: raw.titleKo ?? null,
    imageUrl: raw.imageUrl?.startsWith("https://") ? raw.imageUrl : null,
    summary: raw.summary ?? null,
    lead: raw.lead ?? null,
    more: (raw.more ?? []).flatMap((n) => normalizeHeadline(n) ?? []),
  };
}

/** 계약 내용. 옛 api는 환율(krwPerUsd)을 주지 않는다 */
function normalizeDeal(deal: PostingDeal | null | undefined): PostingDeal | null {
  return deal ? { ...deal, krwPerUsd: deal.krwPerUsd ?? null } : null;
}

/** 목록·상세가 같이 쓰는 선수 정보 */
function normalizeSummary<T extends PlayerSummary>(p: T): T {
  return {
    ...p,
    nameEn: p.nameEn ?? null,
    position: p.position ?? null,
    positionKo: p.positionKo ?? null,
    teamKo: p.teamKo ?? null,
    teamAbbr: p.teamAbbr ?? null,
    photoUrl: photoUrl(p.photoUrl),
    age: p.age ?? null,
    jersey: String(p.jersey ?? "").trim() || null,
    level: p.level === "MLB" || p.level === "MINORS" ? p.level : null,
    levelTeam: p.levelTeam ?? null,
    // FA를 주지 않는 오래된 api면 FA가 아닌 것으로 본다(지금처럼 단계 알약만)
    freeAgent: p.freeAgent === true,
    returnedKo: p.returnedKo ?? null,
  };
}

function normalizePlayers(raw: PlayerSummary[]): PlayerSummary[] {
  return raw.map(normalizeSummary);
}

function normalizePlayer(raw: PlayerResponse): PlayerResponse {
  const p = raw.player;
  return {
    ...raw,
    player: {
      ...normalizeSummary(p),
      teamEn: p.teamEn ?? null,
      birthPlace: p.birthPlace ?? null,
      mlbUrl: httpUrl(p.mlbUrl),
      birthDate: p.birthDate ?? null,
      heightCm: p.heightCm ?? null,
      weightKg: p.weightKg ?? null,
      batsThrowsKo: p.batsThrowsKo ?? null,
      debutYear: p.debutYear ?? null,
      careerKo: p.careerKo ?? null,
      // 오래된 api면 없다. 사진 주소가 없는 줄은 뺀다
      careerPhotos: (p.careerPhotos ?? []).filter((c) => c && typeof c.photoUrl === "string" && c.teamKo),
    },
    hitting: raw.hitting ? normalizeSeason(raw.hitting) : null,
    pitching: raw.pitching ? normalizeSeason(raw.pitching) : null,
    games: (raw.games ?? []).map(normalizeLine),
    moves: raw.moves ?? null,
  };
}

function normalizeMy(raw: MyPlayersResponse): MyPlayersResponse {
  return {
    ...raw,
    isFallback: raw.isFallback ?? false,
    players: (raw.players ?? []).map((p) => ({
      ...p,
      // 선수별 기간이 없으면(오래된 api) 모두 맨 위 기간을 같이 쓴다(당겼는지도 맨 위 값)
      fromKst: p.fromKst ?? raw.fromKst,
      toKst: p.toKst ?? raw.toKst,
      isFallback: p.isFallback ?? raw.isFallback ?? false,
      player: normalizeSummary(p.player),
      hitting: p.hitting ?? null,
      pitching: p.pitching ?? null,
      streak: p.streak ?? null,
      games: (p.games ?? []).map(normalizeLine),
      status: p.status ?? null,
      play: p.play ?? null,
      fact: p.fact ?? null,
      // 기간 근거가 없으면(오래된 api) 당겼는지로 정한다
      basis: p.basis ?? ((p.isFallback ?? raw.isFallback) ? "LAST_PLAYED" : "RECENT"),
      level: p.level ?? "MLB",
      seasonTotals: p.seasonTotals ?? null,
    })),
  };
}

// ---- 호출 ----

/** 호출 실패 이유. 화면은 이 값을 보고 안내 문구를 고른다. */
export type ApiFailure = "unreachable" | "notFound" | "badResponse";

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; failure: ApiFailure };

const TIMEOUT_MS = 5000;

async function fetchApi<T>(path: string, normalize: (raw: T) => T): Promise<ApiResult<T>> {
  // 빌드 때 미리 그리지 않고, 요청이 올 때마다 새로 받는다.
  // (try 밖에 둬야 한다. Next.js가 여기서 던지는 신호를 삼키면 안 된다.)
  await connection();

  let res: Response;
  try {
    const url = new URL(path, process.env.API_BASE_URL ?? "http://localhost:8080");
    res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS) });
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

// cache: 한 요청 안에서 같은 호출을 여러 번 해도 api는 한 번만 부른다.
export const getHome = cache(() => fetchApi("/api/home", normalizeHome));

/** GET /api/players: 선수 목록 */
export const getPlayers = cache(() => fetchApi("/api/players", normalizePlayers));

export const getPlayer = cache((id: number) =>
  fetchApi(`/api/players/${id}`, normalizePlayer),
);

/** GET /api/news/{id}: 우리 기사 페이지 한 건. 없는 기사면 notFound */
export const getNews = cache((id: number) => fetchApi(`/api/news/${id}`, normalizeNewsPage));

/** GET /api/my: 고른 선수들의 최근 days일 경기. ids는 "1,5,2"처럼 1명 이상(빈 목록은 api가 400) */
const getMyPlayersCached = cache((ids: string, days: number) =>
  fetchApi(`/api/my?ids=${ids}&days=${days}`, normalizeMy),
);

// cache는 인자를 값이 아니라 참조로 비교하므로, 배열을 문자열로 바꿔 넘긴다.
export function getMyPlayers(ids: readonly number[], days: number) {
  return getMyPlayersCached(ids.join(","), days);
}
