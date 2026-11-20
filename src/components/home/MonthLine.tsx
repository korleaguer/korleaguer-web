import type { SeasonMonth } from "@/lib/api";
import { formatEra } from "@/lib/format";
import { leagueWords, signedPct } from "@/lib/leagueWords";

/** 그 달 리그 평균 대비 값(100 = 평균, 높을수록 잘함). 타자 wRC+, 투수 ERA+ */
function plus(m: SeasonMonth, pitcher: boolean): number | null {
  const v = pitcher ? m.eraPlus : m.wrcPlus;
  // 서버가 소수로 줘도 이름표·낭독은 정수로
  return v == null ? null : Math.round(v);
}

/** 선에 올리는 달: 메이저·마이너에서 뛰어 값이 있는 달 */
function played(m: SeasonMonth, pitcher: boolean): boolean {
  return (m.kind === "MLB" || m.kind === "MINORS") && plus(m, pitcher) != null;
}

/** 점 하나: i는 달 칸 번호, x·y는 그래프 좌표(viewBox 단위) */
interface Pt {
  i: number;
  x: number;
  y: number;
  v: number;
  /** 경기 적은 달(서버 few): 세로 범위·최고·최저에서 뺀다 */
  few: boolean;
}

/**
 * 단조 3차 곡선 경로(Fritsch–Carlson): 점과 점 사이에서 값보다 위아래로 넘치지 않는다. 보통의 부드러운 곡선은 한 달 반짝한 값 옆에서
 * 점보다 위로 부풀어 '그 달에 없던 값'을 그린다
 */
function smoothPath(p: Pt[]): string {
  const f = (n: number) => n.toFixed(1);
  let s = `M${f(p[0].x)},${f(p[0].y)}`;
  if (p.length === 1) return s;
  const n = p.length;
  const d: number[] = [];
  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) d.push((p[i + 1].y - p[i].y) / (p[i + 1].x - p[i].x));
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / d[i];
    const b = m[i + 1] / d[i];
    const q = a * a + b * b;
    if (q > 9) {
      const t = 3 / Math.sqrt(q);
      m[i] = t * a * d[i];
      m[i + 1] = t * b * d[i];
    }
  }
  for (let i = 0; i < n - 1; i++) {
    const h = (p[i + 1].x - p[i].x) / 3;
    s += ` C${f(p[i].x + h)},${f(p[i].y + m[i] * h)} ${f(p[i + 1].x - h)},${f(p[i + 1].y - m[i + 1] * h)} ${f(p[i + 1].x)},${f(p[i + 1].y)}`;
  }
  return s;
}

/**
 * 그래프 둘레 여백(viewBox 단위). 큰 그래프는 위에 '최고' 이름표, 아래에 '최저' 이름표와 달 이름 줄(달 이름 + 작은 글자) 자리.
 * 높이 164는 10.25rem이라 큰 글씨에서는 글자와 함께 커진다
 */
interface Frame {
  w: number;
  h: number;
  padT: number;
  padB: number;
  padL: number;
  padR: number;
}

const BIG: Frame = { w: 340, h: 164, padT: 28, padB: 56, padL: 6, padR: 6 };
const SMALL: Frame = { w: 84, h: 30, padT: 3, padB: 3, padL: 2, padR: 2 };

/** 선·점 색: 파랑(accent) 한 색 */
const LINE = "var(--accent)";
/** 평균(100) 점선: 흐린 글자색 그대로(라이트 대비 6:1) */
const AVERAGE = "var(--muted)";

/**
 * 그래프 좌표 계산: 달 칸 → 점. 세로 범위는 선수마다 자동이다.
 * - 100(평균)을 늘 포함하고 위아래 8% 여유를 둔 뒤, 평균 100 ±20보다 좁으면 넓힌다(99~101처럼 값 차이가 작아도 출렁이지 않게).
 * - 경기 적은 달(few)은 범위 계산에서 뺀다(4경기 wRC+ 249 하나가 범위를 늘려 나머지 달이 납작해지지 않게). 경기 적지 않은 달이
 *   하나도 없으면 모든 달로 정한다. 범위를 넘는 few 달의 점은 그래프 위·아래 끝에 붙인다.
 * 기록 없는 달(부상·FA 등)은 건너뛰고 앞뒤 기록 있는 달을 한 곡선으로 바로 잇는다.
 */
