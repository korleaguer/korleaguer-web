import Link from "next/link";
import type { GameLine, HomeResponse, MyPlayer } from "@/lib/api";
import { getMyPlayers, getPlayers } from "@/lib/api";
import { formatLineup, formatSummary, formatTime } from "@/lib/format";
import { readMyPlayers } from "@/lib/myPlayers";
import { teamColor, teamLogoUrl } from "@/lib/teams";
import { levelKo } from "@/components/my/formLabels";
import PlayerAvatar from "@/components/PlayerAvatar";
import ResultPill from "@/components/ResultPill";
import ScoreText from "@/components/ScoreText";
import Section from "@/components/Section";
import TeamMark from "@/components/TeamMark";
import RecentGames from "./RecentGames";
import MyPlayersLink from "@/components/home/MyPlayersLink";

/**
 * 시즌 중 홈 맨 위: 선수들이 지금 어디서 뛰나를 층으로 묶는다(이슈 #245, 11-16·17 개편 결정).
 * 해외파는 매일 뛰는 곳이 달라(메이저·트리플A·부상 재활), 메이저 경기만 보이던 '최근 경기' 대신 층마다 선수의 마지막 경기 한 줄을 둔다.
 * 데이터는 '내 선수'와 같은 GET /api/my(명단 전원, 7일)다. 받지 못하면 예전 '최근 경기'를 그대로 보인다.
 */

/** 층. 순서가 화면 순서다 */
type FloorKey = "MLB" | `MINOR_${string}` | "INJURED" | "WAITING" | "FA" | "KBO" | "OVER";

const MINOR_ORDER = ["AAA", "AA", "A+", "A", "ROK"];

interface Floor {
  key: FloorKey;
  title: string;
  /** 왼쪽 점·제목 색 */
  tone: "accent" | "muted" | "danger" | "fa" | "success";
  players: MyPlayer[];
}

function floorOf(entry: MyPlayer): { key: FloorKey; title: string; tone: Floor["tone"] } {
  const status = entry.status;
  switch (status?.kind) {
    case undefined:
    case "CALLED_UP":
    case "RETURNED":
      return { key: "MLB", title: "메이저", tone: "accent" };
    case "MINORS":
      return { key: `MINOR_${status.level ?? "?"}`, title: levelKo(status.level), tone: "muted" };
    case "IL":
    case "MINORS_IL":
      return { key: "INJURED", title: "부상·재활", tone: "danger" };
    case "SUSPENDED":
    case "DFA":
      return { key: "WAITING", title: "출장 정지·지명 할당", tone: "danger" };
    case "FA":
      return { key: "FA", title: "FA · 팀 찾는 중", tone: "fa" };
    case "KBO":
      return { key: "KBO", title: "한국 복귀", tone: "success" };
    default:
      return { key: "OVER", title: "시즌 끝", tone: "muted" };
  }
}

function floorRank(key: FloorKey): number {
  if (key === "MLB") return 0;
  if (key.startsWith("MINOR_")) {
    const i = MINOR_ORDER.indexOf(key.slice("MINOR_".length));
    return 1 + (i < 0 ? MINOR_ORDER.length : i);
  }
  return { INJURED: 10, WAITING: 11, FA: 12, KBO: 13, OVER: 14 }[key as "INJURED" | "WAITING" | "FA" | "KBO" | "OVER"];
}

/** 층으로 묶는다. 층 안은 별 준 선수 먼저, 그다음 명단 순 */
export function buildFloors(players: MyPlayer[], mine: readonly number[]): Floor[] {
  const floors = new Map<FloorKey, Floor>();
  for (const entry of players) {
    const { key, title, tone } = floorOf(entry);
    const floor = floors.get(key) ?? { key, title, tone, players: [] };
    floor.players.push(entry);
    floors.set(key, floor);
  }
  const starred = (e: MyPlayer) => (mine.includes(e.player.id) ? 0 : 1);
  return [...floors.values()]
    .map((f) => ({ ...f, players: [...f.players].sort((a, b) => starred(a) - starred(b)) }))
    .sort((a, b) => floorRank(a.key) - floorRank(b.key));
}

/** 오늘 한국 선수끼리 같은 경기에서 뛴 짝(맞대결). 없으면 null */
export function findDerby(players: MyPlayer[]): [GameLine, GameLine] | null {
  const byGame = new Map<number, GameLine[]>();
  for (const entry of players) {
    const last = shownGame(entry);
    if (!last || !last.played || floorOf(entry).key !== "MLB") continue;
    byGame.set(last.gameId, [...(byGame.get(last.gameId) ?? []), last]);
  }
  for (const lines of byGame.values()) {
    // 다른 팀끼리여야 맞대결이다(같은 팀 동료는 아니다)
    const pair = lines.find((a) => lines.some((b) => b.teamAbbr !== a.teamAbbr));
    if (pair) return [pair, lines.find((b) => b.teamAbbr !== pair.teamAbbr)!];
  }
  return null;
}

