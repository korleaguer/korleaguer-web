// 시즌 중 홈 '이번 주 두 선수'의 셈(사용자 11-22 시안 3B, 이슈 #424). 화면 없이 셈만 한다.
// 주는 한국 날짜 월~일이고, 값은 홈이 이미 받는 내 선수 응답(/api/my, 명단 전원·7일)의 경기 줄을 더한 것이다(7일 기간은 이번 주 월요일을 늘 담는다).
import type { GameLine, MyPlayer, SamePair } from "@/lib/api";
import { kstDayKey } from "@/lib/format";

/** 이번 주에 이만큼은 쳐야 카드에 선다(2026 실데이터: 둘 이상이 채운 주가 28주 중 17주) */
export const WEEK_MIN_PA = 10;

/** 한 타자의 이번 주 메이저 정규시즌 합계 */
export interface WeekHitter {
  playerId: number;
  nameKo: string;
  photoUrl: string | null;
  teamAbbr: string | null;
  photoTeamAbbr: string | null;
  games: number;
  plateAppearances: number;
  atBats: number;
  hits: number;
  homeRuns: number;
  rbi: number;
  walks: number;
  /** 타수가 없으면 null */
  avg: number | null;
  /** 2루타·몸에 맞는 공 같은 세부 칸을 못 받은 경기가 있거나 타수가 없으면 null */
  ops: number | null;
}

/** 두 타자가 이번 주에 같이 나온 경기(a 기준). pair는 이번 주 경기만 담은 묶음이라 같은 경기 창에 그대로 넘긴다 */
export interface WeekSame {
  aId: number;
  bId: number;
  pair: SamePair;
}

/** 'YYYY-MM-DD'에 n일을 더한다 */
function addDays(day: string, n: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
}

/** 그 날이 든 주의 월요일~일요일(한국 날짜 열쇠) */
export function weekRange(today: string): { from: string; to: string } {
  const weekday = new Date(`${today}T00:00:00Z`).getUTCDay(); // 0 = 일요일
  const from = addDays(today, -((weekday + 6) % 7));
  return { from, to: addDays(from, 6) };
}

/** '4월 20일~26일', 달이 바뀌면 '4월 27일~5월 3일' */
export function formatWeekLabel(from: string, to: string): string {
  const [, fm, fd] = from.split("-").map(Number);
  const [, tm, td] = to.split("-").map(Number);
  return fm === tm ? `${fm}월 ${fd}일~${td}일` : `${fm}월 ${fd}일~${tm}월 ${td}일`;
}

function inWeek(line: GameLine, from: string, to: string): boolean {
  const day = kstDayKey(line.startTimeKst);
  return day != null && day >= from && day <= to;
}

/**
 * 이번 주 카드에 설 타자들. 메이저에 있는 타자가 이번 주 메이저 정규시즌 경기에서 친 것을 더하고, 10타석 이상만 남긴다.
 * 순서는 내 선수 먼저, 그다음 타석 많은 순(같으면 명단 순). 둘이 안 되면 카드가 없다(부르는 쪽이 길이를 본다)
 */
export function weekHitters(players: MyPlayer[], today: string, mine: readonly number[]): WeekHitter[] {
  const { from, to } = weekRange(today);
  const rows: WeekHitter[] = [];
  for (const entry of players) {
    // 카드의 단계(level)는 큰 숫자 기간의 단계다. 시즌 합계 카드(FA·시즌 끝·국내 복귀)와 기록 없음 카드는 기간이 없어
    // 서버가 비워 준다. 그런 타자도 이번 주 메이저 경기를 쳤으면 넣는다(시즌 중에 FA가 되거나 시즌이 끝난 주)
    if (entry.player.role !== "HITTER" || (entry.level ?? "MLB") !== "MLB") continue;
    // 포스트시즌은 뺀다(경기 종류를 모르면 정규시즌으로 본다)
    const lines = entry.games.filter(
      (g) => g.played && g.batting && g.seasonType !== "POSTSEASON" && inWeek(g, from, to),
    );
    const sum = (pick: (b: NonNullable<GameLine["batting"]>) => number | null) =>
      lines.reduce((total, g) => total + (pick(g.batting!) ?? 0), 0);
    const atBats = sum((b) => b.atBats);
    const hits = sum((b) => b.hits);
    const walks = sum((b) => b.walks);
    const homeRuns = sum((b) => b.homeRuns);
    const detailed = lines.every((g) => g.batting!.doubles != null && g.batting!.hitByPitch != null && g.batting!.sacFlies != null);
    const hitByPitch = sum((b) => b.hitByPitch);
    const sacFlies = sum((b) => b.sacFlies);
    // 타석을 못 받은 경기는 타수 + 볼넷 + 몸에 맞는 공 + 희생플라이로 센다(희생번트는 빠진다)
    const plateAppearances = sum((b) => b.plateAppearances ?? b.atBats + b.walks + (b.hitByPitch ?? 0) + (b.sacFlies ?? 0));
    if (plateAppearances < WEEK_MIN_PA) continue;
    const totalBases = hits + sum((b) => b.doubles) + 2 * sum((b) => b.triples) + 3 * homeRuns;
    const onBaseChances = atBats + walks + hitByPitch + sacFlies;
    rows.push({
      playerId: entry.player.id,
      nameKo: entry.player.nameKo,
      photoUrl: entry.player.photoUrl,
      teamAbbr: entry.player.teamAbbr,
      photoTeamAbbr: entry.player.photoTeamAbbr,
      games: lines.length,
      plateAppearances,
      atBats,
      hits,
      homeRuns,
      rbi: sum((b) => b.rbi),
      walks,
      avg: atBats > 0 ? hits / atBats : null,
      ops: detailed && atBats > 0 && onBaseChances > 0 ? (hits + walks + hitByPitch) / onBaseChances + totalBases / atBats : null,
    });
  }
  const order = (h: WeekHitter) => (mine.includes(h.playerId) ? 0 : 1);
  return rows
    .map((h, index) => ({ h, index }))
    .sort((x, y) => order(x.h) - order(y.h) || y.h.plateAppearances - x.h.plateAppearances || x.index - y.index)
    .map((x) => x.h);
}

/** 시즌 같은 경기 묶음에서 이번 주 경기만 남긴다(전적도 이번 주 것으로 다시 센다). 이번 주에 같이 나온 경기가 없으면 null */
export function weekPair(pair: SamePair, today: string): SamePair | null {
  const { from, to } = weekRange(today);
  const meetings = pair.meetings.filter((m) => inWeek(m.mine, from, to));
  if (meetings.length === 0) return null;
  return {
    ...pair,
    meetings,
    games: meetings.length,
    wins: meetings.filter((m) => m.mine.result === "W").length,
    losses: meetings.filter((m) => m.mine.result === "L").length,
  };
}
