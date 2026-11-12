"use client";

// 알림 띠(토스트)를 그린다. layout에 하나만 둔다. 띄우는 쪽은 src/lib/toast.ts의 toast("…")를 부른다.
// 토스(TDS Toast)처럼: 머리글 바로 아래에 떴다가 3초(버튼이 있으면 5초) 뒤 사라지고, 위로 밀면 바로 치워진다.
// 앱(웹뷰) 안에서는 아래 네이티브 탭 막대가 화면 아래를 덮고 있어서 위쪽에 둔다.
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, type PointerEvent } from "react";
import { currentToast, dismissToast, subscribeToast, type ToastItem } from "@/lib/toast";

const SHOW_MS = 3000;
const SHOW_WITH_ACTION_MS = 5000;
/** 사라지는 움직임 길이(globals.css .toast-out과 같게) */
const LEAVE_MS = 160;
/** 이만큼 위로 밀면 치운다 */
const SWIPE_PX = 24;

export default function Toaster() {
  const item = useSyncExternalStore(subscribeToast, currentToast, () => null);
  // 사라지는 동안에도 마지막 알림을 잠깐 그려 둔다
  const [shown, setShown] = useState<{ item: ToastItem; leaving: boolean } | null>(null);
  const startY = useRef<number | null>(null);
  // 마우스·손가락·키보드 포커스가 알림 위에 있으면 읽거나 누르는 중이라 내리지 않는다(이슈 #164)
  const [held, setHeld] = useState(false);

  if (item && shown?.item.id !== item.id) {
    setShown({ item, leaving: false });
  } else if (!item && shown && !shown.leaving) {
    setShown({ item: shown.item, leaving: true });
  }

  // 시간이 다 되면 내린다. 붙잡고 있는 동안은 멈췄다가 놓으면 처음부터 다시 센다
  useEffect(() => {
    if (!item || held) return;
    const timer = setTimeout(() => dismissToast(item.id), item.action ? SHOW_WITH_ACTION_MS : SHOW_MS);
    return () => clearTimeout(timer);
  }, [item, held]);

  // 사라지는 움직임이 끝나면 그리지 않는다
  useEffect(() => {
    if (!shown?.leaving) return;
    const timer = setTimeout(() => setShown(null), LEAVE_MS);
    return () => clearTimeout(timer);
  }, [shown]);

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    startY.current = e.clientY;
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (startY.current !== null && shown && e.clientY - startY.current < -SWIPE_PX) {
      startY.current = null;
      dismissToast(shown.item.id);
    }
  }

  const toastItem = shown?.item;
  return (
    // 화면 낭독기가 새 알림을 읽도록 자리는 늘 둔다
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 top-16 z-50 flex justify-center px-3">
      {toastItem && (
        <div
          key={toastItem.id}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={() => (startY.current = null)}
          onPointerEnter={() => setHeld(true)}
          onPointerLeave={() => setHeld(false)}
          onFocus={() => setHeld(true)}
          onBlur={() => setHeld(false)}
          className={`pointer-events-auto flex max-w-[26rem] touch-none items-center gap-2.5 rounded-2xl bg-toast-bg py-3 pl-4 pr-3 text-[0.9375rem] font-semibold text-toast-fg shadow-[0_8px_24px_rgb(0_0_0/0.18)] ${shown.leaving ? "toast-out" : "toast-in"}`}
        >
          {toastItem.tone !== "info" && <ToneIcon tone={toastItem.tone} />}
          <span className="min-w-0 flex-1 pr-1 leading-snug">{toastItem.message}</span>
          {toastItem.action && <ActionButton item={toastItem} />}
        </div>
      )}
    </div>
  );
}

function ActionButton({ item }: { item: ToastItem }) {
  const action = item.action!;
  const className = "press tap-target shrink-0 rounded-lg px-2 py-1 text-[0.9375rem] font-bold text-toast-action";
  const onClick = () => {
    action.onClick?.();
    dismissToast(item.id);
  };
  return action.href ? (
    <Link href={action.href} onClick={onClick} className={className}>
      {action.label}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={className}>
      {action.label}
    </button>
  );
}

/** 성공은 초록 원 체크, 실패는 빨간 원 느낌표 */
function ToneIcon({ tone }: { tone: "success" | "error" }) {
  return (
    <span
      aria-hidden
      className={`grid size-5 shrink-0 place-items-center rounded-full ${tone === "success" ? "bg-toast-success" : "bg-toast-error"}`}
    >
      <svg viewBox="0 0 16 16" fill="none" stroke="#111827" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" className="size-3">
        {tone === "success" ? <path d="m4 8.5 2.5 2.5L12 5.5" /> : <path d="M8 4.5v4.5M8 11.5v.01" />}
      </svg>
    </span>
  );
}
