"use client"; // 펼침 상태를 기억해야 해서 클라이언트 컴포넌트다.

import { useId, useState, type ReactNode } from "react";

/**
 * MLB 도전 카드의 '역대 포스팅 계약'을 접어 두는 머리 줄(사용자 11-12 결정: 매일 같은 목록이 늘 펼쳐져 있지 않게).
 * 누르면 줄 아래로 목록이 펼쳐진다. 접혀 있어도 둘째 줄(최고 계약)로 무엇이 들어 있는지 보인다.
 * 비시즌 홈의 '시즌 기록' 표도 같은 줄로 접는다(이슈 #191). 그때는 className·buttonClassName으로 카드 모양을 준다.
 */
export default function HistoryToggle({
  title,
  hint,
  children,
  className = "mt-4 border-t border-line",
  buttonClassName = "",
}: {
  title: string;
  hint: string;
  children: ReactNode;
  className?: string;
  buttonClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className={className}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
        className={`press-soft flex w-full cursor-pointer items-center gap-3 py-3 text-left ${buttonClassName}`}
      >
        <span className="min-w-0 flex-1">
          <span className="block text-[0.8125rem] font-bold">{title}</span>
          <span className="mt-0.5 block truncate text-xs text-muted tabular-nums">{hint}</span>
        </span>
        <span className="shrink-0 text-[0.8125rem] font-semibold text-accent-ink">{open ? "접기" : "펼치기"}</span>
        <svg
          aria-hidden
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`-ml-2 size-4 shrink-0 text-accent-ink transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M3.5 6 8 10.5 12.5 6" />
        </svg>
      </button>
      <div id={id} hidden={!open} className="reveal">
        {children}
      </div>
    </div>
  );
}
