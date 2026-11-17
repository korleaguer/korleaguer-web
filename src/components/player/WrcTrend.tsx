"use client"; // 손가락(마우스)으로 훑는 자리를 기억하고 그날 값을 바꿔 보여 줘야 해서 클라이언트 컴포넌트다.

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { TrendPoint } from "@/lib/wrcTrend";
import { formatShortDate } from "@/lib/format";
import { haptic } from "@/lib/app";

const W = 340;
const H = 150;
/** 달 눈금 사이 최소 간격(그래프 폭의 %). 휴대폰 그래프 폭 약 320px에서 '10월'(약 24px) 둘이 8px 넘게 떨어진다 */
const MIN_TICK_GAP = 11;
/**
 * 값 눈금(옅은 가로선 + 오른쪽 숫자). 세로 범위가 선수마다 그 선수 최저·최고 ±10이라 같은 높이 차가 선수마다 다른 wRC+ 차다.
 * 100(리그 평균) 점선 위아래 20씩만 그어 '20이 이만큼'을 읽게 한다(사용자 11-17 '추천대로'). 범위 밖이면 긋지 않는다
 */
const GRID = [80, 120];
/** 눈금 숫자끼리 이만큼(그래프 높이 150px 기준 px)은 떨어져야 그린다. 범위가 아주 넓으면 80·120이 100 숫자에 붙는다 */
const MIN_GRID_GAP_PX = 16;

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
    const month = Number(formatShortDate(p.startTimeKst).split(".")[0]);
    if (all.length === 0 || all[all.length - 1].month !== month) all.push({ pct: (i / last) * 100, month });
  });
  if (all.length > 1 && all[1].pct - all[0].pct < MIN_TICK_GAP) all.shift();
  const kept: MonthTick[] = [];
  for (const t of all) {
    if (kept.length === 0 || t.pct - kept[kept.length - 1].pct >= MIN_TICK_GAP) kept.push(t);
  }
  return kept;
}

/** wRC+를 쉬운 말로(100 = 리그 평균) */
function words(v: number): string {
  if (v >= 120) return "리그 평균보다 크게 높아요";
  if (v >= 105) return "리그 평균보다 높아요";
  if (v >= 95) return "리그 평균과 비슷해요";
  return "리그 평균보다 낮아요";
}

/**
 * 타격 흐름 그래프: 시즌 처음부터 그날까지 누적 wRC+ 선 하나와 리그 평균(100) 점선.
 * 토스증권 차트처럼 손가락으로 훑으면 그날까지의 값이 위에 보이고, 날이 바뀔 때마다 고르기 틱(앱 안).
 * 손가락은 떼면 그 자리에 머물고, 마우스는 그래프를 떠나면 시즌 전체 값으로 돌아간다. 키보드는 ←→로 하루씩, Home/End로 처음·마지막.
 */
export default function WrcTrend({ points }: { points: TrendPoint[] }) {
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
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");

  const pick = (i: number) => {
    const next = Math.max(0, Math.min(last, i));
    if (next !== active) {
      setPicked(next);
      haptic("select");
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
  const value = Math.round(p.value);
  const date = formatShortDate(p.startTimeKst);
  const ticks = monthTicks(points);
  // 그래프 위아래 끝에 붙는 눈금은 숫자가 그래프 밖으로 반쯤 나가 빼고(5%), 100과 너무 가까우면 숫자가 겹쳐 뺀다
  const grid = GRID.filter(
    (v) => v > lo + (hi - lo) * 0.05 && v < hi - (hi - lo) * 0.05 && (Math.abs(v - 100) / (hi - lo)) * H >= MIN_GRID_GAP_PX,
  );

  return (
    <div className="@container card px-4 pb-3 pt-4">
      {/* 큰 글씨에서 말('리그 평균보다 크게 높아요')이 8rem도 못 받으면 wRC+ 숫자를 다음 줄 오른쪽으로 내린다(이슈 #264) */}
      <div className="mb-2 flex flex-wrap items-end justify-between gap-x-3">
        <div className="min-w-0 flex-1 basis-[8rem]">
          <p className="text-caption text-muted tabular-nums">{active === last ? "시즌 전체" : `${date}까지`}</p>
          <p className={`text-label ${value >= 105 ? "text-accent-ink" : "text-muted"}`}>{words(value)}</p>
        </div>
        <p className="ml-auto shrink-0 text-stat tabular-nums">
          <span className="mr-1 text-caption text-muted">wRC+</span>
          {value}
        </p>
      </div>
      <div
        ref={boxRef}
        role="slider"
        tabIndex={0}
        aria-label="타격 흐름(누적 wRC+)"
        aria-valuemin={0}
        aria-valuemax={last}
        aria-valuenow={active}
        // 마지막 점만 MLB 공식 값이고 중간은 어림값이다(아래 설명 줄과 같은 뜻)
        aria-valuetext={`${date}까지 wRC+ ${value}${active === last ? "" : "(어림)"}`}
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
        <div aria-hidden className="relative h-[150px] sm:h-[180px]">
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
            {/* 점선 = 리그 평균 100(숫자는 오른쪽 눈금 자리, 뜻은 그래프 아래 설명) */}
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
              둔다. 오른쪽 끝을 카드 안쪽 끝(위 wRC+ 숫자와 같은 세로줄)에 맞추면 세 자리 숫자도 마지막 점(지름 13px, 그래프 끝에서
              반쯤 나옴)과 5px 넘게 떨어진다. 마우스가 숫자 위에 가면 그래프를 떠난 것으로 */}
          {[...grid, 100].map((v) => (
            <span
              key={v}
              className="pointer-events-none absolute -right-8 -translate-y-1/2 text-micro text-muted tabular-nums"
              style={{ top: `${(y(v) / H) * 100}%` }}
            >
              {v}
            </span>
          ))}
          <span
            className="absolute size-[13px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-accent"
            style={{ left: `${(x(active) / W) * 100}%`, top: `${(y(p.value) / H) * 100}%` }}
          />
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
      {/* '100'은 점선 끝 눈금에 있어 되풀이하지 않고 점선의 뜻만 쓴다. 중간 값은 표준 가중치로 어림해 마지막 점(MLB 공식)에 맞춰
          옮긴 값이라 공식 값처럼 읽히지 않게 밝힌다(lib/wrcTrend). 훑을 수 있다는 표시가 없어 손가락 기기·마우스 기기에 맞는 말을
          하나만 보인다(375px 세 줄). 낭독기는 slider 역할과 값 글로 다루므로 이 안내는 읽지 않는다 */}
      <p className="mt-2 text-micro text-muted">
        점선은 리그 평균. 시즌 처음부터 그날까지의 타격이고, 50타석부터 그려요. 중간 값은 어림이고 마지막 값만 MLB 공식이에요.
        <span aria-hidden className="hidden pointer-coarse:inline"> 그래프를 옆으로 훑으면 그날까지 값이 보여요.</span>
        <span aria-hidden className="hidden pointer-fine:inline"> 그래프에 마우스를 올리면 그날까지 값이 보여요.</span>
      </p>
    </div>
  );
}
