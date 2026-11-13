"use client"; // 손가락(마우스)으로 훑는 자리를 기억하고 그날 값을 바꿔 보여 줘야 해서 클라이언트 컴포넌트다.

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { TrendPoint } from "@/lib/wrcTrend";
import { formatShortDate } from "@/lib/format";
import { haptic } from "@/lib/app";

const W = 340;
const H = 150;

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
  const firstMonth = Number(formatShortDate(points[0].startTimeKst).split(".")[0]);
  const lastMonth = Number(formatShortDate(points[last].startTimeKst).split(".")[0]);

  return (
    <div className="card px-4 pb-3 pt-4">
      <div className="mb-2 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted tabular-nums">{active === last ? "시즌 전체" : `${date}까지`}</p>
          <p className={`text-[0.8125rem] font-semibold ${value >= 105 ? "text-accent-ink" : "text-muted"}`}>{words(value)}</p>
        </div>
        <p className="shrink-0 text-xl font-extrabold tabular-nums">
          <span className="mr-1 text-xs font-semibold text-muted">wRC+</span>
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
        aria-valuetext={`${date}까지 wRC+ ${value}`}
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
        // 세로로 쓸면 화면이 스크롤되고, 가로로 훑으면 그래프를 고른다
        className="touch-pan-y rounded-md outline-offset-4 select-none"
      >
        {/* 칸 폭(휴대폰 340px ~ PC 670px)에 맞게 가로로 늘린다. 선 굵기는 그대로(non-scaling-stroke), 점은 늘어나지 않게 그림 밖 원으로 */}
        <div aria-hidden className="relative h-[150px]">
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
            {/* 점선 = 리그 평균 100. 글자는 선과 겹치지 않게 그래프 아래 설명에 둔다 */}
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
          <span
            className="absolute size-[13px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-accent"
            style={{ left: `${(x(active) / W) * 100}%`, top: `${(y(p.value) / H) * 100}%` }}
          />
        </div>
      </div>
      <div aria-hidden className="mt-1 flex justify-between text-[0.6875rem] text-muted">
        <span>{firstMonth}월</span>
        <span>{lastMonth}월</span>
      </div>
      <p className="mt-2 text-xs text-muted">점선은 리그 평균(100). 시즌 처음부터 그날까지의 타격이고, 50타석부터 그려요.</p>
    </div>
  );
}
