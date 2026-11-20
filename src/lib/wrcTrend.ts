// 선수 화면 '타격 흐름': 시즌 처음부터 그날까지의 누적 wRC+(100 = 리그 평균). WrcTrend가 그린다.
import type { GameLine, RosterMove } from "./api";

export interface TrendPoint {
  /** 그 경기 시작(한국 시간 ISO). 화면엔 "5.28까지" */
  startTimeKst: string;
  /** 그날까지 누적 wRC+ */
  value: number;
}

/**
 * wOBA 가중치와 리그 상수(FanGraphs 표준값 근사). 해마다 조금씩 다르지만,
 * 마지막 점을 MLB 공식 시즌 wRC+에 맞춰 옮기므로(아래 shift) 모양만 맞으면 된다.
 */
const W = { bb: 0.689, hbp: 0.72, single: 0.882, double: 1.254, triple: 1.59, hr: 2.05 };
const LEAGUE_WOBA = 0.31;
const WOBA_SCALE = 1.242;
const RUNS_PER_PA = 0.117;

/** 누적 타석이 이보다 적은 앞쪽 경기는 그리지 않는다(몇 타석 만에 300, 0을 오가는 흔들림) */
export const TREND_MIN_PA = 50;

/**
 * 경기(최신부터)를 누적 wRC+ 점(오래된 것부터)으로. 마지막 점은 seasonWrc(MLB 공식 값)와 같게 전체를 옮긴다.
 * 경기별 세부 칸(2루타·타석 등)이 없는 경기는 건너뛰고, 그런 경기가 2할을 넘거나(옛 데이터) 점이 10개 미만이면 null(그리지 않는다).
 *
 * 정규시즌 경기만 쌓는다. 경기 목록에는 포스트시즌도 섞여 와서(김하성 9.30~10.7, 김혜성 10.8), 그대로 쌓으면 포스트시즌까지 더한
 * 마지막 점을 정규시즌 공식 값에 맞춰 선 전체가 어긋났다. 경기 줄의 seasonType(korleaguer-server#192)이 REGULAR인 경기만 쓰고,
 * 모르는 종류(normalize가 null로 바꾼 값)는 정규시즌이라고 단정하지 않고 뺀다.
 *
 * regularGames: 이 시즌 정규시즌에 뛴 경기 수(선수 응답 hitting.games). 뛴 경기 줄에 seasonType이 하나도 없을 때(옛 api: api를
 * korleaguer-server#192 전으로 되돌렸을 때)만 쓰는 어림으로, 뛴 경기를 앞에서부터 그만큼만 쓴다(포스트시즌은 정규시즌이 끝난 뒤라서).
 * 이 수는 서버가 이 경기 목록과 같은 출전 기록(appearance)에서 정규시즌 것만 센 수라 목록의 뛴 줄과 1:1이다. 이것도 없으면 다 쓴다.
 */
export function buildWrcTrend(games: GameLine[], seasonWrc: number, regularGames: number | null = null): TrendPoint[] | null {
  const appeared = games.filter((g) => g.played).reverse();
  // 종류가 있는지는 고르는 대상인 뛴 경기 줄로 본다(결장 줄에만 종류가 있어도 그래프가 비지 않고 어림으로 돌아가게, PR #306 리뷰)
  const typed = appeared.some((g) => g.seasonType != null);
  const regular = typed
    ? appeared.filter((g) => g.seasonType === "REGULAR")
    : regularGames == null
      ? appeared
      : appeared.slice(0, regularGames);
  const batted = regular.filter((g) => g.batting);
  // MLB가 세부 칸을 안 준 경기는 건너뛴다. 대부분 없으면(옛 데이터) 그리지 않는다
  const played = batted.filter((g) => g.batting!.plateAppearances != null && g.batting!.doubles != null);
  if (played.length < batted.length * 0.8) return null;

  let num = 0;
  let den = 0;
  let pa = 0;
  const raw: TrendPoint[] = [];
  for (const g of played) {
    const b = g.batting!;
    const doubles = b.doubles ?? 0;
    const triples = b.triples ?? 0;
    const hbp = b.hitByPitch ?? 0;
    const singles = b.hits - doubles - triples - b.homeRuns;
    num += W.bb * b.walks + W.hbp * hbp + W.single * singles + W.double * doubles + W.triple * triples + W.hr * b.homeRuns;
    den += b.atBats + b.walks + (b.sacFlies ?? 0) + hbp;
    pa += b.plateAppearances ?? 0;
    if (pa >= TREND_MIN_PA && den > 0) {
      const woba = num / den;
      raw.push({ startTimeKst: g.startTimeKst, value: (((woba - LEAGUE_WOBA) / WOBA_SCALE + RUNS_PER_PA) / RUNS_PER_PA) * 100 });
    }
  }
  if (raw.length < 10) return null;
  const shift = seasonWrc - raw[raw.length - 1].value;
  return raw.map((p) => ({ ...p, value: p.value + shift }));
}

