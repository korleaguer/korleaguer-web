import type { PlayerSaber } from "@/lib/api";
import Section from "@/components/Section";
import { formatInningsOuts } from "@/lib/format";
import { cacheLife } from "next/cache";

/** 이보다 적으면 '참고용'(서버가 견주는 선수 기준과 같다: 타자 100타석, 투수 30이닝 = 90아웃) */
const STEADY_PA = 100;
const STEADY_OUTS = 90;

interface Row {
  label: string;
  /** 1~99(높을수록 좋다). 견줄 선수가 아직 없으면 null */
  pct: number | null;
  /** 바 아래 작은 글씨: 그 칸의 실제 값 */
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
      { label: "주루", pct: p.baseRunning, raw: saber.baseRunning == null ? null : `${signed(saber.baseRunning)}점` },
      { label: "수비", pct: p.fielding, raw: saber.fielding == null ? null : `${signed(saber.fielding)}점` },
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
 * 타율 하나로 폼을 판단하지 않게(사용자: "현대 야구에서 타율만으로 평가하진 않아서"), 실제 값은 바 아래 작게만 둔다.
 * 중간보다 아래는 순위 대신 회색 '평균 아래'(혹평처럼 읽히지 않게). 숫자는 서버가 MLB 공식 세이버 지표로 계산한다(korleaguer-server#133).
 */
export default async function LeaguePosition({ saber }: { saber: PlayerSaber }) {
  "use cache";
  cacheLife({ stale: 30, revalidate: 30, expire: 300 });

  const hitter = saber.kind === "hitter";
  const who = hitter ? "타자" : "투수";
  const sample = hitter ? `${saber.plateAppearances ?? 0}타석` : `${formatInningsOuts(saber.inningsOuts ?? 0)}이닝`;
  const steady = hitter ? (saber.plateAppearances ?? 0) >= STEADY_PA : (saber.inningsOuts ?? 0) >= STEADY_OUTS;
  const rows = rowsOf(saber);

  return (
    <Section
      id="position-title"
      title={`MLB ${who} 중에서`}
      aside={rows && saber.poolSize > 0 ? `${saber.season} · ${saber.poolSize}명과 비교` : undefined}
    >
      <div className="card px-4 py-4">
        {!rows ? (
          // 표본이 적으면 서버가 위치를 매기지 않는다(타자 50타석·투수 10이닝 미만)
          <p className="text-sm text-muted">
            {hitter ? `아직 ${sample}이라 위치를 매기지 않았어요. 50타석부터 보여요.` : `아직 ${sample}이라 위치를 매기지 않았어요. 10이닝부터 보여요.`}
          </p>
        ) : (
          <>
            {!steady && (
              <p className="mb-3 text-xs text-muted">
                <span className="mr-1.5 rounded-md bg-surface-2 px-1.5 py-px font-bold">참고용</span>
                {hitter ? `${sample}뿐이라 더 뛰면 크게 바뀔 수 있어요` : `${sample}뿐이라 더 던지면 크게 바뀔 수 있어요`}
              </p>
            )}
            <ul className="space-y-3.5">
              {rows.map((r) => (
                <PositionRow key={r.label} row={r} who={who} />
              ))}
            </ul>
            <p className="mt-3.5 border-t border-line pt-2.5 text-[0.6875rem] leading-relaxed text-muted">
              가운데 선 = MLB 중간 · {hitter ? "득점은 리그 평균 대비(수비는 포지션 난도 포함)" : "ERA-는 100이 평균, 낮을수록 좋아요"} · MLB
              공식 세이버 지표 · {sample}
            </p>
          </>
        )}
      </div>
    </Section>
  );
}

function PositionRow({ row, who }: { row: Row; who: string }) {
  const { label, pct, raw } = row;
  const top = pct != null && pct >= 50;
  const verdict = pct == null ? "아직 비교 전" : top ? `상위 ${100 - pct}%` : "평균 아래";
  return (
    <li>
      <div className="flex items-baseline justify-between">
        <span className="text-[0.9375rem] font-bold">{label}</span>
        <span className={`text-[0.9375rem] font-extrabold tabular-nums ${top ? "text-accent-ink" : "text-muted"}`}>
          <span className="sr-only">{`MLB ${who} 중 `}</span>
          {verdict}
        </span>
      </div>
      <div aria-hidden className="relative mt-1.5 h-2 rounded-full bg-surface-2">
        <span className="absolute inset-y-[-3px] left-1/2 w-px bg-line" />
        {pct != null && (
          <>
            <span className={`absolute inset-y-0 left-0 rounded-full ${top ? "bg-accent" : "bg-muted/40"}`} style={{ width: `${pct}%` }} />
            <span
              className={`absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface ${top ? "bg-accent" : "bg-muted"}`}
              style={{ left: `${pct}%` }}
            />
          </>
        )}
      </div>
      {raw && <p className="mt-1 text-[0.6875rem] text-muted tabular-nums">{raw}</p>}
    </li>
  );
}
