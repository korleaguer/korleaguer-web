"use client"; // 누르면 말풍선을 열고 닫으며 바깥 누르기·Esc를 들어야 해서 클라이언트 컴포넌트다.

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { iosTabBarHeight } from "@/lib/app";

/** 말풍선 폭 상한: 보통 크기 18rem(288px). 큰 글씨면 글자를 따라 넓히되 화면 폭 - 32px까지 */
const MAX_WIDTH_REM = 18;
/** 버튼과 말풍선 사이 간격(px) */
const GAP = 6;

/** 브라우저가 popover(맨 위 층)를 아는가. 모르는 옛 브라우저는 body 끝에 띄운다(home/LinkedTeams의 '외 n개 구단'과 같다) */
function supportsPopover(): boolean {
  return typeof HTMLElement !== "undefined" && "showPopover" in HTMLElement.prototype;
}

/** 말풍선 폭: 보통 크기 18rem. 큰 글씨면 글자를 따라 넓히되 화면 폭 - 32px까지 */
function tipWidth(): number {
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  return Math.min(MAX_WIDTH_REM * rem, window.innerWidth - 32);
}

/** 말풍선을 띄울 수 있는 세로 자리: 위에 붙은 사이트 머리글 아래부터 화면 맨 아래(iOS 앱 아래 탭 막대는 빼고)까지 */
function band(): { top: number; bottom: number } {
  const header = document.querySelector<HTMLElement>("[data-site-header]");
  const sticky = header && getComputedStyle(header).position === "sticky";
  const top = sticky ? Math.max(0, header.getBoundingClientRect().bottom) : 0;
  return { top, bottom: window.innerHeight - iosTabBarHeight() };
}

interface Place {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  /** 버튼이 머리글 밑이나 화면 밖으로 나가 안 보이면 false(그때는 닫는다) */
  shown: boolean;
}

/** 버튼 바로 아래, 아래 자리가 모자라고 위가 더 넉넉하면 위(말풍선 높이 height는 그려진 뒤 잰 값) */
function place(button: HTMLElement | null, height: number): Place | null {
  const rect = button?.getBoundingClientRect();
  if (!rect) return null;
  const width = tipWidth();
  // 버튼 가운데에서 시작해 화면 양쪽 16px 안에 넣는다
  const left = Math.min(Math.max(16, rect.left + rect.width / 2 - 24), window.innerWidth - 16 - width);
  const b = band();
  const below = b.bottom - 8 - (rect.bottom + GAP);
  const above = rect.top - GAP - (b.top + 8);
  const up = height > below && above > below;
  // 아래·위 어느 쪽에도 다 안 들어가면(앱 큰 글씨 2배) 단추를 조금 덮더라도 위아래 자리 안에서 통째로 보이게 민다. 그래도 넘치면 안에서 스크롤
  const room = b.bottom - b.top - 16;
  const h = Math.min(height + 2, room); // +2: 테두리
  const wanted = up ? rect.top - GAP - h : rect.bottom + GAP;
  return {
    top: Math.min(Math.max(wanted, b.top + 8), b.bottom - 8 - h),
    left,
    width,
    maxHeight: room,
    shown: rect.bottom > b.top && rect.top < b.bottom,
  };
}

/**
 * 제목 옆 ⓘ 단추(11-19 설명 글 줄이기, 이슈 #327). 쓰는 법·읽는 법·기준·출처 같은 설명을 화면에서 치우고 눌러야 보이게 한다.
 * 누르면 아래에 짧은 줄 목록 말풍선이 뜨고, 다시 누르기·바깥 누르기·Esc로 닫는다(Esc로 닫으면 포커스는 단추로).
 * 보이는 동그라미는 18px(rem이라 앱 큰 글씨를 따른다), 누르는 영역은 44px(.tap-target)이고 바깥 간격은 그대로다.
 * 말풍선은 home/LinkedTeams '외 n개 구단' 목록처럼 popover로 맨 위 층에 띄워 카드(overflow-hidden)에 잘리지 않고,
 * DOM에서 단추 바로 뒤에 둬 Tab·낭독 순서가 단추 다음이 된다. 스크롤하면 단추를 따라가고, 단추가 머리글 밑으로 가면 닫는다.
 */
export default function InfoTip({ title, lines, className = "" }: { title: string; lines: ReactNode[]; className?: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<Place | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const id = useId();

  // 말풍선이 그려지면 맨 위 층에 올리고 높이를 재 자리를 잡는다(처음엔 숨겨 둔 채로 그려 깜빡이지 않게)
  useLayoutEffect(() => {
    const tip = tipRef.current;
    if (!open || !tip) return;
    if (supportsPopover() && !tip.matches(":popover-open")) tip.showPopover();
    // 높이는 폭이 정해진 뒤에 재야 한다(폭 0으로 재면 한 글자씩 감겨 아주 높다)
    tip.style.width = `${tipWidth()}px`;
    setPos(place(buttonRef.current, tip.scrollHeight));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const outside = (target: EventTarget | null) =>
      !(target instanceof Node) || (!buttonRef.current?.contains(target) && !tipRef.current?.contains(target));
    const onDown = (e: PointerEvent) => {
      if (outside(e.target)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    let frame = 0;
    const follow = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const next = place(buttonRef.current, tipRef.current?.scrollHeight ?? 0);
        if (!next) return;
        if (!next.shown) setOpen(false);
        else setPos(next);
      });
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", follow, { capture: true, passive: true });
    window.addEventListener("resize", follow);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", follow, { capture: true });
      window.removeEventListener("resize", follow);
      cancelAnimationFrame(frame);
    };
  }, [open]);

  // 다른 화면으로 가며 숨겨지거나 지워질 때 닫아 둔다(숨겨 둔 화면이 되살아날 때 옛 자리에 다시 뜨지 않게)
  useEffect(() => () => setOpen(false), []);

  const tip = open && (
    <div
      ref={tipRef}
      id={id}
      popover={supportsPopover() ? "manual" : undefined}
      // 말풍선 빈 곳을 눌러도 뒤 카드(card-link)가 눌린 듯 줄지 않게
      data-no-press
      style={{
        top: pos?.top ?? 0,
        left: pos?.left ?? 0,
        width: pos?.width ?? 0,
        maxHeight: pos?.maxHeight,
        visibility: pos ? undefined : "hidden",
      }}
      // popover 기본 모양(가운데 놓기·여백·테두리)을 지우고 단추 아래 고정 자리에 둔다. z-40은 popover를 모르는 옛 브라우저용
      className="fixed inset-auto z-40 m-0 overflow-y-auto rounded-xl border border-line bg-surface px-3.5 py-3 text-foreground shadow-[var(--shadow-card-hover)]"
    >
      <ul className="list-disc space-y-1 pl-4 text-meta">
        {lines.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    </div>
  );

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={`${title} 설명`}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen((v) => !v)}
        className={`tap-target inline-flex size-[1.125rem] shrink-0 cursor-pointer items-center justify-center rounded-full text-muted hover:text-foreground ${className}`}
      >
        <svg aria-hidden viewBox="0 0 18 18" className="size-full" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
          <circle cx="9" cy="9" r="7.8" />
          <circle cx="9" cy="5.4" r="0.6" fill="currentColor" strokeWidth="0.8" />
          <path d="M9 8.2v5" strokeWidth="1.6" />
        </svg>
      </button>
      {tip && (supportsPopover() ? tip : createPortal(tip, document.body))}
    </>
  );
}
