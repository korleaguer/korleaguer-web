import type { PlayerSaber } from "@/lib/api";
import Section from "@/components/Section";
import { formatInningsOuts } from "@/lib/format";
import { cacheLife } from "next/cache";
import { Fragment } from "react";

/** 이보다 적으면 '참고용'(서버가 견주는 선수 기준과 같다: 타자 100타석, 투수 30이닝 = 90아웃) */
const STEADY_PA = 100;
const STEADY_OUTS = 90;

interface Row {
  label: string;
  /** 1~99(높을수록 좋다). 견줄 선수가 아직 없으면 null */
  pct: number | null;
  /** 막대 아래 한 줄에 모으는 그 칸의 실제 값("WAR +1.0", "주루 +0.7점") */
  raw: string | null;
}

/** +1.2 / −0.4 (빼기는 진짜 빼기 글자) */
function signed(value: number | null, digits = 1): string | null {
  if (value == null) return null;
  const fixed = Math.abs(value).toFixed(digits);
  return `${value < 0 && Number(fixed) !== 0 ? "−" : "+"}${fixed}`;
}

/** 막대 네 줄. 표본이 적어 서버가 위치를 매기지 않았으면 null */
function rowsOf(saber: PlayerSaber): Row[] | null {
  if (saber.kind === "hitter") {
    const p = saber.percentiles;
    if (!p) return null;
    return [
      { label: "종합", pct: p.overall, raw: saber.war == null ? null : `WAR ${signed(saber.war)}` },
      { label: "타격", pct: p.batting, raw: saber.wrcPlus == null ? null : `wRC+ ${Math.round(saber.wrcPlus)}` },
      { label: "주루", pct: p.baseRunning, raw: saber.baseRunning == null ? null : `주루 ${signed(saber.baseRunning)}점` },
      { label: "수비", pct: p.fielding, raw: saber.fielding == null ? null : `수비 ${signed(saber.fielding)}점` },
    ];
  }
  const p = saber.percentiles;
  if (!p) return null;
  return [
    { label: "종합", pct: p.overall, raw: saber.war == null ? null : `WAR ${signed(saber.war)}` },
    { label: "실점 억제", pct: p.runPrevention, raw: saber.eraMinus == null ? null : `ERA- ${Math.round(saber.eraMinus)}` },
    { label: "삼진", pct: p.strikeouts, raw: saber.strikeoutRate == null ? null : `삼진 비율 ${saber.strikeoutRate.toFixed(1)}%` },
    { label: "볼넷", pct: p.walks, raw: saber.walkRate == null ? null : `볼넷 비율 ${saber.walkRate.toFixed(1)}%` },
  ];
}

/**
 * 선수 화면 'MLB 타자(투수) 중에서'(사용자 11-13 결정, Baseball Savant의 백분위 막대처럼).
 * 제목은 아래 줄과 이어 읽힌다: 'MLB 타자 중에서 타격 상위 41%'(처음 이름 'MLB 안 위치'는 어색하다는 사용자 의견으로 바꿨다).
 * 같은 시즌 MLB 선수 중 어디쯤인지를 네 줄로: 타자는 종합·타격·주루·수비, 투수는 종합·실점 억제·삼진·볼넷.
 * 타율 하나로 폼을 판단하지 않게(사용자: "현대 야구에서 타율만으로 평가하진 않아서"), 실제 값은 막대 아래 한 줄에 작게만 둔다.
 * 중간보다 아래는 순위 대신 회색 '평균 아래'(혹평처럼 읽히지 않게). 숫자는 서버가 MLB 공식 세이버 지표로 계산한다(korleaguer-server#133).
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
    // 서버는 타자 50타석·투수 10이닝 미만이면 위치를 매기지 않는다. -mt-4: 위 칸(시즌 성적)과의 간격 28px을 12px로 줄여 그 칸의 각주처럼 붙인다
    return (
      <p className="-mt-4 px-1 text-meta text-muted">
        {`MLB ${who} 중 위치는 메이저 ${hitter ? "50타석" : "10이닝"}부터 보여요${count > 0 ? `(지금 ${sample})` : ""}.`}
      </p>
    );
  }

  const raws = rows.map((r) => r.raw).filter((raw): raw is string => raw != null);
  return (
    <Section
      id="position-title"
      title={`MLB ${who} 중에서`}
      aside={saber.poolSize > 0 ? `${saber.season} · ${saber.poolSize}명과 비교` : undefined}
    >
      <div className="card px-4 py-4">
        {!steady && (
          <p className="mb-3 text-caption text-muted">
            <span className="mr-1.5 rounded-md bg-surface-2 px-1.5 py-0.5 text-badge">참고용</span>
            {hitter ? `${sample}뿐이라 더 뛰면 크게 바뀔 수 있어요` : `${sample}뿐이라 더 던지면 크게 바뀔 수 있어요`}
          </p>
        )}
        <ul className="space-y-3">
          {rows.map((r) => (
            <PositionRow key={r.label} row={r} who={who} labelCol={hitter ? "2.5rem" : "4.25rem"} />
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
        <p className="mt-3 border-t border-line pt-2.5 text-micro text-muted">
          가운데 선 = MLB 중간 · {hitter ? "득점은 리그 평균 대비(수비는 포지션 난도 포함)" : "ERA-는 100이 평균, 낮을수록 좋아요"} · MLB
          공식 세이버 지표 · {sample}
        </p>
      </div>
    </Section>
  );
}

/** 한 줄: 이름 | 막대(가운데 선 = MLB 중간) | 순위. 이름 칸 폭을 줄마다 같게 해 막대 시작점을 맞춘다 */
function PositionRow({ row, who, labelCol }: { row: Row; who: string; labelCol: string }) {
  const { label, pct } = row;
  const top = pct != null && pct >= 50;
  const verdict = pct == null ? "비교 전" : top ? `상위 ${100 - pct}%` : "평균 아래";
  return (
    <li
      className="grid items-center gap-x-3"
      style={{ gridTemplateColumns: `${labelCol} minmax(0, 1fr) 4.5rem` }}
    >
      <span className="text-summary">{label}</span>
      {/* 바탕은 옅은 안쪽 테두리로 0~100 양 끝을 보인다(흰 카드 위 surface-2만으로는 막대 끝이 거의 안 보였다) */}
      <div aria-hidden className="relative h-2 rounded-full bg-surface-2 ring-1 ring-muted/30 ring-inset">
        {pct != null && (
          <span className={`absolute inset-y-0 left-0 rounded-full ${top ? "bg-accent" : "bg-muted/40"}`} style={{ width: `${pct}%` }} />
        )}
        {/* 가운데 선(MLB 중간): 각주가 읽으라고 하는 기준선이라 바탕 대비 3:1이 되게 muted 70%로, 파랑 채움 위에서도 보이게
            채움 위에 카드색 1px 테두리를 둘러 그린다. 점보다는 아래라 점이 가운데 근처면 점이 선을 덮는다 */}
        <span className="absolute inset-y-[-3px] left-1/2 -ml-px w-0.5 bg-muted/70 ring-1 ring-surface" />
        {pct != null && (
          <span
            className={`absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface ${top ? "bg-accent" : "bg-muted"}`}
            style={{ left: `${pct}%` }}
          />
        )}
      </div>
      <span className={`whitespace-nowrap text-right text-summary font-extrabold tabular-nums ${top ? "text-accent-ink" : "text-muted"}`}>
        <span className="sr-only">{`MLB ${who} 중 `}</span>
        {verdict}
      </span>
    </li>
  );
}
