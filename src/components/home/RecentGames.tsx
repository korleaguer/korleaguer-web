import { Fragment } from "react";
import type { GameLine, GameResult, HomeResponse } from "@/lib/api";
import { formatDate, formatScore, formatSummary, formatTime } from "@/lib/format";
import PlayerLink from "@/components/PlayerLink";
import ResultStamp from "@/components/ResultStamp";
import TeamName from "@/components/TeamName";

type Recent = HomeResponse["recent"];

interface Props {
  recent: Recent;
  /** 제목 오른쪽 작은 글씨. 예: "2026 시즌 · 기준 11월 8일(일) 19:06" */
  meta: string;
  className?: string;
}

/** 제목 세 갈래: 최근 24시간 / 마지막 경기일로 대신 / 경기 데이터 없음. note는 제목 아래 설명 */
function heading(recent: Recent): { title: string; note: string | null } {
  if (!recent.isFallback) return { title: "최근 24시간", note: null };
  if (recent.dateKst) {
    return { title: `마지막 경기일 ${formatDate(recent.dateKst)}`, note: "최근 24시간 경기가 없습니다" };
  }
  return { title: "아직 경기 데이터가 없습니다", note: null };
}

/** "6명 중 5명 출전 · 팀 결과 3승 3패". 결과가 난 경기가 없으면 출전 수만, 줄이 없으면 null */
function tally(lines: GameLine[]): string | null {
  if (lines.length === 0) return null;
  const played = lines.filter((line) => line.played).length;
  const count = (result: GameResult) => lines.filter((line) => line.result === result).length;
  const [wins, losses, ties] = [count("W"), count("L"), count("T")];
  const results =
    wins + losses + ties > 0 ? ` · 팀 결과 ${wins}승 ${losses}패${ties > 0 ? ` ${ties}무` : ""}` : "";
  return `${lines.length}명 중 ${played}명 출전${results}`;
}

/**
 * 최근 경기: 선수당 한 줄. 왼쪽 끝 결과 도장이 위에서부터 차례로 찍힌다.
 * 넓은 화면에서는 부모 격자의 두 줄(제목 줄, 목록 줄)을 그대로 이어 쓴다(subgrid). 순위판이 목록 위 끝에 맞춰진다.
 */
export default function RecentGames({ recent, meta, className = "" }: Props) {
  const { title, note } = heading(recent);
  const noData = recent.isFallback && !recent.dateKst;
  // 줄이 바뀌어도 "팀 결과 3승 3패" 같은 덩어리는 쪼개지지 않게 덩어리마다 span으로 감싼다.
  const subline = [note, ...(tally(recent.lines)?.split(" · ") ?? [])].filter(
    (part): part is string => Boolean(part),
  );

  return (
    <section
      aria-labelledby="recent-title"
      className={`min-w-0 space-y-3 lg:grid lg:grid-rows-subgrid lg:space-y-0 ${className}`}
    >
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <h2 id="recent-title" className="font-display text-[1.75rem] font-bold leading-tight sm:text-3xl">
            {title}
          </h2>
          {subline.length > 0 && (
            <p className="mt-1 text-sm font-medium text-muted">
              {/* 구분점 " · "는 span 밖에 둬야 그 자리에서 줄이 바뀔 수 있다 */}
              {subline.map((part, i) => (
                <Fragment key={part}>
                  {i > 0 && " · "}
                  <span className="whitespace-nowrap">{part}</span>
                </Fragment>
              ))}
            </p>
          )}
        </div>
        <p className="text-xs text-muted tabular-nums">{meta}</p>
      </div>

      {recent.lines.length === 0 ? (
        <p className="rounded-[10px] bg-surface px-4 py-6 text-sm text-muted">
          {noData ? "경기 기록이 모이면 선수별 최근 경기가 여기에 나옵니다." : "표시할 경기가 없습니다."}
        </p>
      ) : (
        <ul className="divide-y divide-line self-start overflow-hidden rounded-[10px] bg-surface">
          {recent.lines.map((line, index) => (
            <GameLineRow key={`${line.playerId}-${line.gameId}`} line={line} index={index} />
          ))}
        </ul>
      )}
    </section>
  );
}

function GameLineRow({ line, index }: { line: GameLine; index: number }) {
  // 경기 전이라 점수가 없으면 "샌프란시스코 vs 콜로라도"
  const score = formatScore(line) ?? "vs";

  return (
    <li className="flex gap-3.5 px-4 py-3.5">
      <ResultStamp
        result={line.result}
        gameId={line.gameId}
        size="md"
        date={line.startTimeKst}
        pressIndex={index}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <PlayerLink
            playerId={line.playerId}
            nameKo={line.nameKo}
            photoUrl={line.photoUrl}
            teamAbbr={line.teamAbbr}
            className="text-sm font-semibold"
          />
          {line.role === "PITCHER" && <span className="text-xs text-muted">투수</span>}
          <span className="ml-auto shrink-0 text-xs text-muted tabular-nums">
            {formatTime(line.startTimeKst)}
          </span>
        </div>
        {/* 한 줄 기록이 이 서비스의 핵심이라 이름 바로 아래에, 줄 안에서 가장 크고 굵게 둔다 */}
        <p
          className={`mt-1.5 text-[1.0625rem] font-semibold leading-snug text-balance sm:text-lg ${line.played ? "" : "text-muted"}`}
        >
          {formatSummary(line.summary)}
        </p>
        {/* 내 팀 · 점수 · 상대 팀 (팀 로고가 붙는다) */}
        <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted tabular-nums">
          <TeamName teamKo={line.teamKo} teamAbbr={line.teamAbbr} />
          {score}
          <TeamName teamKo={line.opponentKo} teamAbbr={line.opponentAbbr} />
          {`· ${line.home ? "홈" : "원정"}`}
        </p>
      </div>
    </li>
  );
}
