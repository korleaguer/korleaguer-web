import type { HitterSeason, PitcherSeason } from "@/lib/api";
import { formatEra, formatRate } from "@/lib/format";
import Section from "@/components/Section";

interface Props {
  season: number;
  statsAvailable: boolean;
  hitting: HitterSeason | null;
  pitching: PitcherSeason | null;
}

/** 선수 시즌 요약 카드. 큰 숫자 4개 + 작은 숫자 여러 개 */
export default function SeasonSummary({ season, statsAvailable, hitting, pitching }: Props) {
  return (
    <Section title={`${season} 시즌 성적`}>
      {hitting && <HittingStats h={hitting} />}
      {pitching && <PitchingStats p={pitching} />}
      {!hitting && !pitching && (
        <p className="px-4 py-6 text-sm text-muted">
          {statsAvailable ? "이번 시즌 기록이 없습니다." : "요금제가 없어 시즌 기록을 받지 못했습니다."}
        </p>
      )}
    </Section>
  );
}

function HittingStats({ h }: { h: HitterSeason }) {
  return (
    <div className="p-4">
      <BigStats
        items={[
          ["타율", formatRate(h.avg)],
          ["출루율", formatRate(h.obp)],
          ["장타율", formatRate(h.slg)],
          ["OPS", formatRate(h.ops)],
        ]}
      />
      <SmallStats
        items={[
          ["경기", h.games],
          ["타수", h.atBats],
          ["안타", h.hits],
          ["2루타", h.doubles],
          ["홈런", h.homeRuns],
          ["타점", h.rbi],
          ["볼넷", h.walks],
          ["삼진", h.strikeouts],
          ["도루", h.stolenBases],
        ]}
      />
    </div>
  );
}

function PitchingStats({ p }: { p: PitcherSeason }) {
  return (
    <div className="p-4">
      <BigStats
        items={[
          ["평균자책점", formatEra(p.era)],
          ["이닝", p.inningsText],
          ["승-패-세", `${p.wins}-${p.losses}-${p.saves}`],
          ["탈삼진", String(p.strikeouts)],
        ]}
      />
      <SmallStats
        items={[
          ["경기", p.games],
          ["피안타", p.hitsAllowed],
          ["볼넷", p.walks],
        ]}
      />
    </div>
  );
}

function BigStats({ items }: { items: [string, string][] }) {
  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-lg bg-surface-2 px-2 py-2.5 text-center">
          <dt className="text-[11px] text-muted">{label}</dt>
          <dd className="mt-0.5 whitespace-nowrap text-lg font-extrabold tracking-tight tabular-nums sm:text-xl">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function SmallStats({ items }: { items: [string, number][] }) {
  return (
    <dl className="mt-3 grid grid-cols-3 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-5">
      {items.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-2 border-b border-line pb-1">
          <dt className="text-muted">{label}</dt>
          <dd className="font-semibold tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
