import type { CSSProperties } from "react";
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

/** 순위판: 타율 순, 홈런 순 상위 목록 (값이 0보다 큰 선수만). 흰 면 없이 페이지 바탕 위에 놓는다. */
export default function Leaderboard({ statsAvailable, hitters }: Props) {
  if (!statsAvailable) {
    return (
      <Section title="순위판" plain>
        <p className="border-t border-line py-4 text-sm text-muted">요금제가 없어 시즌 기록을 받지 못했습니다.</p>
      </Section>
    );
  }

  return (
    <Section title="순위판" plain>
      <div className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-1">
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
    // 판마다 위쪽 머리카락 선으로 나눈다
    <div className="border-t border-line pb-4 pt-3">
      <h3 className="mb-2.5 text-xs font-semibold text-muted">{title}</h3>
      {ranked.length === 0 ? (
        <p className="text-sm text-muted">아직 기록이 없습니다.</p>
      ) : (
        // 순위는 직접 쓴다(공동 순위가 있어서 ol 자동 번호를 쓰지 않는다).
        <ul className="space-y-2">
          {ranked.map(({ rank, row, value }) => (
            <li key={row.playerId} className="flex items-center gap-2 text-sm">
              <span
                className={`w-4 text-center text-xs font-bold tabular-nums ${rank === 1 ? "text-gold-ink" : "text-muted"}`}
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
              {/* 막대 길이 = 1위 대비 비율. 다크 모드에서는 어두운 팀 색(밀워키 남색 등)이 바탕에 묻히지 않게 흰색을 섞는다 */}
              <span aria-hidden className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                <span
                  className="block h-full rounded-full bg-(--bar) dark:bg-[color-mix(in_oklab,var(--bar)_60%,white)]"
                  style={
                    {
                      width: `${max > 0 ? (value / max) * 100 : 0}%`,
                      "--bar": teamColor(row.teamAbbr),
                    } as CSSProperties
                  }
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
