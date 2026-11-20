// 선수 성적을 '잘한다/못한다' 판단하는 자리의 말(사용자 11-21 결정, UX-DIRECTION §3·§4): 지표 이름(wRC+·ERA+)을 화면에 쓰지 않고
// 리그 평균 대비 말로 쓴다. 입력은 100 = 리그 평균인 값(타자 wRC+, 투수 ERA+, 높을수록 잘함).

/** 평균과 비슷하다고 보는 구간(WrcTrend의 '리그 평균과 비슷해요'와 같다): 95 이상 105 미만 */
const SAME_FROM = 95;
const SAME_TO = 105;

export type LeagueTone = "up" | "same" | "down";

export interface LeagueWords {
  tone: LeagueTone;
  /** 목록 줄·카드에 쓰는 말 앞부분, 숫자(굵게), 뒷부분. 비슷하면 숫자가 없다 */
  lead: string;
  num: string;
  tail: string;
  /** 앞부분·숫자·뒷부분을 이은 한 문장 */
  text: string;
}

/** 100 = 리그 평균인 값을 말로. 평균 위는 '평균보다 12% 잘 침'(투수 '잘 막음'), 아래는 꾸밈 없이 '평균보다 22% 아래' */
export function leagueWords(plus: number, pitcher: boolean): LeagueWords {
  // 값이 0 아래(몇 타수 무안타)나 300 위로 가도 '평균보다 213% 아래'가 나오지 않게 가둔다
  const v = Math.max(0, Math.min(300, Math.round(plus)));
  if (v >= SAME_TO) {
    const num = `${v - 100}%`;
    const tail = pitcher ? " 잘 막음" : " 잘 침";
    return { tone: "up", lead: "평균보다 ", num, tail, text: `평균보다 ${num}${tail}` };
  }
  if (v >= SAME_FROM) return { tone: "same", lead: "평균과 비슷", num: "", tail: "", text: "평균과 비슷" };
  const num = `${100 - v}%`;
  return { tone: "down", lead: "평균보다 ", num, tail: " 아래", text: `평균보다 ${num} 아래` };
}

/** 평균 대비 부호 있는 퍼센트: 123 → '+23%', 78 → '−22%'(성적표 창 제목·달별 그래프 최고·최저) */
export function signedPct(v: number): string {
  // leagueWords와 같이 0~300으로 가둔다(한 달 wRC+가 0 아래여도 '−108%'가 나오지 않게: 아래쪽 끝은 −100%)
  const d = Math.max(0, Math.min(300, Math.round(v))) - 100;
  return d === 0 ? "0%" : `${d > 0 ? "+" : "−"}${Math.abs(d)}%`;
}

/**
 * 서버가 쓴 전·후반 흐름 이유('6월까지 wRC+ 123 → 7월부터 78')를 말로: '6월까지 평균 +23% → 7월부터 −22%'.
 * 서버 글을 그대로 두고 화면에서만 바꾼다(옛·새 api 모두). 지표 이름이 없는 글은 그대로 돌려준다
 */
export function leagueFlow(text: string): string {
  // 서버 글은 두 번째 숫자에 지표 이름이 없다('6월까지 wRC+ 123 → 7월부터 78'): 앞 숫자에만 '평균'을 붙이고 둘 다 바꾼다
  const half = /^(.*?)(?:wRC\+|ERA\+) ?(-?\d+)( → \d+월부터 )(-?\d+)$/.exec(text);
  if (half) return `${half[1]}평균 ${signedPct(Number(half[2]))}${half[3]}${signedPct(Number(half[4]))}`;
  let first = true;
  return text.replace(/(?:wRC\+|ERA\+) ?(-?\d+)/g, (_m, n: string) => {
    const out = first ? `평균 ${signedPct(Number(n))}` : signedPct(Number(n));
    first = false;
    return out;
  });
}

/** 투수 기간 ERA+의 리그 평균 평균자책점(어림). 서버가 기간 값을 주지 않아 ERA+ = 리그 ERA ÷ 평균자책점 × 100으로 어림한다 */
export const LEAGUE_ERA = 4.2;

/** 기간 평균자책점 → ERA+(100 = 평균). 자책점이 없으면(ERA 0) 300(서버 ERA+의 상한과 같다) */
export function periodEraPlus(era: number): number {
  return era <= 0 ? 300 : Math.min(300, (LEAGUE_ERA / era) * 100);
}
