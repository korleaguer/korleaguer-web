// 선수 페이지 경기 기록을 줄로 묶는다(GameLogList). 메이저·마이너 경기를 최신부터 한 목록에 섞고,
// 콜업·강등은 경기 사이 띠로, 달이 바뀌면 달 머리 줄, 이어진 메이저 결장은 한 줄로 접는다(사용자 11-13 시안 3번).
import type { GameLine, MinorGameLine, Role, RosterMove } from "./api";
import { formatEra, formatRate } from "./format";

/** 한 경기: 메이저(팀 경기, 결장 포함) 또는 마이너(뛴 경기만) */
export type LogGame = { kind: "mlb"; game: GameLine } | { kind: "minor"; game: MinorGameLine; line: GameLine };

export type GameLogItem =
  /** 달 머리 줄: "9월" + "트리플A 10경기 .195 · 메이저 1경기" */
  | { kind: "month"; key: string; month: number; summary: string }
  | { kind: "game"; key: string; entry: LogGame }
  /** 이어진 메이저 결장(투수는 등판 없음) 2경기 이상을 접은 한 줄. games는 최신부터 */
  | { kind: "skip"; key: string; games: GameLine[] }
  /** 콜업(up)·강등(down)·재활 경기 배정(rehab) 띠. date는 이동 기록의 미국 날짜 */
  | { kind: "move"; key: string; tone: MoveTone; date: string };

export type MoveTone = "up" | "down" | "rehab";

/** 경기의 미국 날짜("2026-09-20"). 이동 기록 날짜가 미국 날짜라 맞춰 비교한다(한국 시간에서 14시간 빼면 미국 어디든 같은 날) */
function usDate(startTimeKst: string): string {
  return new Date(new Date(startTimeKst).getTime() + (9 - 14) * 3600_000).toISOString().slice(0, 10);
}

/** 두 날짜("2026-07-13") 사이 날 수. 앞 날짜가 비었으면 아주 큰 수 */
function daysBetween(from: string, to: string): number {
  return from ? (Date.parse(to) - Date.parse(from)) / 86_400_000 : Number.POSITIVE_INFINITY;
}

function monthOf(startTimeKst: string): number {
  return Number(startTimeKst.slice(5, 7));
}

/** 이동 기록 중 단계가 바뀌는 것: 콜업이면 true, 강등·이관이면 false, 그 밖은 null */
function levelChange(m: RosterMove): boolean | null {
  if (/콜업/.test(m.labelKo)) return true;
  if (/강등|이관/.test(m.labelKo)) return false;
  return null;
}

/**
 * 마이너 경기를 메이저 줄 모양(GameLine)으로. 경기 한 줄 부품(GameRow)과 배지(Highlights)를 그대로 쓰려고 맞춘다.
 * 마이너는 끝난 경기만 오고, 선발·교체 여부는 모른다.
 */
export function minorAsLine(m: MinorGameLine, base: Pick<GameLine, "playerId" | "nameKo" | "role" | "photoUrl">): GameLine {
  return {
    ...base,
    gameId: m.gamePk,
    startTimeKst: m.startTimeKst,
    teamKo: m.teamKo,
    teamAbbr: null,
    opponentKo: m.opponentKo,
    opponentAbbr: null,
    home: m.home ?? false,
    teamScore: m.teamScore,
    opponentScore: m.opponentScore,
    result: m.result,
    gameStatus: "final",
    played: true,
    summary: m.summary,
    batting: m.batting,
    pitching: m.pitching,
    lineup: null,
  };
}

/** 그달(또는 단계)의 성적 글: 타자는 ".295", 투수는 "평균자책 3.86". 기록이 없으면 빈 글 */
function rate(lines: GameLine[], role: Role): string {
  if (role === "PITCHER") {
    const outs = lines.reduce((s, g) => s + (g.pitching?.outs ?? 0), 0);
    const er = lines.reduce((s, g) => s + (g.pitching?.earnedRuns ?? 0), 0);
    return outs > 0 ? `평균자책 ${formatEra((er * 27) / outs)}` : "";
  }
  const ab = lines.reduce((s, g) => s + (g.batting?.atBats ?? 0), 0);
  const hits = lines.reduce((s, g) => s + (g.batting?.hits ?? 0), 0);
  return ab > 0 ? formatRate(hits / ab) : "";
}

/**
 * 달 머리 줄 글: 단계마다 뛴 경기 수와 성적. 최근에 뛴 단계부터.
 * 예: "트리플A 10경기 .195 · 메이저 1경기". 그달에 뛴 경기가 없으면 '뛴 경기 없음'(투수는 '등판 없음')
 */
export function monthSummary(entries: LogGame[], role: Role): string {
  const byLevel = new Map<string, GameLine[]>();
  for (const e of entries) {
    const line = e.kind === "mlb" ? e.game : e.line;
    if (!line.played) continue;
    const level = e.kind === "mlb" ? "메이저" : e.game.levelKo;
    byLevel.set(level, [...(byLevel.get(level) ?? []), line]);
  }
  if (byLevel.size === 0) return role === "PITCHER" ? "등판 없음" : "뛴 경기 없음";
  return [...byLevel]
    .map(([level, lines]) => [level, `${lines.length}경기`, rate(lines, role)].filter(Boolean).join(" "))
    .join(" · ");
}

