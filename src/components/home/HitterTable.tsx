import type { HitterSeason, RankingMinimums } from "@/lib/api";
import { formatRate } from "@/lib/format";
import { bestOf, isBest, rankedHitter } from "@/lib/stats";
import PlayerLink from "@/components/PlayerLink";
import TeamName from "@/components/TeamName";
import { RowHeader, TableScroll, Td, Th } from "@/components/table";

/** 타자 시즌 성적 표. 열마다 가장 좋은 값은 굵게 표시한다. 타율·OPS는 순위 기준(최소 타석)을 채운 선수 중에서만 */
export default function HitterTable({ hitters, ranking }: { hitters: HitterSeason[]; ranking: RankingMinimums | null }) {
  const ranked = rankedHitter(ranking);
  const best = {
    avg: bestOf(hitters, (h) => h.avg, "max", ranked),
    homeRuns: bestOf(hitters, (h) => h.homeRuns, "max"),
    rbi: bestOf(hitters, (h) => h.rbi, "max"),
    ops: bestOf(hitters, (h) => h.ops, "max", ranked),
    stolenBases: bestOf(hitters, (h) => h.stolenBases, "max"),
  };

  return (
    <TableScroll>
      <thead>
        <tr>
          <Th align="left" sticky>이름</Th>
          <Th align="left">팀</Th>
          <Th>경기</Th>
          <Th>타율</Th>
          <Th>홈런</Th>
          <Th>타점</Th>
          <Th>OPS</Th>
          <Th>도루</Th>
        </tr>
      </thead>
      <tbody className="divide-y divide-line">
        {hitters.map((h) => (
          <tr key={h.playerId}>
            <RowHeader>
              <PlayerLink
                playerId={h.playerId}
                nameKo={h.nameKo}
                photoUrl={h.photoUrl}
                teamAbbr={h.teamAbbr}
              />
            </RowHeader>
            <Td align="left" className="text-muted">
              <TeamName teamKo={h.teamKo} teamAbbr={h.teamAbbr} />
            </Td>
            <Td>{h.games}</Td>
            <Td strong={ranked(h) && isBest(h.avg, best.avg)}>{formatRate(h.avg)}</Td>
            <Td strong={isBest(h.homeRuns, best.homeRuns)}>{h.homeRuns}</Td>
            <Td strong={isBest(h.rbi, best.rbi)}>{h.rbi}</Td>
            <Td strong={ranked(h) && isBest(h.ops, best.ops)}>{formatRate(h.ops)}</Td>
            <Td strong={isBest(h.stolenBases, best.stolenBases)}>{h.stolenBases}</Td>
          </tr>
        ))}
      </tbody>
    </TableScroll>
  );
}
