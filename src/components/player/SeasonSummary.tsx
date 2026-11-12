import type { CSSProperties } from "react";
import type { HitterSeason, PitcherSeason } from "@/lib/api";
import { formatEra, formatRate } from "@/lib/format";
import RollingNumber from "@/components/RollingNumber";
import Section from "@/components/Section";

interface Props {
  season: number;
  statsAvailable: boolean;
  hitting: HitterSeason | null;
  pitching: PitcherSeason | null;
}

type Stat = [label: string, value: string | number];

/** 선수 시즌 성적. 큰 숫자 카드 네 장 + 세부 기록 한 장 */
export default function SeasonSummary({ season, statsAvailable, hitting, pitching }: Props) {
  return (
    <Section id="season-title" title={`${season} 시즌 성적`}>
      <div className="space-y-2.5">
        {hitting && (
          <StatBlock
            // 야구 중계에서 쓰는 '타율/출루율/장타율' + OPS
            big={[
              ["타율", formatRate(hitting.avg)],
              ["출루율", formatRate(hitting.obp)],
              ["장타율", formatRate(hitting.slg)],
              ["OPS", formatRate(hitting.ops)],
            ]}
            line={[
              ["경기", hitting.games],
              ["타수", hitting.atBats],
              ["안타", hitting.hits],
              ["2루타", hitting.doubles],
              ["홈런", hitting.homeRuns],
              ["타점", hitting.rbi],
              ["볼넷", hitting.walks],
              ["삼진", hitting.strikeouts],
              ["도루", hitting.stolenBases],
            ]}
          />
        )}
        {pitching && (
          <StatBlock
            big={[
              ["평균자책점", formatEra(pitching.era)],
              ["승-패", `${pitching.wins}-${pitching.losses}`],
              ["이닝", pitching.inningsText],
              ["탈삼진", pitching.strikeouts],
            ]}
            line={[
              ["경기", pitching.games],
              ["이닝", pitching.inningsText],
              ["승", pitching.wins],
              ["패", pitching.losses],
              ["세이브", pitching.saves],
              ["탈삼진", pitching.strikeouts],
              ["볼넷", pitching.walks],
              ["피안타", pitching.hitsAllowed],
            ]}
          />
        )}
        {!hitting && !pitching && (
          <p className="card px-4 py-5 text-sm text-muted">
            {statsAvailable ? "이번 시즌 기록이 없어요." : "아직 시즌 기록을 받지 못했어요."}
          </p>
        )}
      </div>
    </Section>
  );
}

/**
 * 큰 숫자 카드(휴대폰 2×2, 넓으면 4칸) + 세부 기록 카드(휴대폰 3·4칸씩 줄바꿈, 넓으면 한 줄).
 * 이름(dt)이 위, 숫자(dd)가 아래라 화면 낭독기도 "타율 .417" 순서로 읽는다.
 */
function StatBlock({ big, line }: { big: Stat[]; line: Stat[] }) {
  // 휴대폰: 4로 나누어떨어지면 4칸, 아니면 3칸씩. 넓은 화면: 한 줄에 전부
  const narrowCols = line.length % 4 === 0 ? "grid-cols-4" : "grid-cols-3";
  const wideCols = { "--line-cols": `repeat(${line.length}, minmax(0, 1fr))` } as CSSProperties;

  return (
    <>
      <dl className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        {big.map(([label, value]) => (
          <div key={label} className="card min-w-0 px-4 py-3.5">
            <dt className="text-[0.8125rem] text-muted">{label}</dt>
            <dd className="text-[1.75rem] font-extrabold leading-tight tracking-[-0.02em] tabular-nums">
              {/* 화면 밖에서 들어오면 굴러가며 나타난다 */}
              <RollingNumber value={String(value)} />
            </dd>
          </div>
        ))}
      </dl>
      <dl className={`card grid p-1.5 ${narrowCols} md:grid-cols-(--line-cols)`} style={wideCols}>
        {line.map(([label, value]) => (
          <div key={label} className="min-w-0 px-1 py-2.5 text-center">
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="text-[1.0625rem] font-bold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}
