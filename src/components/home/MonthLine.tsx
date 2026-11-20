import { useId } from "react";
import type { SeasonMonth } from "@/lib/api";
import { formatEra } from "@/lib/format";

/** 그 달 리그 평균 대비 값(100 = 평균, 높을수록 잘함). 타자 wRC+, 투수 ERA+ */
function plus(m: SeasonMonth, pitcher: boolean): number | null {
  const v = pitcher ? m.eraPlus : m.wrcPlus;
  // 서버가 소수로 줘도 이름표·낭독은 정수로(이름표 폭 계산이 정수 세 자리를 기준으로 한다)
  return v == null ? null : Math.round(v);
}

/** 선에 올리는 달: 메이저·마이너에서 뛰어 값이 있는 달 */
function played(m: SeasonMonth, pitcher: boolean): boolean {
  return (m.kind === "MLB" || m.kind === "MINORS") && plus(m, pitcher) != null;
}

/** 값 글자(음수는 긴 빼기표) */
function plusText(v: number): string {
  return v < 0 ? `−${Math.abs(v)}` : String(v);
}

/** 점 하나: i는 달 칸 번호, x·y는 그래프 좌표(viewBox 단위) */
interface Pt {
  i: number;
  x: number;
  y: number;
  v: number;
  /** 경기 적은 달(서버 few): 값이 흔들리기 쉬워 곡선을 점선으로 그리고 세로 범위·최고·최저에서 뺀다 */
  few: boolean;
  /** 값이 세로 범위를 넘어 점을 위(-1)·아래(1) 끝에 붙였나(0 = 안 넘음) */
  edge: -1 | 0 | 1;
}

/**
 * 단조 3차 곡선(Fritsch–Carlson): 점과 점 사이에서 값보다 위아래로 넘치지 않는다. 보통의 부드러운 곡선은 한 달 반짝한 값 옆에서
 * 점보다 위로 부풀어 '그 달에 없던 값'을 그리고, 평균 점선을 넘나드는 색 갈림도 어긋난다
 */
function smoothBeziers(p: Pt[]): number[][] {
  if (p.length === 1) return [];
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
    const s = a * a + b * b;
    if (s > 9) {
      const t = 3 / Math.sqrt(s);
      m[i] = t * a * d[i];
      m[i + 1] = t * b * d[i];
    }
  }
  // 달 사이 구간마다 3차 곡선 하나: [제어점1 x, y, 제어점2 x, y, 끝 x, y]
  const segs: number[][] = [];
  for (let i = 0; i < n - 1; i++) {
    const h = (p[i + 1].x - p[i].x) / 3;
    segs.push([p[i].x + h, p[i].y + m[i] * h, p[i + 1].x - h, p[i + 1].y - m[i + 1] * h, p[i + 1].x, p[i + 1].y]);
  }
  return segs;
}

/** 구간마다 SVG 경로 조각('Cx1,y1 x2,y2 x,y') */
function smoothSegments(p: Pt[]): string[] {
  const f = (n: number) => n.toFixed(1);
  return smoothBeziers(p).map((b) => `C${f(b[0])},${f(b[1])} ${f(b[2])},${f(b[3])} ${f(b[4])},${f(b[5])}`);
}

/** 곡선 위 점들(글자가 선과 겹치는지 가늠하는 데 쓴다): 구간마다 t를 10등분 */
function curveSamples(p: Pt[]): { x: number; y: number }[] {
  if (p.length < 2) return [];
  const out = [{ x: p[0].x, y: p[0].y }];
  smoothBeziers(p).forEach((b, i) => {
    const [x0, y0] = [p[i].x, p[i].y];
    for (let k = 1; k <= 10; k++) {
      const t = k / 10;
      const u = 1 - t;
      const w = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
      out.push({
        x: w[0] * x0 + w[1] * b[0] + w[2] * b[2] + w[3] * b[4],
        y: w[0] * y0 + w[1] * b[1] + w[2] * b[3] + w[3] * b[5],
      });
    }
  });
  return out;
}

/** 곡선 전체 경로(칠 영역용) */
function smoothPath(p: Pt[]): string {
  return `M${p[0].x.toFixed(1)},${p[0].y.toFixed(1)}${smoothSegments(p).map((c) => ` ${c}`).join("")}`;
}

/**
 * 같은 곡선을 달 사이 구간마다 나눠 경기 적은 달로 들어가고 나오는 구간(dashed)과 아닌 구간으로 묶는다.
 * 접선은 구간 전체로 한 번 구하니 모양은 smoothPath와 같다
 */