/**
 * 보여 줄 경기: 최신 줄이 아직 시작 전(오늘 저녁 경기 등)이면 그 전의 끝난·진행 중 경기를 쓴다.
 * 아침에 홈을 열었을 때 '경기 전'이 어젯밤 결과를 가리지 않게. 끝난 경기가 없으면 최신 줄 그대로
 */
function shownGame(entry: MyPlayer): GameLine | null {
  return entry.games.find((g) => g.gameStatus !== "scheduled" && g.gameStatus !== "postponed") ?? entry.games[0] ?? null;
}

/** "2026-07-07" → "7월 7일" */
function monthDay(date: string): string {
  const [, m, d] = date.split("-");
  return `${Number(m)}월 ${Number(d)}일`;
}

/** 이름 아래 한 줄: 마지막 경기 한 줄 기록(부상이면 재활 경기, FA면 마지막 경기) */
function lineOf(entry: MyPlayer): { text: string; game: GameLine | null } {
  const status = entry.status;
  const game = shownGame(entry);
  if (status?.kind === "IL" || status?.kind === "MINORS_IL") {
    if (entry.basis === "REHAB" && game) return { text: `재활 경기 ${formatSummary(game.summary)}`, game };
    return { text: status.kind === "IL" ? "부상자 명단" : "마이너 부상자 명단", game: null };
  }
  if (status?.kind === "FA" || status?.kind === "SEASON_OVER" || status?.kind === "KBO") {
    return {
      text: status.lastGameDate ? `마지막 경기 ${monthDay(status.lastGameDate)} ${levelKo(status.lastGameLevel)}` : "경기 없음",
      game: null,
    };
  }
  if (!game) return { text: entry.basis === "NONE" ? "아직 경기 없음" : "최근 경기 없음", game: null };
  return { text: formatSummary(game.summary), game };
}

/** 이름 옆 소속: 메이저는 팀, 마이너는 '다저스 산하' */
function teamText(entry: MyPlayer): string | null {
  const team = entry.player.teamKo;
  if (entry.status?.kind === "MINORS" && team) return `${team} 산하`;
  return team;
}

/** 오른쪽: 메이저는 선발·교체·구원, 그 밖은 그 상태 며칠째 */
function sideText(entry: MyPlayer, game: GameLine | null): string | null {
  const status = entry.status;
  if (!status || status.kind === "CALLED_UP" || status.kind === "RETURNED") {
    return game && game.played ? (formatLineup(game) ?? (game.role === "PITCHER" ? "등판" : null)) : null;
  }
  return status.days != null ? `${status.days}일째` : null;
}

/** 이름 아래 초록 한 줄: 메이저로 올라옴·부상 복귀(7일 안) */
function moveText(entry: MyPlayer): string | null {
  const status = entry.status;
  if (!status?.since) return null;
  if (status.kind === "CALLED_UP") return `↑ ${monthDay(status.since)} 메이저로 올라옴`;
  if (status.kind === "RETURNED") return `↑ ${monthDay(status.since)} 부상에서 돌아옴`;
  return null;
}

const DOT: Record<Floor["tone"], string> = {
  accent: "bg-accent",
  muted: "bg-muted",
  danger: "bg-danger-fg",
  fa: "bg-fa-fg",
  success: "bg-success-fg",
};
const TITLE: Record<Floor["tone"], string> = {
  accent: "text-accent-ink",
  muted: "text-muted",
  danger: "text-danger-fg",
  fa: "text-fa-fg",
  success: "text-success-fg",
};

interface Props {
  recent: HomeResponse["recent"];
  asOf: string;
}

