import type { GameLine } from "@/lib/api";
import { formatDate, formatLineup, formatShortDate, formatSummary, formatTime, formatWeekday } from "@/lib/format";
import ResultPill from "@/components/ResultPill";
import Highlights from "@/components/Highlights";
import ScoreText from "@/components/ScoreText";
import TeamName from "@/components/TeamName";

/**
 * 경기 한 줄(선수 페이지 경기 기록, 내 선수 카드의 '모두 보기'가 같이 쓴다).
 * 서버에서도, 브라우저에서도(경기 기록 GameLogList) 그린다. 서버 전용 기능을 쓰지 않는다.
 * 마이너 경기면 levelKo('트리플A')를 상대 팀 앞에 작게 붙이고, 상대 로고는 opponentId(팀 번호)로 찾는다.
 * hideVenue면 홈·원정을 쓰지 않는다(마이너 경기에서 모를 때).
 */
export default function GameRow({
  game: g,
  levelKo,
  opponentId,
  hideVenue = false,
}: {
  game: GameLine;
  levelKo?: string;
  opponentId?: number | null;
  hideVenue?: boolean;
}) {
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
          {levelKo && (
            <span className="rounded-md bg-surface-2 px-1.5 py-px text-[0.6875rem] font-bold text-foreground/70">{levelKo}</span>
          )}
          <span>vs</span>
          <TeamName teamKo={g.opponentKo} teamAbbr={g.opponentAbbr} teamId={opponentId} />
          {!hideVenue && <span>{`· ${g.home ? "홈" : "원정"}`}</span>}
          {lineup && <span>{`· ${lineup}`}</span>}
          {/* 경기 전이면 점수 대신 시작 시각. 끝났는데 점수가 없으면(마이너 경기) 둘 다 쓰지 않는다 */}
          {hasScore ? (
            <ScoreText line={g} className="text-sm font-bold text-foreground" />
          ) : g.gameStatus === "final" ? null : (
            <span className="tabular-nums">{`· ${formatTime(g.startTimeKst)}`}</span>
          )}
          <ResultPill result={g.result} className="ml-auto" />
        </div>
        <p
          className={`mt-1 text-[0.9375rem] leading-[1.45] text-pretty ${g.played ? "font-semibold" : "font-medium text-muted"}`}
        >
          {formatSummary(g.summary)}
        </p>
        <Highlights line={g} className="mt-1.5" />
      </div>
    </li>
  );
}