function smoothGroups(p: Pt[]): { d: string; dashed: boolean }[] {
  const segs = smoothSegments(p);
  const f = (n: number) => n.toFixed(1);
  const groups: { d: string; dashed: boolean }[] = [];
  segs.forEach((c, i) => {
    const dashed = p[i].few || p[i + 1].few;
    const last = groups[groups.length - 1];
    if (last && last.dashed === dashed) last.d += ` ${c}`;
    else groups.push({ d: `M${f(p[i].x)},${f(p[i].y)} ${c}`, dashed });
  });
  return groups;
}

/**
 * 그래프 둘레 여백(viewBox 단위). 큰 그래프는 위에 단계 이름 줄(14) + '최고' 이름표, 아래에 '최저'·달 이름 자리.
 * 첫 달이 마이너이고 최고 달이면 두 글자가 같은 자리라, 단계 이름은 맨 윗줄에 따로 둔다(시안은 26이었다)
 */
interface Frame {
  w: number;
  h: number;
  padT: number;
  padB: number;
  padL: number;
  padR: number;
}

/** 큰 그래프 틀. 높이 164는 10.25rem이라 큰 글씨에서는 글자와 함께 커진다 */
const BIG: Frame = { w: 340, h: 164, padT: 40, padB: 40, padL: 6, padR: 6 };
const SMALL: Frame = { w: 84, h: 30, padT: 3, padB: 3, padL: 2, padR: 2 };

/**
 * 선 색. 평균 위는 파랑(accent), 아래는 회색: 글자색(muted)을 카드 색과 섞어 옅게 만든다(라이트·다크 모두 따라간다).
 * 고대비 모드에서는 globals.css가 data-line·data-area로 시스템 색으로 다시 칠한다
 */
const UP = "var(--accent)";
const DOWN = "color-mix(in srgb, var(--muted) 70%, var(--surface))";
/** 평균(100) 점선: 흐린 글자색 그대로(라이트 대비 6:1) */
const AVERAGE = "var(--muted)";

/**
 * 그래프 좌표 계산: 달 칸 → 점, 세로 범위는 선수마다 자동(100을 늘 포함, 위아래 8% 여유라 음수 달끼리도 갈린다. 단 100 ±20보다 좁아지지는 않는다).
 * 기록 있는 달이 이어진 구간(runs)마다 선 하나이고 기록 없는 달에서 끊는다
 */
function layout(months: SeasonMonth[], pitcher: boolean, f: Frame) {
  const n = months.length;
  // 세로 범위는 경기 적은 달을 빼고 정한다(4경기 wRC+ 249 하나가 범위를 늘려 나머지 달이 납작해지지 않게).
  // 경기 적지 않은 달이 하나도 없으면 모든 달로 정한다
  const playedMonths = months.filter((m) => played(m, pitcher));
  const solid = playedMonths.filter((m) => m.few !== true);
  const vals = (solid.length > 0 ? solid : playedMonths).map((m) => plus(m, pitcher) as number);
  let lo = Math.min(...vals, 100);
  let hi = Math.max(...vals, 100);
  const span = hi - lo || 40;
  lo -= span * 0.08;
  hi += span * 0.08;
  // 최소 폭: 평균 100 ±20보다 좁으면 넓힌다(99~101처럼 값 차이가 작은 선수의 선이 크게 출렁이지 않게)
  lo = Math.min(lo, 80);
  hi = Math.max(hi, 120);
  const bottom = f.h - f.padB;
  const y = (v: number) => f.padT + (1 - (v - lo) / (hi - lo)) * (bottom - f.padT);
  const x = (i: number) => (n === 1 ? f.w / 2 : f.padL + (i * (f.w - f.padL - f.padR)) / (n - 1));
  const runs: Pt[][] = [];
  let run: Pt[] = [];
  months.forEach((m, i) => {
    const v = plus(m, pitcher);
    if (!played(m, pitcher) || v == null) {
      if (run.length) runs.push(run);
      run = [];
      return;
    }
    // 범위를 넘는 경기 적은 달은 점을 그래프 위·아래 끝에 붙인다(곡선도 그 점까지)
    const raw = y(v);
    const yy = Math.min(bottom, Math.max(f.padT, raw));
    run.push({ i, x: x(i), y: yy, v, few: m.few === true, edge: raw < f.padT ? -1 : raw > bottom ? 1 : 0 });
  });
  if (run.length) runs.push(run);
  return { runs, x, y, y100: y(100), bottom };
}

