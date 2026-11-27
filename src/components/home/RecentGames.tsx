import type { CSSProperties } from "react";
import Link from "next/link";
import type { GameBuzz, GameLine, GameResult, HomeResponse } from "@/lib/api";
import { formatDate, formatLineup, formatSummary, formatTime } from "@/lib/format";
import { teamColor, teamLogoUrl } from "@/lib/teams";
import PlayerAvatar from "@/components/PlayerAvatar";
import ResultPill from "@/components/ResultPill";
import Highlights, { gameHighlights } from "@/components/Highlights";
import BuzzLine from "@/components/home/BuzzLine";
import PostseasonLine from "@/components/PostseasonLine";
import ScoreText from "@/components/ScoreText";
import Section from "@/components/Section";
import TeamMark from "@/components/TeamMark";
import Words from "@/components/Words";

type Recent = HomeResponse["recent"];

interface Props {
  recent: Recent;
  /** 제목 오른쪽 작은 글씨. 예: "기준 11월 8일(일) 19:06" */
  asOf: string;
}

/** 경기 상태 → 점수 아래 작은 글씨. 모르는 상태는 비운다 */
const STATUS: Record<string, string> = {
  final: "종료",
  in_progress: "경기 중",
  scheduled: "경기 전",
};

/** 제목 세 갈래: 최근 24시간 / 마지막 경기일로 대신 / 경기 데이터 없음. note는 요약 글자 앞에 붙는 설명 */
function heading(recent: Recent): { title: string; note: string | null } {
  if (!recent.isFallback) return { title: "최근 24시간", note: null };
  if (recent.dateKst) {
    return { title: `${formatDate(recent.dateKst)} 경기`, note: "최근 24시간 경기가 없어요" };
  }
  return { title: "아직 경기 기록이 없어요", note: null };
}

/** ["6명 중 5명 출전", "팀 결과 3승 3패"]. 결과가 난 경기가 없으면 출전 수만, 줄이 없으면 빈 배열 */
function tally(lines: GameLine[]): string[] {
  if (lines.length === 0) return [];
  const played = lines.filter((line) => line.played).length;
  const count = (result: GameResult) => lines.filter((line) => line.result === result).length;
  const [wins, losses, ties] = [count("W"), count("L"), count("T")];
  const parts = [`${lines.length}명 중 ${played}명 출전`];
  if (wins + losses + ties > 0) parts.push(`팀 결과 ${wins}승 ${losses}패${ties > 0 ? ` ${ties}무` : ""}`);
  return parts;
}

/** 이름 옆 작은 글씨: 투수면 "투수", 선발·교체를 알면 덧붙인다. 둘 다 없으면 null */
function sideNote(line: GameLine): string | null {
  const parts = [line.role === "PITCHER" ? "투수" : null, formatLineup(line)].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}

/** 최근 경기: 선수당 카드 한 장. 위는 팀 대 팀 점수 띠, 아래는 선수와 한 줄 기록. */
export default function RecentGames({ recent, asOf }: Props) {
  const { title, note } = heading(recent);
  const noData = recent.isFallback && !recent.dateKst;
  const summary = [note, ...tally(recent.lines)].filter((part): part is string => Boolean(part));

  return (
    <Section id="recent-title" title={title} aside={asOf}>
      {/* 못 누르는 개수·결과라 알약 대신 흐린 '·' 이은 글자 한 줄(11-21 결정) */}
      {summary.length > 0 && (
        <p className="-mt-0.5 mb-3 px-1 text-label text-muted tabular-nums">
          {/* 줄이 바뀌어도 '팀 결과 3승 3패' 한가운데에서 끊기지 않게 덩어리마다 묶는다 */}
          {summary.map((part, i) => (
            <span key={part}>
              {i > 0 && " · "}
              <span className="whitespace-nowrap">{part}</span>
            </span>
          ))}
        </p>
      )}

      {recent.lines.length === 0 ? (
        <p className="card px-4 py-6 text-body text-muted">
          {noData ? "경기 기록이 모이면 선수별 최근 경기가 여기에 나와요." : "보여 줄 경기가 없어요."}
        </p>
      ) : (
        <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {cards(recent).map(({ line, buzz, slot }, index) => (
            <GameCard
              key={`${line.playerId}-${line.gameId}`}
              line={line}
              index={index}
              buzz={buzz}
              celebrateSlot={slot}
            />
          ))}
        </ul>
      )}
    </Section>
  );
}

/** 이 줄의 화제 문구(없으면 null). 옛 api는 buzz 칸이 없어 늘 null이다 */
function buzzOf(buzz: GameBuzz[] | undefined, line: GameLine): GameBuzz | null {
  return buzz?.find((b) => b.playerId === line.playerId && b.gameId === line.gameId) ?? null;
}

/**
 * 카드마다 화제 문구와 축하 자리(slot)를 정한다. 축하는 '최근 24시간'일 때만 돌고, 가장 큰 표시가 있는 카드끼리 순서를 센다
 * (화제 문구가 있거나 채운 주황 배지가 있는 카드). 가장 큰 표시가 없는 카드가 앞에 있어도 첫 3장 제한을 쓰지 않는다. 없으면 -1.
 */
