// 표와 순위판에서 쓰는 작은 계산 함수들.

import type { HitterSeason, PitcherSeason, RankingMinimums } from "@/lib/api";

/**
 * 목록에서 가장 좋은 값. 1위 표시를 할 필요가 없으면 null.
 * - 행이 1개 이하면 비교할 의미가 없다.
 * - eligible을 주면 그 행들 중에서만 고른다(타율·OPS·평균자책점은 순위 기준을 채운 선수만).
 * - "max"(홈런·타율 등)는 최고값이 0 이하이면 아무도 1위가 아니다(전원 0이면 표시 안 함).
 */
export function bestOf<T>(
  rows: T[],
  pick: (row: T) => number | null,
  direction: "max" | "min",
  eligible: (row: T) => boolean = () => true,
): number | null {
  if (rows.length < 2) return null;
  const values = rows
    .filter(eligible)
    .map(pick)
    .filter((v): v is number => v != null);
  if (values.length === 0) return null;
  if (direction === "min") return Math.min(...values);
  const max = Math.max(...values);
  return max > 0 ? max : null;
}

/** value가 1위 값인가. 비교할 1위가 없으면(null) 아니다 */
export function isBest(value: number | null, best: number | null): boolean {
  return best != null && value === best;
}

export interface Ranked<T> {
  rank: number;
  row: T;
  value: number;
}

/** 값이 0보다 큰 선수만, 큰 순으로 상위 limit개. 같은 값은 같은 순위(1, 2, 2, 4) */
export function topBy<T>(
  rows: T[],
  pick: (row: T) => number | null,
  limit: number,
): Ranked<T>[] {
  const withValue = rows
    .map((row) => ({ row, value: pick(row) }))
    .filter((r): r is { row: T; value: number } => r.value != null && r.value > 0)
    .sort((a, b) => b.value - a.value);

  return withValue.slice(0, limit).map((r) => ({
    ...r,
    rank: 1 + withValue.filter((o) => o.value > r.value).length,
  }));
}

/** 메이저 선수들끼리 비교하는 묶음(올해 주로 메이저)과 따로 보여 줄 묶음(올해 주로 마이너)으로 나눈다. 순서는 그대로 */
export function splitByMinors<T extends { mainlyMinors: boolean }>(rows: T[]): { majors: T[]; minors: T[] } {
  return {
    majors: rows.filter((row) => !row.mainlyMinors),
    minors: rows.filter((row) => row.mainlyMinors),
  };
}

/** 타율·OPS 순위에 넣는 타자인가. 기준을 모르면(null) 거르지 않는다 */
export function rankedHitter(ranking: RankingMinimums | null) {
  return (h: HitterSeason) => ranking == null || h.plateAppearances >= ranking.minPlateAppearances;
}

/** 평균자책점 순위에 넣는 투수인가. 기준을 모르면(null) 거르지 않는다 */
export function rankedPitcher(ranking: RankingMinimums | null) {
  return (p: PitcherSeason) => ranking == null || p.outs >= ranking.minOuts;
}