export default async function SeasonFloors({ recent, asOf }: Props) {
  const [playersResult, mine] = await Promise.all([getPlayers(), readMyPlayers()]);
  const ids = playersResult.ok ? playersResult.data.map((p) => p.id).slice(0, 20) : [];
  const myResult = ids.length > 0 ? await getMyPlayers(ids, 7) : null;
  if (!myResult || !myResult.ok || myResult.data.players.length === 0) {
    return <RecentGames recent={recent} asOf={asOf} />;
  }
  const players = myResult.data.players;
  const floors = buildFloors(players, mine);
  const derby = findDerby(players);

  return (
    <Section id="floors-title" title="지금 어디서 뛰나" aside={asOf}>
      {/* '내 선수'(/my)로 가는 입구(이슈 #262). 내 선수는 층마다 파란 고리로 먼저 놓인다 */}
      <div className="-mt-1 mb-2 flex justify-end px-1">
        <MyPlayersLink count={mine.length} />
      </div>
      {derby && <DerbyCard pair={derby} />}
      {/* PC: 층을 두 칸에 나눠 놓는다(한 줄이 화면 끝까지 늘어나지 않게). 층을 잇는 세로선은 휴대폰에서만 */}
      <div className="space-y-3 lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-6 lg:gap-y-4 lg:space-y-0">
        {floors.map((floor, index) => (
          <section key={floor.key} aria-label={`${floor.title} ${floor.players.length}명`} className="relative pl-6">
            {/* 층을 잇는 세로선과 층 점 */}
            {index < floors.length - 1 && (
              <span aria-hidden className="absolute top-2.5 bottom-[-0.75rem] left-[0.4375rem] w-0.5 bg-line lg:hidden" />
            )}
            <span
              aria-hidden
              className={`absolute top-1 left-0 size-4 rounded-full border-4 border-background ${DOT[floor.tone]}`}
            />
            <div className="mb-1.5 flex items-baseline justify-between px-0.5">
              <h3 className={`text-label ${TITLE[floor.tone]}`}>{floor.title}</h3>
              <span className="text-caption text-muted tabular-nums">{floor.players.length}명</span>
            </div>
            <ul className="card divide-y divide-line overflow-hidden">
              {floor.players.map((entry) => (
                <FloorRow key={entry.player.id} entry={entry} starred={mine.includes(entry.player.id)} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Section>
  );
}

function FloorRow({ entry, starred }: { entry: MyPlayer; starred: boolean }) {
  const { text, game } = lineOf(entry);
  const side = sideText(entry, game);
  const move = moveText(entry);
  const team = teamText(entry);
  return (
    <li>
      <Link href={`/players/${entry.player.id}`} className="press-soft flex min-h-16 items-center gap-3 px-3.5 py-2.5">
        <span className={`shrink-0 rounded-full ${starred ? "ring-2 ring-accent ring-offset-2 ring-offset-surface" : ""}`}>
          <PlayerAvatar
            nameKo={entry.player.nameKo}
            photoUrl={entry.player.photoUrl}
            teamAbbr={entry.player.teamAbbr}
            size={44}
          />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="text-heading">{entry.player.nameKo}</span>
            {starred && <span className="sr-only">(내 선수)</span>}
            <TeamMark logoUrl={teamLogoUrl(entry.player.teamAbbr)} color={teamColor(entry.player.teamAbbr)} size="sm" />
            {team && <span className="truncate text-caption text-muted">{team}</span>}
          </span>
          <span className={`mt-0.5 block text-body text-pretty ${game && !game.played ? "text-muted" : ""}`}>
            {text}
            {game && game.played && game.result && (
              <span className="text-muted">
                {" · "}
                <ScoreText line={game} />
              </span>
            )}
          </span>
          {move && <span className="mt-0.5 block text-label text-success-fg">{move}</span>}
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          {/* 결장한 경기의 팀 승패는 그 선수 이야기가 아니라 뺀다 */}
          {game && game.played && <ResultPill result={game.result} />}
          {side && <span className="text-caption text-muted tabular-nums">{side}</span>}
        </span>
      </Link>
    </li>
  );
}

/** 맞대결 카드: 같은 경기에서 뛴 두 선수와 점수 */
function DerbyCard({ pair: [a, b] }: { pair: [GameLine, GameLine] }) {
  const [home, away] = a.home ? [a, b] : [b, a];
  return (
    <div className="card mb-3 p-3.5">
      <div className="flex items-baseline justify-between">
        <span className="text-label text-danger-fg">오늘 맞대결</span>
        <span className="text-caption text-muted tabular-nums">{formatTime(a.startTimeKst)} 시작</span>
      </div>
      <div className="mt-2.5 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
        {[away, home].map((line, i) => (
          <Link
            key={line.playerId}
            href={`/players/${line.playerId}`}
            className={`press-soft flex min-w-0 flex-col items-center gap-1 text-center ${i === 1 ? "order-3" : ""}`}
          >
            <PlayerAvatar nameKo={line.nameKo} photoUrl={line.photoUrl} teamAbbr={line.teamAbbr} size={44} />
            <span className="text-heading">{line.nameKo}</span>
            <span className="text-caption text-muted">{formatSummary(line.summary)}</span>
          </Link>
        ))}
        <div className="order-2 text-center">
          <span className="flex items-center justify-center gap-1.5">
            <TeamMark logoUrl={teamLogoUrl(away.teamAbbr)} color={teamColor(away.teamAbbr)} size="sm" />
            <span className="text-score tabular-nums">
              {away.teamScore ?? "-"} : {home.teamScore ?? "-"}
            </span>
            <TeamMark logoUrl={teamLogoUrl(home.teamAbbr)} color={teamColor(home.teamAbbr)} size="sm" />
          </span>
        </div>
      </div>
    </div>
  );
}
