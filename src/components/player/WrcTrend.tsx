"use client"; // 손가락(마우스)으로 훑는 자리를 기억하고 그날 값을 바꿔 보여 줘야 해서 클라이언트 컴포넌트다.

import { useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import type { RosterMove } from "@/lib/api";
import { trendGaps, type TrendGap, type TrendPoint } from "@/lib/wrcTrend";
import { formatShortDate } from "@/lib/format";
import { haptic } from "@/lib/app";
import { leagueWords } from "@/lib/leagueWords";

const W = 340;
const H = 150;
/** 달 눈금 사이 최소 간격(그래프 폭의 %). 휴대폰 그래프 폭 약 320px에서 '10월'(약 24px) 둘이 8px 넘게 떨어진다 */
const MIN_TICK_GAP = 11;
/**
 * 값 눈금(옅은 가로선 + 오른쪽 숫자). 세로 범위가 선수마다 그 선수 최저·최고 ±10이라 같은 높이 차가 선수마다 다른 평균 대비 % 차다(값은 wRC+ 점수 차 = % 차).
 * 100(리그 평균) 점선 위아래 20씩만 그어 '20이 이만큼'을 읽게 한다(사용자 11-17 '추천대로'). 범위 밖이면 긋지 않는다
 */
const GRID = [80, 120];
/**
 * 눈금 숫자끼리 이만큼(px)은 떨어져야 그린다. 범위가 아주 넓으면 80·120(눈금 −20%·+20%)이 100(0) 글자에 붙는다.
 * 일부러 낮은 쪽 높이(H = 150px, 휴대폰)로 잰다. 640px 이상 그래프(180px)는 1.2배 여유가 있지만, 같은 선수는 휴대폰·PC에서
 * 같은 눈금을 보이고, 높이마다 따로 재면 큰 글씨 숫자 크기(tickGap)도 높이마다 달라져야 한다. PC에서만 더 그을 수 있는 경우는
 * 세로 범위(hi − lo)가 187.5~225일 때뿐이다(2026 타자 4명은 77~152).
 * 1배 숫자(11px) 기준이라, 큰 글씨에서는 숫자 크기를 눈금 사이 간격까지만 키운다(아래 tickGap)
 */
const MIN_GRID_GAP_PX = 16;

/** 눈금 글자: 평균(100)은 '0', 위아래는 평균 대비 퍼센트('+20%'·'−20%', 11-21 지표 이름 wRC+ 대신). 말('평균보다 12% 잘 침')과 같은 단위 */
function tickText(v: number): string {
  const d = Math.round(v - 100);
  return d === 0 ? "0" : `${d > 0 ? "+" : "−"}${Math.abs(d)}%`;
}

/** 점의 달(1~12). 한국 날짜 기준 */
function monthOf(p: TrendPoint): number {
  return Number(formatShortDate(p.startTimeKst).split(".")[0]);
}

/** 끊긴 곳 이유 글자를 선 아래에 두려면 선 끝 점 아래에 이만큼(그래프 단위 = 휴대폰 px)은 남아야 한다. 아니면 선 위에 둔다 */
const GAP_LABEL_ROOM = 28;

/** 그래프 아래 달 눈금 하나: 그 달 첫 경기 자리(%)와 달 */
interface MonthTick {
  pct: number;
  month: number;
}

/**
 * 달이 바뀌는 첫 경기마다 눈금. x축이 날짜가 아니라 경기 순서라 그 경기 자리에 둔다.
 * 맨 앞 눈금은 시즌 첫 점(50타석 채운 날, 달 중간일 수 있음)이라, 다음 달 눈금과 붙으면 맨 앞 것을 뺀다.
 * 그 밖에는 앞 눈금과 붙는 것을 뺀다(한 달에 경기가 몇 개뿐인 달).
 */
function monthTicks(points: TrendPoint[]): MonthTick[] {
  const last = points.length - 1;
  const all: MonthTick[] = [];
  points.forEach((p, i) => {
    const month = monthOf(p);
    if (all.length === 0 || all[all.length - 1].month !== month) all.push({ pct: (i / last) * 100, month });
  });
  if (all.length > 1 && all[1].pct - all[0].pct < MIN_TICK_GAP) all.shift();
  const kept: MonthTick[] = [];
  for (const t of all) {
    if (kept.length === 0 || t.pct - kept[kept.length - 1].pct >= MIN_TICK_GAP) kept.push(t);
  }
  return kept;
}

/**
 * 타격 흐름 그래프: 시즌 처음부터 그날까지 누적 wRC+(리그 평균 = 100, 화면에는 평균 대비 말·%로) 선 하나와 평균 점선.
 * 토스증권 차트처럼 손가락으로 훑으면 그날까지의 값이 위에 보이고, 날이 바뀔 때마다 고르기 틱(앱 안).
 * 손가락은 떼면 그 자리에 머물고, 마우스는 그래프를 떠나면 시즌 전체 값으로 돌아간다. 키보드는 ←→로 하루씩, Home/End로 처음·마지막.
 * 가로축은 경기 순서라 한 달 넘게 쉰 곳(정규시즌 안 30일 초과)도 점 하나 간격이다. 그대로 이으면 쉬는 동안 뛴 것처럼 보여서
 * 그 구간은 선을 끊고 끊긴 곳 아래에 이유('부상'·'마이너', 이동 기록으로 알 때만)를 적는다(사용자 11-19 '추천대로', 이슈 #313).
 * 훑기는 끊긴 곳도 한 칸으로 지나가고, 끊긴 뒤 첫 경기에서는 값 위 말과 낭독에 그 사실을 덧붙인다.
 */
export default function WrcTrend({ points, moves }: { points: TrendPoint[]; moves: RosterMove[] }) {
  const last = points.length - 1;
  const [picked, setPicked] = useState(last);
  // 점 수가 줄어든 새 points가 와도 범위를 넘지 않게
  const active = Math.min(picked, last);
  const boxRef = useRef<HTMLDivElement>(null);

  const values = points.map((p) => p.value);
  const lo = Math.min(...values, 100) - 10;
  const hi = Math.max(...values, 100) + 10;
  const x = (i: number) => (i / last) * W;
  const y = (v: number) => H - ((v - lo) / (hi - lo)) * H;
  const gaps = trendGaps(points, moves);
  const gapAt = new Map<number, TrendGap>(gaps.map((g) => [g.index, g]));
  // 끊긴 곳 뒤 점은 이어 긋지 않고(M) 새로 시작한다
  const path = points
    .map((p, i) => `${i && !gapAt.has(i) ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`)
    .join(" ");

  const pick = (i: number) => {
    const next = Math.max(0, Math.min(last, i));
    if (next !== active) {
      setPicked(next);
      // 달이 바뀌는 곳을 지날 때만 틱(날마다 울리면 경기 수만큼 잦다)
      if (monthOf(points[next]) !== monthOf(points[active])) haptic("select");
    }
  };
  const fromPointer = (e: PointerEvent<HTMLDivElement>) => {
    const box = boxRef.current?.getBoundingClientRect();
    if (!box || box.width === 0) return;
    pick(Math.round(((e.clientX - box.left) / box.width) * last));
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = { ArrowLeft: -1, ArrowRight: 1 }[e.key];
    if (step) pick(active + step);
    else if (e.key === "Home") pick(0);
    else if (e.key === "End") pick(last);
    else return;
    e.preventDefault();
  };

  const p = points[active];
  const verdict = leagueWords(p.value, false);
  const date = formatShortDate(p.startTimeKst);
  const ticks = monthTicks(points);
  // 지금 점이 끊긴 뒤 첫 점이면 그 사실: '부상 뒤 첫 경기', 이유를 모르면 '38일 만의 경기'
  const gap = gapAt.get(active);
  const afterGap = gap ? (gap.reason ? `${gap.reason} 뒤 첫 경기` : `${gap.days}일 만의 경기`) : null;
  // 그래프 위아래 끝에 붙는 눈금은 숫자가 그래프 밖으로 반쯤 나가 빼고(5%), 100과 너무 가까우면 숫자가 겹쳐 뺀다
  const grid = GRID.filter(
    (v) => v > lo + (hi - lo) * 0.05 && v < hi - (hi - lo) * 0.05 && (Math.abs(v - 100) / (hi - lo)) * H >= MIN_GRID_GAP_PX,
  );
  // 눈금 숫자 사이 가장 좁은 간격(그래프 높이에 대한 비율, 눈금이 100 하나면 1). 그래프 높이는 px라 글자만 커지면 숫자끼리 붙어서
  // 숫자 크기가 이 간격을 넘지 않게 한다(globals.css .trend-tick). 2배(22px)에서 김하성 '100'·'80' 사이 틈이 약 4px였다
  const tickGap = Math.min(1, ...grid.map((v) => Math.abs(v - 100) / (hi - lo)));

  return (
    <div className="@container card px-4 pb-3 pt-4">
      {/* 판정 말('평균보다 12% 잘 침')이 이 카드의 큰 글자다(사용자 11-21: 지표 이름 wRC+·숫자는 화면에 쓰지 않고 ⓘ로).
          예전에는 말(작게)과 'wRC+ 112'(크게)가 같은 뜻을 두 번 했다. 큰 글씨에서는 날짜와 말이 칸 폭 안에서 줄을 바꾼다 */}
      <div className="mb-2">
        <p className="text-caption text-muted tabular-nums">{active === last ? "시즌 전체" : `${date}까지`}
          {afterGap && ` · ${afterGap}`}
        </p>
        <p className={`text-heading ${verdict.tone === "up" ? "text-accent-ink" : "text-muted"}`}>{verdict.text}</p>
      </div>
      <div
        ref={boxRef}
        role="slider"
        tabIndex={0}
        aria-label="타격 흐름(누적, 리그 평균 대비)"
        aria-valuemin={0}
        aria-valuemax={last}
        aria-valuenow={active}
        // 마지막 점만 MLB 공식 값이고 중간은 어림값이다(제목 옆 ⓘ 안 설명과 같은 뜻)
        aria-valuetext={`${date}까지 ${verdict.text}${active === last ? "" : "(어림)"}${afterGap ? `, ${afterGap}` : ""}`}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          fromPointer(e);
        }}
        onPointerMove={(e) => {
          // 마우스는 올려만 둬도, 손가락은 누른 채 움직일 때만 따라간다
          if (e.pointerType === "mouse" || e.buttons) fromPointer(e);
        }}
        // 마우스가 그래프를 떠나면 시즌 전체 값으로 돌아간다(지나가기만 한 날 값에 멈춰 있지 않게). 손가락은 뗀 자리에 머문다
        onPointerLeave={(e) => {
          if (e.pointerType === "mouse") setPicked(last);
        }}
        onKeyDown={onKey}
        // 세로로 쓸면 화면이 스크롤되고, 가로로 훑으면 그래프를 고른다.
        // mr-8: 오른쪽 2rem은 값 눈금 숫자 자리. 숫자를 그래프 안에 두면 오른쪽 끝에 닿는 선·마지막 점과 겹친다
        className="mr-8 touch-pan-y rounded-md outline-offset-4 select-none"
      >
        {/* 칸 폭(휴대폰 340px ~ PC 670px)에 맞게 가로로 늘린다. 선 굵기는 그대로(non-scaling-stroke), 점은 늘어나지 않게 그림 밖 원으로.
            640px 이상은 180px: 그래프가 넓어지는데 높이가 그대로면 가로세로 비가 휴대폰(2.2:1)의 두 배로 납작해 기울기가 반으로 보였다 */}
        <div
          aria-hidden
          className="trend-ticks relative h-[150px] sm:h-[180px]"
          style={{ "--tick-gap": tickGap.toFixed(4) } as CSSProperties}
        >
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
            {/* 달 경계 옅은 세로선: 아래 'N월' 눈금이 어느 자리인지 이어 준다(맨 왼쪽 끝은 그래프 시작이라 긋지 않는다) */}
            {ticks
              .filter((t) => t.pct > 0)
              .map((t) => (
                <line
                  key={t.month}
                  x1={(t.pct / 100) * W}
                  x2={(t.pct / 100) * W}
                  y1="0"
                  y2={H}
                  stroke="var(--line)"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            {/* 값 눈금 80·120: 점선보다 옅은 실선(숫자는 아래 글자로) */}
            {grid.map((v) => (
              <line
                key={v}
                x1="0"
                x2={W}
                y1={y(v)}
                y2={y(v)}
                stroke="var(--muted)"
                strokeOpacity="0.3"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {/* 점선 = 리그 평균 100(숫자는 오른쪽 눈금 자리, 뜻은 점선 왼쪽 끝 '평균' 이름표) */}
            <line x1="0" x2={W} y1={y(100)} y2={y(100)} stroke="var(--muted)" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
            <path
              d={path}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="2.25"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
            <line x1={x(active)} x2={x(active)} y1="0" y2={H} stroke="var(--accent)" strokeOpacity="0.35" vectorEffect="non-scaling-stroke" />
          </svg>
          {/* 눈금 숫자: SVG 안 글자는 그래프와 함께 가로로 늘어나 찌그러져서, 점처럼 % 자리의 글자로 그래프 오른쪽 밖(mr-8 자리)에
              둔다. 오른쪽 끝을 카드 안쪽 끝에 맞추면 세 글자 눈금도 마지막 점(지름 13px, 그래프 끝에서
              반쯤 나옴)과 5px 넘게 떨어진다. 마우스가 숫자 위에 가면 그래프를 떠난 것으로.
              크기는 Micro지만 큰 글씨에서는 눈금 사이 간격까지만 커진다(trend-tick) */}
          {[...grid, 100].map((v) => (
            <span
              key={v}
              className="trend-tick pointer-events-none absolute -right-8 -translate-y-1/2 text-muted tabular-nums"
              style={{ top: `${(y(v) / H) * 100}%` }}
            >
              {tickText(v)}
            </span>
          ))}
          {/* 점선 이름표 '평균': 점선 왼쪽 끝 바로 위. SVG 안 글자는 그래프와 함께 가로로 늘어나 찌그러지므로(위 눈금 숫자와 같은 이유)
              % 자리의 글자로 둔다. 눈금 숫자처럼 마우스가 지나가도 그래프를 떠난 것으로 치지 않게 pointer-events-none */}
          <span
            className="pointer-events-none absolute left-0.5 -translate-y-full pb-px text-micro text-muted"
            style={{ top: `${(y(100) / H) * 100}%` }}
          >
            평균
          </span>
          {/* 끊긴 곳 이유: 끊긴 자리(두 점 사이) 가운데, 두 끝 점 중 낮은 쪽 바로 아래. 아래가 좁으면(선이 바닥 가까이,
              김하성은 12px 남짓) 선에 겹치지 않게 높은 쪽 바로 위에 둔다. 모르면 글자 없이 끊기만 한다.
              글자 폭(em)만큼 양 끝에서 조여 그래프 밖으로 나가지 않게 한다(달 눈금과 같은 방식) */}
          {gaps.map((g) => {
            if (!g.reason) return null;
            const ys = [y(points[g.index - 1].value), y(points[g.index].value)];
            const below = H - Math.max(...ys) >= GAP_LABEL_ROOM;
            const half = g.reason.length / 2;
            return (
              <span
                key={g.index}
                className="absolute -translate-x-1/2 whitespace-nowrap text-micro text-muted"
                style={{
                  left: `clamp(${half}em, ${((g.index - 0.5) / last) * 100}%, calc(100% - ${half}em))`,
                  ...(below
                    ? { top: `calc(${(Math.max(...ys) / H) * 100}% + 3px)` }
                    : { bottom: `calc(${(1 - Math.min(...ys) / H) * 100}% + 3px)` }),
                }}
              >
                {g.reason}
              </span>
            );
          })}
          <span
            className="absolute size-[13px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-accent"
            style={{ left: `${(x(active) / W) * 100}%`, top: `${(y(p.value) / H) * 100}%` }}
          />
          {/* 훑을 수 있다는 표시: 세로선 아래 끝의 ‹ › 손잡이(글로 '옆으로 훑으면…'을 쓰던 자리, 이슈 #327) */}
          <span
            className="pointer-events-none absolute bottom-1 inline-flex h-5 -translate-x-1/2 items-center whitespace-nowrap rounded-full border border-accent bg-surface px-1.5 text-micro leading-none text-accent-ink"
            style={{ left: `${(x(active) / W) * 100}%` }}
          >
            ‹ ›
          </span>
        </div>
      </div>
      {/* 달 눈금: 그 달 첫 경기 자리 가운데에 둔다. 양 끝 글자는 카드 밖으로 나가지 않게 글자 폭(em, 숫자 0.65 + '월' 1)만큼
          자리를 조인다. 예전엔 4%·96%로 끊어 큰 글씨에서 '10월'이 카드 밖으로 나갔다(이슈 #264).
          칸이 좁으면(큰 글씨) 하나 걸러 하나만 보여 글자끼리 겹치지 않게 한다. 세로 경계선은 모두 남는다.
          mr-8: 위 그래프와 같은 폭이어야 % 자리가 맞는다 */}
      <div aria-hidden className="relative mt-1 mr-8 h-4 text-micro text-muted">
        {ticks.map((t) => {
          const w = `${String(t.month).length * 0.65 + 1}em`;
          return (
            <span
              key={t.month}
              className="absolute top-0 whitespace-nowrap tabular-nums @max-[15rem]:even:hidden"
              style={{ left: `clamp(0px, calc(${t.pct}% - ${w} / 2), calc(100% - ${w}))` }}
            >
              {t.month}월
            </span>
          );
        })}
      </div>
    </div>
  );
}