function layout(months: SeasonMonth[], pitcher: boolean, f: Frame) {
  const n = months.length;
  const playedMonths = months.filter((m) => played(m, pitcher));
  const solid = playedMonths.filter((m) => m.few !== true);
  const vals = (solid.length > 0 ? solid : playedMonths).map((m) => plus(m, pitcher) as number);
  let lo = Math.min(...vals, 100);
  let hi = Math.max(...vals, 100);
  const span = hi - lo || 40;
  lo -= span * 0.08;
  hi += span * 0.08;
  lo = Math.min(lo, 80);
  hi = Math.max(hi, 120);
  const bottom = f.h - f.padB;
  const y = (v: number) => f.padT + (1 - (v - lo) / (hi - lo)) * (bottom - f.padT);
  const x = (i: number) => (n === 1 ? f.w / 2 : f.padL + (i * (f.w - f.padL - f.padR)) / (n - 1));
  const pts: Pt[] = [];
  months.forEach((m, i) => {
    const v = plus(m, pitcher);
    if (!played(m, pitcher) || v == null) return;
    pts.push({ i, x: x(i), y: Math.min(bottom, Math.max(f.padT, y(v))), v, few: m.few === true });
  });
  return { pts, x, y100: y(100) };
}

/** 평균 점선(가로로 늘어나도 점선 간격은 그대로) */
function AverageLine({ f, y100, opacity, scaled }: { f: Frame; y100: number; opacity: number; scaled: boolean }) {
  return (
    <line
      data-avg
      x1="0"
      x2={f.w}
      y1={y100}
      y2={y100}
      stroke={AVERAGE}
      strokeOpacity={opacity}
      strokeDasharray="2 3"
      strokeWidth="1"
      vectorEffect={scaled ? "non-scaling-stroke" : undefined}
    />
  );
}

