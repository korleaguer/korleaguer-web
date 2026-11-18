// 내 선수 카드의 경기별 막대 자리. 기간의 날짜마다 한 칸, 그날 경기가 둘(더블헤더)이면 두 칸이다.
import type { GameLine } from "@/lib/api";

export interface BarSlot {
  /** 한국 날짜 "2026-09-21" */
  date: string;
  /** "21" */
  day: string;
  /** 달(1~12) */
  month: number;
  /** 앞 칸과 달이 다르면 true(첫 칸은 false). 막대에 달 바뀜 선과 '10월'을 그린다 */
  monthStart: boolean;
  /** 그 날짜의 몇 번째 칸인지(더블헤더면 0, 1) */
  part: number;
  /** 경기가 없는 날이면 null */
  game: GameLine | null;
}

/** "2026-09-21"에 n일을 더한 날짜 */
function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** 기간 [fromKst, toKst]의 막대 자리. 왼쪽이 오래된 날, 같은 날은 이른 경기부터 */
export function barSlots(fromKst: string, toKst: string, games: readonly GameLine[]): BarSlot[] {
  // startTimeKst는 +09:00 시각이라 앞 10글자가 곧 한국 날짜다.
  const byDate = new Map<string, GameLine[]>();
  for (const game of games) {
    const date = game.startTimeKst.slice(0, 10);
    byDate.set(date, [...(byDate.get(date) ?? []), game]);
  }

  const slots: BarSlot[] = [];
  let prevMonth: number | null = null;
  // 날짜가 이상하게 오면 멈추도록 최대 60일만 센다.
  for (let date = fromKst, n = 0; date <= toKst && n < 60; date = addDays(date, 1), n++) {
    const day = String(Number(date.slice(8, 10)));
    const month = Number(date.slice(5, 7));
    const monthStart = prevMonth != null && month !== prevMonth;
    prevMonth = month;
    const dayGames = [...(byDate.get(date) ?? [])].sort((a, b) => a.startTimeKst.localeCompare(b.startTimeKst));
    if (dayGames.length === 0) {
      slots.push({ date, day, month, monthStart, part: 0, game: null });
    } else {
      // 더블헤더 두 번째 칸은 같은 날이라 달 바뀜이 아니다
      dayGames.forEach((game, part) => slots.push({ date, day, month, monthStart: monthStart && part === 0, part, game }));
    }
  }
  return slots;
}
