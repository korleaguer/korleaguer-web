import type { ReactNode } from "react";
import type { HitterSeason, PitcherSeason, RankingMinimums } from "@/lib/api";
import InfoTip from "@/components/InfoTip";
import Section from "@/components/Section";
import HitterTable from "./HitterTable";
import PitcherTable from "./PitcherTable";
import HistoryToggle from "./HistoryToggle";
import { cacheLife } from "next/cache";

interface Props {
  season: number;
  statsAvailable: boolean;
  ranking: RankingMinimums | null;
  hitters: HitterSeason[];
  pitchers: PitcherSeason[];
  minorHitters: HitterSeason[];
  minorPitchers: PitcherSeason[];
  /** 비시즌: 시즌 성적표가 같은 숫자를 보이므로 표를 접어 둔다(이슈 #191) */
  folded?: boolean;
}

/**
 * 시즌 기록: 타자 표 + 투수 표(이슈 #88). 탭(#39)을 누르지 않아도 되게, 메이저 줄 바로 밑에
 * 같은 선수의 마이너 기록 줄을 붙이고, 마이너에서만 뛴 선수는 표 맨 아래 따로 묶는다.
 */
export default async function SeasonStats({
  season,
  statsAvailable,
  ranking,
  hitters,
  pitchers,
  minorHitters,
  minorPitchers,
  folded = false,
}: Props) {
  // 잠깐 재사용: 같은 데이터면 30초 동안 그려 둔 것을 다시 쓴다(쿠키와 상관없는 부품이라 모두에게 같다).
  // 운영 서버(라즈베리파이 4)는 화면 그리기가 느려서 큰 부품을 매번 그리지 않는다.
  "use cache";
  cacheLife({ stale: 30, revalidate: 30, expire: 300 });
  // 선수 기록을 아직 못 받았으면 표 대신 한 줄로 알린다.
  if (!statsAvailable) {
    return (
      <Section id="stats-title" title={`${season} 선수별 기록`}>
        <p className="card px-4 py-5 text-body text-muted">아직 시즌 기록을 받지 못했어요.</p>
      </Section>
    );
  }

  // 메이저 줄: 이번 시즌 메이저 경기가 있는 선수만
  const majorHitters = hitters.filter((h) => h.games > 0);
  const majorPitchers = pitchers.filter((p) => p.games > 0);
  const hasMinors = minorHitters.length + minorPitchers.length > 0;
  // 마이너 경기 수는 아는데 경기별 기록을 아직 못 받은 경우(받기 전)
  const minorsPending = !hasMinors && [...hitters, ...pitchers].some((row) => row.minorGames > 0);

  // 표 아래 각주는 제목 옆 ⓘ 하나로, '마이너 기록 받는 중'은 제목 오른쪽 이름표로(이슈 #329). 1위 표시 기준이 없으면 ⓘ도 없다
  const tips = [
    ranking && majorHitters.length > 0 && `타율·OPS 1위는 ${ranking.minPlateAppearances}타석 이상인 선수 중에서 골라요`,
    ranking && majorPitchers.length > 0 && `평균자책점 1위는 ${ranking.minInningsText}이닝 이상인 투수 중에서 골라요`,
    hasMinors && "마이너 기록은 모든 단계를 더한 것이라 1위를 표시하지 않아요",
    minorsPending && "마이너 경기 기록은 하루 한 번 새로 받아요",
  ].filter((line): line is string => typeof line === "string" && line.length > 0);
  const info = tips.length > 0 ? <InfoTip title="선수별 기록" lines={tips} /> : undefined;
  const aside = minorsPending ? "마이너 기록 받는 중" : undefined;
  // 제목은 '선수별 기록': 비시즌 홈의 '시즌 성적표'(카드)와 한 화면에 있어 이름이 거의 같았다(문구 점검 11-13)
  const tables = (
    <div className="space-y-5">
      <Group title="타자" aside="타율 순 · 파란 숫자는 1위">
        <TableCard>
          {majorHitters.length + minorHitters.length > 0 ? (
            <HitterTable hitters={majorHitters} minors={minorHitters} ranking={ranking} />
          ) : (
            <Empty />
          )}
        </TableCard>
        {/* '타석이 적거나 주로 마이너에서 뛴 선수는 아래에 있어요'는 표 안 띠가 같은 말을 해서 뺐다(이슈 #277) */}
      </Group>
      <Group title="투수" aside="평균자책점 순">
        <TableCard>
          {majorPitchers.length + minorPitchers.length > 0 ? (
            <PitcherTable pitchers={majorPitchers} minors={minorPitchers} ranking={ranking} />
          ) : (
            <Empty />
          )}
        </TableCard>
      </Group>
    </div>
  );
  if (!folded) {
    return (
      <Section id="stats-title" title={`${season} 선수별 기록`} info={info} aside={aside}>
        {tables}
      </Section>
    );
  }
  // 몇 명의 표인지 접힌 줄에 적는다(메이저·마이너 줄은 같은 선수다)
  const hitterCount = new Set([...majorHitters, ...minorHitters].map((h) => h.playerId)).size;
  const pitcherCount = new Set([...majorPitchers, ...minorPitchers].map((p) => p.playerId)).size;
  return (
    <Section id="stats-title" title={`${season} 선수별 기록`} info={info} aside={aside}>
      <HistoryToggle
        title="타자·투수 기록 표"
        hint={`타자 ${hitterCount}명 · 투수 ${pitcherCount}명`}
        className=""
        buttonClassName="card px-4 py-3.5"
      >
        <div className="mt-4">{tables}</div>
      </HistoryToggle>
    </Section>
  );
}

/** 섹션 안의 작은 묶음(타자·투수): 제목 + 오른쪽 작은 글씨 */
function Group({ title, aside, children }: { title: string; aside: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-x-3 px-1">
        <h3 className="text-summary">{title}</h3>
        <p className="shrink-0 text-caption text-muted">{aside}</p>
      </div>
      {children}
    </div>
  );
}

function TableCard({ children }: { children: ReactNode }) {
  return <div className="card overflow-hidden py-1.5">{children}</div>;
}

function Empty() {
  return <p className="px-4 py-4 text-body text-muted">아직 기록이 없어요.</p>;
}