/**
 * 메이저 경기(최신부터, 결장 포함)와 마이너 경기(최신부터)를 한 목록으로.
 * - 경기는 시작 시각 최신부터 섞는다. 마이너 경기 줄은 메이저와 같은 모양이다.
 * - 콜업·강등(단계가 실제로 바뀐 것)과 재활 경기 배정은 그날 경기와 그 전 경기 사이에 띠로 끼운다(이 시즌 것만, 첫 경기보다 앞선 것은 맨 끝).
 * - 이어진 메이저 결장 2경기 이상은 한 줄로 접는다(1경기는 그대로). 띠·달이 바뀌면 끊는다.
 * - 달 머리 줄은 그달 첫 줄 앞에 둔다.
 */
export function buildGameLog(games: GameLine[], minorGames: MinorGameLine[], moves: RosterMove[]): GameLogItem[] {
  const base = games[0] ?? null;
  const role: Role = base?.role ?? (minorGames[0]?.pitching && !minorGames[0]?.batting ? "PITCHER" : "HITTER");
  const who = { playerId: base?.playerId ?? 0, nameKo: base?.nameKo ?? "", role, photoUrl: base?.photoUrl ?? null };
  const entries: LogGame[] = [
    ...games.map((g): LogGame => ({ kind: "mlb", game: g })),
    ...minorGames.map((m): LogGame => ({ kind: "minor", game: m, line: minorAsLine(m, who) })),
  ].sort((a, b) => b.game.startTimeKst.localeCompare(a.game.startTimeKst));
  if (entries.length === 0) return [];

  const startOf = (e: LogGame) => e.game.startTimeKst;
  const first = entries[entries.length - 1];
  const oldest = usDate(startOf(first));
  // 실제로 단계가 바뀐 이동만 띠로 둔다. 이미 마이너에 있는 선수를 40인 명단에서 빼는 '이관'처럼
  // 같은 방향이 이어지면 뺀다(마이너에서 던지는 중인데 '마이너로 내려감'이 붙지 않게).
  // 첫 경기 전의 이동은 띠 없이 그때 상태만 정하고, 이동이 없으면 첫 경기가 메이저인지로 정한다.
  // 재활 경기 배정은 단계를 바꾸지 않지만, 부상 중 메이저 선수가 왜 트리플A 줄에 있는지 알려 주려고 흐린 띠로 둔다.
  let up: boolean | null = first.kind === "mlb";
  const kept: { date: string; tone: MoveTone }[] = [];
  let lastRehab = "";
  for (const m of [...moves].sort((a, c) => a.date.localeCompare(c.date))) {
    // 이 시즌의 이동만 띠로(마지막 경기 뒤의 이동, 예를 들어 오늘 콜업은 맨 위에, 첫 경기 전 것은 맨 끝에)
    const shown = m.date.slice(0, 4) === oldest.slice(0, 4);
    if (/재활 경기/.test(m.labelKo)) {
      // 며칠 사이 단계를 옮겨 다시 배정되는 일이 많아(더블A → 트리플A) 열흘 안의 재활 배정은 첫 것 하나로
      if (shown && daysBetween(lastRehab, m.date) > 10) kept.push({ date: m.date, tone: "rehab" });
      lastRehab = m.date;
      continue;
    }
    const dir = levelChange(m);
    if (dir == null || dir === up) continue;
    up = dir;
    if (shown) kept.push({ date: m.date, tone: dir ? "up" : "down" });
  }
  const bands = kept.reverse();

  const byMonth = new Map<number, LogGame[]>();
  for (const e of entries) {
    const m = monthOf(startOf(e));
    byMonth.set(m, [...(byMonth.get(m) ?? []), e]);
  }

  const items: GameLogItem[] = [];
  let lastMonth: number | null = null;
  let b = 0;
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const day = usDate(startOf(e));
    // 이 경기보다 늦은 이동은 이 경기 위에(콜업 당일 경기는 띠 위, 그 전 경기는 띠 아래)
    while (b < bands.length && bands[b].date > day) {
      const mv = bands[b++];
      items.push({ kind: "move", key: `move-${mv.date}-${b}`, tone: mv.tone, date: mv.date });
    }
    const month = monthOf(startOf(e));
    if (month !== lastMonth) {
      items.push({ kind: "month", key: `month-${startOf(e).slice(0, 7)}`, month, summary: monthSummary(byMonth.get(month) ?? [], role) });
      lastMonth = month;
    }
    if (e.kind === "mlb" && !e.game.played) {
      // 같은 달 안, 사이에 띠가 끼지 않는 동안 이어진 결장을 모은다
      let j = i;
      const offMlb = (x: LogGame | undefined) => x?.kind === "mlb" && !x.game.played;
      while (
        j + 1 < entries.length &&
        offMlb(entries[j + 1]) &&
        monthOf(startOf(entries[j + 1])) === month &&
        !(b < bands.length && bands[b].date > usDate(startOf(entries[j + 1])))
      ) {
        j++;
      }
      if (j > i) {
        items.push({ kind: "skip", key: `skip-${e.game.gameId}`, games: entries.slice(i, j + 1).map((x) => x.game as GameLine) });
        i = j;
        continue;
      }
    }
    items.push({ kind: "game", key: `${e.kind}-${e.kind === "mlb" ? e.game.gameId : e.game.gamePk}`, entry: e });
  }
  // 첫 경기보다 앞선 이동(시즌 첫 재활 배정 등)은 맨 끝에
  while (b < bands.length) {
    const mv = bands[b++];
    items.push({ kind: "move", key: `move-${mv.date}-${b}`, tone: mv.tone, date: mv.date });
  }
  return items;
}
