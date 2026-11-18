// 선수 페이지 경기 기록을 월 달력으로 묶는다(GameCalendar, 사용자 11-15 시안 D).
// 메이저·마이너 경기를 한국 날짜별로 모아 날짜 칸 하나에 그날 결과 하나(홈런·N안타·결장 …)를 쓴다.
// 같은 날 여러 경기(더블헤더, 메이저 결장 + 마이너 재활 경기)는 한 칸으로 합치고, 날짜를 누르면 그날 경기를 모두 보여 준다.
import type { GameLine, MinorGameLine, Role } from "./api";
import { formatDate, formatEra, formatInningsOuts, formatRate, formatSummary, formatTime } from "./format";

/** 한 경기: 메이저(팀 경기, 결장 포함) 또는 마이너(뛴 경기만) */
export type LogGame = { kind: "mlb"; game: GameLine } | { kind: "minor"; game: MinorGameLine; line: GameLine };

/** 경기 한 줄 모양(GameLine). 마이너는 메이저 줄 모양으로 바꾼 것 */
export function lineOf(entry: LogGame): GameLine {
  return entry.kind === "mlb" ? entry.game : entry.line;
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
    // 홈·원정을 모르면(null) 줄에 쓰지 않는다(GameRow hideVenue). 여기 값은 쓰이지 않는다
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

/**
 * 그달(또는 단계)의 성적 글: 타자는 ".295", 투수는 "평균자책점 3.86". 기록이 없으면 빈 글.
 * 같은 페이지의 시즌 성적·경기 줄이 '평균자책점'이라 줄여 쓰지 않는다(한 대상은 한 이름, 11-17 전수조사)
 */
function rate(lines: GameLine[], role: Role): string {
  if (role === "PITCHER") {
    const outs = lines.reduce((s, g) => s + (g.pitching?.outs ?? 0), 0);
    const er = lines.reduce((s, g) => s + (g.pitching?.earnedRuns ?? 0), 0);
    return outs > 0 ? `평균자책점 ${formatEra((er * 27) / outs)}` : "";
  }
  const ab = lines.reduce((s, g) => s + (g.batting?.atBats ?? 0), 0);
  const hits = lines.reduce((s, g) => s + (g.batting?.hits ?? 0), 0);
  return ab > 0 ? formatRate(hits / ab) : "";
}

/**
 * 그달 성적 글: 단계마다 뛴 경기 수와 성적. 최근에 뛴 단계부터.
 * 예: "트리플A 10경기 .195 · 메이저 1경기", 투수는 "트리플A 8번 등판 평균자책점 12.54"(투수 출전 수는 '등판'으로 부른다,
 * 시즌 성적 이름표 '메이저 4번 등판'과 같은 말). 그달에 뛴 경기가 없으면 '뛴 경기 없음'(투수는 '등판 없음')
 */
export function monthSummary(entries: LogGame[], role: Role): string {
  const byLevel = new Map<string, GameLine[]>();
  for (const e of entries) {
    const line = lineOf(e);
    if (!line.played) continue;
    const level = e.kind === "mlb" ? "메이저" : e.game.levelKo;
    const list = byLevel.get(level);
    if (list) list.push(line);
    else byLevel.set(level, [line]);
  }
  if (byLevel.size === 0) return role === "PITCHER" ? "등판 없음" : "뛴 경기 없음";
  return [...byLevel]
    .map(([level, lines]) =>
      [level, role === "PITCHER" ? `${lines.length}번 등판` : `${lines.length}경기`, rate(lines, role)].filter(Boolean).join(" "),
    )
    .join(" · ");
}

/**
 * 날짜 칸 색(뜻):
 * hr 가장 큰 활약(홈런, 투수는 2이닝 이상 무실점) · multi 2안타 이상(투수는 1이닝 이상 무실점, 이닝을 모르는 무실점) ·
 * hit 1안타(투수는 1이닝 못 채운 무실점) · zero 무안타(타수 없는 출전 포함)·실점 · unknown 뛰었는데 기록을 못 받음(색 없이 '출전'·'등판') ·
 * off 결장(타자) · pending 경기 전·중·연기 · rest 등판 없음(투수, 칸을 칠하지 않는다)
 */
export type DayTone = "hr" | "multi" | "hit" | "zero" | "unknown" | "off" | "pending" | "rest";

/** 달력 날짜 칸 하나(그날 경기를 모두 합친 것) */
export interface CalendarDay {
  /** 한국 날짜 "2026-09-21" */
  key: string;
  day: number;
  /** 그날 경기. 뛴 경기 먼저, 그다음 시작 시각 순 */
  entries: LogGame[];
  tone: DayTone;
  /** 좁은 칸(휴대폰) 글자: "1안타", "홈런", "결장", "무실점", "08:05" */
  label: string;
  /** 넓은 칸 글자: "4타수 2안타", "1안타 1홈런", "1⅔이닝 무실점" */
  detail: string;
  /** 넓은 칸 아래 줄: "승 7-3", 여러 경기면 "2경기". 점수를 모르면(마이너) 빈 글 */
  result: string;
  /** 그날 경기 수(더블헤더면 2) */
  count: number;
  /** 로고·단계를 보여 줄 경기(뛴 경기 먼저) */
  main: LogGame;
  /** 화면 낭독기가 읽는 칸 이름: "9월 21일(월) 2타수 1안타 1볼넷" */
  speech: string;
  /** 누를 수 있는 칸인지(투수의 등판 없는 날은 아니다) */
  selectable: boolean;
}

/** 달 하나: 달 칸과 달력 머리에 쓴다 */
export interface CalendarMonth {
  /** "2026-09" */
  key: string;
  year: number;
  month: number;
  /** 그달 경기(뛴 경기·결장 포함). 0이면 빈 달(부상 등) */
  entries: LogGame[];
  /** 처음 고를 날짜(그달 마지막으로 뛴 날, 없으면 마지막 누를 수 있는 날). 없으면 null */
  defaultDay: string | null;
}

export interface GameCalendarData {
  /** 첫 경기 달부터 마지막 경기 달까지 빠짐없이(경기 없는 달도 넣는다) */
  months: CalendarMonth[];
  days: Map<string, CalendarDay>;
  /** 처음 펼칠 달: 마지막 경기가 있는 달 */
  defaultMonth: string | null;
}

/** 한국 날짜 "2026-09-21". startTimeKst는 +09:00 시각이라 앞 10자가 한국 날짜다 */
export function kstDay(startTimeKst: string): string {
  return startTimeKst.slice(0, 10);
}

const RESULT_KO = { W: "승", L: "패", T: "무" } as const;

/** 넓은 칸 아래 줄 "승 7-3". 점수를 모르면 빈 글 */
function resultText(line: GameLine): string {
  if (line.teamScore == null || line.opponentScore == null) return "";
  const head = line.result ? `${RESULT_KO[line.result]} ` : "";
  return `${head}${line.teamScore}-${line.opponentScore}`;
}

/** 끝나지 않은 경기의 칸 글자: 경기 중 · 연기 · 취소 · 시작 시각 */
function pendingLabel(line: GameLine): string {
  if (line.gameStatus === "in_progress") return "경기중";
  if (line.gameStatus === "postponed" || line.gameStatus === "suspended") return "연기";
  if (line.gameStatus === "cancelled") return "취소";
  return formatTime(line.startTimeKst);
}

type Look = Pick<CalendarDay, "tone" | "label" | "detail">;

/** 타자가 뛴 경기(그날 모두)를 합친 칸 */
function hitterLook(played: GameLine[]): Look {
  const known = played.filter((l) => l.batting);
  // 기록을 못 받았으면(숫자 없음) 뛰었다는 것만. 회색이면 범례의 '무안타'로 읽혀서 색 없는 칸으로 둔다(PR #291 리뷰)
  if (known.length === 0) return { tone: "unknown", label: "출전", detail: "출전" };
  const ab = known.reduce((s, l) => s + (l.batting?.atBats ?? 0), 0);
  const hits = known.reduce((s, l) => s + (l.batting?.hits ?? 0), 0);
  const hr = known.reduce((s, l) => s + (l.batting?.homeRuns ?? 0), 0);
  if (hr > 0) return { tone: "hr", label: hr > 1 ? `${hr}홈런` : "홈런", detail: `${hits}안타 ${hr}홈런` };
  if (hits >= 2) return { tone: "multi", label: `${hits}안타`, detail: `${ab}타수 ${hits}안타` };
  if (hits === 1) return { tone: "hit", label: "1안타", detail: `${ab}타수 1안타` };
  // 타수 없이 뛴 날(대주자·대수비·볼넷만): 한 경기면 그 한 줄('1볼넷', '1도루', '출전')을 넓은 칸에 쓴다
  if (ab === 0) return { tone: "zero", label: "출전", detail: played.length === 1 ? formatSummary(played[0].summary) : "출전" };
  return { tone: "zero", label: "무안타", detail: `${ab}타수 무안타` };
}

/**
 * 투수가 던진 경기(그날 모두)를 합친 칸. 칸 색은 던진 내용이다(사용자 결정 11-17 '추천대로'):
 * 2이닝 이상 무실점(주황) > 1이닝 이상 무실점(파랑) > 1이닝 못 채운 무실점(연파랑) > 실점(회색).
 * 예전에는 승리·세이브가 주황이라 2실점 승리가 2이닝 무실점보다 센 색이었다(색 순서가 잘 던진 순서와 반대, 승리는 팀 타선 덕도 크다).
 * 승·세이브는 칸에 쓰지 않고 아래 경기 줄(활약 배지 '승리투수'·'세이브', 한 줄 기록 '· 승')과 낭독 글(한 줄 기록)에 남긴다.
 * 넓은 칸에 '· 승'을 붙이면 바로 아래 줄 팀 결과('승 5-4')와 '승'이 한 칸에 두 번 나오고, 칸 안쪽 64px에서 '승'만 다음 줄로 떨어졌다.
 * 칸 글자는 결과다: 좁은 칸(휴대폰) '무실점'·'2실점', 넓은 칸 '1이닝 무실점'·'2이닝 2실점'.
 * 던진 내용을 모르면 범례의 어느 색도 아니게 둔다: 투구 기록을 못 받은 등판은 색 없는 칸 '등판'(회색이면 범례의 '실점'으로 읽힌다),
 * 아웃 수를 모르는 무실점은 파랑(범례 '무실점'. 연파랑은 1이닝 못 채운 짧은 등판으로 읽힌다). 2026 운영 데이터 등판 40번에는
 * 둘 다 없었다(기록을 못 받았을 때 대비, PR #291 리뷰)
 */
function pitcherLook(played: GameLine[]): Look {
  const known = played.filter((l) => l.pitching);
  if (known.length === 0) return { tone: "unknown", label: "등판", detail: "등판" };
  const outsKnown = known.every((l) => l.pitching?.outs != null);
  const outs = known.reduce((s, l) => s + (l.pitching?.outs ?? 0), 0);
  const runs = known.reduce((s, l) => s + (l.pitching?.runs ?? 0), 0);
  const runsText = runs === 0 ? "무실점" : `${runs}실점`;
  // 아웃 1~2개는 "0⅓"이 아니라 "⅓"(경기 한 줄 기록과 같은 표기)
  const innings = formatInningsOuts(outs).replace(/^0(?=[⅓⅔])/, "");
  const detail = outsKnown ? `${innings}이닝 ${runsText}` : runsText;
  if (runs > 0) return { tone: "zero", label: runsText, detail };
  // 아웃 수를 모르는 경기가 끼면 아는 아웃만 더한 outs는 실제보다 작다. 그래도 2이닝을 넘었으면 주황은 맞고, 아니면 파랑
  return { tone: outs >= 6 ? "hr" : outs >= 3 || !outsKnown ? "multi" : "hit", label: runsText, detail };
}

/** 그날 경기들로 칸 하나를 만든다. entries는 같은 한국 날짜의 경기 */
function buildDay(key: string, entries: LogGame[], role: Role): CalendarDay {
  // 뛴 경기 먼저, 그다음 시작 시각 순(더블헤더 1차전 → 2차전)
  const sorted = [...entries].sort(
    (a, b) =>
      Number(lineOf(b).played) - Number(lineOf(a).played) ||
      lineOf(a).startTimeKst.localeCompare(lineOf(b).startTimeKst),
  );
  const lines = sorted.map(lineOf);
  const played = lines.filter((l) => l.played);
  const main = sorted[0];
  const mainLine = lines[0];
  // 그날 실제로 치른(또는 치를) 경기 수. 메이저 결장 + 마이너 재활 경기처럼 팀이 다른 날은 뛴 경기만 센다
  const count = played.length > 0 ? played.length : lines.length;

  let look: Look;
  if (played.length > 0) {
    look = role === "PITCHER" ? pitcherLook(played) : hitterLook(played);
  } else if (lines.every((l) => l.gameStatus === "final")) {
    // 팀은 경기했는데 안 뛰었다. 타자에겐 결장이 소식이고, 투수에겐 등판 없는 날이 보통이라 칸을 칠하지 않는다
    look = role === "PITCHER" ? { tone: "rest", label: "", detail: "" } : { tone: "off", label: "결장", detail: "결장" };
  } else {
    // 아직 끝나지 않은 경기가 있으면 그 경기를 쓴다(더블헤더 1차전 결장 뒤 2차전 예정이면 '결장' 대신 2차전 시각)
    const next = lines.find((l) => l.gameStatus !== "final") ?? mainLine;
    const label = pendingLabel(next);
    look = { tone: "pending", label, detail: label === formatTime(next.startTimeKst) ? `${label} 시작` : label };
  }

  const speechLines = sorted
    .filter((e) => played.length === 0 || lineOf(e).played)
    .map((e) => `${e.kind === "minor" ? `${e.game.levelKo} ` : ""}${lineOf(e).summary}`);
  const speech = `${formatDate(key)}${count > 1 ? ` 더블헤더 ${count}경기` : ""} ${
    look.tone === "rest" ? "등판 없음" : speechLines.join(", ")
  }`;

  return {
    key,
    day: Number(key.slice(8, 10)),
    entries: sorted,
    ...look,
    result: count > 1 ? `${count}경기` : resultText(mainLine),
    count,
    main,
    speech,
    selectable: look.tone !== "rest",
  };
}

/**
 * 메이저 경기(결장 포함)와 마이너 경기를 달력으로 묶는다. role은 선수의 주 역할(칸 글자·달 성적에 쓴다).
 * 달은 첫 경기 달부터 마지막 경기 달까지 빠짐없이 만든다. 경기가 없는 달(시즌 내내 부상 등)도 칸으로 남겨 비었다는 걸 보여 준다.
 */
export function buildGameCalendar(games: GameLine[], minorGames: MinorGameLine[], role: Role): GameCalendarData {
  const base = games[0] ?? null;
  const who = { playerId: base?.playerId ?? 0, nameKo: base?.nameKo ?? "", role, photoUrl: base?.photoUrl ?? null };
  const entries: LogGame[] = [
    ...games.map((g): LogGame => ({ kind: "mlb", game: g })),
    ...minorGames.map((m): LogGame => ({ kind: "minor", game: m, line: minorAsLine(m, who) })),
  ];
  if (entries.length === 0) return { months: [], days: new Map(), defaultMonth: null };

  const byDay = new Map<string, LogGame[]>();
  for (const e of entries) {
    const key = kstDay(lineOf(e).startTimeKst);
    const list = byDay.get(key);
    if (list) list.push(e);
    else byDay.set(key, [e]);
  }
  const days = new Map<string, CalendarDay>();
  for (const [key, list] of byDay) days.set(key, buildDay(key, list, role));

  const keys = [...days.keys()].sort();
  const keysByMonth = new Map<string, string[]>();
  for (const k of keys) {
    const list = keysByMonth.get(k.slice(0, 7));
    if (list) list.push(k);
    else keysByMonth.set(k.slice(0, 7), [k]);
  }
  const first = keys[0];
  const last = keys[keys.length - 1];
  const months: CalendarMonth[] = [];
  let year = Number(first.slice(0, 4));
  let month = Number(first.slice(5, 7));
  const endYear = Number(last.slice(0, 4));
  const endMonth = Number(last.slice(5, 7));
  while (year < endYear || (year === endYear && month <= endMonth)) {
    const key = `${year}-${String(month).padStart(2, "0")}`;
    const monthDays = (keysByMonth.get(key) ?? []).map((k) => days.get(k)!);
    const lastPlayed = monthDays.filter((d) => d.entries.some((e) => lineOf(e).played)).at(-1);
    const lastSelectable = monthDays.filter((d) => d.selectable).at(-1);
    months.push({
      key,
      year,
      month,
      entries: monthDays.flatMap((d) => d.entries),
      defaultDay: (lastPlayed ?? lastSelectable)?.key ?? null,
    });
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return { months, days, defaultMonth: last.slice(0, 7) };
}

/** 그달 달력 칸: 일요일부터 한 주 7칸. 앞뒤 빈칸은 null */
export function monthCells(year: number, month: number): (number | null)[] {
  // 시간대와 상관없게 UTC로 요일·날 수를 센다
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const length = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: (number | null)[] = Array.from({ length: firstWeekday }, () => null);
  for (let d = 1; d <= length; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
