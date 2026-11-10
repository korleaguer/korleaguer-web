import type { PitcherSeason, RankingMinimums } from "@/lib/api";
import { formatEra } from "@/lib/format";
import { bestOf, isBest, rankedPitcher } from "@/lib/stats";
import PlayerLink from "@/components/PlayerLink";
import TeamName from "@/components/TeamName";
import { RowHeader, TableScroll, Td, Th } from "@/components/table";
import LevelPill from "./LevelPill";

/**
 * 투수 시즌 성적 표. 메이저 표는 열마다 가장 좋은 값을 굵게 표시한다(평균자책점은 순위 기준(최소 이닝)을 채운 투수 중에서만).
 * 마이너 표(minors)는 단계가 섞여 1위를 표시하지 않고, 팀 옆에 단계를 붙인다(이슈 #39).
 */
export default function PitcherTable({
  pitchers,
  ranking,
  minors = false,
}: {
  pitchers: PitcherSeason[];
  ranking: RankingMinimums | null;
  minors?: boolean;
}) {
  const ranked = rankedPitcher(ranking);
  const best = {
    era: bestOf(pitchers, (p) => p.era, "min", ranked),
    strikeouts: bestOf(pitchers, (p) => p.strikeouts, "max"),
  };

  const row = (p: PitcherSeason) => {
    const compared = !minors;
    return (
      <tr key={p.playerId}>
        <RowHeader>
          <PlayerLink playerId={p.playerId} nameKo={p.nameKo} photoUrl={p.photoUrl} teamAbbr={p.teamAbbr} />
        </RowHeader>
        <Td align="left" className="text-muted">
          <TeamName teamKo={p.teamKo} teamAbbr={p.teamAbbr} />
          {p.levelKo && <LevelPill level={p.levelKo} />}
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
      <tbody className="divide-y divide-line">{pitchers.map(row)}</tbody>
    </TableScroll>
  );
}
