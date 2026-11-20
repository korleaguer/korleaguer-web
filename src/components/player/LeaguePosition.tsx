import type { PlayerSaber } from "@/lib/api";
import InfoTip from "@/components/InfoTip";
import Section from "@/components/Section";
import PositionBar from "@/components/player/PositionBar";
import { formatInningsOuts } from "@/lib/format";
import { leagueWords } from "@/lib/leagueWords";
// 이보다 적으면 '참고용'(타자 100타석, 투수 30이닝 = 90아웃). 시즌 성적 한 줄·홈 성적표 작은 판과 같은 값을 한 곳에서 가져온다
import { STEADY_OUTS, STEADY_PA } from "@/lib/seasonStats";
import { cacheLife } from "next/cache";
import { Fragment } from "react";

export interface Row {
  label: string;
  /** 1~99(높을수록 좋다). 견줄 선수가 아직 없으면 null */
  pct: number | null;
  /**
   * 막대 아래 한 줄에 모으는 그 칸의 실제 값("종합 WAR +1.0", "주루 +0.7점"). 값만 모아 두면 'WAR'가 어느 막대 값인지
   * 줄마다 맞춰 봐야 해서 막대 이름을 앞에 붙인다(주루·수비·삼진·볼넷은 값 이름에 이미 들어 있다)
   */
  raw: string | null;
}

/** +1.2 / −0.4 (빼기는 진짜 빼기 글자) */
function signed(value: number | null, digits = 1): string | null {
  if (value == null) return null;
  const fixed = Math.abs(value).toFixed(digits);
  return `${value < 0 && Number(fixed) !== 0 ? "−" : "+"}${fixed}`;
}

/**
 * 막대 네 줄(맨 앞이 '종합'). 타격·실점 억제의 실제 값은 지표 이름(wRC+·ERA-) 대신 리그 대비 말로 쓴다(사용자 11-21).
 * ERA-는 낮을수록 좋아서 ERA+ 꼴(100 ÷ ERA- × 100)로 바꿔 말한다. 표본이 적어 서버가 위치를 매기지 않았으면 null. 홈 성적표 작은 판(LeaguePositionCompact)도 쓴다 */
export function rowsOf(saber: PlayerSaber): Row[] | null {
  if (saber.kind === "hitter") {
    const p = saber.percentiles;
    if (!p) return null;
    return [
      { label: "종합", pct: p.overall, raw: saber.war == null ? null : `종합 WAR ${signed(saber.war)}` },
      { label: "타격", pct: p.batting, raw: saber.wrcPlus == null ? null : `타격 ${leagueWords(saber.wrcPlus, false).text}` },
      { label: "주루", pct: p.baseRunning, raw: saber.baseRunning == null ? null : `주루 ${signed(saber.baseRunning)}점` },
      { label: "수비", pct: p.fielding, raw: saber.fielding == null ? null : `수비 ${signed(saber.fielding)}점` },
    ];
  }
  const p = saber.percentiles;
  if (!p) return null;
  return [
    { label: "종합", pct: p.overall, raw: saber.war == null ? null : `종합 WAR ${signed(saber.war)}` },
    { label: "실점 억제", pct: p.runPrevention, raw: saber.eraMinus == null || saber.eraMinus <= 0 ? null : `실점 억제 ${leagueWords(10000 / saber.eraMinus, true).text}` },
    { label: "삼진", pct: p.strikeouts, raw: saber.strikeoutRate == null ? null : `삼진 비율 ${saber.strikeoutRate.toFixed(1)}%` },
    // '볼넷 상위 10%'는 볼넷을 많이 준다로 읽혀 '실점 억제'처럼 '볼넷 억제'(볼넷을 적게 줄수록 위). 이름 칸(4.25rem)에 그대로 든다
    { label: "볼넷 억제", pct: p.walks, raw: saber.walkRate == null ? null : `볼넷 비율 ${saber.walkRate.toFixed(1)}%` },
  ];
}

/**
 * 선수 화면 'MLB 타자(투수) 중에서'(사용자 11-13 결정, Baseball Savant의 백분위 막대처럼).
 * 제목은 아래 줄과 이어 읽힌다: 'MLB 타자 중에서 타격 상위 41%'(처음 이름 'MLB 안 위치'는 어색하다는 사용자 의견으로 바꿨다).
 * 같은 시즌 MLB 선수 중 어디쯤인지를 네 줄로: 타자는 종합·타격·주루·수비, 투수는 종합·실점 억제·삼진·볼넷 억제.
 * 타율 하나로 폼을 판단하지 않게(사용자: "현대 야구에서 타율만으로 평가하진 않아서"), 실제 값은 막대 아래 한 줄에 작게만 둔다.
 * 순위는 위아래 모두 '상위 N%'로 쓰고, 중간(백분위 50)보다 아래는 흐린 회색 글자로 둔다(혹평처럼 읽히지 않게). 기준이 중간값이라 '평균'이라 쓰지 않는다:
 * 'WAR +1.0'인데 '평균 아래'면 모순처럼 읽혔다(WAR는 0이 평균이 아니다). 숫자는 서버가 MLB 공식 세이버 지표로 계산한다(korleaguer-server#133).
 * 항목마다 '이름 · 막대 · 순위'를 한 줄로 둔다(사용자 11-16 시안 A, 이슈 #236). 세 줄씩 쌓던 때는 이 칸이 시즌 성적보다 커서
 * 아래 경기 기록이 너무 멀었다. 표본이 적어 위치가 없으면 빈 칸 대신 시즌 성적 바로 아래 안내 한 줄만 둔다.
 */
