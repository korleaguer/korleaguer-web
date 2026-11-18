import { Fragment, type ReactNode } from "react";
import type { HitterSeason, PitcherSeason } from "@/lib/api";
import { formatEra, formatRate } from "@/lib/format";
import { levelSeasons, sampleLabel, smallSampleNote } from "@/lib/seasonStats";
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
  /** 제목 옆 데이터 기준 시각("기준 11월 17일(화) 09:00", 홈과 같은 꼴, 이슈 #277). 옛 api면 없다 */
  asOf?: string;
}

type Stat = [label: string, value: string | number];
/** 아래 한 줄 기록 하나. numberFirst면 '143경기'처럼 숫자 뒤에 이름, 아니면 '2루타 31' */
type RestStat = [label: string, value: number, numberFirst?: boolean];

/**
 * 선수 시즌 성적. 단계(메이저·마이너)마다 큰 숫자 카드 네 장 + 세부 기록 한 장이고, 올해 주로 뛴 단계가 먼저다.
 * 세부 기록은 팬이 먼저 찾는 넷(안타·홈런·타점·도루)을 크게, 나머지는 아래 한 줄로 모은다(사용자가 고른 시안 B, 이슈 #232).
 * 묶음마다 '메이저 4경기'처럼 단계·경기 수를 먼저 적는다. 메이저만 보이면 트리플A 85경기를 뛴 김혜성이 43경기로 읽히고,
 * 메이저 4경기 9.00이 시즌 전체처럼 보였다(이슈 #184). 표본이 적은 묶음(타자 100타석·투수 30이닝 미만)은 큰 숫자 대신
 * 작은 한 줄 카드와 '참고용'이다(StatLine, 11-17 사용자 결정).
 */
export default async function SeasonSummary({
  season,
  statsAvailable,
  hitting,
  pitching,
  minorHitting,
  minorPitching,
  asOf,
}: Props) {
  // 잠깐 재사용: 같은 데이터면 30초 동안 그려 둔 것을 다시 쓴다(쿠키와 상관없는 부품이라 모두에게 같다).
  // 운영 서버(라즈베리파이 4)는 화면 그리기가 느려서 큰 부품을 매번 그리지 않는다.
  "use cache";
  cacheLife({ stale: 30, revalidate: 30, expire: 300 });
  const hitterSeasons = levelSeasons(hitting, minorHitting);
  const pitcherSeasons = levelSeasons(pitching, minorPitching);
  return (
    <Section id="season-title" title={`${season} 시즌 성적`} aside={asOf}>
      {/* 묶음 사이 28px: 20px이면 앞 묶음 세부 카드와 다음 묶음 이름표가 붙어 이름표가 어느 숫자의 것인지 흐렸다(11-17 전수조사) */}
      <div className="space-y-7">
        {hitterSeasons.map((s) => {
          // 야구 중계에서 쓰는 '타율/출루율/장타율' + OPS
          const big: Stat[] = [
            ["타율", formatRate(s.line.avg)],
            ["출루율", formatRate(s.line.obp)],
            ["장타율", formatRate(s.line.slg)],
            ["OPS", formatRate(s.line.ops)],
          ];
          // 9칸을 같은 크기로 늘어놓으면 계산기 자판처럼 읽혀서, 기사에서 '149안타 10홈런 57타점 12도루'로 부르는 넷만 크게 둔다
          const main: Stat[] = [
            ["안타", s.line.hits],
            ["홈런", s.line.homeRuns],
            ["타점", s.line.rbi],
            ["도루", s.line.stolenBases],
          ];
          const note = smallSampleNote(s, false);
          return (
            <LevelBlock key={s.levelKo} label={sampleLabel(s, false)} note={note}>
              {note ? (
                // 작은 한 줄: 도루는 0이면 뺀다(모두가 쌓는 기록이 아니라 몇 경기 묶음에서는 대개 0이다)
                <StatLine stats={[...big, ...main.filter(([label, value]) => label !== "도루" || value !== 0)]} />
              ) : (
                <StatBlock
                  big={big}
                  main={main}
                  rest={[
                    ["경기", s.line.games, true],
                    ["타수", s.line.atBats, true],
                    ["2루타", s.line.doubles],
                    ["볼넷", s.line.walks],
                    ["삼진", s.line.strikeouts],
                  ]}
                />
              )}
            </LevelBlock>
          );
        })}
        {pitcherSeasons.map((s) => {
          const big: Stat[] = [
            ["평균자책점", formatEra(s.line.era)],
            ["승-패", `${s.line.wins}-${s.line.losses}`],
            ["이닝", s.line.inningsText],
            ["탈삼진", s.line.strikeouts],
          ];
          const note = smallSampleNote(s, true);
          return (
            <LevelBlock key={s.levelKo} label={sampleLabel(s, true)} note={note}>
              {note ? (
                // 작은 한 줄: 등판은 이름표('메이저 4번 등판')에 있어 빼고, 세이브는 0이면 뺀다(결정 그림 ④의 한 줄과 같다)
                <StatLine
                  stats={[
                    ...big.slice(0, 2),
                    ...(s.line.saves > 0 ? [["세이브", s.line.saves] as Stat] : []),
                    ...big.slice(2),
                    ["볼넷", s.line.walks],
                    ["피안타", s.line.hitsAllowed],
                  ]}
                />
              ) : (
                <StatBlock
                  big={big}
                  // 위 큰 칸에 있는 이닝·승패·탈삼진은 되풀이하지 않는다(문구 점검 11-13). 투수 출전 수는 '등판'. 넷뿐이라 아래 한 줄은 없다
                  main={[
                    ["등판", s.line.games],
                    ["세이브", s.line.saves],
                    ["볼넷", s.line.walks],
                    ["피안타", s.line.hitsAllowed],
                  ]}
                  rest={[]}
                />
              )}
            </LevelBlock>
          );
        })}
        {hitterSeasons.length === 0 && pitcherSeasons.length === 0 && (
          <p className="card px-4 py-5 text-body text-muted">
            {statsAvailable ? "이번 시즌 기록이 없어요." : "아직 시즌 기록을 받지 못했어요."}
          </p>
        )}
      </div>
    </Section>
  );
}

