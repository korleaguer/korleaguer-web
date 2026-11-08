import type { GameLine } from "@/lib/api";
import { formatDate, formatScore, formatSummary, formatTime } from "@/lib/format";
import ResultStamp from "@/components/ResultStamp";
import Section from "@/components/Section";
import { TableScroll, Td, Th } from "@/components/table";

/** 경기 기록 (최신 경기부터). 좁은 화면은 목록, 넓은 화면은 표로 보여 준다. */
export default function GameLog({ games }: { games: GameLine[] }) {
  return (
    <Section title="경기 기록" aside={`${games.length}경기`}>
      {games.length === 0 ? (
        <p className="px-4 pb-6 pt-2 text-sm text-muted">경기 기록이 없습니다.</p>
      ) : (
        <>
          <GameList games={games} />
          <GameTable games={games} />
        </>
      )}
    </Section>
  );
}

function dateTimeText(game: GameLine): string {
  return `${formatDate(game.startTimeKst)} ${formatTime(game.startTimeKst)}`;
}

function opponentText(game: GameLine): string {
  return `${game.home ? "vs" : "@"} ${game.opponentKo}`;
}

/** 모바일: 한 경기 = 도장 + 두 줄. 점수가 없으면(경기 전) 점수 부분을 뺀다. */
function GameList({ games }: { games: GameLine[] }) {
  return (
    <ul className="divide-y divide-line border-t border-line sm:hidden">
      {games.map((g) => {
        const info = [
          formatTime(g.startTimeKst),
          `${opponentText(g)} (${g.home ? "홈" : "원정"})`,
          formatScore(g),
        ].filter(Boolean);

        return (
          <li key={g.gameId} className="flex gap-3.5 px-4 py-3">
            <ResultStamp result={g.result} gameId={g.gameId} size="md" date={g.startTimeKst} />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted tabular-nums">{info.join(" · ")}</p>
              <p className={`mt-1 text-[0.9375rem] font-medium leading-snug text-balance ${g.played ? "" : "text-muted"}`}>
                {formatSummary(g.summary)}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** 넓은 화면: 날짜 · 상대 · 결과 · 기록 표 */
function GameTable({ games }: { games: GameLine[] }) {
  return (
    <div className="hidden sm:block">
      <TableScroll>
        <thead>
          <tr>
            <Th align="left">날짜</Th>
            <Th align="left">상대</Th>
            <Th align="left">결과</Th>
            <Th align="left">기록</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {games.map((g) => {
            const score = formatScore(g);
            return (
              <tr key={g.gameId}>
                <Td align="left" className="text-muted">
                  {dateTimeText(g)}
                </Td>
                <Td align="left">
                  {opponentText(g)}
                  <span className="ml-1.5 text-xs text-muted">{g.home ? "홈" : "원정"}</span>
                </Td>
                <Td align="left">
                  <span className="inline-flex items-center gap-2">
                    <ResultStamp result={g.result} gameId={g.gameId} />
                    {score && <span className="text-xs text-muted">{score}</span>}
                  </span>
                </Td>
                {/* 기록 문장은 길 수 있어서 줄바꿈을 허용한다 */}
                <Td
                  align="left"
                  className={`w-full whitespace-normal font-medium ${g.played ? "" : "text-muted"}`}
                >
                  {formatSummary(g.summary)}
                </Td>
              </tr>
            );
          })}
        </tbody>
      </TableScroll>
    </div>
  );
}