/** 평균 위 구간만 / 아래 구간만 보이게 가르는 clipPath 둘과 칠 기울기(선 아래로 옅어진다) */
function Defs({ id, f, y100, bottom, alpha }: { id: string; f: Frame; y100: number; bottom: number; alpha: number }) {
  return (
    <defs>
      <linearGradient id={`${id}g`} x1="0" y1={f.padT} x2="0" y2={bottom} gradientUnits="userSpaceOnUse">
        <stop offset="0" style={{ stopColor: UP, stopOpacity: alpha }} />
        <stop offset="1" style={{ stopColor: UP, stopOpacity: 0 }} />
      </linearGradient>
      <linearGradient id={`${id}h`} x1="0" y1={f.padT} x2="0" y2={bottom} gradientUnits="userSpaceOnUse">
        <stop offset="0" style={{ stopColor: DOWN, stopOpacity: 0.18 }} />
        <stop offset="1" style={{ stopColor: DOWN, stopOpacity: 0 }} />
      </linearGradient>
      <clipPath id={`${id}a`}>
        <rect x="-10" y="-10" width={f.w + 20} height={y100 + 10} />
      </clipPath>
      <clipPath id={`${id}b`}>
        <rect x="-10" y={y100} width={f.w + 20} height={f.h} />
      </clipPath>
    </defs>
  );
}

