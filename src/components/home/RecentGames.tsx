import type { GameLine, HomeResponse } from "@/lib/api";
import { formatDate, formatScore, formatTime } from "@/lib/format";
import PlayerLink from "@/components/PlayerLink";
import ResultBadge from "@/components/ResultBadge";
import Section from "@/components/Section";
import TeamName from "@/components/TeamName";

type Recent = HomeResponse["recent"];

/** 제목 세 갈래: 최근 24시간 / 마지막 경기일로 대신 / 경기 데이터 없음 */
function recentTitle(recent: Recent): string {
  if (!recent.isFallback) return "최근 24시간";
  if (recent.dateKst) {
    return `최근 24시간 경기가 없습니다 · 마지막 경기일 ${formatDate(recent.dateKst)}`;
  }
  return "아직 경기 데이터가 없습니다";
}

/** 최근 경기: 선수당 한 줄 */
export default function RecentGames({ recent }: { recent: Recent }) {
  const noData = recent.isFallback && !recent.dateKst;

  return (
    <Section title={recentTitle(recent)}>
      {recent.lines.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted">
          {noData ? "경기 기록이 모이면 선수별 최근 경기가 여기에 나옵니다." : "표시할 경기가 없습니다."}
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {recent.lines.map((line) => (
            <GameLineRow key={`${line.playerId}-${line.gameId}`} line={line} />
          ))}
        </ul>
      )}
    </Section>
  );
}

function GameLineRow({ line }: { line: GameLine }) {
  // 경기 전이라 점수가 없으면 "샌프란시스코 vs 콜로라도"
  const score = formatScore(line) ?? "vs";

  return (
    <li className="flex gap-3 px-4 py-2.5">
      <ResultBadge result={line.result} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5">
            <PlayerLink
              playerId={line.playerId}
              nameKo={line.nameKo}
              photoUrl={line.photoUrl}
              teamAbbr={line.teamAbbr}
              className="font-bold"
            />
            {line.role === "PITCHER" && <span className="text-xs text-muted">투수</span>}
            {/* 내 팀 · 점수 · 상대 팀 (팀 로고가 붙는다) */}
            <span className="inline-flex flex-wrap items-center gap-x-1.5 text-xs text-muted tabular-nums">
              <TeamName teamKo={line.teamKo} teamAbbr={line.teamAbbr} />
              {score}
              <TeamName teamKo={line.opponentKo} teamAbbr={line.opponentAbbr} />
              {`· ${line.home ? "홈" : "원정"}`}
            </span>
          </div>
          <span className="shrink-0 text-xs text-muted tabular-nums">
            {formatTime(line.startTimeKst)}
          </span>
        </div>
        <p className={`mt-0.5 text-sm ${line.played ? "" : "text-muted"}`}>{line.summary}</p>
      </div>
    </li>
  );
}
