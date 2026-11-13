"use client"; // 누른 칸을 바로 표시하고 알약 자리를 재야 해서 클라이언트 컴포넌트다.

import Link, { useLinkStatus } from "next/link";
import { useLayoutEffect, useRef, useState } from "react";
import { haptic } from "@/lib/app";
import LoadingDots from "./LoadingDots";

export interface PillItem {
  href: string;
  label: string;
  /** "page": 지금 이 화면, "true": 이 칸 아래 화면, 그 외 undefined */
  current?: "page" | "true";
}

interface Props {
  items: PillItem[];
  /** 화면 낭독기가 읽는 이름("기간", "주요 메뉴") */
  label: string;
  /** nav에 붙는 클래스(간격·바탕 등) */
  className?: string;
  /** 칸마다 붙는 클래스(크기·글씨) */
  itemClass: string;
  /** 고르지 않은 칸 글씨색 등 */
  idleClass: string;
  /** 같은 화면에서 주소만 바꿀 때(기간) false: 맨 위로 튀지 않게 */
  scroll?: boolean;
}

/**
 * 알약 모양 칸 고르기(토스 SegmentedControl처럼). 누르는 즉시 파란 알약이 그 칸으로 미끄러지고(스프링),
 * 다음 화면을 받는 동안 그 칸 글자 자리에 점 3개가 돈다. 앱 안이면 칸이 바뀔 때 고르기 틱.
 * 알약 자리는 칸의 실제 위치를 재서 정한다(글씨 크기를 키워도 맞게). 재기 전(서버가 그린 첫 화면)에는 고른 칸 자체에 바탕을 칠한다.
 */
export default function PillNav({ items, label, className = "", itemClass, idleClass, scroll }: Props) {
  const currentIndex = items.findIndex((item) => item.current);
  // 누른 칸. 주소가 바뀌어 currentIndex가 따라오면 더는 쓰지 않는다(base로 어느 화면에서 눌렀는지 기억)
  const [picked, setPicked] = useState<{ index: number; base: number } | null>(null);
  const active = picked && picked.base === currentIndex ? picked.index : currentIndex;

  const navRef = useRef<HTMLElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [rect, setRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [ready, setReady] = useState(false);

  // 고른 칸의 자리를 잰다. 글씨 크기·창 폭이 바뀌어도 다시 잰다
  useLayoutEffect(() => {
    const nav = navRef.current;
    const measure = () => {
      const el = active >= 0 ? itemRefs.current[active] : null;
      setRect(el ? { x: el.offsetLeft, y: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight } : null);
    };
    measure();
    if (!nav) return;
    const observer = new ResizeObserver(measure);
    observer.observe(nav);
    return () => observer.disconnect();
  }, [active]);

  // 첫 자리를 잡은 다음 프레임부터 움직임을 켠다(처음 그릴 때 왼쪽 끝에서 미끄러져 오지 않게)
  useLayoutEffect(() => {
    if (!rect || ready) return;
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, [rect, ready]);

  return (
    <nav ref={navRef} aria-label={label} className={`relative flex ${className}`}>
      {rect && (
        <span
          aria-hidden
          data-ready={ready ? "" : undefined}
          className="pill-indicator absolute left-0 top-0 rounded-full bg-accent-soft"
          style={{ translate: `${rect.x}px ${rect.y}px`, width: rect.width, height: rect.height }}
        />
      )}
      {items.map((item, i) => {
        const on = i === active;
        return (
          <Link
            key={item.href}
            ref={(el) => {
              itemRefs.current[i] = el;
            }}
            href={item.href}
            scroll={scroll}
            aria-current={item.current}
            onClick={() => {
              if (on) return;
              haptic("select");
              setPicked({ index: i, base: currentIndex });
            }}
            className={`press tap-target relative rounded-full ${itemClass} ${on ? "text-accent-ink" : idleClass} ${on && !rect ? "bg-accent-soft" : ""}`}
          >
            <PendingLabel>{item.label}</PendingLabel>
          </Link>
        );
      })}
    </nav>
  );
}

/** 이 칸의 다음 화면을 받는 동안 점 3개(Link 안에서만 쓸 수 있다) */
function PendingLabel({ children }: { children: string }) {
  const { pending } = useLinkStatus();
  return <LoadingDots loading={pending}>{children}</LoadingDots>;
}
