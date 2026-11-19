"use client"; // 고른 금액 단위(상태)를 기억하고, 기기 '동작 줄이기' 설정을 브라우저에서 읽어야 해서 클라이언트 컴포넌트다.

import { useRef, useState, useSyncExternalStore, type KeyboardEvent, type ReactNode } from "react";
import { haptic } from "@/lib/app";
import { radioKeyIndex } from "@/lib/radioKeys";

type Unit = "auto" | "usd" | "krw";

const UNITS = ["usd", "krw"] as const;
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
 * 보이는 단위는 하나뿐이라 두 버튼은 켜고 끄는 버튼(aria-pressed)이 아니라 라디오 묶음이다(WAI-ARIA APG Radio Group, 전수조사 L328,
 * 경기별 막대·소속팀 사진과 같다). 번갈아 보는 동안은 둘 다 고르지 않은 상태다.
 */
export default function MoneyUnitScope({ children, className = "" }: { children: ReactNode; className?: string }) {
  const [unit, setUnit] = useState<Unit>("auto");
  const groupRef = useRef<HTMLSpanElement>(null);
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

  /**
   * 화살표(←↑·→↓, 둘뿐이라 다른 쪽으로)와 Home·End로 그 단위를 고르고 포커스도 옮긴다. 누르기(Enter·Space·클릭)와 달리
   * 이미 고른 단위로 옮겨도 번갈아 보기로 되돌리지 않는다(화살표는 고르기만 한다)
   */
  function onKey(e: KeyboardEvent<HTMLSpanElement>) {
    const at = UNITS.findIndex((u) => u === (e.target as HTMLElement).closest("[data-unit]")?.getAttribute("data-unit"));
    const k = radioKeyIndex(e.key, at, UNITS.length);
    if (k == null) return;
    const to = UNITS[k];
    e.preventDefault();
    if (shown !== to) {
      haptic("select");
      setUnit(to);
    }
    groupRef.current?.querySelector<HTMLElement>(`[data-unit="${to}"]`)?.focus();
  }

  return (
    <div data-money={shown}>
      <div className={`mb-1.5 flex items-center justify-end gap-1 ${className}`}>
        <span className="mr-0.5 text-caption text-muted">{shown === "auto" ? "번갈아 보는 중 ·" : "금액"}</span>
        <span ref={groupRef} role="radiogroup" aria-label="계약 금액 단위" onKeyDown={onKey} className="flex items-center gap-1">
          {UNITS.map((u) => {
            const on = shown === u;
            // Tab은 고른 단위에 멈춘다. 번갈아 보는 중(고른 것 없음)이면 첫 단위 '달러'에
            const tabbable = shown === "auto" ? u === "usd" : on;
            return (
              <button
                key={u}
                type="button"
                role="radio"
                aria-checked={on}
                tabIndex={tabbable ? 0 : -1}
                data-unit={u}
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
        </span>
      </div>
      {children}
    </div>
  );
}
