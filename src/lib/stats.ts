// 표와 순위판에서 쓰는 작은 계산 함수들.

/**
 * 목록에서 가장 좋은 값. 1위 표시를 할 필요가 없으면 null.
 * - 행이 1개 이하면 비교할 의미가 없다.
 * - "max"(홈런·타율 등)는 최고값이 0 이하이면 아무도 1위가 아니다(전원 0이면 표시 안 함).
 */
export function bestOf<T>(
  rows: T[],
  pick: (row: T) => number | null,
  direction: "max" | "min",
): number | null {
  if (rows.length < 2) return null;
  const values = rows.map(pick).filter((v): v is number => v != null);
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
