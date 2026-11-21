import Link from "next/link";
import type { GameBuzz, GameLine, HomeResponse, MyPlayer } from "@/lib/api";
import { getMyPlayers, getPlayers } from "@/lib/api";
import { formatLineup, formatScore, formatSummary, formatTime, kstDayKey, kstPrevDayKey, teamLabel } from "@/lib/format";
import { readMyPlayers } from "@/lib/myPlayers";
import { teamColor, teamLogoUrl } from "@/lib/teams";
import { levelKo, statusBadge } from "@/components/my/formLabels";
import PlayerAvatar from "@/components/PlayerAvatar";
import ResultPill from "@/components/ResultPill";
import { PostseasonLine } from "@/components/player/GameRow";
import ScoreText from "@/components/ScoreText";
import Section from "@/components/Section";
import TeamMark from "@/components/TeamMark";
import RecentGames from "./RecentGames";
import FloorBuzz, { type FloorBuzzItem } from "./FloorBuzz";
import MyPlayersLink from "@/components/home/MyPlayersLink";
import StarIcon from "@/components/my/StarIcon";
import Words from "@/components/Words";

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
  tone: "accent" | "muted" | "danger" | "fa";
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
      // 국내 리그로 돌아간 선수는 상태 배지처럼 회색 점이다(초록은 부상 해제·계약 뜻, 전수조사 L306).
      // '시즌 끝'처럼 지금 해외에서 뛰지 않는 층이라 제목도 같이 흐리게 둔다
      return { key: "KBO", title: "한국 복귀", tone: "muted" };
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

/**
 * 오늘(한국 날짜) 한국 선수끼리 같은 경기에서 뛴 짝(맞대결). 없으면 null.
 * 보여 줄 경기는 7일 안의 마지막 경기라, 날짜를 보지 않으면 며칠 전 맞대결도 '오늘 맞대결'로 맨 위에 떴다
 * (전수조사 L291, 11-16 결정 '맞대결은 그날만'). today를 모르면 오늘인지 말할 수 없어 띄우지 않는다
 */
