import type { ReactNode } from "react";
import type { HitterSeason, PitcherSeason, RankingMinimums } from "@/lib/api";
import Section from "@/components/Section";
import HitterTable from "./HitterTable";
import PitcherTable from "./PitcherTable";
import SeasonTabs from "./SeasonTabs";

interface Props {
  season: number;
  statsAvailable: boolean;
  ranking: RankingMinimums | null;
  hitters: HitterSeason[];
  pitchers: PitcherSeason[];
  minorHitters: HitterSeason[];
  minorPitchers: PitcherSeason[];
}

/**
 * 시즌 기록: '메이저 | 마이너' 탭(이슈 #39). 메이저 탭은 메이저 경기에 나온 선수의 메이저 기록,
 * 마이너 탭은 마이너 경기에 나온 선수의 마이너 기록이다. 탭마다 타자 표 + 투수 표를 쌓는다.
 */
export default function SeasonStats({
  season,
  statsAvailable,
  ranking,
  hitters,
  pitchers,
  minorHitters,
  minorPitchers,
}: Props) {
  // 선수 기록을 아직 못 받았으면 표 대신 한 줄로 알린다.
  if (!statsAvailable) {
    return (
      <Section id="stats-title" title={`${season} 시즌 기록`}>
        <p className="card px-4 py-5 text-sm text-muted">아직 시즌 기록을 받지 못했습니다.</p>
      </Section>
    );
  }

  // 메이저 탭: 이번 시즌 메이저 경기가 있는 선수만
  const majorHitters = hitters.filter((h) => h.games > 0);
  const majorPitchers = pitchers.filter((p) => p.games > 0);
  // 마이너 경기 수는 아는데 경기별 기록을 아직 못 받은 경우(받기 전)
  const minorsPending =
    minorHitters.length + minorPitchers.length === 0 &&
    [...hitters, ...pitchers].some((row) => row.minorGames > 0);

  return (
    <Section id="stats-title" title={`${season} 시즌 기록`}>
      <SeasonTabs
        label="시즌 기록 리그"
        tabs={[
          {
            label: "메이저",
            content: (
              <div className="space-y-5">
                <Group title="타자" aside="타율 순 · 파란 숫자 = 1위">
                  <TableCard>
                    {majorHitters.length > 0 ? <HitterTable hitters={majorHitters} ranking={ranking} /> : <Empty />}
                  </TableCard>
                  <Notes
                    lines={[
                      ranking &&
                        majorHitters.length > 0 &&
                        `타율·OPS 순위와 1위는 ${ranking.minPlateAppearances}타석 이상인 선수만 셉니다. 못 채운 선수는 아래에 둡니다.`,
                    ]}
                  />
                </Group>
                <Group title="투수" aside="평균자책점 순">
                  <TableCard>
                    {majorPitchers.length > 0 ? <PitcherTable pitchers={majorPitchers} ranking={ranking} /> : <Empty />}
                  </TableCard>
                  <Notes
                    lines={[
                      ranking &&
                        majorPitchers.length > 0 &&
                        `평균자책점 순위와 1위는 ${ranking.minInningsText}이닝 이상인 투수만 셉니다.`,
                    ]}
                  />
                </Group>
              </div>
            ),
          },
          {
            label: "마이너",
            content: minorsPending ? (
              <p className="card px-4 py-5 text-sm text-muted">마이너 경기별 기록을 받는 중입니다. 하루 한 번 새로 받습니다.</p>
            ) : (
              <div className="space-y-5">
                <Group title="타자" aside="마이너 경기 많은 순">
                  <TableCard>
                    {minorHitters.length > 0 ? (
                      <HitterTable hitters={minorHitters} ranking={null} minors />
                    ) : (
                      <Empty />
                    )}
                  </TableCard>
                </Group>
                <Group title="투수" aside="마이너 등판 많은 순">
                  <TableCard>
                    {minorPitchers.length > 0 ? (
                      <PitcherTable pitchers={minorPitchers} ranking={null} minors />
                    ) : (
                      <Empty />
                    )}
                  </TableCard>
                </Group>
                <Notes lines={["트리플A부터 루키까지 마이너 경기를 모두 더한 기록입니다. 단계가 섞여 1위는 표시하지 않습니다."]} />
              </div>
            ),
          },
        ]}
      />
    </Section>
  );
}

/** 탭 안의 작은 묶음(타자·투수): 제목 + 오른쪽 작은 글씨 */
function Group({ title, aside, children }: { title: string; aside: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-x-3 px-1">
        <h3 className="text-[0.9375rem] font-bold">{title}</h3>
        <p className="shrink-0 text-xs text-muted">{aside}</p>
      </div>
      {children}
    </div>
  );
}

function TableCard({ children }: { children: ReactNode }) {
  return <div className="card overflow-hidden py-1.5">{children}</div>;
}

/** 표 아래 작은 설명. 해당하는 줄만 보여 주고, 하나도 없으면 그리지 않는다 */
function Notes({ lines }: { lines: (string | false | null)[] }) {
  const shown = lines.filter((line): line is string => typeof line === "string" && line.length > 0);
  if (shown.length === 0) return null;
  return (
    <div className="mt-2 space-y-0.5 px-1 text-xs text-muted">
      {shown.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>
  );
}

function Empty() {
  return <p className="px-4 py-4 text-sm text-muted">아직 기록이 없습니다.</p>;
}
