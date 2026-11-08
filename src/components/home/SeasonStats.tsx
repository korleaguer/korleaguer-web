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

/**
 * 시즌 성적: 타자 표 + 투수 표. 흰 면 없이 페이지 바탕 위에 머리카락 선으로만 나눈다.
 * 표 칸 바탕(고정된 이름 칸 등)도 페이지 바탕색으로 맞춘다(--table-bg).
 */
export default function SeasonStats({ season, statsAvailable, hitters, pitchers }: Props) {
  const title = `${season} 시즌 성적`;

  // 요금제가 없으면 기록 자체를 못 받으므로, 표 대신 한 줄로 알린다.
  if (!statsAvailable) {
    return (
      <Section title={title} plain>
        <p className="py-4 text-sm text-muted">요금제가 없어 시즌 기록을 받지 못했습니다.</p>
      </Section>
    );
  }

  return (
    <Section title={title} aside="금색 굵은 숫자 = 해당 항목 1위" plain>
      {/* 표의 첫 칸·끝 칸 바깥 여백을 없애 글자와 선이 제목·순위판과 같은 열 안에서 시작하고 끝나게 한다 */}
      <div className="[--table-bg:var(--background)] [--table-head-bg:var(--background)] [&_tr>*:first-child]:pl-0 [&_tr>*:last-child]:pr-0">
        <SubTitle>타자 · 타율 순</SubTitle>
        {hitters.length > 0 ? <HitterTable hitters={hitters} /> : <Empty />}
        <SubTitle>투수 · 평균자책점 순</SubTitle>
        {pitchers.length > 0 ? <PitcherTable pitchers={pitchers} /> : <Empty />}
      </div>
    </Section>
  );
}

function SubTitle({ children }: { children: string }) {
  return <h3 className="pb-1 pt-4 text-sm font-bold">{children}</h3>;
}

function Empty() {
  return <p className="py-4 text-sm text-muted">아직 기록이 없습니다.</p>;
}
