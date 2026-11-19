// 선수 화면 '타격 흐름': 시즌 처음부터 그날까지의 누적 wRC+(100 = 리그 평균). WrcTrend가 그린다.
import type { GameLine } from "./api";

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
 * regularGames: 이 시즌 정규시즌에 뛴 경기 수(선수 응답 hitting.games). 경기 줄에 seasonType이 하나도 없을 때(옛 api)만 쓰는 어림으로,
 * 뛴 경기를 앞에서부터 그만큼만 쓴다(포스트시즌은 정규시즌이 끝난 뒤라서). 이 수는 서버가 이 경기 목록과 같은 출전 기록(appearance)에서
 * 정규시즌 것만 센 수라 목록의 뛴 줄과 1:1이다. 이것도 없으면 다 쓴다.
 */
export function buildWrcTrend(games: GameLine[], seasonWrc: number, regularGames: number | null = null): TrendPoint[] | null {
  const appeared = games.filter((g) => g.played).reverse();
  const typed = games.some((g) => g.seasonType != null);
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
