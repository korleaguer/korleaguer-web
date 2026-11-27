import type { GameLine } from "@/lib/api";
import { formatDate, formatLineup, formatShortDate, formatSummary, formatTime, formatWeekday } from "@/lib/format";
import ResultPill from "@/components/ResultPill";
import Highlights from "@/components/Highlights";
import ScoreText from "@/components/ScoreText";
import TeamName from "@/components/TeamName";
import PostseasonLine from "@/components/PostseasonLine";
import Words from "@/components/Words";

/**
 * 경기 한 줄(선수 페이지 경기 기록, 내 선수 카드의 '모두 보기'가 같이 쓴다).
 * 서버에서도, 브라우저에서도(경기 달력 GameCalendar) 그린다. 서버 전용 기능을 쓰지 않는다.
 * 마이너 경기면 levelKo('트리플A')를 상대 팀 앞에 작게 붙이고, 상대 로고는 opponentId(팀 번호)로 찾는다.
 * 포스트시즌 경기면 경기 정보 줄 위에 PostseasonLine.
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
    // 오른쪽 칸이 8rem도 안 남으면(큰 글씨) 날짜를 위 줄로 올려 경기 내용이 줄 폭을 다 쓴다. 옆에 두면 2배에서
    // '2타수 1안타 1볼넷'이 한 단어씩 세 줄로 갈렸다(이슈 #264)
    <li className="flex flex-wrap gap-x-3 gap-y-1 p-3.5">
      {/* 눈에는 "9.27 / 일", 화면 낭독기에는 "9월 27일(일)". 10~12월("10.16", 17px 굵게 약 49px)도 한 줄에 들어가는 너비 */}
      <p className="w-13 shrink-0 text-center">
        <span aria-hidden className="block whitespace-nowrap text-heading tabular-nums">
          {formatShortDate(g.startTimeKst)}
        </span>
        <span aria-hidden className="block text-caption text-muted">
          {formatWeekday(g.startTimeKst)}
        </span>
        <span className="sr-only">{formatDate(g.startTimeKst)}</span>
      </p>
      <div className="min-w-[min(8rem,100%)] flex-1">
        <PostseasonLine game={g} />
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-meta text-muted">
          {levelKo && (
            <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-badge text-foreground/70">{levelKo}</span>
          )}
          <span>vs</span>
          <TeamName teamKo={g.opponentKo} teamAbbr={g.opponentAbbr} teamId={opponentId} />
          {!hideVenue && <span>{`· ${g.home ? "홈" : "원정"}`}</span>}
          {lineup && <span>{`· ${lineup}`}</span>}
          {/* 경기 전이면 점수 대신 시작 시각. 끝났는데 점수가 없으면(마이너 경기) 둘 다 쓰지 않는다 */}
          {hasScore ? (
            <ScoreText line={g} className="text-summary font-bold text-foreground" />
          ) : g.gameStatus === "final" ? null : (
            <span className="tabular-nums">{`· ${formatTime(g.startTimeKst)}`}</span>
          )}
          <ResultPill result={g.result} className="ml-auto" />
        </div>
        <p
          className={`mt-1 text-summary text-pretty ${g.played ? "" : "font-medium text-muted"}`}
        >
          <Words text={formatSummary(g.summary)} />
        </p>
        <Highlights line={g} className="mt-1.5" />
      </div>
    </li>
  );
}
