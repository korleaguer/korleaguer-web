"use client";

// 알림 띠(토스트)를 그린다. layout에 하나만 둔다. 띄우는 쪽은 src/lib/toast.ts의 toast("…")를 부른다.
// 토스(TDS Toast)처럼: 머리글 바로 아래에 떴다가 3초(버튼이 있으면 10초) 뒤 사라지고, 위로 밀면 바로 치워진다.
// 앱(웹뷰) 안에서는 아래 네이티브 탭 막대가 화면 아래를 덮고 있어서 위쪽에 둔다.
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, type MouseEvent, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { currentToast, dismissToast, subscribeToast, type ToastItem } from "@/lib/toast";
import { subscribeModal, topModal } from "@/lib/useModalDialog";

const SHOW_MS = 3000;
/**
 * 버튼('되돌리기'·'보기' 등)이 있는 알림. 5초는 버튼을 찾아 누르기에 짧았다: 별로 뺀 내 선수를 되돌리는 버튼이 이 알림에만 있고,
 * 알림이 문서 맨 끝이라 키보드로 가는 사이 사라졌다(11-17 점검, 버튼이 있으면 10초 이상). 포커스·마우스가 올라가 있는 동안은 멈춘다
 */
const SHOW_WITH_ACTION_MS = 10000;
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
  // 창(<dialog> 모달)이 열려 있으면 그 창 안에 그린다. 창 밖은 창 아래 깔리고 누를 수 없어서(inert) 창 안에서 별을 누를 때 뜬
  // '되돌리기' 알림이 가려졌다(이슈 #326). 창은 위치를 바꾸지 않는(transform 없는) 전체 화면이라 fixed 위치는 그대로다
  const host = useSyncExternalStore(subscribeModal, topModal, () => null);
  const bar = (
    // 화면 낭독기가 새 알림을 읽도록 자리는 늘 둔다. data-toast: 포커스가 아직 사라지는 알림 안에 있는지 알아볼 때 쓴다(useFocusAfterRemove)
    <div
      role="status"
      aria-live="polite"
      data-toast
      className="pointer-events-none fixed inset-x-0 top-16 z-50 flex justify-center px-3"
    >
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
          // 위로 밀어 치우는 띠라 글자가 잡히지 않게 select-none(앱 안 글자 선택은 누르는 것·끄는 곳에만 막는다)
          className={`pointer-events-auto flex max-w-[26rem] touch-none select-none items-center gap-2.5 rounded-2xl bg-toast-bg py-3 pl-4 pr-3 text-summary text-toast-fg shadow-[0_8px_24px_rgb(0_0_0/0.18)] ${shown.leaving ? "toast-out" : "toast-in"}`}
        >
          {toastItem.tone !== "info" && <ToneIcon tone={toastItem.tone} />}
          <span className="min-w-0 flex-1 pr-1">{toastItem.message}</span>
          {toastItem.action && <ActionButton item={toastItem} />}
        </div>
      )}
    </div>
  );
  return host ? createPortal(bar, host) : bar;
}

function ActionButton({ item }: { item: ToastItem }) {
  const action = item.action!;
  // 포커스 테두리도 버튼 글자와 같은 밝은 파랑. 사이트 기본 파랑(accent)은 다크 알림 바탕(#3a404a) 위에서 2.02:1이라
  // 키보드로 옮겨 와도 잘 안 보였다(WCAG 1.4.11 3:1, 전수조사). 밝은 파랑은 라이트 7.78:1 · 다크 5.98:1
  const className =
    "press tap-target shrink-0 rounded-lg px-2 py-1 text-button text-toast-action focus-visible:outline-toast-action";
  // 누를 때 이 버튼에 포커스가 있었는지 함께 넘긴다. 알림이 사라지면 그 포커스도 사라지니 할 일 쪽이 옮길 곳을 정한다
  const onClick = (e: MouseEvent<HTMLElement>) => {
    action.onClick?.({ focused: document.activeElement === e.currentTarget, keyboard: e.detail === 0 });
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
