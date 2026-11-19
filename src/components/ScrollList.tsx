"use client"; // 안 줄이 상자 높이보다 많은지 재야 해서(ResizeObserver) 클라이언트 컴포넌트다.

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * 높이를 제한한 목록(ol). 줄이 상자보다 많아 세로로 넘칠 때만 Tab이 머물러 키보드(↑↓·PageDown)로도 내린다
 * (WCAG 2.1.1, 사파리는 스크롤 상자에 저절로 포커스를 주지 않는다). 다 들어가면 Tab 정지가 없다(ScrollBox와 같은 규칙, 세로 판).
 * 포커스가 머물 때는 이름이 있어야 해서 label 이름의 영역(region)이 되고, 넘치지 않으면 그냥 목록이다.
 * 글자 크기(앱 큰 글씨)가 바뀌면 줄 높이가 달라져 상자와 안 줄을 함께 잰다
 */
export default function ScrollList({ label, className = "", children }: { label: string; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLOListElement>(null);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    const box = ref.current;
    if (!box) return;
    const measure = () => setOverflows(box.scrollHeight > box.clientHeight);
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    for (const child of box.children) observer.observe(child);
    return () => observer.disconnect();
  }, []);

  return (
    <ol
      ref={ref}
      tabIndex={overflows ? 0 : undefined}
      role={overflows ? "region" : undefined}
      aria-label={overflows ? label : undefined}
      className={className}
    >
      {children}
    </ol>
  );
}
