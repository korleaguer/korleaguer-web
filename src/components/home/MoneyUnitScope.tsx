"use client"; // 고른 금액 단위(상태)를 기억하고, 기기 '동작 줄이기' 설정을 브라우저에서 읽어야 해서 클라이언트 컴포넌트다.

import { useState, useSyncExternalStore, type ReactNode } from "react";
import { haptic } from "@/lib/app";

type Unit = "auto" | "usd" | "krw";

const LABEL: Record<"usd" | "krw", string> = { usd: "달러", krw: "원화" };
const REDUCE = "(prefers-reduced-motion: reduce)";

function subscribeReduce(onChange: () => void): () => void {
  const query = window.matchMedia(REDUCE);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/**
 * 역대 계약 금액의 달러↔원화 번갈아 보이기를 멈추는 고르기(전수조사 P1, WCAG 2.2 SC 2.2.2, 사용자 11-17 '추천대로', 이슈 #263).
 * 번갈아 보이기는 그대로 두고(사용자 11-11 요청), '달러'·'원화'를 누르면 그 금액으로 멈춘다. 누른 것을 다시 누르면 다시 번갈아 보인다.
 * 기기 '동작 줄이기'가 켜져 있으면 번갈아 보이지 않고 달러로 멈춰 있다('원화'를 누르면 원화). 금액 칸(DealMoney)은 서버 부품이라
 * 감싼 div의 data-money를 보고 CSS(globals.css .money-flip)가 한쪽만 보인다.
 */
export default function MoneyUnitScope({ children, className = "" }: { children: ReactNode; className?: string }) {
  const [unit, setUnit] = useState<Unit>("auto");
  // 서버에는 기기 설정이 없어 false로 그리고, 브라우저에서 실제 값으로 다시 그린다
  const reduce = useSyncExternalStore(subscribeReduce, () => window.matchMedia(REDUCE).matches, () => false);
  const shown: Unit = unit === "auto" && reduce ? "usd" : unit;

  const pick = (next: "usd" | "krw") => {
    // 동작 줄이기면 번갈아 보기가 없어 둘 중 하나를 고르는 것뿐이다(라디오처럼). 이미 보이는 단위를 다시 누르면 아무 일도 없다.
    // 전에는 눌린 '달러'를 다시 누르면 속 상태만 바뀌고 화면·눌림 표시는 그대로여서 누른 보람이 없었다(리뷰 지적)
    if (reduce && shown === next) return;
    haptic("select");
    setUnit(shown === next ? "auto" : next);
  };

  return (
    <div data-money={shown}>
      <div role="group" aria-label="계약 금액 단위" className={`mb-1.5 flex items-center justify-end gap-1 ${className}`}>
        <span className="mr-0.5 text-caption text-muted">{shown === "auto" ? "번갈아 보는 중 ·" : "금액"}</span>
        {(["usd", "krw"] as const).map((u) => {
          const on = shown === u;
          return (
            <button
              key={u}
              type="button"
              aria-pressed={on}
              onClick={() => pick(u)}
              className={`press tap-target rounded-full px-2.5 py-0.5 text-caption ${
                on ? "bg-accent-soft text-accent-ink" : "text-muted hover:bg-surface-2 hover:text-foreground"
              }`}
            >
              {/* 고른 단위는 글자도 굵게(색만으로 구분하지 않게) */}
              <span className={`bold-reserve ${on ? "font-extrabold" : ""}`} data-text={LABEL[u]}>
                {LABEL[u]}
              </span>
            </button>
          );
        })}
      </div>
      {children}
    </div>
  );
}