/** 구간마다 선 + 아래 칠. 한 달뿐인 구간은 선이 없어 칠도 없다(점은 호출한 쪽이 그린다) */
function Runs({
  id,
  runs,
  bottom,
  lineWidth,
  scaled,
}: {
  id: string;
  runs: Pt[][];
  bottom: number;
  lineWidth: number;
  /** true면 가로로 늘어나는 그림이라 선 굵기를 화면 픽셀로 고정한다 */
  scaled: boolean;
}) {
  const ve = scaled ? ("non-scaling-stroke" as const) : undefined;
  return (
    <>
      {runs.map((r) => {
        const line = smoothPath(r);
        const area = `${line} L${r[r.length - 1].x.toFixed(1)},${bottom} L${r[0].x.toFixed(1)},${bottom} Z`;
        const common = { fill: "none", strokeWidth: lineWidth, strokeLinecap: "round" as const, vectorEffect: ve };
        return (
          <g key={r[0].i}>
            {r.length > 1 && (
              <>
                <path data-area d={area} fill={`url(#${id}g)`} clipPath={`url(#${id}a)`} />
                <path data-area d={area} fill={`url(#${id}h)`} clipPath={`url(#${id}b)`} />
              </>
            )}
            {r.length > 1 &&
              smoothGroups(r).map((g, gi) => {
                // 점선: 둥근 끝 + 아주 짧은 선이라 점이 된다. 굵기는 그대로, 간격만 짧게
                const dash = g.dashed ? { strokeDasharray: `0.1 ${(lineWidth * 1.8).toFixed(1)}` } : {};
                return (
                  <g key={gi}>
                    <path data-line d={g.d} stroke={UP} clipPath={`url(#${id}a)`} {...common} {...dash} />
                    <path data-line="dim" d={g.d} stroke={DOWN} clipPath={`url(#${id}b)`} {...common} {...dash} />
                  </g>
                );
              })}
          </g>
        );
      })}
    </>
  );
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

/** 점 색: 그 값이 평균 위면 파랑, 아래면 회색 */
function dotColor(v: number): string {
  return v < 100 ? DOWN : UP;
}

/** SVG id에 쓸 수 없는 글자를 걷는다(useId는 «r0»·:r0: 모양이다) */
function useSvgId(): string {
  return useId().replace(/[^a-zA-Z0-9]/g, "");
}

/** 마이너 달 구간(단계가 바뀌면 나눈다): 옅은 배경 띠 + 왼쪽 위 단계 이름 */
function minorBands(months: SeasonMonth[]): { from: number; to: number; level: string }[] {
  const bands: { from: number; to: number; level: string }[] = [];
  months.forEach((m, i) => {
    if (m.kind !== "MINORS") return;
    const level = m.levelKo ?? "마이너";
    const prev = bands[bands.length - 1];
    if (prev && prev.to === i - 1 && prev.level === level) prev.to = i;
    else bands.push({ from: i, to: i, level });
  });
  return bands;
}

/**
 * 성적표 아래 창·PC 오른쪽 칸의 달별 꺾은선(사용자 11-20 '토스형 꺾은선 T2', 이슈 #347). 예전 막대 여섯 개(이슈 #239·#242·#261)를 바꿨다.
 * 그리는 값은 그대로다: 그 리그 평균 대비(타자 wRC+, 투수 ERA+, 100 = 평균). 마이너는 그 단계 리그 평균과 비교한다(서버).
 * - 선: 단조 3차 곡선 하나, 아래로 옅어지는 칠. 평균(100) 점선 위 구간은 파랑, 아래 구간은 회색(clipPath로 가른다).
 *   세로 범위는 선수마다 자동이라 점선 위아래 어디에 몰려도 달끼리 구분된다. 기록 없는 달(부상·FA·없음)에서는 선을 끊고,
 *   앞뒤가 끊긴 외딴 한 달은 점 하나로 둔다.
 * - 숫자는 달마다 쓰지 않고 가장 높은 달·낮은 달에 '최고 N'·'최저 N'만, 마지막 달 점만 강조한다(토스증권 차트 방식).
 *   200 넘는 달의 꺾임 표시는 곡선에서는 뜻이 없어 없앴다. 경기 적은 달(서버 few)은 세로 범위·최고·최저에서 빼고
 *   곡선을 점선으로 그린다(4경기 wRC+ 249가 '최고'가 되고 범위를 늘려 나머지 달이 납작해지지 않게, 이슈 #349). 범위를 넘으면
 *   점을 끝에 붙이고 ▲▼ + 'N경기' 글자.
 * - 마이너 달은 옅은 둥근 띠와 단계 이름('트리플A')으로 어디서 뛰었는지 보이고(색 대신 띠라 메이저 선과 한 선으로 이어진다),
 *   부상 달은 바닥에 본문 글자색 '부상' + 빨간 짧은 줄(빨간 글자는 주황과 헷갈려 줄에만, 사용자 11-17), FA 달은 'FA'.
 * - 폭이 휴대폰 창(~343px)부터 PC 오른쪽 칸까지 바뀌어, 선수 화면 타격 흐름(WrcTrend)처럼 SVG를 가로로 늘이고(preserveAspectRatio="none",
 *   선은 non-scaling-stroke) 글자·점은 SVG 밖의 % 자리 HTML로 둔다(SVG 안 글자는 같이 찌그러진다). 높이는 rem이라 큰 글씨에서 같이 커진다.
 *   글자 크기는 칸 폭이 허락하는 만큼만 키운다(globals.css .month-line, 이슈 #264).
 * 화면 읽기 프로그램에는 달마다 '4월 메이저 31경기 wRC+ 118' 한 줄씩 읽힌다(그림은 숨긴다).
 */
export default function MonthLine({ months, pitcher }: { months: SeasonMonth[]; pitcher: boolean }) {
  const id = useSvgId();
  if (months.length === 0) return null;
  const stat = pitcher ? "ERA+" : "wRC+";
  const f = BIG;
  const { runs, x, y100, bottom } = layout(months, pitcher, f);
  const all = runs.flat();
  const playedMonths = months.filter((m) => played(m, pitcher));
  const hasMajors = playedMonths.some((m) => m.kind === "MLB");
  const minorLevels = new Set(playedMonths.filter((m) => m.kind === "MINORS").map((m) => m.levelKo ?? "마이너"));
  // 비교한 리그가 둘 이상이면(메이저 + 트리플A, 트리플A + 더블A) 달마다 평균이 다르다
  const average = (hasMajors ? 1 : 0) + minorLevels.size > 1 ? "각 리그 평균" : "리그 평균";

  const px = (v: number) => `${((v / f.w) * 100).toFixed(2)}%`;
  const py = (v: number) => `${((v / f.h) * 100).toFixed(2)}%`;
  const last = all.length > 0 ? all[all.length - 1] : null;
  const lastIdx = months.length - 1;
  // '평균' 이름표: 양 끝 중 선이 점선에서 더 먼 쪽(최고·최저 이름표와 겹치지 않게). 선이 끝 달에 닿지 않으면 먼 것으로 친다
  const first = all.length > 0 ? all[0] : null;
  const farFirst = first && first.i === 0 ? Math.abs(first.y - y100) : 99;
  const farLast = last && last.i === lastIdx ? Math.abs(last.y - y100) : 99;
  // 같으면 왼쪽: 오른쪽 끝에는 마지막 달 강조 점(옅은 원 지름 16)이 있어 이름표를 가린다(평평한 선수). 오른쪽이 점선에 가까우면 점 안쪽으로 비킨다
  // 양 끝 모두 선이 닿지 않으면(처음·끝 달이 부상·FA) 오른쪽(강조 점도 없다)
  const avgRight = farLast > farFirst || (farLast === 99 && farFirst === 99);
  // 오른쪽 끝 강조 점의 옅은 원(반지름 8)이 이름표 칸(점선 위 15, 아래 0)에 닿으면 점 안쪽으로 14px 비킨다
  const avgInset = avgRight && last && last.i === lastIdx && last.y > y100 - 23 && last.y < y100 + 8 ? 14 : 0;
  // 최고·최저 후보에서 경기 적은 달은 뺀다(후보가 없으면 이름표 없음)
  const cand = all.filter((q) => !q.few);
  const mx = cand.length > 0 ? cand.reduce((a, b) => (b.v > a.v ? b : a)) : null;
  const mn = cand.length > 0 ? cand.reduce((a, b) => (b.v < a.v ? b : a)) : null;

  /** 점 바로 위·아래 이름표 자리: 양 끝 달은 글자를 안쪽으로 붙이고, 가운데는 점 위에 가운데 맞춘다 */
  const labelStyle = (q: Pt, above: boolean) => {
    const vert = above ? { bottom: `calc(${100 - (q.y / f.h) * 100}% + 7px)` } : { top: `calc(${py(q.y)} + 7px)` };
    if (q.i === 0) return { ...vert, left: `calc(${px(q.x)} - 4px)` };
    if (q.i === lastIdx) return { ...vert, right: `calc(${100 - (q.x / f.w) * 100}% - 4px)` };
    return { ...vert, left: px(q.x), transform: "translateX(-50%)" };
  };

  // ---- 'N경기' 글자 자리: 점 위·아래 × 왼쪽 붙임·가운데·오른쪽 붙임 여섯 곳 중, 선·다른 글자·점과 가장 안 겹치는 곳.
  // 글자 크기는 휴대폰 1배 기준 어림(글자 폭 px ≈ 그림 단위)이라 PC·큰 글씨에서는 조금 어긋날 수 있다
  const LH = 14;
  const textW = (t: string) => [...t].reduce((a, c) => a + (c === " " ? 3 : /[0-9a-zA-Z+−\-–.]/.test(c) ? 6.6 : 11.5), 0);
  interface Rect {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  }
  const fixed: Rect[] = [];
  const near = (cx: number, cy: number, r: number) => fixed.push({ x0: cx - r, y0: cy - r, x1: cx + r, y1: cy + r });
  /** 점 q 위(above)·아래에 놓이는 글자의 칸. horiz: 점에서 오른쪽으로(start)·왼쪽으로(end)·가운데 */
  const labelRect = (q: Pt, text: string, above: boolean, horiz: "start" | "center" | "end", gap: number): Rect => {
    const w = textW(text);
    const y0 = above ? q.y - gap - LH : q.y + gap;
    const x0 = horiz === "start" ? q.x - 4 : horiz === "end" ? q.x + 4 - w : q.x - w / 2;
    return { x0, y0, x1: x0 + w, y1: y0 + LH };
  };
  // 이미 놓인 것들의 칸: 최고·최저 이름표, 단계 이름, 달 이름, 부상·FA 글자, 평균 이름표, 점
  if (mx) fixed.push(labelRect(mx, `최고 ${plusText(mx.v)}`, true, mx.i === 0 ? "start" : mx.i === lastIdx ? "end" : "center", 7));
  if (mx && mn && mn !== mx) fixed.push(labelRect(mn, `최저 ${plusText(mn.v)}`, false, mn.i === 0 ? "start" : mn.i === lastIdx ? "end" : "center", 7));
  minorBands(months).forEach((b) => {
    const step = (f.w - f.padL - f.padR) / Math.max(1, months.length - 1);
    const x0 = Math.max(0, x(b.from) - step / 2) + 6;
    fixed.push({ x0, y0: 2, x1: x0 + textW(b.level), y1: 2 + LH });
  });
  months.forEach((m, i) => {
    const w = textW(`${m.month}월`);
    const x0 = i === 0 ? x(i) : i === lastIdx ? x(i) - w : x(i) - w / 2;
    fixed.push({ x0, y0: f.h - LH, x1: x0 + w, y1: f.h });
    if (!played(m, pitcher)) {
      const rw = textW(m.kind === "INJURED" ? "부상" : m.kind === "FREE_AGENT" ? "FA" : "–");
      const rx = Math.min(f.w - rw, Math.max(0, x(i) - rw / 2));
      fixed.push({ x0: rx, y0: bottom - 2 - LH, x1: rx + rw, y1: bottom });
    }
  });
  if (all.length > 0) {
    const aw = textW("평균");
    fixed.push(avgRight ? { x0: f.w - avgInset - aw, y0: y100 - LH - 1, x1: f.w - avgInset, y1: y100 } : { x0: 0, y0: y100 - LH - 1, x1: aw, y1: y100 });
  }
  if (last) near(last.x, last.y, 8);
  all.forEach((q) => {
    if (q.few) near(q.x, q.y, 4);
    if (q.edge !== 0) fixed.push({ x0: q.i === lastIdx ? q.x - 18 : q.x + 5, y0: q.y - 5, x1: q.i === lastIdx ? q.x - 5 : q.x + 18, y1: q.y + 5 });
  });
  runs.forEach((r) => {
    if (r.length === 1) near(r[0].x, r[0].y, 4);
    else {
      if (r[0].i > 0) near(r[0].x, r[0].y, 3);
      if (r[r.length - 1].i < lastIdx) near(r[r.length - 1].x, r[r.length - 1].y, 3);
    }
  });
  const samples = runs.filter((r) => r.length > 1).flatMap((r) => curveSamples(r));
  const hit = (a: Rect, b: Rect) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
  const fewPlace = new Map<number, { above: boolean; horiz: "start" | "center" | "end" }>();
  all
    .filter((q) => q.few)
    .forEach((q) => {
      const text = `${months[q.i].games}${pitcher ? "등판" : "경기"}`;
      // 안쪽 우선: 위 끝에 붙은 점은 아래, 아래 끝에 붙은 점은 위. 그 밖에는 아래부터
      const order = q.edge === 1 ? [true, false] : [false, true];
      let best: { above: boolean; horiz: "start" | "center" | "end"; rect: Rect } | null = null;
      let bestCost = Infinity;
      order.forEach((above, oi) => {
        (["center", "start", "end"] as const).forEach((horiz, hi) => {
          const rect = labelRect(q, text, above, horiz, 6);
          let cost = oi * 0.4 + hi * 0.1;
          if (rect.x0 < 0 || rect.x1 > f.w || rect.y0 < 0 || rect.y1 > f.h) cost += 20;
          const grown = { x0: rect.x0 - 1.5, y0: rect.y0 - 1.5, x1: rect.x1 + 1.5, y1: rect.y1 + 1.5 };
          cost += fixed.filter((r) => hit(grown, r)).length * 10;
          cost += samples.filter((pt) => pt.x > grown.x0 && pt.x < grown.x1 && pt.y > grown.y0 && pt.y < grown.y1).length;
          if (cost < bestCost) {
            bestCost = cost;
            best = { above, horiz, rect };
          }
        });
      });
      if (best) {
        const b = best as { above: boolean; horiz: "start" | "center" | "end"; rect: Rect };
        fewPlace.set(q.i, { above: b.above, horiz: b.horiz });
        fixed.push(b.rect);
      }
    });

  return (
    <div className="mt-3">
      <p className="mb-1.5 text-caption text-muted">{`달마다 ${stat}`}</p>
      {/* 화면 읽기: 그림은 숨기고 달마다 한 줄씩 */}
      <ol className="sr-only" aria-label={`달마다 ${stat}, 100이 ${average}`}>
        {months.map((m) => (
          <li key={m.month}>{spoken(m, pitcher)}</li>
        ))}
      </ol>
      {/* month-line: 글자는 칸 폭이 허락하는 만큼만 키운다(globals.css, 이슈 #264) */}
      <div aria-hidden className="month-line relative h-[10.25rem]">
        {minorBands(months).map((b) => {
          const step = (f.w - f.padL - f.padR) / Math.max(1, months.length - 1);
          const x0 = Math.max(0, x(b.from) - step / 2);
          const x1 = Math.min(f.w, x(b.to) + step / 2);
          return (
            <div
              key={b.from}
              className="absolute rounded-md bg-surface-2"
              style={{ left: px(x0), width: px(x1 - x0), top: 0, bottom: py(f.padB) }}
            >
              <span className="month-line-label absolute left-1.5 top-0.5 text-muted">{b.level}</span>
            </div>
          );
        })}
        <svg viewBox={`0 0 ${f.w} ${f.h}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
          <Defs id={id} f={f} y100={y100} bottom={bottom} alpha={0.22} />
          <AverageLine f={f} y100={y100} opacity={0.7} scaled />
          <Runs id={id} runs={runs} bottom={bottom} lineWidth={2.5} scaled />
        </svg>
        {all.length > 0 && (
          <span
            className="month-line-label pointer-events-none absolute -translate-y-full pb-px text-muted"
            style={avgRight ? { right: avgInset, top: py(y100) } : { left: 0, top: py(y100) }}
          >
            평균
          </span>
        )}
        {/* 앞뒤가 끊긴 외딴 달은 선이 없으니 점 하나 */}
        {runs
          .filter((r) => r.length === 1 && !r[0].few)
          .map((r) => (
            <span
              key={r[0].i}
              className="absolute size-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full"
              data-dot
              style={{ left: px(r[0].x), top: py(r[0].y), background: dotColor(r[0].v) }}
            />
          ))}
        {/* 기록 없는 달에서 끊긴 구간의 끝(앞이나 뒤가 끊긴 점)에 작은 점: 잘린 조각처럼 보이지 않게. 마지막 강조 점·경기 적은 달 빈 점이 우선 */}
        {runs
          .filter((r) => r.length > 1)
          .flatMap((r) => [...(r[0].i > 0 ? [r[0]] : []), ...(r[r.length - 1].i < lastIdx ? [r[r.length - 1]] : [])])
          .filter((q) => !q.few && q !== last)
          .map((q) => (
            <span
              key={`cut${q.i}`}
              data-dot
              className="absolute size-[5px] -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{ left: px(q.x), top: py(q.y), background: dotColor(q.v) }}
            />
          ))}
        {mx && (
          <span className="month-line-label absolute whitespace-nowrap text-foreground" style={labelStyle(mx, true)}>
            <span className="text-muted">최고 </span>
            <b>{plusText(mx.v)}</b>
          </span>
        )}
        {mx && mn && mn !== mx && (
          <span className="month-line-label absolute whitespace-nowrap text-foreground" style={labelStyle(mn, false)}>
            <span className="text-muted">최저 </span>
            <b>{plusText(mn.v)}</b>
          </span>
        )}
        {/* 경기 적은 달: 속 빈 작은 점 + 흐린 'N경기'(투수 'N등판')로 점선의 뜻을 알린다. 범위를 넘어 끝에 붙인 점은 옆에 ▲▼.
            글자 자리는 위의 fewPlace가 정한다(선·다른 글자·점과 안 겹치는 곳, 끝에 붙은 점은 안쪽 우선) */}
        {all
          .filter((q) => q.few)
          .map((q) => {
            const m = months[q.i];
            const side = q.i === lastIdx ? { right: `calc(${100 - (q.x / f.w) * 100}% + 7px)` } : { left: `calc(${px(q.x)} + 7px)` };
            return (
              <span key={q.i}>
                {q !== last && (
                <span
                  data-dot
                  className="absolute size-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px]"
                  style={{ left: px(q.x), top: py(q.y), background: "var(--surface)", borderColor: dotColor(q.v), boxSizing: "border-box" }}
                />
                )}
                {q.edge !== 0 && (
                  <span className="month-line-label absolute -translate-y-1/2 text-muted" style={{ ...side, top: py(q.y) }}>
                    {q.edge === -1 ? "▲" : "▼"}
                  </span>
                )}
                <span
                  className="month-line-label absolute whitespace-nowrap text-muted opacity-80"
                  style={(() => {
                    const pl = fewPlace.get(q.i) ?? { above: false, horiz: "center" as const };
                    const horiz =
                      pl.horiz === "start"
                        ? { left: `calc(${px(q.x)} - 4px)` }
                        : pl.horiz === "end"
                          ? { right: `calc(${100 - (q.x / f.w) * 100}% - 4px)` }
                          : { left: px(q.x), transform: "translateX(-50%)" };
                    const vert = pl.above ? { bottom: `calc(${100 - (q.y / f.h) * 100}% + 6px)` } : { top: `calc(${py(q.y)} + 6px)` };
                    return { ...horiz, ...vert };
                  })()}
                >
                  {`${m.games}${pitcher ? "등판" : "경기"}`}
                </span>
              </span>
            );
          })}
        {/* 마지막 달 점만 강조: 옅은 원 + 테두리 점. 색은 그 값이 평균 위면 파랑·아래면 회색 */}
        {last && (
          <>
            <span
              data-dot
              className="absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.18]"
              style={{ left: px(last.x), top: py(last.y), background: dotColor(last.v) }}
            />
            <span
              data-dot
              className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full ${last.few ? "size-2.5 border-2" : "size-2 border-[1.5px] border-surface"}`}
              // 마지막 달이 경기 적은 달이면 속 빈 점
              style={
                last.few
                  ? { left: px(last.x), top: py(last.y), background: "var(--surface)", borderColor: dotColor(last.v), boxSizing: "content-box" }
                  : { left: px(last.x), top: py(last.y), background: dotColor(last.v), boxSizing: "content-box" }
              }
            />
          </>
        )}
        {/* 기록 없는 달: '부상'(본문 글자색 + 빨간 짧은 줄) · 'FA'. 표본이 모자라 값이 없는 달·기록 없는 달은 흐린 '–'(이유 없이 빈칸으로 두지 않는다).
            글자 폭(em)만큼 양 끝에서 조여 첫 달·마지막 달에서도 그림 밖으로 나가지 않게 한다 */}
        {months.map((m, i) => {
          if (played(m, pitcher)) return null;
          const t = m.kind === "INJURED" ? "부상" : m.kind === "FREE_AGENT" ? "FA" : "–";
          const w = t === "부상" ? 2.1 : t === "FA" ? 1.6 : 0.8;
          return (
            <span key={m.month}>
              <span
                className={`month-line-label absolute -translate-y-full ${t === "–" ? "text-muted" : "text-foreground"}`}
                style={{ left: `clamp(0px, calc(${px(x(i))} - ${w / 2}em), calc(100% - ${w}em))`, top: py(bottom - 2) }}
              >
                {t}
              </span>
              {m.kind === "INJURED" && (
                <span
                  data-injury
                  className="absolute h-[3px] w-[18px] -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{
                    left: px(x(i)),
                    top: py(bottom - 1),
                    background: "color-mix(in srgb, var(--danger-fg) 80%, transparent)",
                  }}
                />
              )}
            </span>
          );
        })}
        {/* 달 이름 줄: 양 끝은 안쪽으로 붙여 카드 밖으로 나가지 않게 */}
        {months.map((m, i) => (
          <span
            key={m.month}
            className="month-line-small absolute bottom-0 whitespace-nowrap tabular-nums text-muted"
            style={
              i === 0
                ? { left: px(x(i)) }
                : i === lastIdx
                  ? { right: `${100 - (x(i) / f.w) * 100}%` }
                  : { left: px(x(i)), transform: "translateX(-50%)" }
            }
          >
            {`${m.month}월`}
          </span>
        ))}
      </div>
    </div>
  );
}

