import type { GameLine } from "@/lib/api";
import { formatDate, formatLineup, formatShortDate, formatSummary, formatTime, formatWeekday } from "@/lib/format";
import ResultPill from "@/components/ResultPill";
import Highlights from "@/components/Highlights";
import ScoreText from "@/components/ScoreText";
import Section from "@/components/Section";
import ShowMore from "@/components/ShowMore";
import TeamName from "@/components/TeamName";

/** 처음에 보여 줄 경기 수(최근부터). 나머지는 '더 보기'로 펼친다 */
const VISIBLE = 10;

/**
 * 경기 기록 (최신 경기부터). 카드 한 장 안에 경기마다 한 줄: 왼쪽 날짜, 오른쪽 상대·점수·결과와 한 줄 기록.
 * 시즌 전체(160경기 넘게)를 한 번에 펼치면 휴대폰에서 아래의 선수 정보·이동 기록이 한참 밀리므로
 * 최근 10경기만 먼저 보여 준다. 나머지 줄도 서버 HTML에는 그대로 있다(숨김 상태).
 */
export default function GameLog({ games }: { games: GameLine[] }) {
  const shown = games.slice(0, VISIBLE);
  const rest = games.slice(VISIBLE);

  return (
    <Section id="games-title" title="경기 기록" aside={`${games.length}경기`}>
      {games.length === 0 ? (
        <p className="card px-4 py-5 text-sm text-muted">경기 기록이 없습니다.</p>
      ) : (
        <div className="card">
          <ul className="divide-y divide-line">
            {shown.map((g) => (
              <GameRow key={g.gameId} game={g} />
            ))}
          </ul>
          {/* 펼치면 나머지 경기가 버튼 위에 붙고, 버튼은 맨 아래에서 '접기'가 된다 */}
          {rest.length > 0 && (
            <ShowMore moreLabel={`${rest.length}경기 더 보기`} buttonClassName="border-t border-line py-2.5">
              {/* 펼쳐도 화면이 끝없이 늘지 않게 일정 높이 안에서 스크롤한다(이동 기록과 같은 방식) */}
              <ul className="max-h-[36rem] divide-y divide-line overflow-y-auto overscroll-contain border-t border-line">
                {rest.map((g) => (
                  <GameRow key={g.gameId} game={g} />
                ))}
              </ul>
            </ShowMore>
          )}
        </div>
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
