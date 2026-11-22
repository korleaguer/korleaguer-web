// 두 선수 비교 창의 규칙(사용자 11-22 시안 1B, plan/2026-11-22-비교-시안 '고친 것'). 화면 없이 셈만 한다.
import type { CompareLine } from "@/lib/api";

/** 이보다 타석이 적으면 '참고용'이고, 한쪽이라도 그러면 어느 숫자도 파랑으로 칠하지 않는다(선수 페이지 시즌 성적의 참고용 문턱과 같다) */
export const COMPARE_MIN_PA = 100;
/** 경기 수가 이 배수 넘게 다르면 쌓이는 기록(홈런·타점·도루)은 칠하지 않는다(143경기 대 43경기는 견줄 수 없다) */
const GAMES_FAR = 1.5;

export type CompareKey = "plus" | "games" | "avg" | "homeRuns" | "rbi" | "stolenBases" | "ops";

export const COMPARE_ROWS: { key: Exclude<CompareKey, "plus">; label: string; rate: boolean }[] = [
  { key: "games", label: "경기", rate: false },
  { key: "avg", label: "타율", rate: true },
  { key: "homeRuns", label: "홈런", rate: false },
  { key: "rbi", label: "타점", rate: false },
  { key: "stolenBases", label: "도루", rate: false },
  { key: "ops", label: "OPS", rate: true },
];

const COUNTING: CompareKey[] = ["homeRuns", "rbi", "stolenBases"];

/**
 * 처음 보일 상대. 내 선수(별 준 순서) 중 후보에 있는 첫 선수가 먼저다. 없으면 100타석 이상 타자 중 리그 평균 대비(wRC+)가 가장
 * 높은 선수(문턱이 없으면 4타석 선수가 뽑힌다), 그도 없으면 타석이 가장 많은 선수(others는 타석 많은 순). 후보가 없으면 null
 */
export function pickDefaultOpponent(others: CompareLine[], mine: readonly number[]): CompareLine | null {
  for (const id of mine) {
    const found = others.find((o) => o.player.id === id);
    if (found) return found;
  }
  const steady = others.filter((o) => o.plateAppearances >= COMPARE_MIN_PA && o.wrcPlus != null);
  if (steady.length > 0) return steady.reduce((best, o) => (o.wrcPlus! > best.wrcPlus! ? o : best));
  return others[0] ?? null;
}

/**
 * a의 이 칸을 '앞섬'(진한 파랑 굵게)으로 칠할지.
 * - 경기 칸은 칠하지 않는다(많이 나온 것은 잘한 것이 아니다).
 * - 한쪽이라도 100타석 아래면 어느 칸도 칠하지 않는다.
 * - 경기 수가 1.5배 넘게 다르면 홈런·타점·도루는 칠하지 않는다.
 * - 평균 대비는 평균 위(100 초과)인 쪽만 칠한다(둘 다 평균 아래면 '덜 나쁜 쪽'을 칠하지 않는다).
 * - 값이 같거나 한쪽이 없으면 칠하지 않는다.
 */
export function leads(key: CompareKey, a: CompareLine, b: CompareLine): boolean {
  if (key === "games") return false;
  if (a.plateAppearances < COMPARE_MIN_PA || b.plateAppearances < COMPARE_MIN_PA) return false;
  if (COUNTING.includes(key)) {
    const [lo, hi] = a.games < b.games ? [a.games, b.games] : [b.games, a.games];
    if (hi > GAMES_FAR * Math.max(1, lo)) return false;
  }
  const x = key === "plus" ? a.wrcPlus : a[key];
  const y = key === "plus" ? b.wrcPlus : b[key];
  if (x == null || y == null || x <= y) return false;
  // 화면의 '+2%'는 반올림한 값이라, 반올림해서 평균(100)이면 평균 위로 치지 않는다
  return key !== "plus" || Math.round(x) > 100;
}

/** 표본이 적은 선수의 한마디: '배지환 4타석이라 참고용'. 100타석 이상이면 null */
export function sampleNote(line: CompareLine): string | null {
  return line.plateAppearances < COMPARE_MIN_PA ? `${line.player.nameKo} ${line.plateAppearances}타석이라 참고용` : null;
}
