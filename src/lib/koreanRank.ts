import type { RecordNext } from "@/lib/api";

/** 선수 페이지 '한국인 통산 기록' 칸에 보이는 줄 수 */
export const RANK_ROWS = 3;

/** 등수가 같을 때 종목 순서(api의 종목 키). 목록에 없는 종목은 맨 뒤 */
const CATEGORY_ORDER = ["hits", "homeRuns", "rbi", "games", "stolenBases"];
const categoryOrder = (key: string) => {
  const i = CATEGORY_ORDER.indexOf(key);
  return i < 0 ? CATEGORY_ORDER.length : i;
};

/**
 * 이 선수의 '한국인 통산 기록' 세 줄을 고르는 규칙(11-21 사용자 결정, 이슈 #380).
 * 1) 한국인 메이저리거 통산 순위가 가장 높은 종목(등수가 작은 것)부터 세 종목을 고른다.
 * 2) 등수가 같으면 안타 > 홈런 > 타점 > 경기 > 도루 순으로 둔다(숫자가 큰 기록이 앞. 도루는 숫자가 작아 같은 등수면 뒤).
 * 3) 그래도 같으면 api가 준 순서(남은 비율이 작은 순)를 지킨다.
 * 선수마다 가장 자랑할 만한 종목이 뽑히고, 같은 선수는 늘 같은 세 줄이다. 공유 카드(순위 카드, 이슈 #381)도 이 함수로 종목을 고른다.
 * 타자·투수 구분은 api의 `next`가 이미 한다(통산 순위가 있는 종목만 준다). 줄이 없으면 빈 배열
 */
export function pickRankRows(next: RecordNext[], playerId: number): RecordNext[] {
  return next
    .map((n, order) => ({ n, order }))
    .filter(({ n }) => n.playerId === playerId)
    .sort((a, b) => a.n.rank - b.n.rank || categoryOrder(a.n.category) - categoryOrder(b.n.category) || a.order - b.order)
    .slice(0, RANK_ROWS)
    .map(({ n }) => n);
}
