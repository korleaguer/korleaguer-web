import type { HitterSeason } from "@/lib/api";
import { formatRate } from "@/lib/format";
import { topBy, type Ranked } from "@/lib/stats";
import { teamColor } from "@/lib/teams";
import PlayerLink from "@/components/PlayerLink";
import Section from "@/components/Section";

const LIMIT = 5;

interface Props {
  statsAvailable: boolean;
  hitters: HitterSeason[];
}

/** 순위판: 타율 순, 홈런 순 상위 목록 (값이 0보다 큰 선수만) */
export default function Leaderboard({ statsAvailable, hitters }: Props) {
  if (!statsAvailable) {
    return (
      <Section title="순위판">
        <p className="px-4 py-6 text-sm text-muted">요금제가 없어 시즌 기록을 받지 못했습니다.</p>
      </Section>
    );
  }

  return (
    <Section title="순위판">
      <div className="grid divide-y divide-line sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-1 lg:divide-x-0 lg:divide-y">
        <Board title="타율" ranked={topBy(hitters, (h) => h.avg, LIMIT)} format={formatRate} />
        <Board
          title="홈런"
          ranked={topBy(hitters, (h) => h.homeRuns, LIMIT)}
          format={(v) => String(v)}
        />
      </div>
    </Section>
  );
}

interface BoardProps {
  title: string;
  ranked: Ranked<HitterSeason>[];
  format: (value: number) => string;
}

function Board({ title, ranked, format }: BoardProps) {
  const max = ranked[0]?.value ?? 0;

  return (
    <div className="px-4 py-3">
      <h3 className="mb-2 text-xs font-semibold text-muted">{title}</h3>
      {ranked.length === 0 ? (
        <p className="text-sm text-muted">아직 기록이 없습니다.</p>
      ) : (
        // 순위는 직접 쓴다(공동 순위가 있어서 ol 자동 번호를 쓰지 않는다).
        <ul className="space-y-2">
          {ranked.map(({ rank, row, value }) => (
            <li key={row.playerId} className="flex items-center gap-2 text-sm">
              <span
                className={`w-4 text-center text-xs font-bold tabular-nums ${rank === 1 ? "text-accent" : "text-muted"}`}
              >
                {rank}
                <span className="sr-only">위</span>
              </span>
              <PlayerLink
                playerId={row.playerId}
                nameKo={row.nameKo}
                photoUrl={row.photoUrl}
                teamAbbr={row.teamAbbr}
                className="w-24 shrink-0 font-semibold"
              />
              {/* 막대 길이 = 1위 대비 비율 */}
              <span aria-hidden className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                <span
                  className="block h-full rounded-full"
                  style={{
                    width: `${max > 0 ? (value / max) * 100 : 0}%`,
                    backgroundColor: teamColor(row.teamAbbr),
                  }}
                />
              </span>
              <span className="w-11 text-right font-bold tabular-nums">{format(value)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
