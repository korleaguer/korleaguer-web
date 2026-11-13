"use client";

import { useLayoutEffect, useRef, useState, type RefObject } from "react";

export interface PillRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 고른 칸 아래로 미끄러지는 파란 알약의 자리(PillNav·Segmented가 같이 쓴다).
 * 칸의 실제 위치를 재서 정하고(글씨 크기를 키워도 맞게), 묶음 크기가 바뀌면 다시 잰다.
 * ready는 첫 자리를 잡은 다음 프레임부터 true: 처음 그릴 때 왼쪽 끝에서 미끄러져 오지 않게 그때부터 움직임을 켠다.
 */
export function usePillIndicator<T extends HTMLElement>(
  active: number,
  containerRef: RefObject<HTMLElement | null>,
): { itemRefs: RefObject<(T | null)[]>; rect: PillRect | null; ready: boolean } {
  const itemRefs = useRef<(T | null)[]>([]);
  const [rect, setRect] = useState<PillRect | null>(null);
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const measure = () => {
      const el = active >= 0 ? itemRefs.current[active] : null;
      setRect(el ? { x: el.offsetLeft, y: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight } : null);
    };
    measure();
    if (!container) return;
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [active, containerRef]);

  useLayoutEffect(() => {
    if (!rect || ready) return;
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, [rect, ready]);

  return { itemRefs, rect, ready };
}
