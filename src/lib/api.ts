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
  /** 선수 사진 주소(MLB 이미지 서버). 없으면 null */
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
  /** 타율 높은 순 */
  hitters: HitterSeason[];
  /** 평균자책점 낮은 순 */
  pitchers: PitcherSeason[];
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
  hitting: HitterPeriod | null;
  pitching: PitcherPeriod | null;
  /** 타자는 연속 안타, 투수는 연속 무실점 경기 수. 기록을 못 받았으면 null */
  streak: number | null;
  games: GameLine[];
}

/** GET /api/my?ids=1,2&days=7 */
export interface MyPlayersResponse {
  dataMode: DataMode;
  statsAvailable: boolean;
  season: number;
  generatedAt: string;
  days: number;
  /** 기간 첫날·마지막 날(한국 날짜, "2026-09-21") */
  fromKst: string;
  toKst: string;
  /** 최근 days일에 경기가 없어 마지막 경기일로 기간을 당겼으면 true(비시즌) */
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

function normalizeLine(line: GameLine): GameLine {
  return {
    ...line,
    teamAbbr: line.teamAbbr ?? null,
    photoUrl: httpUrl(line.photoUrl),
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
  T extends { teamKo: string | null; teamAbbr: string | null; photoUrl: string | null },
>(row: T): T {
  return {
    ...row,
    teamKo: row.teamKo ?? null,
    teamAbbr: row.teamAbbr ?? null,
    photoUrl: httpUrl(row.photoUrl),
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
    hitters: (raw.hitters ?? []).map(normalizeSeason),
    pitchers: (raw.pitchers ?? []).map(normalizeSeason),
  };
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
    photoUrl: httpUrl(p.photoUrl),
    age: p.age ?? null,
    jersey: String(p.jersey ?? "").trim() || null,
    level: p.level === "MLB" || p.level === "MINORS" ? p.level : null,
    levelTeam: p.levelTeam ?? null,
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
      player: normalizeSummary(p.player),
      hitting: p.hitting ?? null,
      pitching: p.pitching ?? null,
      streak: p.streak ?? null,
      games: (p.games ?? []).map(normalizeLine),
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

/** GET /api/my: 고른 선수들의 최근 days일 경기. ids는 "1,5,2"처럼 1명 이상(빈 목록은 api가 400) */
const getMyPlayersCached = cache((ids: string, days: number) =>
  fetchApi(`/api/my?ids=${ids}&days=${days}`, normalizeMy),
);

// cache는 인자를 값이 아니라 참조로 비교하므로, 배열을 문자열로 바꿔 넘긴다.
export function getMyPlayers(ids: readonly number[], days: number) {
  return getMyPlayersCached(ids.join(","), days);
}