/** 곡선 하나. 기록 있는 달이 하나뿐이면 선이 없어 점은 호출한 쪽이 그린다 */
function Curve({ pts, lineWidth, scaled }: { pts: Pt[]; lineWidth: number; scaled: boolean }) {
  if (pts.length < 2) return null;
  return (
    <path
      data-line
      d={smoothPath(pts)}
      fill="none"
      stroke={LINE}
      strokeWidth={lineWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      vectorEffect={scaled ? "non-scaling-stroke" : undefined}
    />
  );
}

/**
 * 성적표 아래 창·PC 오른쪽 칸의 달별 꺾은선(사용자 11-20 '토스형 꺾은선', 이슈 #347 → 효과를 걷어낸 단순형 #359).
 * 그리는 값은 막대 시절 그대로다: 그 리그 평균 대비(타자 wRC+, 투수 ERA+, 100 = 평균). 마이너는 그 단계 리그 평균과 비교한다(서버).
 * - 선: 단조 곡선 하나, 파랑 한 색. 칠·색 가르기·점선·단계 띠는 두지 않는다('이런저런 효과' 빼기, 사용자 11-20).
 *   기록 없는 달(부상·FA)은 건너뛰고 앞뒤 기록 있는 달을 곡선으로 바로 잇는다(선이 뚝뚝 끊기지 않게). 한 달뿐이면 점 하나.
 * - 숫자는 가장 높은 달·낮은 달에 '최고 N'·'최저 N'만 쓰고(토스증권 차트 방식) 그 두 달과 마지막 달에만 작은 점을 찍는다.
 *   경기 적은 달(서버 few)은 최고·최저 후보와 세로 범위에서 뺀다.
 * - 달 이름 밑에 기록 없는 달·경기 적은 달의 이유를 작은 흐린 글자로('부상'·'FA'·'4경기'·'4등판').
 * - 폭이 휴대폰 창(~343px)부터 PC 오른쪽 칸까지 바뀌어, 선수 화면 타격 흐름(WrcTrend)처럼 SVG를 가로로 늘이고(preserveAspectRatio="none",
 *   선은 non-scaling-stroke) 글자·점은 SVG 밖의 % 자리 HTML로 둔다(SVG 안 글자는 같이 찌그러진다). 높이는 rem이라 큰 글씨에서 같이 커진다.
 *   글자 크기는 칸 폭이 허락하는 만큼만 키운다(globals.css .month-line, 이슈 #264).
 * 화면 읽기 프로그램에는 달마다 '4월 메이저 31경기 평균보다 18% 잘 침' 한 줄씩 읽힌다(그림은 숨긴다).
 */
export default function MonthLine({ months, pitcher }: { months: SeasonMonth[]; pitcher: boolean }) {
  if (months.length === 0) return null;
  const f = BIG;
  const { pts, x, y100 } = layout(months, pitcher, f);
  const playedMonths = months.filter((m) => played(m, pitcher));
  const hasMajors = playedMonths.some((m) => m.kind === "MLB");
  const minorLevels = new Set(playedMonths.filter((m) => m.kind === "MINORS").map((m) => m.levelKo ?? "마이너"));
  // 비교한 리그가 둘 이상이면(메이저 + 트리플A, 트리플A + 더블A) 달마다 평균이 다르다
  const average = (hasMajors ? 1 : 0) + minorLevels.size > 1 ? "각 리그 평균" : "리그 평균";

  const px = (v: number) => `${((v / f.w) * 100).toFixed(2)}%`;
  const py = (v: number) => `${((v / f.h) * 100).toFixed(2)}%`;
  const lastIdx = months.length - 1;
  const first = pts.length > 0 ? pts[0] : null;
  const last = pts.length > 0 ? pts[pts.length - 1] : null;
  // '평균' 이름표: 양 끝 중 선이 점선에서 더 먼 쪽(최고·최저 이름표·마지막 점과 겹치지 않게). 선이 끝 달에 닿지 않으면 먼 것으로 친다.
  // 같으면 왼쪽, 양 끝 모두 안 닿으면 오른쪽. 오른쪽인데 마지막 점이 이름표 칸(점선 위 18 ~ 아래 4)에 들면 점 안쪽으로 비킨다
  const farFirst = first && first.i === 0 ? Math.abs(first.y - y100) : 99;
  const farLast = last && last.i === lastIdx ? Math.abs(last.y - y100) : 99;
  const avgRight = farLast > farFirst || (farLast === 99 && farFirst === 99);
  const avgInset = avgRight && last && last.i === lastIdx && last.y > y100 - 18 && last.y < y100 + 4 ? 10 : 0;
  // 최고·최저 후보에서 경기 적은 달은 뺀다(후보가 없으면 이름표 없음)
  const cand = pts.filter((q) => !q.few);
  const mx = cand.length > 0 ? cand.reduce((a, b) => (b.v > a.v ? b : a)) : null;
  const mn = cand.length > 0 ? cand.reduce((a, b) => (b.v < a.v ? b : a)) : null;
  const dots = [...new Set([mx, mn, last].filter((q): q is Pt => q != null))];

  /** 점 바로 위·아래 이름표 자리: 양 끝 달은 글자를 안쪽으로 붙이고, 가운데는 점 위에 가운데 맞춘다 */
  const labelStyle = (q: Pt, above: boolean) => {
    const vert = above ? { bottom: `calc(${100 - (q.y / f.h) * 100}% + 7px)` } : { top: `calc(${py(q.y)} + 7px)` };
    if (q.i === 0) return { ...vert, left: `calc(${px(q.x)} - 4px)` };
    if (q.i === lastIdx) return { ...vert, right: `calc(${100 - (q.x / f.w) * 100}% - 4px)` };
    return { ...vert, left: px(q.x), transform: "translateX(-50%)" };
  };

  return (
    <div className="mt-3">
      <p className="mb-1.5 text-caption text-muted">달마다 평균 대비</p>
      {/* 화면 읽기: 그림은 숨기고 달마다 한 줄씩 */}
      <ol className="sr-only" aria-label={`달마다 ${average} 대비`}>
        {months.map((m) => (
          <li key={m.month}>{spoken(m, pitcher)}</li>
        ))}
      </ol>
      {/* month-line: 글자는 칸 폭이 허락하는 만큼만 키운다(globals.css, 이슈 #264) */}
      <div aria-hidden className="month-line relative h-[10.25rem]">
        <svg viewBox={`0 0 ${f.w} ${f.h}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
          <AverageLine f={f} y100={y100} opacity={0.7} scaled />
          <Curve pts={pts} lineWidth={2.25} scaled />
        </svg>
        {pts.length > 0 && (
          <span
            className="month-line-label pointer-events-none absolute -translate-y-full pb-px text-muted"
            style={avgRight ? { right: avgInset, top: py(y100) } : { left: 0, top: py(y100) }}
          >
            평균
          </span>
        )}
        {mx && (
          <span className="month-line-label absolute whitespace-nowrap text-foreground" style={labelStyle(mx, true)}>
            <span className="text-muted">최고 </span>
            <b>{signedPct(mx.v)}</b>
          </span>
        )}
        {mx && mn && mn !== mx && (
          <span className="month-line-label absolute whitespace-nowrap text-foreground" style={labelStyle(mn, false)}>
            <span className="text-muted">최저 </span>
            <b>{signedPct(mn.v)}</b>
          </span>
        )}
        {/* 최고·최저 달과 마지막 달에만 작은 점(테두리·옅은 원 없이 파랑 6px) */}
        {dots.map((q) => (
          <span
            key={q.i}
            data-dot
            className="absolute size-[6px] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ left: px(q.x), top: py(q.y), background: LINE }}
          />
        ))}
        {/* 달 이름 줄: 양 끝은 안쪽으로 붙여 카드 밖으로 나가지 않게. 이름 밑에 작은 흐린 글자(부상·FA·4경기)를 둔다 */}
        {months.map((m, i) => (
          <span
            key={m.month}
            className={`absolute bottom-0 flex flex-col whitespace-nowrap tabular-nums text-muted ${i === 0 ? "items-start" : i === lastIdx ? "items-end" : "items-center"}`}
            style={
              i === 0
                ? { left: px(x(i)) }
                : i === lastIdx
                  ? { right: `${100 - (x(i) / f.w) * 100}%` }
                  : { left: px(x(i)), transform: "translateX(-50%)" }
            }
          >
            <span className="month-line-small">{`${m.month}월`}</span>
            <span className="month-line-small">{note(m, pitcher) ?? " "}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/** 달 이름 밑 작은 글자: 기록 없는 달은 이유('부상'·'FA', 그 밖은 '–'), 경기 적은 달은 '4경기'·'4등판' */
function note(m: SeasonMonth, pitcher: boolean): string | null {
  if (!played(m, pitcher)) return m.kind === "INJURED" ? "부상" : m.kind === "FREE_AGENT" ? "FA" : "–";
  return m.few === true ? `${m.games}${pitcher ? "등판" : "경기"}` : null;
}

/** 화면 읽기 한 줄: '4월 메이저 31경기 평균보다 18% 잘 침'(투수는 평균자책점도), 기록 없는 달은 '9월 부상' */
function spoken(m: SeasonMonth, pitcher: boolean): string {
  if (!played(m, pitcher)) {
    const rest = m.kind === "INJURED" ? "부상" : m.kind === "FREE_AGENT" ? "FA" : "기록 없음";
    return `${m.month}월 ${rest}`;
  }
  const v = plus(m, pitcher) as number;
  const where = m.kind === "MLB" ? "메이저" : (m.levelKo ?? "마이너");
  return pitcher
    ? `${m.month}월 ${where} ${m.games}등판 ${leagueWords(v, true).text}, 평균자책점 ${formatEra(m.era)}${m.few ? ", 등판 적은 달" : ""}`
    : `${m.month}월 ${where} ${m.games}경기 ${leagueWords(v, false).text}${m.few ? ", 경기 적은 달" : ""}`;
}

/**
 * 성적표 목록 한 줄 오른쪽의 작은 달별 꺾은선(이슈 #276 → #347 → 단순형 #359). 펼치지 않아도 선수마다 한 해 모양(언제 잘했고 언제 빠졌나)을
 * 나란히 견주게 한다. 큰 그래프(MonthLine)와 같은 곡선·같은 세로 범위 규칙이고 점·글자 없이 평균 점선 + 선만 둔다(한 달뿐이면 점 하나).
 * 펼치기 버튼 안에 놓이고 버튼 이름에 섞이지 않게 화면 읽기 프로그램에는 숨긴다(같은 값은 펼친 곳이 달마다 읽어 준다).
 * 크기는 px로 고정해 큰 글씨에서도 찌그러지지 않는다.
 */
export function MonthSpark({ months, pitcher }: { months: SeasonMonth[]; pitcher: boolean }) {
  if (months.length === 0) return null;
  const f = SMALL;
  const { pts, y100 } = layout(months, pitcher, f);
  return (
    <svg aria-hidden viewBox={`0 0 ${f.w} ${f.h}`} width={f.w} height={f.h} className="block h-[30px] w-[84px] overflow-visible">
      <AverageLine f={f} y100={y100} opacity={0.6} scaled={false} />
      <Curve pts={pts} lineWidth={1.75} scaled={false} />
      {pts.length === 1 && <circle data-dot cx={pts[0].x} cy={pts[0].y} r={2} fill={LINE} />}
    </svg>
  );
}
