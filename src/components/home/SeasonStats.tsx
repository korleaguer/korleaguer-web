import type { HitterSeason, PitcherSeason } from "@/lib/api";
import Section from "@/components/Section";
import HitterTable from "./HitterTable";
import PitcherTable from "./PitcherTable";

interface Props {
  season: number;
  statsAvailable: boolean;
  hitters: HitterSeason[];
  pitchers: PitcherSeason[];
}

/** 시즌 성적: 타자 표 + 투수 표 */
export default function SeasonStats({ season, statsAvailable, hitters, pitchers }: Props) {
  const title = `${season} 시즌 성적`;

  // 요금제가 없으면 기록 자체를 못 받으므로, 표 대신 한 줄로 알린다.
  if (!statsAvailable) {
    return (
      <Section title={title}>
        <p className="px-4 py-6 text-sm text-muted">요금제가 없어 시즌 기록을 받지 못했습니다.</p>
      </Section>
    );
  }

  return (
    <Section title={title} aside="굵은 숫자 = 해당 항목 1위">
      <SubTitle>타자 · 타율 순</SubTitle>
      {hitters.length > 0 ? <HitterTable hitters={hitters} /> : <Empty />}
      <SubTitle>투수 · 평균자책점 순</SubTitle>
      {pitchers.length > 0 ? <PitcherTable pitchers={pitchers} /> : <Empty />}
    </Section>
  );
}

function SubTitle({ children }: { children: string }) {
  return (
    <h3 className="border-b border-line px-4 pb-1.5 pt-3 text-xs font-bold">{children}</h3>
  );
}

function Empty() {
  return <p className="px-4 py-4 text-sm text-muted">아직 기록이 없습니다.</p>;
}