export function findDerby(players: MyPlayer[], today: string | null): [GameLine, GameLine] | null {
  if (!today) return null;
  const byGame = new Map<number, GameLine[]>();
  for (const entry of players) {
    const last = shownGame(entry);
    if (!last || !last.played || floorOf(entry).key !== "MLB" || kstDayKey(last.startTimeKst) !== today) continue;
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

/** 화제 카드에 두는 줄 수. 많으면 첫 화면이 길어져 우선순위 위에서부터 이만큼만 둔다 */
const FLOOR_BUZZ_MAX = 3;
/** 화제로 치는 시간: 경기가 시작한 지 이만큼 안이다('최근 24시간' 경기 카드와 같은 기준) */
const FLOOR_BUZZ_WINDOW_MS = 24 * 60 * 60 * 1000;
/** 서버 우선순위: 넘은 기록 > 데뷔·시즌 첫 > 연속 기록 > 시즌 최고 경기 */
const BUZZ_RANK: Record<GameBuzz["kind"], number> = { PASSED: 0, FIRST: 1, STREAK: 2, SEASON_BEST: 3 };

/**
 * 층 화면 맨 위 화제 카드에 둘 줄(11-21 B안). 선수마다 최근 24시간 안에 시작한 경기 중 서버가 문구를 준 가장 최근 경기 하나만
 * 줄이 된다(선수당 한 줄). 순서는 내 선수 먼저, 그다음 우선순위, 같으면 명단 순이고 세 줄까지다.
 * 옛 api(buzz 칸 없음)·화제 없는 날은 빈 목록이라 카드가 없다.
 */
export function pickFloorBuzz(
  players: MyPlayer[],
  buzz: GameBuzz[],
  mine: readonly number[],
  generatedAt: string,
): FloorBuzzItem[] {
  const now = Date.parse(generatedAt);
  if (Number.isNaN(now) || buzz.length === 0) return [];
  const rows: { item: FloorBuzzItem; mine: boolean; rank: number; order: number }[] = [];
  players.forEach((entry, order) => {
    // 최신 경기부터 보며 24시간 안에 뛴 경기 중 문구가 있는 첫 경기를 쓴다(마이너 경기 줄이 맨 앞에 와도 메이저 화제를 놓치지 않는다)
    for (const game of entry.games) {
      if (!game.played) continue;
      const started = Date.parse(game.startTimeKst);
      if (Number.isNaN(started) || started > now || now - started > FLOOR_BUZZ_WINDOW_MS) continue;
      const found = buzz.find((b) => b.playerId === entry.player.id && b.gameId === game.gameId);
      if (!found) continue;
      rows.push({
        item: { buzz: found, nameKo: entry.player.nameKo },
        mine: mine.includes(entry.player.id),
        rank: BUZZ_RANK[found.kind] ?? 9,
        order,
      });
      return;
    }
  });
  rows.sort((a, b) => Number(b.mine) - Number(a.mine) || a.rank - b.rank || a.order - b.order);
  return rows.slice(0, FLOOR_BUZZ_MAX).map((r) => r.item);
}

/** "2026-07-07" → "7월 7일". 달과 날 사이는 줄바꿈 없는 공백이라 Words로 그리면 큰 글씨에서도 '7월'/'7일'로 갈리지 않는다 */
function monthDay(date: string): string {
  const [, m, d] = date.split("-");
  return `${Number(m)}월\u00a0${Number(d)}일`;
}

/**
 * 경기 한 줄 앞에 붙는 날짜(전수조사 L425): 오늘(today, 한국 날짜)이면 없음, 하루 전이면 '어제', 그보다 전이면 '7월 15일'.
 * 층은 선수마다 7일 안의 마지막 경기라, 날짜가 없으면 며칠 전 경기도 오늘 경기처럼 읽혔다. 뉴스 탭 날짜 묶기와 같은 오늘·어제 규칙이다
 */
function dayLabel(game: GameLine, today: string | null): string | null {
  const day = kstDayKey(game.startTimeKst);
  if (!day || !today || day === today) return null;
  return day === kstPrevDayKey(today) ? "어제" : monthDay(day);
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

/**
 * 이름 옆 소속: 메이저는 팀, 마이너는 '다저스 산하'. FA·국내 복귀 선수의 팀은 마지막 MLB 팀이라 '전 애틀랜타'처럼
 * '전'을 붙인다(선수 화면·선수 목록과 같은 teamLabel). 그냥 '애틀랜타'면 아직 그 팀 소속처럼 읽혔다(#289에서 남긴 일).
 * 시즌 끝 선수는 아직 그 팀 소속이라 그대로다
 */
function teamText(entry: MyPlayer): string | null {
  const team = entry.player.teamKo;
  if (entry.status?.kind === "MINORS" && team) return `${team} 산하`;
  return teamLabel(entry.player);
}

/**
 * 오른쪽 작은 글씨: 메이저는 선발·교체·구원, 그 밖은 그 상태로 며칠째인지(전수조사 L308). 'n일째'만 쓰던 때는
 * '출장 정지·지명 할당' 층처럼 두 상태가 섞이면 무엇의 날수인지 알 수 없었다.
 * 상태 이름은 둘레가 말하지 않을 때만 보인다(같은 말 두 번 금지, 리뷰 지적). 두 상태가 섞인 층은 '내 선수' 상태 배지 말
 * ('지명 할당(DFA) 5일째'·재활 경기 중이면 '부상자 명단 12일째'), 층 제목이 곧 상태인 층(트리플A 등 마이너·'FA · 팀 찾는 중')과
 * 이름 아래 줄이 이미 '부상자 명단'인 줄은 날수만('12일째'). 층 제목이 말해서 뺀 이름은 낭독에만 붙인다(srPrefix):
 * 링크로 훑는 화면 낭독기는 층 제목을 듣지 못한다.
 * 날수를 모르면 비운다. 마이너 부상자 명단은 오른 날을 믿기 어려워(배지에도 날수가 없다), 국내 복귀·시즌 끝은
 * 이름 아래 '마지막 경기' 줄이 말해서 비운다
 */
function sideText(entry: MyPlayer, game: GameLine | null): { text: string; srPrefix: string | null } | null {
  const status = entry.status;
  if (!status || status.kind === "CALLED_UP" || status.kind === "RETURNED") {
    const lineup = game && game.played ? (formatLineup(game) ?? (game.role === "PITCHER" ? "등판" : null)) : null;
    return lineup ? { text: lineup, srPrefix: null } : null;
  }
  if (status.days == null) return null;
  const days = `${status.days}일째`;
  switch (status.kind) {
    case "MINORS":
      // 층 제목이 단계 이름('트리플A')이다
      return { text: days, srPrefix: levelKo(status.level) };
    case "FA":
      return { text: days, srPrefix: "FA" };
    case "IL":
      // 재활 경기가 없으면 이름 아래 줄이 '부상자 명단'이다(lineOf). 재활 경기 줄이면 이름을 붙인다('부상·재활' 층에는
      // 마이너 부상자 명단도 섞인다)
      return { text: game ? (statusBadge(status)?.text ?? days) : days, srPrefix: null };
    case "SUSPENDED":
    case "DFA":
      return { text: statusBadge(status)?.text ?? days, srPrefix: null };
    default:
      return null;
  }
}

/**
 * 이름 아래 한 줄(7일 안): 메이저로 올라옴은 '콜업 N일째' 배지와 같은 진한 파랑, 부상 복귀는 복귀 초록(DESIGN.md 신호색).
 * 예전에는 둘 다 초록이었다(초록은 부상 해제·계약 뜻, 전수조사 L306).
 * 날짜(since)는 이동 기록의 미국 날짜라 '(미국)'을 붙인다(formatUsDate와 같은 규칙, 사용자 11-17 '추천대로'). 시각이 없어
 * 한국 날짜로 바꿀 근거가 없고, 바로 위 경기 한 줄의 날짜('어제'·'7월 8일')는 한국 날짜라 붙이지 않으면 미국 저녁 경기와
 * 하루 어긋나 보였다(리뷰 지적)
 */
function moveText(entry: MyPlayer): { text: string; color: string } | null {
  const status = entry.status;
  if (!status?.since) return null;
  const day = `${monthDay(status.since)}(미국)`;
  if (status.kind === "CALLED_UP") return { text: `↑\u00a0${day} 메이저로 올라옴`, color: "text-accent-ink" };
  if (status.kind === "RETURNED") return { text: `↑\u00a0${day} 부상에서 돌아옴`, color: "text-success-fg" };
  return null;
}

/*
 * 층 점과 제목 색(전수조사 L306). 층의 뜻은 점이 맡는다: 메이저 채운 파랑, 마이너·한국 복귀·시즌 끝 회색, 위기 빨강, FA 보라.
 * 제목은 파랗게 칠하지 않는다(DESIGN.md One Blue Rule): 메이저도 본문 글자이고, 지금 해외에서 안 뛰는 층은 흐린 글자다
 */
const DOT: Record<Floor["tone"], string> = {
  accent: "bg-accent",
  muted: "bg-muted",
  danger: "bg-danger-fg",
  fa: "bg-fa-fg",
};
// 위기 층('부상·재활'·'출장 정지·지명 할당')은 빨간 점 + 본문 글자다. 빨간 글자는 '좋은 활약' 주황과 거의 같은 색이라
// 빨강은 점에만 쓴다(DESIGN.md 위기 빨강, 사용자 11-17 '추천대로')
const TITLE: Record<Floor["tone"], string> = {
  accent: "text-foreground",
  muted: "text-muted",
  danger: "text-foreground",
  fa: "text-fa-fg",
};

/**
 * 층에 쓰는 선수 목록(/api/players)을 홈이 /api/home을 기다리는 동안 미리 받기 시작한다(전수조사 L309, Next 문서 'Preloading data').
 * 층은 홈 응답 → 선수 목록 → /api/my 차례라, 선수 목록이 늦게 시작하면 그만큼 늦었다. getPlayers는 React cache라
 * 층(과 비시즌 성적표)이 같은 요청을 다시 쓴다. /api/my는 선수 번호가 있어야 해서 차례가 남는다
 */
export function preloadFloors() {
  void getPlayers();
}

interface Props {
  recent: HomeResponse["recent"];
  asOf: string;
}

export default async function SeasonFloors({ recent, asOf }: Props) {
  const [playersResult, mine] = await Promise.all([getPlayers(), readMyPlayers()]);
  // 명단 전원. api가 한 번에 20명까지라 getMyPlayers가 나눠 부른다(전수조사 L426, 예전에는 20명에서 잘라 21번째부터 말없이 빠졌다)
  const ids = playersResult.ok ? playersResult.data.map((p) => p.id) : [];
  const myResult = ids.length > 0 ? await getMyPlayers(ids, 7) : null;
  if (!myResult || !myResult.ok || myResult.data.players.length === 0) {
    return <RecentGames recent={recent} asOf={asOf} />;
  }
  const players = myResult.data.players;
  const floors = buildFloors(players, mine);
  // 입구의 '내 선수 n명'은 /my 머리말과 같은 기준: 쿠키에 남은 없는 선수 id는 뺀다(리뷰 지적, 이슈 #262)
  const myCount = playersResult.ok ? mine.filter((id) => playersResult.data.some((p) => p.id === id)).length : mine.length;
  // '오늘'의 기준일: 지금 시각(new Date)이 아니라 경기 목록을 만든 응답 시각의 한국 날짜다. 캐시된 화면에서도 날짜 말이 목록과 맞는다
  const today = kstDayKey(myResult.data.generatedAt);
  const derby = findDerby(players, today);
  const buzzItems = pickFloorBuzz(players, myResult.data.buzz, mine, myResult.data.generatedAt);

  return (
    <Section id="floors-title" title="지금 어디서 뛰나" aside={asOf}>
      {/* '내 선수'(/my)로 가는 입구(이슈 #262). 내 선수는 층마다 먼저 놓이고 사진 파란 고리와 이름 끝 ★로 보인다 */}
      <div className="-mt-1 mb-2 flex justify-end px-1">
        <MyPlayersLink count={myCount} />
      </div>
      {/* 그날 화제 문구를 모은 카드. 화제가 없으면 카드 자체가 없다(11-21 B안) */}
      {buzzItems.length > 0 && <FloorBuzz items={buzzItems} />}
      {derby && <DerbyCard pair={derby} />}
      {/* 층 순서가 곧 순위라 PC에서도 층은 위에서 아래로 한 줄씩 두고 세로선으로 잇는다. 층 안 선수만 PC에서 두 칸으로
          나눠 한 줄이 화면 끝까지 늘어나지 않게 한다(사용자 11-17 '추천대로', 전수조사 L307). 예전처럼 층을 두 칸에 흘리면
          2위 층(트리플A)이 1위(메이저) 옆, 3위 층이 다음 줄 왼쪽에 놓였다 */}
      <div className="space-y-3">
        {floors.map((floor, index) => (
          // 층은 이름 붙은 영역(section)으로 두지 않는다: 층 수만큼 랜드마크가 늘어 '지금 어디서 뛰나' 하나만 남긴다(전수조사 L304).
          // 층 이름과 사람 수는 제목 하나에 넣어, 제목으로 훑으면 '메이저 3명'으로 읽힌다
          <div key={floor.key} className="relative pl-6">
            {/* 층을 잇는 세로선과 층 점 */}
            {index < floors.length - 1 && (
              <span aria-hidden className="absolute top-2.5 bottom-[-0.75rem] left-[0.4375rem] w-0.5 bg-line" />
            )}
            <span
              aria-hidden
              className={`absolute top-1 left-0 size-4 rounded-full border-4 border-background ${DOT[floor.tone]}`}
            />
            {/* PC는 층이 화면 폭 전체라 'n명'을 오른쪽 끝 대신 제목 바로 옆에 둔다(제목과 1,000px 가까이 떨어지지 않게) */}
            <h3 className="mb-1.5 flex items-baseline justify-between px-0.5 text-label lg:justify-start lg:gap-x-2">
              <span className={TITLE[floor.tone]}>{floor.title}</span>{" "}
              <span className="text-caption text-muted tabular-nums">{floor.players.length}명</span>
            </h3>
            {/* PC 두 칸: 휴대폰의 줄 사이 선(divide-y)을 끄고, 줄마다 둘째 줄부터 위 선·왼쪽 칸에 세로 선을 긋는다(FloorRow) */}
            <ul className="card divide-y divide-line overflow-hidden lg:grid lg:grid-cols-2 lg:divide-y-0">
              {floor.players.map((entry) => (
                <FloorRow key={entry.player.id} entry={entry} starred={mine.includes(entry.player.id)} today={today} />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Section>
  );
}

function FloorRow({ entry, starred, today }: { entry: MyPlayer; starred: boolean; today: string | null }) {
  const { text, game } = lineOf(entry);
  const day = game ? dayLabel(game, today) : null;
  const side = sideText(entry, game);
  const move = moveText(entry);
  const team = teamText(entry);
  return (
    // 큰 글씨로 줄이 18rem보다 좁아지면 오른쪽 칸(결과 알약·상태 날수)을 기록 아래 줄로 내린다. 이름·기록 칸이
    // 한두 글자 폭으로 찌그러져 이름이 오른쪽 칸 위로 넘치지 않게(rem 조건이라 글자 배율을 따라간다, #269와 같은 방식).
    // 보통 크기는 360px 휴대폰에서도 19.5rem이라 그대로다.
    // PC 두 칸(lg): 셋째 칸부터 위 선, 오른쪽 이웃이 있는 왼쪽 칸에 세로 선. 같은 줄 두 칸은 높이가 같아지고 링크가 칸을 채운다
    <li className="@container lg:border-line lg:nth-[n+3]:border-t lg:odd:not-last:border-r">
      <Link
        href={`/players/${entry.player.id}`}
        className="press-soft flex min-h-16 items-center gap-3 px-3.5 py-2.5 @max-[18rem]:flex-wrap @max-[18rem]:gap-y-1.5 lg:h-full"
      >
        <span className={`shrink-0 rounded-full ${starred ? "ring-2 ring-accent ring-offset-2 ring-offset-surface" : ""}`}>
          <PlayerAvatar
            nameKo={entry.player.nameKo}
            photoUrl={entry.player.photoUrl}
            teamAbbr={entry.player.teamAbbr}
            size={44}
          />
        </span>
        <span className="min-w-0 flex-1">
          {/* 큰 글씨로 이름 줄이 넘치면 로고·팀을 다음 줄로 내린다. 팀은 남은 폭만 차지해서(flex-1) 보통 크기에서는
              지금처럼 한 줄에서 '…'로 줄어든다 */}
          <span className="flex flex-wrap items-center gap-x-1.5">
            <span className="text-heading">{entry.player.nameKo}</span>
            {/* 내 선수: 사진의 파란 고리에 더해 이름 끝에 작은 ★(별 버튼·뉴스 선수 고르기와 같은 기호, 사용자 11-17
                '추천대로', 전수조사 L305). 고리만으로는 무슨 뜻인지 알 수 없었다. ★는 그림이라 낭독은 '(내 선수)' 한 번 */}
            {starred && <StarIcon filled className="-ml-0.5 size-3.5 shrink-0 text-accent-ink" />}
            {starred && <span className="sr-only">(내 선수)</span>}
            <TeamMark logoUrl={teamLogoUrl(entry.player.teamAbbr)} color={teamColor(entry.player.teamAbbr)} size="sm" />
            {team && <span className="min-w-0 flex-1 truncate text-caption text-muted">{team}</span>}
          </span>
          {/* 포스트시즌 경기면 이름 아래 기록 위에 '포스트시즌' 한 줄(선수 화면 경기 줄과 같은 부품, 이슈 #309) */}
          {game && <PostseasonLine game={game} />}
          {/* 경기 한 줄 기록은 카드에서 가장 굵은 본문(Summary 600, 안 뛰었으면 500 + 흐림, DESIGN.md·전수조사 L307).
              '부상자 명단'·'마지막 경기 …' 같은 상태 줄은 기록이 아니라 보통 본문 글자로 둔다 */}
          <span
            className={`mt-0.5 block text-pretty ${game ? `text-summary ${game.played ? "" : "font-medium text-muted"}` : "text-body"}`}
          >
            {/* 오늘 경기가 아니면 앞에 흐린 날짜('어제 ·'·'7월 15일 ·'). 날짜와 점은 한 덩어리로 줄을 바꾼다 */}
            {day && (
              <span className="text-muted">
                <Words text={`${day}\u00a0·`} />{" "}
              </span>
            )}
            <Words text={text} />
            {/* 마이너·재활 경기는 점수를 몰라(결과 알약만 있다) 점까지 뺀다. 예전에는 '4타수 2안타 · '처럼 점만 남았다.
                점수가 있는지는 ScoreText와 같은 formatScore로 본다 */}
            {game && game.played && game.result && formatScore(game) != null && (
              <span className="text-muted">
                {" · "}
                <ScoreText line={game} />
              </span>
            )}
          </span>
          {move && (
            <span className={`mt-0.5 block text-label ${move.color}`}>
              <Words text={move.text} />
            </span>
          )}
        </span>
        {/* 상태 말이 길면('지명 할당(DFA) 12일째') 6.5rem 안에서 낱말 단위로 줄을 바꾼다. 아래 줄로 내려가면 기록 칸과
            왼쪽을 맞추고(사진 44px + 간격), 비었으면 그 줄을 만들지 않는다 */}
        <span className="flex max-w-[6.5rem] shrink-0 flex-col items-end gap-1 text-right @max-[18rem]:max-w-none @max-[18rem]:basis-full @max-[18rem]:flex-row @max-[18rem]:items-center @max-[18rem]:gap-2 @max-[18rem]:pl-[calc(44px+0.75rem)] @max-[18rem]:text-left @max-[18rem]:empty:hidden">
          {/* 결장한 경기의 팀 승패는 그 선수 이야기가 아니라 뺀다 */}
          {game && game.played && <ResultPill result={game.result} />}
          {side && (
            <span className="text-caption text-muted tabular-nums">
              {side.srPrefix && <span className="sr-only">{`${side.srPrefix} `}</span>}
              <Words text={side.text} />
            </span>
          )}
        </span>
      </Link>
    </li>
  );
}

/** 맞대결 점수 낭독: '샌디에이고 3, 다저스 2'(화면처럼 원정 먼저). 점수를 모르면 '샌디에이고 대 다저스' */
function derbyScoreLabel(away: GameLine, home: GameLine): string {
  if (away.teamScore == null || home.teamScore == null) return `${away.teamKo} 대 ${home.teamKo}`;
  return `${away.teamKo} ${away.teamScore}, ${home.teamKo} ${home.teamScore}`;
}

/** 맞대결 카드: 같은 경기에서 뛴 두 선수와 점수 */
function DerbyCard({ pair: [a, b] }: { pair: [GameLine, GameLine] }) {
  const [home, away] = a.home ? [a, b] : [b, a];
  return (
    <div className="card mb-3 p-3.5">
      <div className="flex items-baseline justify-between">
        {/* 빨강은 위기(부상·DFA) 뜻이라 쓰지 않고 본문 글자를 한 단계 굵게(700) 둔다('오늘 새 기사'처럼, 전수조사 L306) */}
        <span className="text-label font-bold">오늘 맞대결</span>
        <span className="text-caption text-muted tabular-nums">{formatTime(a.startTimeKst)} 시작</span>
      </div>
      {/* 문서 순서도 화면과 같은 원정 선수 → 점수 → 홈 선수다. 예전에는 grid order로 점수만 가운데로 옮겨서, 화면 낭독기가
          두 선수를 다 읽은 뒤 팀 이름 없는 '3 : 2'를 읽었다(전수조사 L303) */}
      <div className="mt-2.5 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
        <DerbyPlayer line={away} />
        <div className="text-center">
          <span aria-hidden className="flex items-center justify-center gap-1.5">
            <TeamMark logoUrl={teamLogoUrl(away.teamAbbr)} color={teamColor(away.teamAbbr)} size="sm" />
            <span className="text-score tabular-nums">
              {away.teamScore ?? "-"} : {home.teamScore ?? "-"}
            </span>
            <TeamMark logoUrl={teamLogoUrl(home.teamAbbr)} color={teamColor(home.teamAbbr)} size="sm" />
          </span>
          {/* 로고는 그림이라 낭독에는 팀 이름을 붙인다 */}
          <span className="sr-only">{derbyScoreLabel(away, home)}</span>
        </div>
        <DerbyPlayer line={home} />
      </div>
    </div>
  );
}

function DerbyPlayer({ line }: { line: GameLine }) {
  return (
    <Link
      href={`/players/${line.playerId}`}
      className="press-soft flex min-w-0 flex-col items-center gap-1 text-center"
    >
      <PlayerAvatar nameKo={line.nameKo} photoUrl={line.photoUrl} teamAbbr={line.teamAbbr} size={44} />
      <span className="text-heading">{line.nameKo}</span>
      <span className="text-caption text-muted">
        <Words text={formatSummary(line.summary)} />
      </span>
    </Link>
  );
}
