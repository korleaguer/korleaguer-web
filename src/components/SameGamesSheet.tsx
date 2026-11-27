// 같은 경기 창: 두 선수가 같이 나온 경기 목록(창 몸)과 그 창의 제목·전적 문구. 선수 페이지, 홈 층·맞대결 카드, 이번 주 두 선수, 비교 창이 같이 쓴다.
import type { GameLine, SamePair } from "@/lib/api";
import Chevron from "@/components/Chevron";
import ResultPill from "@/components/ResultPill";
import SheetOpener from "@/components/SheetOpener";
import Words from "@/components/Words";
import { formatShortDate, formatSummary, formatWeekday, kstDayKey } from "@/lib/format";

/** 창을 열며 쌓는 주소 기록 표시. 상대 선수마다 다르다 */
export const sameGamesStateKey = (otherId: number) => `korleaguerSameGames${otherId}`;

/** '샌프란시스코 4승 2패'. 시즌 중 팀을 옮겨 팀 이름이 하나가 아니면 '이정후 팀 4승 2패' */
export function sameGamesRecord(pair: SamePair, nameKo: string): string {
  return `${pair.teamKo ?? `${nameKo} 팀`} ${pair.wins}승 ${pair.losses}패`;
}

/** 창 제목: '이정후 · 김혜성 같은 경기' */
export function sameGamesTitle(nameKo: string, pair: SamePair): string {
  return `${nameKo} · ${pair.other.nameKo} 같은 경기`;
}

/** 점수 '3-1'(이 선수 팀 먼저). 점수를 모르면 null */
function scoreText(line: GameLine): string | null {
  return line.teamScore == null || line.opponentScore == null ? null : `${line.teamScore}-${line.opponentScore}`;
}

/**
 * 한 짝의 같은 경기 목록(창 몸). 맨 위 한 줄 '6경기 · 샌프란시스코 4승 2패', 아래는 경기마다 날짜 | 결과 알약·점수 | 두 사람 한 줄 기록.
 * 결과와 점수는 이 선수(nameKo) 팀 기준이다. 같은 날 두 경기(더블헤더)는 줄마다 '1차전'·'2차전'을 붙인다.
 * 상대 팀 이름은 줄마다 쓰지 않는다(같은 말 두 번 금지: 한 짝의 상대 팀은 대개 하나다).
 */
export function SameGamesSheetBody({ pair, nameKo }: { pair: SamePair; nameKo: string }) {
  const dayCount = new Map<string, number>();
  for (const m of pair.meetings) {
    const day = kstDayKey(m.mine.startTimeKst) ?? "";
    dayCount.set(day, (dayCount.get(day) ?? 0) + 1);
  }
  const seen = new Map<string, number>();
  return (
    <div className="pb-2">
      <p className="text-meta text-muted tabular-nums">{`${pair.games}경기 · ${sameGamesRecord(pair, nameKo)}`}</p>
      <ul className="mt-1 divide-y divide-line">
        {pair.meetings.map(({ mine, other }) => {
          const day = kstDayKey(mine.startTimeKst) ?? "";
          const nth = (seen.get(day) ?? 0) + 1;
          seen.set(day, nth);
          const score = scoreText(mine);
          return (
            <li key={mine.gameId} className="flex gap-3 py-3">
              <p className="w-11 shrink-0 text-center">
                <span className="block text-heading tabular-nums">{formatShortDate(mine.startTimeKst)}</span>
                <span className="block text-caption text-muted">{formatWeekday(mine.startTimeKst)}</span>
              </p>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="flex flex-wrap items-center gap-x-1.5 text-meta text-muted tabular-nums">
                  <ResultPill result={mine.result} />
                  {score}
                  {(dayCount.get(day) ?? 0) > 1 && <span>{`${score ? "· " : ""}${nth}차전`}</span>}
                </p>
                <p className="text-summary">
                  <span className="text-muted">{mine.nameKo} </span>
                  <Words text={formatSummary(mine.summary)} />
                </p>
                <p className="text-summary">
                  <span className="text-muted">{other.nameKo} </span>
                  <Words text={formatSummary(other.summary)} />
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * 카드 맨 아래 '같은 경기 n번 · 샌프란시스코 4승 2패 ›' 줄. 누르면 그 짝의 같은 경기 창을 연다.
 * 홈 맞대결 카드('올해 n번째'), 홈 이번 주 두 선수, 비교 창이 같은 모양으로 쓴다. lead는 줄 앞 글자, stateKey는 창 주소 기록 표시
 */
export function SameGamesLine({ stateKey, nameKo, pair, lead }: { stateKey: string; nameKo: string; pair: SamePair; lead: string }) {
  return (
    <SheetOpener
      stateKey={stateKey}
      sheetTitle={sameGamesTitle(nameKo, pair)}
      className="press-soft flex min-h-11 w-full cursor-pointer items-center justify-between gap-2 px-4 py-2.5 text-left text-button text-accent-ink"
      label={
        <>
          <span>
            {lead}
            <span className="font-normal text-muted">{` · ${sameGamesRecord(pair, nameKo)}`}</span>
          </span>
          <Chevron small />
        </>
      }
    >
      <SameGamesSheetBody pair={pair} nameKo={nameKo} />
    </SheetOpener>
  );
}
