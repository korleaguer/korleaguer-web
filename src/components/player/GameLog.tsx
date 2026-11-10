import type { GameLine } from "@/lib/api";
import { formatDate, formatLineup, formatShortDate, formatSummary, formatTime, formatWeekday } from "@/lib/format";
import ResultPill from "@/components/ResultPill";
import ScoreText from "@/components/ScoreText";
import Section from "@/components/Section";
import TeamName from "@/components/TeamName";

/** 경기 기록 (최신 경기부터). 카드 한 장 안에 경기마다 한 줄: 왼쪽 날짜, 오른쪽 상대·점수·결과와 한 줄 기록 */
export default function GameLog({ games }: { games: GameLine[] }) {
  return (
    <Section id="games-title" title="경기 기록" aside={`${games.length}경기`}>
      {games.length === 0 ? (
        <p className="card px-4 py-5 text-sm text-muted">경기 기록이 없습니다.</p>
      ) : (
        <ul className="card divide-y divide-line">
          {games.map((g) => (
            <GameRow key={g.gameId} game={g} />
          ))}
        </ul>
      )}
    </Section>
  );
}

/** 경기 한 줄(선수 페이지 경기 기록, 내 선수 카드의 '모두 보기'가 같이 쓴다) */
export function GameRow({ game: g }: { game: GameLine }) {
  const hasScore = g.teamScore != null && g.opponentScore != null;
  const lineup = formatLineup(g);

  return (
    <li className="flex gap-3 p-3.5">
      {/* 눈에는 "9.27 / 일", 화면 낭독기에는 "9월 27일(일)". 10~12월("10.16")도 한 줄에 들어가는 너비 */}
      <p className="w-12 shrink-0 text-center">
        <span aria-hidden className="block whitespace-nowrap text-base font-bold leading-snug tabular-nums">
          {formatShortDate(g.startTimeKst)}
        </span>
        <span aria-hidden className="block text-xs text-muted">
          {formatWeekday(g.startTimeKst)}
        </span>
        <span className="sr-only">{formatDate(g.startTimeKst)}</span>
      </p>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[0.8125rem] text-muted">
          <span>vs</span>
          <TeamName teamKo={g.opponentKo} teamAbbr={g.opponentAbbr} />
          <span>{`· ${g.home ? "홈" : "원정"}`}</span>
          {lineup && <span>{`· ${lineup}`}</span>}
          {/* 경기 전이면 점수 대신 시작 시각 */}
          {hasScore ? (
            <ScoreText line={g} className="text-sm font-bold text-foreground" />
          ) : (
            <span className="tabular-nums">{`· ${formatTime(g.startTimeKst)}`}</span>
          )}
          <ResultPill result={g.result} className="ml-auto" />
        </div>
        <p
          className={`mt-1 text-[0.9375rem] leading-[1.45] text-pretty ${g.played ? "font-semibold" : "font-medium text-muted"}`}
        >
          {formatSummary(g.summary)}
        </p>
      </div>
    </li>
  );
}
