// 선수 페이지 경기 기록을 줄로 묶는다(GameLogList). 최신 경기부터, 달이 바뀌면 달 머리 줄, 이어진 결장은 한 줄로 접는다.
import type { GameLine, RosterMove } from "./api";
import { formatEra, formatRate } from "./format";

export type GameLogFilter = "all" | "played";

export type GameLogItem =
  /**
   * 달 머리 줄: "9월" + "뛴 25경기 · 타율 .247".
   * fromMonth: 달을 넘는 마이너·부상자 명단 줄이 그달 첫 줄이면 그 줄이 덮는 첫 달("6–9월")
   */
  | { kind: "month"; key: string; month: number; fromMonth?: number; summary: string }
  /** 경기 한 줄 */
  | { kind: "game"; key: string; game: GameLine }
  /**
   * 이어진 결장(투수는 등판 없음) 2경기 이상을 접은 한 줄. games는 최신부터.
   * reason: 그동안 이동 기록상 어디 있었나(마이너·부상자 명단). 모르거나 섞였으면 null(그냥 결장)
   */
  | { kind: "skip"; key: string; games: GameLine[]; reason: SkipReason | null };

export type SkipReason = "minors" | "injured";

/** 경기의 미국 날짜("2026-09-20"). 이동 기록 날짜가 미국 날짜라 맞춰 비교한다(한국 시간에서 14시간 빼면 미국 동부·서부 어디든 같은 날) */
function usDate(game: GameLine): string {
  return new Date(new Date(game.startTimeKst).getTime() - 14 * 3600_000 + 9 * 3600_000).toISOString().slice(0, 10);
}

/** 그날 선수가 어디 있었나: 그날까지의 마지막 이동 기록으로 본다 */
function placeOn(date: string, moves: RosterMove[]): SkipReason | "majors" | null {
  const last = moves.filter((m) => m.date <= date).sort((a, b) => b.date.localeCompare(a.date))[0];
  if (!last) return null;
  if (/부상자 명단 등재|재활/.test(last.labelKo)) return "injured";
  if (/마이너|강등|옵션/.test(last.labelKo) || last.toLevel === "MINORS") return "minors";
  return "majors";
}

/** 접은 줄의 까닭: 모든 경기가 같은 곳(마이너 또는 부상자 명단)이면 그곳, 아니면 null */
function skipReason(games: GameLine[], moves: RosterMove[]): SkipReason | null {
  const places = new Set(games.map((g) => placeOn(usDate(g), moves)));
  if (places.size !== 1) return null;
  const only = [...places][0];
  return only === "minors" || only === "injured" ? only : null;
}

function monthOf(game: GameLine): number {
  return Number(game.startTimeKst.slice(5, 7));
}

/** 달 머리 줄 글: 타자는 뛴 경기 수·타율, 투수는 등판 수·평균자책점. 그달에 뛴 경기가 없으면 '뛴 경기 없음' */
export function monthSummary(games: GameLine[]): string {
  const pitcher = games[0]?.role === "PITCHER";
  const played = games.filter((g) => g.played);
  if (played.length === 0) return pitcher ? "등판 없음" : "뛴 경기 없음";
  if (pitcher) {
    const outs = played.reduce((s, g) => s + (g.pitching?.outs ?? 0), 0);
    const er = played.reduce((s, g) => s + (g.pitching?.earnedRuns ?? 0), 0);
    return outs > 0 ? `등판 ${played.length} · 평균자책점 ${formatEra((er * 27) / outs)}` : `등판 ${played.length}`;
  }
  const ab = played.reduce((s, g) => s + (g.batting?.atBats ?? 0), 0);
  const hits = played.reduce((s, g) => s + (g.batting?.hits ?? 0), 0);
  return ab > 0 ? `뛴 ${played.length}경기 · 타율 ${formatRate(hits / ab)}` : `뛴 ${played.length}경기`;
}

/**
 * 경기(최신부터)를 줄로 묶는다. filter가 played면 뛴 경기만.
 * 결장이 2경기 이상 이어지면 한 줄로 접는다(1경기는 그대로). 달 머리 줄은 그달 첫 줄 앞에 둔다.
 */
export function buildGameLog(games: GameLine[], filter: GameLogFilter, moves: RosterMove[] = []): GameLogItem[] {
  const byMonth = new Map<number, GameLine[]>();
  for (const g of games) {
    const m = monthOf(g);
    byMonth.set(m, [...(byMonth.get(m) ?? []), g]);
  }

  const rows: GameLogItem[] = [];
  const shown = filter === "played" ? games.filter((g) => g.played) : games;
  for (let i = 0; i < shown.length; i++) {
    const g = shown[i];
    if (!g.played) {
      let j = i;
      // 같은 곳(그냥 결장·마이너·부상자 명단)끼리만 묶어 '결장 3경기'와 '부상자 명단 23경기'가 한 줄에 섞이지 않게 한다.
      // 그냥 결장은 같은 달 안에서만 묶고, 마이너·부상자 명단처럼 긴 기간은 달을 넘어 한 줄로 묶는다
      // ("6.1–9.28 마이너에 있던 기간 104경기". 그 사이 달은 뛴 경기가 없어 머리 줄도 없다)
      const place = placeOn(usDate(g), moves);
      const long = place === "minors" || place === "injured";
      while (
        j + 1 < shown.length &&
        !shown[j + 1].played &&
        (long || monthOf(shown[j + 1]) === monthOf(g)) &&
        placeOn(usDate(shown[j + 1]), moves) === place
      ) {
        j++;
      }
      if (j > i) {
        const run = shown.slice(i, j + 1);
        rows.push({ kind: "skip", key: `skip-${g.gameId}`, games: run, reason: skipReason(run, moves) });
        i = j;
        continue;
      }
    }
    rows.push({ kind: "game", key: `game-${g.gameId}`, game: g });
  }

  const firstOf = (row: GameLogItem | undefined) => (row?.kind === "game" ? row.game : row?.kind === "skip" ? row.games[0] : null);
  const items: GameLogItem[] = [];
  let lastMonth: number | null = null;
  rows.forEach((row, idx) => {
    const first = firstOf(row);
    if (!first) return;
    const m = monthOf(first);
    if (m !== lastMonth) {
      // 달을 넘는 접은 줄(5.30–9.28 마이너)이면 머리 줄을 '6–9월'로: 9월만 쓰면 6~8월이 빠진 것처럼 보인다.
      // 맨 끝 경기의 달(5월)은 다음 줄이 같은 달이면 그 줄의 머리 줄이 따로 있으니 뺀다
      let from = m;
      if (row.kind === "skip") {
        from = monthOf(row.games[row.games.length - 1]);
        const next = firstOf(rows[idx + 1]);
        if (next && monthOf(next) === from) from = Math.min(from + 1, m);
      }
      const months = Array.from({ length: m - from + 1 }, (_, k) => from + k).flatMap((mm) => byMonth.get(mm) ?? []);
      items.push({
        kind: "month",
        key: `month-${first.startTimeKst.slice(0, 7)}`,
        month: m,
        ...(from < m ? { fromMonth: from } : {}),
        summary: monthSummary(months),
      });
      lastMonth = m;
    }
    items.push(row);
  });
  return items;
}
