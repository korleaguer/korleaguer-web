import type { CSSProperties, ReactNode } from "react";
import type { HitterSeason, PitcherSeason } from "@/lib/api";
import { formatEra, formatRate } from "@/lib/format";
import { levelSeasons, sampleLabel } from "@/lib/seasonStats";
import RollingNumber from "@/components/RollingNumber";
import Section from "@/components/Section";
import { cacheLife } from "next/cache";

interface Props {
  season: number;
  statsAvailable: boolean;
  hitting: HitterSeason | null;
  pitching: PitcherSeason | null;
  /** 같은 시즌 마이너 기록. 없거나 오래된 api면 null */
  minorHitting: HitterSeason | null;
  minorPitching: PitcherSeason | null;
}

type Stat = [label: string, value: string | number];

/**
 * 선수 시즌 성적. 단계(메이저·마이너)마다 큰 숫자 카드 네 장 + 세부 기록 한 장이고, 올해 주로 뛴 단계가 먼저다.
 * 묶음마다 '메이저 4경기'처럼 단계·경기 수를 먼저 적는다. 메이저만 보이면 트리플A 85경기를 뛴 김혜성이 43경기로 읽히고,
 * 메이저 4경기 9.00이 시즌 전체처럼 보였다(이슈 #184).
 */
export default async function SeasonSummary({
  season,
  statsAvailable,
  hitting,
  pitching,
  minorHitting,
  minorPitching,
}: Props) {
  // 잠깐 재사용: 같은 데이터면 30초 동안 그려 둔 것을 다시 쓴다(쿠키와 상관없는 부품이라 모두에게 같다).
  // 운영 서버(라즈베리파이 4)는 화면 그리기가 느려서 큰 부품을 매번 그리지 않는다.
  "use cache";
  cacheLife({ stale: 30, revalidate: 30, expire: 300 });
  const hitterSeasons = levelSeasons(hitting, minorHitting);
  const pitcherSeasons = levelSeasons(pitching, minorPitching);
  return (
    <Section id="season-title" title={`${season} 시즌 성적`}>
      <div className="space-y-5">
        {hitterSeasons.map((s) => (
          <LevelBlock key={s.levelKo} label={sampleLabel(s, false)}>
            <StatBlock
              // 야구 중계에서 쓰는 '타율/출루율/장타율' + OPS
              big={[
                ["타율", formatRate(s.line.avg)],
                ["출루율", formatRate(s.line.obp)],
                ["장타율", formatRate(s.line.slg)],
                ["OPS", formatRate(s.line.ops)],
              ]}
              line={[
                ["경기", s.line.games],
                ["타수", s.line.atBats],
                ["안타", s.line.hits],
                ["2루타", s.line.doubles],
                ["홈런", s.line.homeRuns],
                ["타점", s.line.rbi],
                ["볼넷", s.line.walks],
                ["삼진", s.line.strikeouts],
                ["도루", s.line.stolenBases],
              ]}
            />
          </LevelBlock>
        ))}
        {pitcherSeasons.map((s) => (
          <LevelBlock key={s.levelKo} label={sampleLabel(s, true)}>
            <StatBlock
              big={[
                ["평균자책점", formatEra(s.line.era)],
                ["승-패", `${s.line.wins}-${s.line.losses}`],
                ["이닝", s.line.inningsText],
                ["탈삼진", s.line.strikeouts],
              ]}
              line={[
                ["경기", s.line.games],
                ["이닝", s.line.inningsText],
                ["승", s.line.wins],
                ["패", s.line.losses],
                ["세이브", s.line.saves],
                ["탈삼진", s.line.strikeouts],
                ["볼넷", s.line.walks],
                ["피안타", s.line.hitsAllowed],
              ]}
            />
          </LevelBlock>
        ))}
        {hitterSeasons.length === 0 && pitcherSeasons.length === 0 && (
          <p className="card px-4 py-5 text-sm text-muted">
            {statsAvailable ? "이번 시즌 기록이 없어요." : "아직 시즌 기록을 받지 못했어요."}
          </p>
        )}
      </div>
    </Section>
  );
}

/** 단계 묶음: '메이저 143경기' 이름표(작은 제목) + 숫자 카드들 */
function LevelBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2.5">
      <h3 className="px-1 text-[0.8125rem] font-semibold text-muted">{label}</h3>
      {children}
    </div>
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
              {/* 처음부터 최종 값. 새 기록이 와서 값이 바뀔 때만 굴러간다 */}
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