/**
 * 단계 묶음: '메이저 143경기' 이름표(작은 제목) + 숫자 카드들.
 * 이름표는 본문 글자색이다. 흐린 글자로 두면 바로 아래 28px 숫자에 묻혀 어느 단계 기록인지 잘 안 보였다(11-17 전수조사).
 * 표본이 적으면 이름표 뒤에 흐린 '· 4이닝이라 참고용'(note)
 */
function LevelBlock({ label, note, children }: { label: string; note: string | null; children: ReactNode }) {
  return (
    <div className="space-y-2.5">
      <h3 className="px-1 text-label text-foreground">
        {label}
        {note && <span className="font-normal text-muted">{` · ${note}`}</span>}
      </h3>
      {children}
    </div>
  );
}

/**
 * 표본이 적은 묶음(타자 100타석·투수 30이닝 미만)의 작은 한 줄 카드: '평균자책점 9.00 승-패 0-0 이닝 4 …'(이름 흐림, 숫자 굵게).
 * 큰 숫자 카드로 두면 메이저 4번 등판이 마이너 36번 등판과 같은 무게로 읽혔다(4이닝은 한 경기만 못 던져도 크게 흔들린다,
 * 11-17 사용자 결정 '추천대로' 결정 그림 ④). 항목 안에서는 줄을 바꾸지 않고, 좁으면(큰 글씨) 항목 사이에서 바꾼다
 */
function StatLine({ stats }: { stats: Stat[] }) {
  return (
    <dl className="card flex flex-wrap gap-x-3.5 gap-y-1 px-4 py-3 text-body tabular-nums">
      {stats.map(([label, value]) => (
        <div key={label} className="flex gap-1 whitespace-nowrap">
          <dt className="text-muted">{label}</dt>
          <dd className="font-semibold">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * 큰 숫자 카드(휴대폰 2×2, 넓으면 4칸) + 세부 기록 카드(주요 넷을 세로선으로 나눈 4칸, 그 아래 `line` 선 밑에 나머지 한 줄).
 * 이름(dt)이 위, 숫자(dd)가 아래라 화면 낭독기도 "타율 .417" 순서로 읽는다.
 */
function StatBlock({ big, main, rest }: { big: Stat[]; main: Stat[]; rest: RestStat[] }) {
  return (
    <>
      {/* 큰 숫자 카드 줄이 13rem보다 좁으면(큰 글씨) 한 칸에 하나씩, 이름표 왼쪽·숫자 오른쪽으로. 두 칸이면 2배에서
          '.276'이 '.'/'276'으로, '평균자책점'이 두 줄로 갈렸다(이슈 #264). 768px 이상의 네 칸도 줄이 30rem보다 좁으면
          두 칸으로(네 칸에 필요한 폭: 11-17 측정 25.4rem, OPS가 1.000을 넘으면 약 29rem). 보통 크기 768px 이상은 줄이 38rem
          이상이라 그대로다 */}
      <div className="@container">
        <dl className="grid grid-cols-2 gap-2.5 md:grid-cols-4 @max-[30rem]:grid-cols-2 @max-[13rem]:grid-cols-1 @max-[13rem]:gap-2 @max-[13rem]:*:flex @max-[13rem]:*:items-baseline @max-[13rem]:*:justify-between @max-[13rem]:*:gap-3">
          {big.map(([label, value]) => (
            <div key={label} className="card min-w-0 px-4 py-3.5">
              <dt className="text-caption text-muted">{label}</dt>
              <dd className="text-stat-hero tabular-nums">
                {/* 처음부터 최종 값. 새 기록이 와서 값이 바뀔 때만 굴러간다 */}
                <RollingNumber value={String(value)} />
              </dd>
            </div>
          ))}
        </dl>
      </div>
      {/* 세부 넷: 칸이 11.5rem보다 좁으면(큰 글씨) 두 줄 두 칸으로(한 칸에 '149'가 '14'/'9'로 갈렸다). 둘째 줄 첫 칸은 세로선 없이 */}
      <div className="@container card px-3 pt-3.5 pb-3">
        <dl className="grid grid-cols-4 @max-[11.5rem]:grid-cols-2 @max-[11.5rem]:gap-y-2.5">
          {main.map(([label, value], i) => (
            <div
              key={label}
              className={`min-w-0 text-center ${i > 0 ? "border-l border-line" : ""} ${i === 2 ? "@max-[11.5rem]:border-l-0" : ""}`}
            >
              <dt className="text-caption text-muted">{label}</dt>
              <dd className="text-stat tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
        {rest.length > 0 && (
          // 항목 안에서는 줄을 바꾸지 않고, 좁으면 ' · ' 자리에서 바꾼다
          <p className="mt-3 border-t border-line pt-2.5 text-center text-meta text-muted tabular-nums">
            {rest.map(([label, value, numberFirst], i) => (
              <Fragment key={label}>
                {i > 0 && " · "}
                <span className="whitespace-nowrap">
                  {numberFirst ? (
                    <>
                      <span className="font-semibold text-foreground">{value}</span>
                      {label}
                    </>
                  ) : (
                    <>
                      {label} <span className="font-semibold text-foreground">{value}</span>
                    </>
                  )}
                </span>
              </Fragment>
            ))}
          </p>
        )}
      </div>
    </>
  );
}
