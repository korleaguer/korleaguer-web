import type { HitterSeason, RankingMinimums } from "@/lib/api";
import { formatRate } from "@/lib/format";
import { bestOf, isBest, pairWithMinors, rankedHitter } from "@/lib/stats";
import PlayerLink from "@/components/PlayerLink";
import TeamName from "@/components/TeamName";
import { ROW_LINK, RowHeader, TableScroll, Td, Th } from "@/components/table";
import { MinorRowLabel, MinorsOnlyHeader } from "./MinorRows";
import MinorTeam from "./MinorTeam";

const COLUMNS = 9;

/**
 * 타자 시즌 성적 표(이슈 #88). 메이저 줄(hitters) 바로 밑에 같은 선수의 마이너 기록(minors) 줄을 붙이고,
 * 마이너에서만 뛴 선수는 맨 아래 따로 묶는다.
 * 메이저 줄은 열마다 가장 좋은 값을 굵게 표시한다(타율·OPS는 순위 기준(최소 타석)을 채운 선수 중에서만).
 * 마이너 줄은 단계가 섞여 1위를 표시하지 않고, 팀 칸에 단계를 붙인다.
 */
export default function HitterTable({
  hitters,
  minors = [],
  ranking,
}: {
  hitters: HitterSeason[];
  minors?: HitterSeason[];
  ranking: RankingMinimums | null;
}) {
  const ranked = rankedHitter(ranking);
  const best = {
    avg: bestOf(hitters, (h) => h.avg, "max", ranked),
    homeRuns: bestOf(hitters, (h) => h.homeRuns, "max"),
    rbi: bestOf(hitters, (h) => h.rbi, "max"),
    ops: bestOf(hitters, (h) => h.ops, "max", ranked),
    stolenBases: bestOf(hitters, (h) => h.stolenBases, "max"),
  };
  const { pairs, minorsOnly } = pairWithMinors(hitters, minors);

  // 이름 칸 다음의 기록 칸들. 마이너 줄(compared = false)은 1위 비교에서 뺀다
  const cells = (h: HitterSeason, compared: boolean) => (
    <>
      <Td align="left" className="text-muted">
        {h.levelKo ? (
          <MinorTeam teamKo={h.teamKo} level={h.levelKo} />
        ) : (
          <TeamName teamKo={h.teamKo} teamAbbr={h.teamAbbr} />
        )}
      </Td>
      <Td>{h.games}</Td>
      <Td>{h.plateAppearances}</Td>
      <Td strong={compared && ranked(h) && isBest(h.avg, best.avg)}>{formatRate(h.avg)}</Td>
      <Td strong={compared && isBest(h.homeRuns, best.homeRuns)}>{h.homeRuns}</Td>
      <Td strong={compared && isBest(h.rbi, best.rbi)}>{h.rbi}</Td>
      <Td strong={compared && ranked(h) && isBest(h.ops, best.ops)}>{formatRate(h.ops)}</Td>
      <Td strong={compared && isBest(h.stolenBases, best.stolenBases)}>{h.stolenBases}</Td>
    </>
  );
  const nameCell = (h: HitterSeason) => (
    <RowHeader>
      <PlayerLink playerId={h.playerId} nameKo={h.nameKo} photoUrl={h.photoUrl} teamAbbr={h.teamAbbr} />
    </RowHeader>
  );

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
      {/* 선수 한 명 = 묶음 하나(메이저 줄 + 있으면 마이너 줄). 묶음 사이에만 선을 긋는다 */}
      {pairs.map(({ major, minor }) => (
        <tbody
          key={major.playerId}
          data-href={`/players/${major.playerId}`}
          className={`border-t border-line first-of-type:border-t-0 ${ROW_LINK}`}
        >
          <tr>
            {nameCell(major)}
            {cells(major, true)}
          </tr>
          {minor && (
            <tr className="text-muted *:pt-0">
              <RowHeader>
                <MinorRowLabel nameKo={minor.nameKo} />
              </RowHeader>
              {cells(minor, false)}
            </tr>
          )}
        </tbody>
      ))}
      {minorsOnly.length > 0 && (
        <tbody className="divide-y divide-line">
          <MinorsOnlyHeader colSpan={COLUMNS} />
          {minorsOnly.map((h) => (
            <tr key={h.playerId} data-href={`/players/${h.playerId}`} className={ROW_LINK}>
              {nameCell(h)}
              {cells(h, false)}
            </tr>
          ))}
        </tbody>
      )}
    </TableScroll>
  );
}