export default async function LeaguePosition({ saber }: { saber: PlayerSaber }) {
  "use cache";
  cacheLife({ stale: 30, revalidate: 30, expire: 300 });

  const hitter = saber.kind === "hitter";
  const who = hitter ? "타자" : "투수";
  const count = hitter ? (saber.plateAppearances ?? 0) : (saber.inningsOuts ?? 0);
  const sample = hitter ? `${count}타석` : `${formatInningsOuts(count)}이닝`;
  const steady = count >= (hitter ? STEADY_PA : STEADY_OUTS);
  const rows = rowsOf(saber);

  if (!rows) {
    // 서버는 타자 50타석·투수 10이닝 미만이면 위치를 매기지 않는다. -mt-4: 위 칸(시즌 성적)과의 간격 28px을 12px로 줄여 그 칸의 각주처럼 붙인다.
    // 이름표만 보인다('메이저 4타석 · 50타석부터 비교', 이슈 #327). 낭독기는 앞에 무엇의 위치인지 붙여 읽는다
    const from = hitter ? "50타석" : "10이닝";
    return (
      <p className="-mt-4 px-1 text-meta text-muted">
        <span className="sr-only">{`MLB ${who} 중 위치: `}</span>
        {count > 0 ? `메이저 ${sample} · ${from}부터 비교` : `${from}부터 비교`}
      </p>
    );
  }

  // ⓘ 안 줄(이슈 #327): 예전 카드 아래 각주와 '참고용' 문장. WAR 풀이는 시즌별 기록 표 설명(낭독)과 달리 보이는 곳은 여기 한 곳뿐이다
  const tips = [
    "WAR는 대체 선수보다 더 번 승수(0이 평균 아님)",
    hitter
      ? "타격은 리그 평균 타자를 100으로 놓은 값(wRC+ 112 = 평균보다 12% 잘 침)을 말로 풀었어요. 수비는 포지션 난도 포함"
      : "실점 억제는 ERA-(100이 평균, 낮을수록 좋아요)를 평균 대비 말로 풀었어요(ERA- 80 = 평균보다 25% 잘 막음, 100 ÷ ERA-로 어림)",
    `MLB 공식 세이버 지표 · ${sample}`,
    ...(steady ? [] : [`${sample}뿐이라 더 ${hitter ? "뛰면" : "던지면"} 크게 바뀔 수 있어요`]),
  ];
  const raws = rows.map((r) => r.raw).filter((raw): raw is string => raw != null);
  return (
    <Section
      id="position-title"
      title={`MLB ${who} 중에서`}
      info={<InfoTip title={`MLB ${who} 중에서`} lines={tips} />}
      aside={saber.poolSize > 0 ? `${saber.season} · ${saber.poolSize}명과 비교` : undefined}
    >
      <div className="card px-4 py-4">
        {!steady && (
          // 이름표만(나머지 말은 ⓘ 안)
          <p className="mb-3 text-caption text-muted">
            <span className="mr-1.5 rounded-md bg-surface-2 px-1.5 py-0.5 text-badge">참고용</span>
            {sample}
          </p>
        )}
        {/* @container: 칸이 좁으면(앱 큰 글씨 등) 줄 모양을 바꾼다(PositionRow) */}
        <ul className="@container space-y-3">
          {rows.map((r) => (
            <PositionRow
              key={r.label}
              row={r}
              who={who}
              // 이름 칸: 타자 2.5rem(두 글자), 투수 4.25rem('실점 억제'·'볼넷 억제'). Tailwind가 읽게 클래스를 통째로 적는다
              cols={hitter ? "grid-cols-[2.5rem_minmax(0,1fr)_4.5rem]" : "grid-cols-[4.25rem_minmax(0,1fr)_4.5rem]"}
            />
          ))}
        </ul>
        {raws.length > 0 && (
          <p className="mt-3.5 text-meta text-muted tabular-nums">
            {raws.map((raw, i) => (
              <Fragment key={raw}>
                {i > 0 && " · "}
                <span className="whitespace-nowrap">{raw}</span>
              </Fragment>
            ))}
          </p>
        )}
      </div>
    </Section>
  );
}

/**
 * 한 줄: 이름 | 막대(PositionBar) | 순위. 이름 칸 폭을 줄마다 같게 해 막대 시작점을 맞춘다.
 * 칸이 15rem보다 좁으면(앱 큰 글씨 1.5배 이상, 휴대폰) 이름·순위 한 줄 아래에 막대를 칸 폭 그대로 둔다.
 * 한 줄로 두면 이름·순위 칸(rem)이 커져 막대 칸이 0이 되고 점만 남았다(2배 375px)
 */
function PositionRow({ row, who, cols }: { row: Row; who: string; cols: string }) {
  const { label, pct } = row;
  const top = pct != null && pct >= 50;
  const verdict = pct == null ? "비교 전" : `상위 ${100 - pct}%`;
  return (
    <li className={`grid items-center gap-x-3 ${cols} @max-[15rem]:grid-cols-[minmax(0,1fr)_auto] @max-[15rem]:gap-y-1.5`}>
      <span className="text-summary">{label}</span>
      <PositionBar pct={pct} size="md" className="@max-[15rem]:order-last @max-[15rem]:col-span-2" />
      <span className={`whitespace-nowrap text-right text-summary font-extrabold tabular-nums ${top ? "text-accent-ink" : "text-muted"}`}>
        <span className="sr-only">{`MLB ${who} 중 `}</span>
        {verdict}
      </span>
    </li>
  );
}
