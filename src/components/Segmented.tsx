"use client"; // 고른 칸을 기억하고 알약 자리를 재야 해서 클라이언트 컴포넌트다.

import { useRef } from "react";
import { haptic } from "@/lib/app";
import { usePillIndicator } from "@/lib/usePillIndicator";

export interface SegmentOption<V extends string> {
  value: V;
  label: string;
}

/**
 * 같은 화면 안에서 보기를 바꾸는 칸 고르기(토스 SegmentedControl처럼). 흰 띠 위로 파란 알약이 미끄러진다.
 * 주소를 바꾸는 고르기는 PillNav를 쓴다. 앱 안이면 칸이 바뀔 때 고르기 틱.
 */
export default function Segmented<V extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: SegmentOption<V>[];
  value: V;
  onChange: (value: V) => void;
  /** 화면 낭독기가 읽는 묶음 이름 */
  label: string;
}) {
  const active = options.findIndex((o) => o.value === value);
  const groupRef = useRef<HTMLDivElement>(null);
  const { itemRefs, rect, ready } = usePillIndicator<HTMLButtonElement>(active, groupRef);
  return (
    <div
      ref={groupRef}
      role="group"
      aria-label={label}
      className="relative flex w-fit gap-0.5 rounded-full bg-surface p-1 shadow-[var(--shadow-card)]"
    >
      {rect && (
        <span
          aria-hidden
          data-ready={ready ? "" : undefined}
          className="pill-indicator absolute left-0 top-0 rounded-full bg-accent-soft"
          style={{ translate: `${rect.x}px ${rect.y}px`, width: rect.width, height: rect.height }}
        />
      )}
      {options.map((o, i) => {
        const on = i === active;
        return (
          <button
            key={o.value}
            ref={(el) => {
              itemRefs.current[i] = el;
            }}
            type="button"
            aria-pressed={on}
            onClick={() => {
              if (on) return;
              haptic("select");
              onChange(o.value);
            }}
            className={`press tap-target relative rounded-full px-3 py-1 text-[0.8125rem] font-semibold tabular-nums ${on ? "text-accent-ink" : "text-muted hover:text-foreground"} ${on && !rect ? "bg-accent-soft" : ""}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