function cards(recent: Recent): { line: GameLine; buzz: GameBuzz | null; slot: number }[] {
  let next = 0;
  return recent.lines.map((line) => {
    const buzz = line.played ? buzzOf(recent.buzz, line) : null;
    const hasBig = buzz !== null || gameHighlights(line).some((h) => h.strong);
    return { line, buzz, slot: !recent.isFallback && hasBig ? next++ : -1 };
  });
}

/**
 * 카드 하나. buzz가 있으면 한 줄 기록 아래에 화제 문구 한 줄이 서고, 같은 뜻의 활약 배지는 빠지며 배지는 한 개까지다
 * (주황 표시는 문구 + 배지 합쳐 카드당 둘까지, The Hot Is Earned Rule).
 * celebrateSlot이 0 이상이면(홈 '최근 24시간'에서 가장 큰 표시가 있는 카드) 그 표시 하나가 처음 보일 때 한 번 커졌다 돌아온다:
 * 화제 문구가 있으면 문구 줄, 없으면 채운 주황 배지. slot은 그런 카드 사이의 순서다.
 */
function GameCard({
  line,
  index,
  buzz,
  celebrateSlot,
}: {
  line: GameLine;
  index: number;
  buzz: GameBuzz | null;
  celebrateSlot: number;
}) {
  const celebration = celebrateSlot >= 0 ? { id: `${line.playerId}-${line.gameId}`, order: celebrateSlot } : undefined;
  // "종료 · 홈 · 05:05". 모르는 상태는 뺀다.
  const meta = [STATUS[line.gameStatus], line.home ? "홈" : "원정", formatTime(line.startTimeKst)]
    .filter(Boolean)
    .join(" · ");

  return (
    // 이름 링크를 카드 전체로 넓혀서(after:absolute) 카드 어디를 눌러도 선수 페이지로 간다. 화면 낭독기는 이름만 읽는다.
    // --i: 처음 그릴 때 위에서부터 차례로 떠오르는 순서
    <li
      className="card card-link card-rise relative p-3 has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-accent"
      style={{ "--i": index } as CSSProperties}
    >
      {/* 점수 띠: 우리 팀 | 점수 + 상태 | 상대 팀 */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 rounded-xl bg-surface-2 px-3 py-2.5">
        <TeamSide teamKo={line.teamKo ?? ""} teamAbbr={line.teamAbbr} />
        <div className="text-center">
          {line.teamScore != null && line.opponentScore != null ? (
            <ScoreText line={line} className="block text-score" />
          ) : (
            <span className="block text-heading text-muted">vs</span>
          )}
          <span className="block whitespace-nowrap text-micro text-muted tabular-nums">{meta}</span>
        </div>
        <TeamSide teamKo={line.opponentKo ?? ""} teamAbbr={line.opponentAbbr} end />
      </div>

      <div className="mt-3 flex items-start gap-3 px-0.5">
        <PlayerAvatar size={44} nameKo={line.nameKo} photoUrl={line.photoUrl} teamAbbr={line.teamAbbr} photoTeamAbbr={line.photoTeamAbbr} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Link
              href={`/players/${line.playerId}`}
              className="text-heading after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none"
            >
              {line.nameKo}
            </Link>
            {/* "투수 · 구원", "선발"처럼 이름 옆 작은 글씨 */}
            {sideNote(line) && <span className="text-caption text-muted">{sideNote(line)}</span>}
            <ResultPill result={line.result} className="ml-auto" />
          </div>
          {/* 포스트시즌 경기면 선수 화면 경기 줄과 같은 '포스트시즌' 한 줄(이슈 #309) */}
          <PostseasonLine game={line} />
          {/* 한 줄 기록이 이 서비스의 핵심이라 카드 안에서 가장 굵게 둔다. 안 뛰었으면 흐리게 */}
          <p
            className={`mt-0.5 text-summary text-pretty ${line.played ? "" : "font-medium text-muted"}`}
          >
            <Words text={formatSummary(line.summary)} />
          </p>
          {buzz && <BuzzLine text={buzz.text} className="mt-1.5" celebrate={celebration} />}
          <Highlights
            line={line}
            className="mt-1.5"
            cover={buzz?.stat}
            max={buzz ? 1 : undefined}
            celebrate={buzz ? undefined : celebration}
          />
        </div>
      </div>
    </li>
  );
}

/** 점수 띠의 팀 한쪽: 로고 + 이름. end면 오른쪽 끝에 붙고 로고가 이름 뒤에 온다 */
function TeamSide({ teamKo, teamAbbr, end = false }: { teamKo: string; teamAbbr: string | null; end?: boolean }) {
  return (
    <span
      className={`flex min-w-0 items-center gap-1.5 text-label ${end ? "flex-row-reverse text-right" : ""}`}
    >
      <TeamMark logoUrl={teamLogoUrl(teamAbbr)} color={teamColor(teamAbbr)} size="md" ringTeam={teamAbbr} />
      <span className="truncate">{teamKo}</span>
    </span>
  );
}
