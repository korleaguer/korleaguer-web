"use client"; // 고른 탭을 기억하고 바꿔야 해서 클라이언트 컴포넌트다.

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

interface Tab {
  label: string;
  /** 탭 내용. 서버에서 그린 그대로 받아, 고르지 않은 탭은 숨겨 둔다 */
  content: ReactNode;
}

/**
 * 시즌 기록의 '메이저 | 마이너' 탭(이슈 #39). 첫 탭이 기본이다.
 * 화면 낭독기용 탭 역할(tablist·tab·tabpanel)을 달고, 왼쪽·오른쪽 화살표로 탭을 옮긴다.
 */
export default function SeasonTabs({ label, tabs }: { label: string; tabs: Tab[] }) {
  const [active, setActive] = useState(0);
  const baseId = useId();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (step === 0) return;
    event.preventDefault();
    const next = (active + step + tabs.length) % tabs.length;
    setActive(next);
    buttons.current[next]?.focus();
  }

  return (
    <div>
      <div role="tablist" aria-label={label} className="mb-3 inline-flex gap-1 rounded-full bg-surface-2 p-1">
        {tabs.map((tab, i) => {
          const selected = i === active;
          return (
            <button
              key={tab.label}
              ref={(el) => {
                buttons.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${i}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${i}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(i)}
              onKeyDown={onKeyDown}
              className={`cursor-pointer rounded-full px-4 py-1.5 text-sm font-semibold ${selected ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground"}`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {tabs.map((tab, i) => (
        <div
          key={tab.label}
          role="tabpanel"
          id={`${baseId}-panel-${i}`}
          aria-labelledby={`${baseId}-tab-${i}`}
          hidden={i !== active}
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
