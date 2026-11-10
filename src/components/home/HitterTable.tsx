import type { HitterSeason, RankingMinimums } from "@/lib/api";
import { formatRate } from "@/lib/format";
import { bestOf, isBest, rankedHitter, splitByMinors } from "@/lib/stats";
import PlayerLink from "@/components/PlayerLink";
import TeamName from "@/components/TeamName";
import { RowHeader, TableScroll, Td, Th } from "@/components/table";
import { MinorGamesNote, MinorsGroupHeader } from "./MinorsGroup";

const COLUMNS = 9;

/**
 * 타자 시즌 성적 표. 열마다 가장 좋은 값은 굵게 표시한다. 타율·OPS는 순위 기준(최소 타석)을 채운 선수 중에서만.
 * 올해 주로 마이너에서 뛴 선수는 아래에 따로 묶고, 1위 비교에서 뺀다.
 */
export default function HitterTable({ hitters, ranking }: { hitters: HitterSeason[]; ranking: RankingMinimums | null }) {
  const ranked = rankedHitter(ranking);
  const { majors, minors } = splitByMinors(hitters);
  const best = {
    avg: bestOf(majors, (h) => h.avg, "max", ranked),
    homeRuns: bestOf(majors, (h) => h.homeRuns, "max"),
    rbi: bestOf(majors, (h) => h.rbi, "max"),
    ops: bestOf(majors, (h) => h.ops, "max", ranked),
    stolenBases: bestOf(majors, (h) => h.stolenBases, "max"),
  };

  const row = (h: HitterSeason) => {
    // 주로 마이너인 선수는 메이저 선수와 1위를 겨루지 않는다
    const compared = !h.mainlyMinors;
    return (
      <tr key={h.playerId}>
        <RowHeader>
          <PlayerLink playerId={h.playerId} nameKo={h.nameKo} photoUrl={h.photoUrl} teamAbbr={h.teamAbbr} />
          {h.mainlyMinors && <MinorGamesNote games={h.minorGames} />}
        </RowHeader>
        <Td align="left" className="text-muted">
          <TeamName teamKo={h.teamKo} teamAbbr={h.teamAbbr} />
        </Td>
        <Td>{h.games}</Td>
        <Td>{h.plateAppearances}</Td>
        <Td strong={compared && ranked(h) && isBest(h.avg, best.avg)}>{formatRate(h.avg)}</Td>
        <Td strong={compared && isBest(h.homeRuns, best.homeRuns)}>{h.homeRuns}</Td>
        <Td strong={compared && isBest(h.rbi, best.rbi)}>{h.rbi}</Td>
        <Td strong={compared && ranked(h) && isBest(h.ops, best.ops)}>{formatRate(h.ops)}</Td>
        <Td strong={compared && isBest(h.stolenBases, best.stolenBases)}>{h.stolenBases}</Td>
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
          <Th>타석</Th>
          <Th>타율</Th>
          <Th>홈런</Th>
          <Th>타점</Th>
          <Th>OPS</Th>
          <Th>도루</Th>
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