/** 화면 읽기 한 줄: '4월 메이저 31경기 wRC+ 118'(투수는 평균자책점도), 기록 없는 달은 '9월 부상' */
function spoken(m: SeasonMonth, pitcher: boolean): string {
  if (!played(m, pitcher)) {
    const rest = m.kind === "INJURED" ? "부상" : m.kind === "FREE_AGENT" ? "FA" : "기록 없음";
    return `${m.month}월 ${rest}`;
  }
  const v = plus(m, pitcher) as number;
  const where = m.kind === "MLB" ? "메이저" : (m.levelKo ?? "마이너");
  return pitcher
    ? `${m.month}월 ${where} ${m.games}등판 ERA+ ${v}, 평균자책점 ${formatEra(m.era)}${m.few ? ", 등판 적은 달" : ""}`
    : `${m.month}월 ${where} ${m.games}경기 wRC+ ${v}${m.few ? ", 경기 적은 달" : ""}`;
}

/**
 * 성적표 목록 한 줄 오른쪽의 작은 달별 꺾은선(이슈 #276 → #347). 펼치지 않아도 선수마다 한 해 모양(언제 잘했고 언제 빠졌나)을
 * 나란히 견주게 한다. 큰 그래프(MonthLine)와 같은 곡선·색 규칙이고 점·글자·띠 없이 평균 점선 + 선·칠만 둔다.
 * 펼치기 버튼 안에 놓이고 버튼 이름에 섞이지 않게 화면 읽기 프로그램에는 숨긴다(같은 값은 펼친 곳이 달마다 읽어 준다).
 * 크기는 px로 고정해 큰 글씨에서도 찌그러지지 않는다.
 */
