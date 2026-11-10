import type { CSSProperties } from "react";
import Link from "next/link";
import type { GameLine, GameResult, HomeResponse } from "@/lib/api";
import { formatDate, formatLineup, formatSummary, formatTime } from "@/lib/format";
import { teamColor, teamLogoUrl } from "@/lib/teams";
import PlayerAvatar from "@/components/PlayerAvatar";
import ResultPill from "@/components/ResultPill";
import ScoreText from "@/components/ScoreText";
import Section from "@/components/Section";
import TeamMark from "@/components/TeamMark";

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

/** 제목 세 갈래: 최근 24시간 / 마지막 경기일로 대신 / 경기 데이터 없음. note는 요약 알약 앞에 붙는 설명 */
function heading(recent: Recent): { title: string; note: string | null } {
  if (!recent.isFallback) return { title: "최근 24시간", note: null };
  if (recent.dateKst) {
    return { title: `${formatDate(recent.dateKst)} 경기`, note: "최근 24시간 경기가 없습니다" };
  }
  return { title: "아직 경기 데이터가 없습니다", note: null };
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
  const pills = [note, ...tally(recent.lines)].filter((part): part is string => Boolean(part));

  return (
    <Section id="recent-title" title={title} aside={asOf}>
      {pills.length > 0 && (
        <ul className="-mt-0.5 mb-3 flex flex-wrap gap-1.5 px-1">
          {pills.map((part) => (
            <li
              key={part}
              className="rounded-full bg-surface px-2.5 py-0.5 text-[0.8125rem] font-semibold leading-5 text-neutral-pill-fg"
            >
              {part}
            </li>
          ))}
        </ul>
      )}

      {recent.lines.length === 0 ? (
        <p className="card px-4 py-6 text-sm text-muted">
          {noData ? "경기 기록이 모이면 선수별 최근 경기가 여기에 나옵니다." : "표시할 경기가 없습니다."}
        </p>
      ) : (
        <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {recent.lines.map((line, index) => (
            <GameCard key={`${line.playerId}-${line.gameId}`} line={line} index={index} />
          ))}
        </ul>
      )}
    </Section>
  );
}

function GameCard({ line, index }: { line: GameLine; index: number }) {
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
        <TeamSide teamKo={line.teamKo} teamAbbr={line.teamAbbr} />
        <div className="text-center">
          {line.teamScore != null && line.opponentScore != null ? (
            <ScoreText line={line} className="block text-[1.3125rem] font-extrabold leading-tight tracking-[0.02em]" />
          ) : (
            <span className="block text-base font-bold leading-tight text-muted">vs</span>
          )}
          <span className="block whitespace-nowrap text-[0.6875rem] text-muted tabular-nums">{meta}</span>
        </div>
        <TeamSide teamKo={line.opponentKo} teamAbbr={line.opponentAbbr} end />
      </div>

      <div className="mt-3 flex items-start gap-3 px-0.5">
        <PlayerAvatar size={44} nameKo={line.nameKo} photoUrl={line.photoUrl} teamAbbr={line.teamAbbr} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Link
              href={`/players/${line.playerId}`}
              className="text-base font-bold after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none"
            >
              {line.nameKo}
            </Link>
            {/* "투수 · 구원", "선발"처럼 이름 옆 작은 글씨 */}
            {sideNote(line) && <span className="text-xs text-muted">{sideNote(line)}</span>}
            <ResultPill result={line.result} className="ml-auto" />
          </div>
          {/* 한 줄 기록이 이 서비스의 핵심이라 카드 안에서 가장 굵게 둔다. 안 뛰었으면 흐리게 */}
          <p
            className={`mt-0.5 text-[0.9375rem] leading-[1.45] text-pretty ${line.played ? "font-semibold" : "font-medium text-muted"}`}
          >
            {formatSummary(line.summary)}
          </p>
        </div>
      </div>
    </li>
  );
}

/** 점수 띠의 팀 한쪽: 로고 + 이름. end면 오른쪽 끝에 붙고 로고가 이름 뒤에 온다 */
function TeamSide({ teamKo, teamAbbr, end = false }: { teamKo: string; teamAbbr: string | null; end?: boolean }) {
  return (
    <span
      className={`flex min-w-0 items-center gap-1.5 text-[0.8125rem] font-semibold ${end ? "flex-row-reverse text-right" : ""}`}
    >
      <TeamMark logoUrl={teamLogoUrl(teamAbbr)} color={teamColor(teamAbbr)} size="md" />
      <span className="truncate">{teamKo}</span>
    </span>
  );
}
