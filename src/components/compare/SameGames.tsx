import type { SamePair } from "@/lib/api";
import Chevron from "@/components/Chevron";
import PlayerAvatar from "@/components/PlayerAvatar";
import Section from "@/components/Section";
import SheetOpener from "@/components/SheetOpener";
import { SameGamesSheetBody, sameGamesRecord, sameGamesStateKey, sameGamesTitle } from "@/components/SameGamesSheet";

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
