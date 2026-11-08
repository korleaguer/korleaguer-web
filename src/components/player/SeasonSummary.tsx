import type { HitterSeason, PitcherSeason } from "@/lib/api";
import { formatEra, formatRate } from "@/lib/format";
import Section from "@/components/Section";
import { TableScroll, Td, Th } from "@/components/table";

interface Props {
  season: number;
  statsAvailable: boolean;
  hitting: HitterSeason | null;
  pitching: PitcherSeason | null;
}

/** 선수 시즌 성적. 큰 글씨 한 줄(타자는 타율/출루율/장타율, 투수는 평균자책점) + 기록 한 줄 표 */
export default function SeasonSummary({ season, statsAvailable, hitting, pitching }: Props) {
  return (
    <Section title={`${season} 시즌 성적`}>
      {hitting && <HittingStats h={hitting} />}
      {pitching && <PitchingStats p={pitching} />}
      {!hitting && !pitching && (
        <p className="px-4 pb-6 pt-2 text-sm text-muted">
          {statsAvailable ? "이번 시즌 기록이 없습니다." : "요금제가 없어 시즌 기록을 받지 못했습니다."}
        </p>
      )}
    </Section>
  );
}

function HittingStats({ h }: { h: HitterSeason }) {
  return (
    <div className="pb-1">
      {/* 야구 중계에서 쓰는 '타율/출루율/장타율' 한 줄 + OPS */}
      <dl className="flex flex-wrap items-end gap-x-6 gap-y-3 px-4 pb-4 pt-1">
        <div className="flex items-end gap-x-2">
          <BigStat label="타율" value={formatRate(h.avg)} />
          <Slash />
          <BigStat label="출루율" value={formatRate(h.obp)} />
          <Slash />
          <BigStat label="장타율" value={formatRate(h.slg)} />
        </div>
        <BigStat label="OPS" value={formatRate(h.ops)} />
      </dl>
      <StatLine
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
    <div className="pb-1">
      <dl className="px-4 pb-4 pt-1">
        <BigStat label="평균자책점" value={formatEra(p.era)} />
      </dl>
      <StatLine
        items={[
          ["경기", p.games],
          ["이닝", p.inningsText],
          ["승", p.wins],
          ["패", p.losses],
          ["세이브", p.saves],
          ["탈삼진", p.strikeouts],
          ["볼넷", p.walks],
          ["피안타", p.hitsAllowed],
        ]}
      />
    </div>
  );
}

/** 큰 숫자 + 아래 작은 이름. 화면 낭독기는 "타율 .417" 순서로 읽는다(dt가 먼저, 눈에는 아래). */
function BigStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col-reverse">
      <dt className="mt-1 text-xs text-muted">{label}</dt>
      <dd className="text-3xl font-bold leading-none tracking-tight tabular-nums sm:text-[2.5rem]">{value}</dd>
    </div>
  );
}

function Slash() {
  return (
    <span aria-hidden className="pb-6 text-2xl font-light text-line sm:text-3xl">
      /
    </span>
  );
}

/** 기록 한 줄 표: 위는 항목 이름, 아래는 숫자. 좁으면 표 안에서만 가로로 밀린다 */
function StatLine({ items }: { items: [string, number | string][] }) {
  return (
    <TableScroll>
      <thead>
        <tr>
          {items.map(([label]) => (
            <Th key={label} align="center">
              {label}
            </Th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr>
          {items.map(([label, value]) => (
            <Td key={label} align="center" className="font-semibold">
              {value}
            </Td>
          ))}
        </tr>
      </tbody>
    </TableScroll>
  );
}
