import type { ReactNode } from "react";
import type { HitterSeason, PitcherSeason, RankingMinimums } from "@/lib/api";
import Section from "@/components/Section";
import HitterTable from "./HitterTable";
import PitcherTable from "./PitcherTable";

interface Props {
  season: number;
  statsAvailable: boolean;
  ranking: RankingMinimums | null;
  hitters: HitterSeason[];
  pitchers: PitcherSeason[];
}

/** 시즌 기록: 타자 표 카드 + 투수 표 카드 (위아래로 쌓는다) */
export default function SeasonStats({ season, statsAvailable, ranking, hitters, pitchers }: Props) {
  // 요금제가 없으면 기록 자체를 못 받으므로, 표 대신 한 줄로 알린다.
  if (!statsAvailable) {
    return (
      <Section id="stats-title" title={`${season} 시즌 기록`}>
        <p className="card px-4 py-5 text-sm text-muted">요금제가 없어 시즌 기록을 받지 못했습니다.</p>
      </Section>
    );
  }

  return (
    <div className="space-y-7">
      <Section id="hitters-title" title="타자 시즌 기록" aside="타율 순 · 파란 숫자 = 1위">
        <TableCard>{hitters.length > 0 ? <HitterTable hitters={hitters} ranking={ranking} /> : <Empty />}</TableCard>
        {ranking && hitters.length > 0 && (
          <Note>{`타율·OPS 순위와 1위는 ${ranking.minPlateAppearances}타석 이상인 선수만 셉니다. 못 채운 선수는 아래에 둡니다.`}</Note>
        )}
      </Section>
      <Section id="pitchers-title" title="투수 시즌 기록" aside="평균자책점 순">
        <TableCard>{pitchers.length > 0 ? <PitcherTable pitchers={pitchers} ranking={ranking} /> : <Empty />}</TableCard>
        {ranking && pitchers.length > 0 && (
          <Note>{`평균자책점 순위와 1위는 ${ranking.minInningsText}이닝 이상인 투수만 셉니다.`}</Note>
        )}
      </Section>
    </div>
  );
}

function TableCard({ children }: { children: ReactNode }) {
  return <div className="card overflow-hidden py-1.5">{children}</div>;
}

/** 표 아래 작은 설명 한 줄 */
function Note({ children }: { children: ReactNode }) {
  return <p className="mt-2 px-1 text-xs text-muted">{children}</p>;
}

function Empty() {
  return <p className="px-4 py-4 text-sm text-muted">아직 기록이 없습니다.</p>;
}
