import type { PitcherSeason, RankingMinimums } from "@/lib/api";
import { formatEra } from "@/lib/format";
import { bestOf, isBest, pairWithMinors, rankedPitcher, sortByValue, splitByMinors } from "@/lib/stats";
import PlayerLink from "@/components/PlayerLink";
import TeamName from "@/components/TeamName";
import { ROW_LINK, RowHeader, TableScroll, Td, Th } from "@/components/table";
import { GroupHeader, MinorRowLabel } from "./MinorRows";
import MinorTeam from "./MinorTeam";

const COLUMNS = 7;

/**
 * 투수 시즌 성적 표(이슈 #88). 메이저 줄(pitchers) 바로 밑에 같은 투수의 마이너 기록(minors) 줄을 붙이고,
 * 마이너에서만 뛴 투수는 맨 아래 따로 묶는다.
 * 줄은 세 묶음이고 묶음마다 평균자책점 낮은 순이다(표 위 이름표 '평균자책점 순', 이슈 #277): 순위 대상(올해 주로 메이저 +
 * 이닝 기준을 채움) → 띠 '이닝이 적거나 주로 마이너에서 던진 투수' → 띠 '마이너에서만 던진 투수'. 타자 표와 같은 규칙이다(띠 말은 같은 표 안에서 '던진 투수'로 맞춘다).
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
  // 1위(굵은 숫자)는 시즌 1위 카드와 같은 규칙: 주로 마이너에서 던진 투수(아래 띠 묶음)는 빼고, 남은 메이저 투수가 2명 이상일 때만,
  // 평균자책점은 순위 기준 이닝도 채운 투수 중에서(타자 표와 같다)
  const { majors } = splitByMinors(pitchers);
  const best = {
    era: bestOf(majors, (p) => p.era, "min", ranked),
    strikeouts: bestOf(majors, (p) => p.strikeouts, "max"),
  };
  const { pairs, minorsOnly } = pairWithMinors(pitchers, minors);
  const byEra = (list: typeof pairs) => sortByValue(list, (p) => p.major.era, "min");
  const top = byEra(pairs.filter((p) => !p.major.mainlyMinors && ranked(p.major)));
  const rest = byEra(pairs.filter((p) => p.major.mainlyMinors || !ranked(p.major)));
  const minorsOnlyByEra = sortByValue(minorsOnly, (p) => p.era, "min");

  // 이름 칸 다음의 기록 칸들. 마이너 줄(compared = false)과 주로 마이너에서 던진 투수의 메이저 줄은 1위 비교에서 뺀다
  const cells = (p: PitcherSeason, compared: boolean) => {
    const lead = compared && !p.mainlyMinors;
    return (
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
        <Td strong={lead && ranked(p) && isBest(p.era, best.era)}>{formatEra(p.era)}</Td>
        <Td>{`${p.wins}-${p.losses}-${p.saves}`}</Td>
        <Td strong={lead && isBest(p.strikeouts, best.strikeouts)}>{p.strikeouts}</Td>
      </>
    );
  };
  const nameCell = (p: PitcherSeason) => (
    <RowHeader>
      <PlayerLink playerId={p.playerId} nameKo={p.nameKo} photoUrl={p.photoUrl} teamAbbr={p.teamAbbr} />
    </RowHeader>
  );

  // 투수 한 명 = 묶음 하나(메이저 줄 + 있으면 마이너 줄). 묶음 사이에만 선을 긋는다
  const pairBody = ({ major, minor }: (typeof pairs)[number]) => (
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
  );

  return (
    <TableScroll>
      <thead>
        <tr>
          <Th align="left" sticky>이름</Th>
          <Th align="left">팀</Th>
          <Th>등판</Th>
          <Th>이닝</Th>
          <Th>평균자책점</Th>
          <Th>승-패-세</Th>
          <Th>탈삼진</Th>
        </tr>
      </thead>
      {top.map(pairBody)}
      {/* 띠만 든 묶음이라 누를 수 없다(타자 표와 같다) */}
      {rest.length > 0 && (
        <tbody>
          <GroupHeader colSpan={COLUMNS} label="이닝이 적거나 주로 마이너에서 던진 투수" />
        </tbody>
      )}
      {rest.map(pairBody)}
      {minorsOnlyByEra.length > 0 && (
        <tbody className="divide-y divide-line">
          <GroupHeader colSpan={COLUMNS} label="마이너에서만 던진 투수" />
          {minorsOnlyByEra.map((p) => (
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