/** 이웃한 두 점의 날짜가 이만큼(일)을 넘게 벌어지면 선을 끊는다(정규시즌 안의 한 달 넘는 공백: 부상·마이너) */
export const TREND_GAP_DAYS = 30;

/** 선이 끊긴 곳: index 점이 끊긴 뒤 첫 점이다. 이유는 이동 기록으로 알 수 있을 때만 */
export interface TrendGap {
  index: number;
  days: number;
  reason: "부상" | "마이너" | null;
}

const DAY_MS = 86_400_000;

/** 시각이 있는 값("2026-07-26T19:40:00+09:00")과 날짜만 있는 값("2026-07-26", 한국 날짜로 읽는다) → 한국 날짜의 일 수. 못 읽으면 null */
function dayOf(value: string): number | null {
  const t = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00+09:00` : value).getTime();
  return Number.isNaN(t) ? null : Math.floor((t + 9 * 3_600_000) / DAY_MS);
}

/**
 * 빈 기간(앞 점 날짜 ~ 뒤 점 날짜)의 이유. 이동 기록은 미국 날짜만 와서 한국 날짜와 하루 다를 수 있어 앞뒤 하루씩 넓게 본다.
 * 부상자 명단 이동(등재·이동·해제)이 기간 안에 있거나, 기간이 시작될 때 이미 명단에 올라 있었으면 '부상'(명단 해제만 있었던 것도 포함),
 * 아니면 마이너로 옮긴 기록(toLevel MINORS)이 기간 안에 있으면 '마이너', 모르면 null
 */
function gapReason(from: number, to: number, moves: RosterMove[]): TrendGap["reason"] {
  const dated = moves.flatMap((m) => {
    const day = dayOf(m.date);
    return day == null ? [] : [{ m, day }];
  });
  const isIl = (m: RosterMove) => (m.labelKo ?? "").startsWith("부상자 명단");
  const inside = dated.filter(({ day }) => day >= from - 1 && day <= to + 1);
  if (inside.some(({ m }) => isIl(m))) return "부상";
  // 기간이 시작되기 전 마지막 명단 기록이 해제가 아니면 아직 명단에 있는 중이다
  const before = dated.filter(({ m, day }) => isIl(m) && day < from - 1).sort((a, b) => b.day - a.day)[0];
  if (before && !before.m.labelKo.endsWith("해제")) return "부상";
  if (inside.some(({ m }) => m.toLevel === "MINORS")) return "마이너";
  return null;
}

/** 점 사이 30일 넘게 벌어진 곳(앞에서부터). 이동 기록이 없어도 끊기만 한다 */
export function trendGaps(points: TrendPoint[], moves: RosterMove[]): TrendGap[] {
  const gaps: TrendGap[] = [];
  for (let i = 1; i < points.length; i++) {
    const from = dayOf(points[i - 1].startTimeKst);
    const to = dayOf(points[i].startTimeKst);
    if (from == null || to == null || to - from <= TREND_GAP_DAYS) continue;
    gaps.push({ index: i, days: Math.round(to - from), reason: gapReason(from, to, moves) });
  }
  return gaps;
}

/**
 * 한 기간(내 선수 카드의 최근 7·14·30일)의 wRC+(100 = 리그 평균). 위 누적 그래프와 같은 표준 가중치로 계산하되,
 * 그래프와 달리 공식 시즌 값에 맞춰 옮기지 않는다(기간 하나라 맞출 마지막 점이 없다). 경기별 세부 칸(2루타·타석 등)이 없는 경기가
 * 2할을 넘으면(옛 데이터) 근거가 모자라 null이다. 메이저 리그 평균을 기준으로 하므로 마이너 기록에는 쓰지 않는다
 */
export function periodWrcPlus(games: GameLine[]): number | null {
  const batted = games.filter((g) => g.played && g.batting);
  const full = batted.filter((g) => g.batting!.doubles != null && g.batting!.triples != null);
  if (full.length === 0 || full.length < batted.length * 0.8) return null;
  let num = 0;
  let den = 0;
  for (const g of full) {
    const b = g.batting!;
    const doubles = b.doubles ?? 0;
    const triples = b.triples ?? 0;
    const hbp = b.hitByPitch ?? 0;
    const singles = b.hits - doubles - triples - b.homeRuns;
    num += W.bb * b.walks + W.hbp * hbp + W.single * singles + W.double * doubles + W.triple * triples + W.hr * b.homeRuns;
    den += b.atBats + b.walks + (b.sacFlies ?? 0) + hbp;
  }
  if (den === 0) return null;
  return (((num / den - LEAGUE_WOBA) / WOBA_SCALE + RUNS_PER_PA) / RUNS_PER_PA) * 100;
}
