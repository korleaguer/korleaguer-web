import type { PitcherSeason, RankingMinimums } from "@/lib/api";
import { formatEra } from "@/lib/format";
import { bestOf, isBest, rankedPitcher, splitByMinors } from "@/lib/stats";
import PlayerLink from "@/components/PlayerLink";
import TeamName from "@/components/TeamName";
import { RowHeader, TableScroll, Td, Th } from "@/components/table";
import { MinorGamesNote, MinorsGroupHeader } from "./MinorsGroup";

const COLUMNS = 7;

/**
 * 투수 시즌 성적 표. 열마다 가장 좋은 값은 굵게 표시한다. 평균자책점은 순위 기준(최소 이닝)을 채운 투수 중에서만.
 * 올해 주로 마이너에서 던진 투수는 아래에 따로 묶고, 1위 비교에서 뺀다.
 */
export default function PitcherTable({ pitchers, ranking }: { pitchers: PitcherSeason[]; ranking: RankingMinimums | null }) {
  const ranked = rankedPitcher(ranking);
  const { majors, minors } = splitByMinors(pitchers);
  const best = {
    era: bestOf(majors, (p) => p.era, "min", ranked),
    strikeouts: bestOf(majors, (p) => p.strikeouts, "max"),
  };

  const row = (p: PitcherSeason) => {
    // 주로 마이너인 투수는 메이저 투수와 1위를 겨루지 않는다
    const compared = !p.mainlyMinors;
    return (
      <tr key={p.playerId}>
        <RowHeader>
          <PlayerLink playerId={p.playerId} nameKo={p.nameKo} photoUrl={p.photoUrl} teamAbbr={p.teamAbbr} />
          {p.mainlyMinors && <MinorGamesNote games={p.minorGames} />}
        </RowHeader>
        <Td align="left" className="text-muted">
          <TeamName teamKo={p.teamKo} teamAbbr={p.teamAbbr} />
        </Td>
        <Td>{p.games}</Td>
        <Td>{p.inningsText}</Td>
        <Td strong={compared && ranked(p) && isBest(p.era, best.era)}>{formatEra(p.era)}</Td>
        <Td>{`${p.wins}-${p.losses}-${p.saves}`}</Td>
        <Td strong={compared && isBest(p.strikeouts, best.strikeouts)}>{p.strikeouts}</Td>
      </tr>
    );
  };

  return (
    <TableScroll>
      <thead>
        <tr>
          <Th align="left" sticky>이름</Th>
          <Th align="left">팀</Th>
          <Th>경기</Th>
          <Th>이닝</Th>
          <Th>평균자책점</Th>
          <Th>승-패-세</Th>
          <Th>탈삼진</Th>
        </tr>
      </thead>
      {majors.length > 0 && <tbody className="divide-y divide-line">{majors.map(row)}</tbody>}
      {minors.length > 0 && (
        <tbody className="divide-y divide-line">
          <MinorsGroupHeader colSpan={COLUMNS} />
          {minors.map(row)}
        </tbody>
      )}
    </TableScroll>
  );
}