export function MonthSpark({ months, pitcher }: { months: SeasonMonth[]; pitcher: boolean }) {
  const id = useSvgId();
  if (months.length === 0) return null;
  const f = SMALL;
  const { runs, x, y100, bottom } = layout(months, pitcher, f);
  return (
    <svg aria-hidden viewBox={`0 0 ${f.w} ${f.h}`} width={f.w} height={f.h} className="block h-[30px] w-[84px] overflow-visible">
      <Defs id={id} f={f} y100={y100} bottom={bottom} alpha={0.28} />
      <AverageLine f={f} y100={y100} opacity={0.6} scaled={false} />
      <Runs id={id} runs={runs} bottom={bottom} lineWidth={1.75} scaled={false} />
      {/* 부상 달 자리 바닥에 짧은 빨간 줄(큰 그래프 '부상' 줄과 같은 색): 선이 끊긴 이유. 끊긴 구간 끝 점은 너무 작아 넣지 않는다 */}
      {months.map((m, i) =>
        m.kind === "INJURED" ? (
          <line
            key={`inj${m.month}`}
            data-injury
            x1={x(i) - 3}
            x2={x(i) + 3}
            y1={f.h - 1.5}
            y2={f.h - 1.5}
            stroke="color-mix(in srgb, var(--danger-fg) 80%, transparent)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        ) : null,
      )}
      {runs
        .filter((r) => r.length === 1)
        .map((r) => (
          <circle key={r[0].i} data-dot cx={r[0].x} cy={r[0].y} r={2} fill={dotColor(r[0].v)} />
        ))}
    </svg>
  );
}
