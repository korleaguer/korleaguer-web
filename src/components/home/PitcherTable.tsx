import type { PitcherSeason } from "@/lib/api";
import { formatEra } from "@/lib/format";
import { bestOf, isBest } from "@/lib/stats";
import PlayerLink from "@/components/PlayerLink";
import TeamName from "@/components/TeamName";
import { RowHeader, TableScroll, Td, Th } from "@/components/table";

/** 투수 시즌 성적 표. 열마다 가장 좋은 값은 굵게 표시한다. */
export default function PitcherTable({ pitchers }: { pitchers: PitcherSeason[] }) {
  const best = {
    era: bestOf(pitchers, (p) => p.era, "min"),
    strikeouts: bestOf(pitchers, (p) => p.strikeouts, "max"),
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
      <tbody className="divide-y divide-line">
        {pitchers.map((p) => (
          <tr key={p.playerId}>
            <RowHeader>
              <PlayerLink
                playerId={p.playerId}
                nameKo={p.nameKo}
                photoUrl={p.photoUrl}
                teamAbbr={p.teamAbbr}
              />
            </RowHeader>
            <Td align="left" className="text-muted">
              <TeamName teamKo={p.teamKo} teamAbbr={p.teamAbbr} />
            </Td>
            <Td>{p.games}</Td>
            <Td>{p.inningsText}</Td>
            <Td strong={isBest(p.era, best.era)}>{formatEra(p.era)}</Td>
            <Td>{`${p.wins}-${p.losses}-${p.saves}`}</Td>
            <Td strong={isBest(p.strikeouts, best.strikeouts)}>{p.strikeouts}</Td>
          </tr>
        ))}
      </tbody>
    </TableScroll>
  );
}
