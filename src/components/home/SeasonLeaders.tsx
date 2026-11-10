import type { HitterSeason } from "@/lib/api";
import { formatRate } from "@/lib/format";
import { topBy } from "@/lib/stats";
import PlayerLink from "@/components/PlayerLink";
import Section from "@/components/Section";

interface Props {
  season: number;
  statsAvailable: boolean;
  hitters: HitterSeason[];
}

interface Leader {
  title: string;
  pick: (h: HitterSeason) => number | null;
  format: (value: number) => string;
}

const LEADERS: Leader[] = [
  { title: "타율", pick: (h) => h.avg, format: formatRate },
  { title: "홈런", pick: (h) => h.homeRuns, format: String },
  { title: "OPS", pick: (h) => h.ops, format: formatRate },
  { title: "타점", pick: (h) => h.rbi, format: String },
];

/** 시즌 1위 카드 네 장(타율·홈런·OPS·타점). 공동 1위면 "이정후 외 2명" */
export default function SeasonLeaders({ season, statsAvailable, hitters }: Props) {
  return (
    <Section id="leaders-title" title="시즌 1위" aside={`${season} 시즌`}>
      {statsAvailable ? (
        <ul className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
          {LEADERS.map((leader) => (
            <LeaderCard key={leader.title} leader={leader} hitters={hitters} />
          ))}
        </ul>
      ) : (
        <p className="card px-4 py-5 text-sm text-muted">아직 시즌 기록을 받지 못했습니다.</p>
      )}
    </Section>
  );
}

function LeaderCard({ leader, hitters }: { leader: Leader; hitters: HitterSeason[] }) {
  // 값이 0보다 큰 선수 중 1위(공동 포함)
  const firsts = topBy(hitters, leader.pick, hitters.length).filter((r) => r.rank === 1);
  const first = firsts[0];

  return (
    <li className="card min-w-0 p-3.5">
      <h3 className="text-[0.8125rem] font-semibold text-muted">{leader.title}</h3>
      {first ? (
        <>
          <p className="mb-2 mt-0.5 text-[1.75rem] font-extrabold leading-tight tracking-[-0.02em] text-accent-ink tabular-nums">
            {leader.format(first.value)}
          </p>
          <p className="flex min-w-0 items-center gap-1 text-sm font-semibold">
            <PlayerLink
              playerId={first.row.playerId}
              nameKo={first.row.nameKo}
              photoUrl={first.row.photoUrl}
              teamAbbr={first.row.teamAbbr}
              avatarSize={28}
            />
            {firsts.length > 1 && <span className="shrink-0 text-muted">{`외 ${firsts.length - 1}명`}</span>}
          </p>
        </>
      ) : (
        <p className="mt-1.5 text-sm text-muted">아직 기록이 없습니다.</p>
      )}
    </li>
  );
}
