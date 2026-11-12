import type { HitterSeason, RankingMinimums } from "@/lib/api";
import { formatRate } from "@/lib/format";
import { rankedHitter, splitByMinors, topBy } from "@/lib/stats";
import PlayerLink from "@/components/PlayerLink";
import RollingNumber from "@/components/RollingNumber";
import Section from "@/components/Section";

interface Props {
  season: number;
  statsAvailable: boolean;
  ranking: RankingMinimums | null;
  hitters: HitterSeason[];
}

interface Leader {
  title: string;
  pick: (h: HitterSeason) => number | null;
  format: (value: number) => string;
  /** 비율 기록이라 순위 기준(최소 타석)을 채운 선수만 센다 */
  ranked: boolean;
}

const LEADERS: Leader[] = [
  { title: "타율", pick: (h) => h.avg, format: formatRate, ranked: true },
  { title: "홈런", pick: (h) => h.homeRuns, format: String, ranked: false },
  { title: "OPS", pick: (h) => h.ops, format: formatRate, ranked: true },
  { title: "타점", pick: (h) => h.rbi, format: String, ranked: false },
];

/**
 * 시즌 1위 카드 네 장(타율·홈런·OPS·타점). 공동 1위면 "이정후 외 2명".
 * 올해 주로 마이너에서 뛴 선수는 빼고 메이저 선수끼리 비교한다.
 * 타율·OPS는 몇 타석만 뛴 선수가 1위가 되지 않게 순위 기준(최소 타석)을 채운 선수 중에서 고른다.
 */
export default function SeasonLeaders({ season, statsAvailable, ranking, hitters }: Props) {
  return (
    <Section id="leaders-title" title="시즌 1위" aside={`${season} 시즌`}>
      {statsAvailable ? (
        <ul className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
          {LEADERS.map((leader) => (
            <LeaderCard key={leader.title} leader={leader} ranking={ranking} hitters={hitters} />
          ))}
        </ul>
      ) : (
        <p className="card px-4 py-5 text-sm text-muted">아직 시즌 기록을 받지 못했어요.</p>
      )}
    </Section>
  );
}

function LeaderCard({
  leader,
  ranking,
  hitters,
}: {
  leader: Leader;
  ranking: RankingMinimums | null;
  hitters: HitterSeason[];
}) {
  const filtered = leader.ranked && ranking != null;
  const { majors } = splitByMinors(hitters);
  // 표의 1위 표시와 같은 규칙: 메이저 선수가 2명 이상일 때만 1위를 고른다
  const comparable = majors.length >= 2 ? majors : [];
  const candidates = filtered ? comparable.filter(rankedHitter(ranking)) : comparable;
  // 값이 0보다 큰 선수 중 1위(공동 포함)
  const firsts = topBy(candidates, leader.pick, candidates.length).filter((r) => r.rank === 1);
  const first = firsts[0];

  return (
    // 1위가 있으면 카드 어디를 눌러도 1위 선수 페이지로 간다(이름 링크의 ::after를 카드 전체로, 이슈 #158)
    <li
      className={`card min-w-0 p-3.5 ${first ? "card-link relative has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-accent" : ""}`}
    >
      <h3 className="flex flex-wrap items-baseline gap-x-1.5 text-[0.8125rem] font-semibold text-muted">
        {leader.title}
        {filtered && <span className="text-[0.6875rem] font-medium">{`${ranking.minPlateAppearances}타석 이상`}</span>}
      </h3>
      {first ? (
        <>
          <p className="mb-2 mt-0.5 text-[1.75rem] font-extrabold leading-tight tracking-[-0.02em] text-accent-ink tabular-nums">
            <RollingNumber value={leader.format(first.value)} />
          </p>
          <p className="flex min-w-0 items-center gap-1 text-sm font-semibold">
            <PlayerLink
              playerId={first.row.playerId}
              nameKo={first.row.nameKo}
              photoUrl={first.row.photoUrl}
              teamAbbr={first.row.teamAbbr}
              avatarSize={28}
              className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none"
            />
            {firsts.length > 1 && <span className="shrink-0 text-muted">{`외 ${firsts.length - 1}명`}</span>}
          </p>
        </>
      ) : (
        <p className="mt-1.5 text-sm text-muted">{emptyMessage(hitters.length, majors.length, filtered)}</p>
      )}
    </li>
  );
}

/** 1위가 없을 때 이유 한 줄. 표와 같은 기준(메이저 선수 2명 이상, 비율 기록은 최소 타석)으로 말한다 */
function emptyMessage(hitterCount: number, majorCount: number, filtered: boolean): string {
  if (hitterCount === 0) return "아직 기록이 없어요.";
  if (majorCount < 2) return "비교할 메이저 선수가 아직 2명이 안 돼요.";
  return filtered ? "아직 기준을 채운 선수가 없어요." : "아직 기록이 없어요.";
}
