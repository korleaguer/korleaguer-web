"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

/** 축하를 이미 본 경기 키 목록을 담는 기기 저장소 이름 */
const STORAGE_KEY = "kl-celebrated";
/** 기록해 둘 경기 수(오래된 것부터 버린다) */
const KEEP = 100;
/** 한 화면에서 축하가 도는 카드 수. 카드 순서가 이보다 뒤면 돌지 않는다 */
const MAX_ORDER = 3;
/** 카드가 떠오른 뒤에 시작하고(260ms), 카드 순서대로 늦춰 한꺼번에 번쩍이지 않게 한다 */
const BASE_DELAY_MS = 300;
const STEP_DELAY_MS = 120;

function readSeen(): string[] {
  const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  return Array.isArray(raw) ? raw.filter((item): item is string => typeof item === "string") : [];
}

/**
 * 큰 일 작은 축하(11-21 사용자 결정): 카드에서 가장 큰 표시 하나가 처음 보일 때 한 번 커졌다 돌아온다(300ms 안쪽).
 * 같은 경기(id)는 그 기기에서 한 번만 돈다. 동작 줄이기 설정이거나 기기 저장소를 쓸 수 없으면 돌지 않는다.
 * 화면에 60% 이상 보이는 순간에 돌고 그때 기록한다(안 보이는 카드의 축하가 낭비되지 않게).
 * 서버 화면에는 움직임이 없고, 브라우저가 이어받은 뒤에만 data-play를 단다.
 */
export default function Celebrate({
  id,
  order,
  scale,
  origin = "center",
  className = "",
  children,
}: {
  /** 경기 키(선수 id-경기 id) */
  id: string;
  /** 카드 순서(0부터). MAX_ORDER 이상이면 돌지 않는다 */
  order: number;
  /** 커지는 배율. 알약 배지 1.1, 글자 한 줄 1.05 */
  scale: number;
  origin?: string;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || order >= MAX_ORDER) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    try {
      if (readSeen().includes(id)) return;
    } catch {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        // 숨은 탭에서 교차가 잡히면 아무도 못 본 채 기록만 남으니, 탭이 보일 때까지 미룬다
        if (document.visibilityState !== "visible") {
          document.addEventListener("visibilitychange", retry, { once: true });
          return;
        }
        observer.disconnect();
        try {
          const seen = readSeen();
          if (seen.includes(id)) return;
          localStorage.setItem(STORAGE_KEY, JSON.stringify([...seen, id].slice(-KEEP)));
        } catch {
          return;
        }
        el.dataset.play = "";
      },
      { threshold: 0.6 },
    );
    // 관찰을 다시 걸면 지금 교차 상태로 콜백이 한 번 더 온다
    const retry = () => {
      observer.unobserve(el);
      observer.observe(el);
    };
    observer.observe(el);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", retry);
    };
  }, [id, order]);

  return (
    <span
      ref={ref}
      className={`celebrate ${className}`}
      style={
        {
          "--celebrate-scale": scale,
          "--celebrate-origin": origin,
          "--celebrate-delay": `${BASE_DELAY_MS + order * STEP_DELAY_MS}ms`,
        } as CSSProperties
      }
    >
      {children}
    </span>
  );
}
