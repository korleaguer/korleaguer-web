import type { GameLine, SamePair } from "@/lib/api";
import Chevron from "@/components/Chevron";
import PlayerAvatar from "@/components/PlayerAvatar";
import ResultPill from "@/components/ResultPill";
import Section from "@/components/Section";
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

/**
 * 선수 페이지 '같은 경기에 나온 선수'(사용자 11-22 시안 2B, 이슈 #420). 그 시즌 메이저 경기에서 다른 우리 선수와 같이 나온 경기를
 * 상대마다 한 줄(사진·이름·경기 수·이 선수 팀 전적 ›)로 두고, 누르면 그 짝의 경기 목록 창을 연다(SameGamesSheetBody).
 * 짝이 없는 선수(투수 등)는 칸이 없다. 팀 이름은 제목 오른쪽에 한 번만 쓴다(줄마다 되풀이하지 않는다). 시즌 중 팀을 옮겨
 * 짝마다 팀이 다르면 제목에는 '팀 전적'만 두고 줄에 팀 이름을 붙인다.
 * 휴대폰은 전적을 줄 오른쪽 끝에, 640px 이상은 경기 수 바로 뒤에 붙인다(넓은 줄에서 이름과 전적이 양 끝으로 벌어지지 않게).
 */
export default function SameGames({ season, nameKo, pairs }: { season: number; nameKo: string; pairs: SamePair[] }) {
  if (pairs.length === 0) return null;
  const teams = [...new Set(pairs.map((p) => p.teamKo))];
  const oneTeam = teams.length === 1 && teams[0] != null ? teams[0] : null;
  return (
    <Section id="same-games-title" title="같은 경기에 나온 선수" aside={`${season} · ${oneTeam ?? "팀"} 전적`}>
      <ul className="card divide-y divide-line overflow-hidden">
        {pairs.map((pair) => (
          <li key={pair.other.playerId}>
            <SheetOpener
              stateKey={sameGamesStateKey(pair.other.playerId)}
              sheetTitle={sameGamesTitle(nameKo, pair)}
              className="press-soft flex min-h-14 w-full cursor-pointer flex-wrap items-center gap-x-3 gap-y-0.5 px-4 py-2.5 text-left"
              label={
                <>
                  <PlayerAvatar
                    nameKo={pair.other.nameKo}
                    photoUrl={pair.other.photoUrl}
                    teamAbbr={pair.other.teamAbbr}
                    photoTeamAbbr={pair.other.photoTeamAbbr}
                    size={28}
                  />
                  <span className="min-w-0">
                    <span className="text-heading">{pair.other.nameKo}</span>{" "}
                    <span className="whitespace-nowrap text-meta text-muted tabular-nums">{`${pair.games}경기`}</span>
                  </span>
                  <span className="ml-auto whitespace-nowrap text-meta text-muted tabular-nums sm:-ml-1.5 sm:before:mr-1.5 sm:before:content-['·']">
                    {oneTeam ? `${pair.wins}승 ${pair.losses}패` : sameGamesRecord(pair, nameKo)}
                  </span>
                  <span className="sm:ml-auto">
                    <Chevron small />
                  </span>
                </>
              }
            >
              <SameGamesSheetBody pair={pair} nameKo={nameKo} />
            </SheetOpener>
          </li>
        ))}
      </ul>
    </Section>
  );
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
