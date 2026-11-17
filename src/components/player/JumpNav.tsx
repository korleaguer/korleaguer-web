"use client"; // 지금 보는 칸 표시와 미끄러져 가기에 스크롤 위치가 필요해서 클라이언트 컴포넌트다.

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { haptic } from "@/lib/app";
import { revealInRow } from "@/lib/scroll";

/** 바로 가기 알약 하나: 그 칸 제목(h2)의 id와 알약 글자 */
export interface JumpTarget {
  id: string;
  label: string;
}

/** 칸 제목을 탭 줄 바로 아래 이만큼 띄워 멈춘다(px) */
const GAP = 12;

/**
 * 선수 페이지 바로 가기 탭(사용자 11-16 시안 B, 이슈 #236). 머리 카드 아래 '성적 · 기사 · 경기 · 시즌별 · 이동'.
 * 페이지가 길어 경기 기록이 화면 두 장 넘게 아래에 있어서, 어디까지 내려가 있든 한 번 눌러 그 칸으로 가게 한다.
 * 내려가면 화면 맨 위(앱은 위에 붙은 머리글 아래)에 붙고, 지금 보고 있는 칸 알약이 켜진다(기간 알약과 같은 연파랑).
 * 붙으면 사이트 머리글처럼 흰 띠 + 아래 선이 된다(회색 바탕 위 `line` 선은 바탕과 거의 같은 색이라 보이지 않았다).
 * 흰 띠 위에서는 꺼진 알약을 회색(surface-2)으로 바꿔 모양을 남긴다.
 * 휴대폰·태블릿만. PC(1024px 이상)는 두 칸이라 한 화면에 많이 보이고, 오른쪽 칸(기사·이동)이 왼쪽과 같은 높이에 있어
 * '지금 보는 칸'이 하나로 정해지지 않아 숨긴다.
 * 자바스크립트가 없어도 보통 링크(#id)로 그 칸에 간다.
 */
