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
 * 경기별 세부 칸(2루타·타석 등)이 없는 옛 데이터가 섞였거나 점이 10개 미만이면 null(그리지 않는다).
 */
export function buildWrcTrend(games: GameLine[], seasonWrc: number): TrendPoint[] | null {
  const played = games.filter((g) => g.played && g.batting).reverse();
  if (played.some((g) => g.batting!.plateAppearances == null || g.batting!.doubles == null)) return null;

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
