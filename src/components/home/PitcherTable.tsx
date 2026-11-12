import type { PitcherSeason, RankingMinimums } from "@/lib/api";
import { formatEra } from "@/lib/format";
import { bestOf, isBest, pairWithMinors, rankedPitcher } from "@/lib/stats";
import PlayerLink from "@/components/PlayerLink";
import TeamName from "@/components/TeamName";
import { ROW_LINK, RowHeader, TableScroll, Td, Th } from "@/components/table";
import { MinorRowLabel, MinorsOnlyHeader } from "./MinorRows";
import MinorTeam from "./MinorTeam";

const COLUMNS = 7;

/**
 * 투수 시즌 성적 표(이슈 #88). 메이저 줄(pitchers) 바로 밑에 같은 투수의 마이너 기록(minors) 줄을 붙이고,
 * 마이너에서만 뛴 투수는 맨 아래 따로 묶는다.
 * 메이저 줄은 열마다 가장 좋은 값을 굵게 표시한다(평균자책점은 순위 기준(최소 이닝)을 채운 투수 중에서만).
 * 마이너 줄은 단계가 섞여 1위를 표시하지 않고, 팀 칸에 단계를 붙인다.
 */
export default function PitcherTable({
  pitchers,
  minors = [],
  ranking,
}: {
  pitchers: PitcherSeason[];
  minors?: PitcherSeason[];
  ranking: RankingMinimums | null;
}) {
  const ranked = rankedPitcher(ranking);
  const best = {
    era: bestOf(pitchers, (p) => p.era, "min", ranked),
    strikeouts: bestOf(pitchers, (p) => p.strikeouts, "max"),
  };
  const { pairs, minorsOnly } = pairWithMinors(pitchers, minors);

  // 이름 칸 다음의 기록 칸들. 마이너 줄(compared = false)은 1위 비교에서 뺀다
  const cells = (p: PitcherSeason, compared: boolean) => (
    <>
      <Td align="left" className="text-muted">
        {p.levelKo ? (
          <MinorTeam teamKo={p.teamKo} level={p.levelKo} />
        ) : (
          <TeamName teamKo={p.teamKo} teamAbbr={p.teamAbbr} />
        )}
      </Td>
      <Td>{p.games}</Td>
      <Td>{p.inningsText}</Td>
      <Td strong={compared && ranked(p) && isBest(p.era, best.era)}>{formatEra(p.era)}</Td>
      <Td>{`${p.wins}-${p.losses}-${p.saves}`}</Td>
      <Td strong={compared && isBest(p.strikeouts, best.strikeouts)}>{p.strikeouts}</Td>
    </>
  );
  const nameCell = (p: PitcherSeason) => (
    <RowHeader>
      <PlayerLink playerId={p.playerId} nameKo={p.nameKo} photoUrl={p.photoUrl} teamAbbr={p.teamAbbr} />
    </RowHeader>
  );

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
      {/* 투수 한 명 = 묶음 하나(메이저 줄 + 있으면 마이너 줄). 묶음 사이에만 선을 긋는다 */}
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
          {minorsOnly.map((p) => (
            <tr key={p.playerId} data-href={`/players/${p.playerId}`} className={ROW_LINK}>
              {nameCell(p)}
              {cells(p, false)}
            </tr>
          ))}
        </tbody>
      )}
    </TableScroll>
  );
}