export default function JumpNav({ targets }: { targets: JumpTarget[] }) {
  const navRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  // 알약을 눌러 미끄러져 가는 동안은 그 알약을 켜 둔다(지나가는 칸마다 깜빡이지 않게). 스크롤이 멈추면 푼다
  const lockRef = useRef<number | null>(null);
  // 도착한 뒤에도 사람이 스크롤하기 전까지는 누른 알약을 켜 둔다. 페이지 끝 근처 칸(시즌별)은 끝까지 내려가도
  // 제목이 탭 줄 아래에 오지 못해서, 끝에 닿으면 마지막 칸을 켜는 규칙이 누른 칸 대신 '이동'을 켰다
  const heldRef = useRef<{ index: number; y: number } | null>(null);
  const [active, setActive] = useState(0);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    let frame = 0;
    let settle = 0;

    const update = () => {
      frame = 0;
      const rect = nav.getBoundingClientRect();
      const stickTop = parseFloat(getComputedStyle(nav).top) || 0;
      setStuck(window.scrollY > 0 && rect.top <= stickTop + 0.5);
      if (lockRef.current != null) {
        setActive(lockRef.current);
        return;
      }
      const held = heldRef.current;
      if (held && Math.abs(window.scrollY - held.y) < 4) {
        setActive(held.index);
        return;
      }
      heldRef.current = null;
      // 제목이 탭 줄 바로 아래 선을 지난 마지막 칸. 맨 아래까지 내려오면 마지막 칸(짧은 마지막 칸은 선에 못 닿는다)
      const line = rect.bottom + GAP + 4;
      let current = 0;
      targets.forEach((t, i) => {
        const el = document.getElementById(t.id);
        if (el && el.getBoundingClientRect().top <= line) current = i;
      });
      const doc = document.documentElement;
      if (window.scrollY > 0 && window.innerHeight + window.scrollY >= doc.scrollHeight - 2) current = targets.length - 1;
      setActive(current);
    };
    const onScroll = () => {
      if (lockRef.current != null) {
        window.clearTimeout(settle);
        settle = window.setTimeout(() => {
          if (lockRef.current != null) heldRef.current = { index: lockRef.current, y: window.scrollY };
          lockRef.current = null;
          update();
        }, 150);
      }
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
      window.clearTimeout(settle);
    };
  }, [targets]);

  // 켜진 알약이 줄 밖(큰 글씨로 알약이 넘칠 때)이면 가로로 밀어 보이게 한다. 페이지 세로 스크롤은 건드리지 않는다
  useEffect(() => {
    const list = listRef.current;
    const pill = list?.children[active] as HTMLElement | undefined;
    if (list && pill) revealInRow(list, pill);
  }, [active]);

  const go = (event: MouseEvent<HTMLAnchorElement>, i: number) => {
    const nav = navRef.current;
    const el = document.getElementById(targets[i].id);
    if (!nav || !el) return;
    event.preventDefault();
    haptic("select");
    // 붙은 탭 줄(앱은 머리글까지) 아래에 제목이 오게 직접 계산한다. 주소에 #을 남기지 않아 뒤로 가기가 그대로다
    const stickTop = parseFloat(getComputedStyle(nav).top) || 0;
    const y = el.getBoundingClientRect().top + window.scrollY - stickTop - nav.offsetHeight - GAP;
    const top = Math.min(Math.max(0, y), document.documentElement.scrollHeight - window.innerHeight);
    setActive(i);
    // 키보드·낭독기 사용자도 그 칸에서 이어 가게 칸 제목으로 포커스를 옮긴다. 예전에는 화면만 내려가고 포커스는 탭 줄에 남아,
    // 다음 Tab이 페이지 위쪽부터 다시 시작했다(11-17 전수조사). 제목은 원래 포커스를 받지 않아 tabindex=-1을 붙이고(Tab 순서에는
    // 들지 않는다), 스크롤은 위에서 직접 하니 막는다. 테두리는 키보드로 왔을 때만 보인다(:focus-visible)
    if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
    el.focus({ preventScroll: true });
    // 이미 그 자리면 스크롤이 일어나지 않아 잠금을 풀 일이 없으니 잠그지 않고 켜 두기만 한다
    if (Math.abs(window.scrollY - top) < 2) {
      heldRef.current = { index: i, y: window.scrollY };
      return;
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    lockRef.current = i;
    window.scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <nav
      ref={navRef}
      // 붙은 탭 줄 밑으로 포커스가 숨지 않게 globals.css가 이 표시를 보고 scroll-padding-top을 둔다
      data-jump-nav=""
      aria-label="이 페이지 바로 가기"
      className={`sticky top-0 z-30 -mx-3 px-3 py-0.5 transition-[background-color,box-shadow] duration-150 motion-reduce:transition-none sm:-mx-6 sm:px-6 lg:hidden in-app:top-14 ${
        stuck ? "bg-surface shadow-[0_1px_0_var(--line)]" : "bg-background"
      }`}
    >
      {/* 알약 32px(2rem)에 누르는 영역 44px(.tap-target, 이슈 #251). 가로로 밀리는 줄은 넘친 부분을 잘라서, 넓힌 영역이 들어가게
          줄 위아래에 (44px − 알약)/2 여백을 두고 그만큼 탭 줄 여백(py-2 → py-0.5)을 줄여 높이는 그대로다.
          앱에서 글자를 작게 하면 알약이 줄어드니 여백을 max(6px 상당, 22px − 1rem)로(이슈 #257) */}
      <ul ref={listRef} className="no-scrollbar flex gap-1.5 overflow-x-auto overflow-y-hidden py-[max(0.375rem,calc(22px-1rem))]">
        {targets.map((t, i) => {
          const on = i === active;
          return (
            <li key={t.id} className="shrink-0">
              <a
                href={`#${t.id}`}
                onClick={(e) => go(e, i)}
                aria-current={on ? "location" : undefined}
                className={`press tap-target inline-flex min-h-8 items-center rounded-full px-3.5 text-label transition-colors duration-150 motion-reduce:transition-none ${
                  on
                    ? "bg-accent-soft text-accent-ink"
                    : `${stuck ? "bg-surface-2" : "bg-surface"} text-muted hover:text-foreground`
                }`}
              >
                {/* 지금 보는 칸은 글자도 굵게(색만으로 구분하지 않게, 이슈 #260) */}
                <span className={`bold-reserve ${on ? "font-extrabold" : ""}`} data-text={t.label}>
                  {t.label}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
