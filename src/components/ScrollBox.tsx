"use client"; // 안 내용이 상자보다 넓은지 재야 해서(ResizeObserver) 클라이언트 컴포넌트다.

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * 안 내용(표 등)이 넓으면 이 상자 안에서만 가로로 밀린다. 넘칠 때만 Tab이 머물러 키보드로도 민다(WCAG 2.1.1, 사파리는
 * 스크롤 상자에 저절로 포커스를 주지 않는다). 늘 tabIndex를 두면 다 들어가 밀 것이 없을 때도 아무 일 안 하는 칸에 Tab이
 * 한 번 더 멈췄다(PR #290 리뷰). 시즌별 기록 표는 보통 크기 360px 휴대폰·PC에서는 다 들어가고, 320px과 앱 큰 글씨
 * 1.25배부터 넘친다. 포커스가 머물 때는 이름이 있어야 해서 labelledBy 이름의 묶음(group)이 되고, 넘치지 않으면 그냥 상자다.
 * 안에 링크처럼 포커스가 가는 것이 있으면 Tab이 이미 안으로 들어가므로 쓰지 않는다(홈 기록 표 TableScroll은 줄마다 이름 링크).
 * 글자 크기(앱 큰 글씨)만 바뀌면 상자 폭은 그대로여도 안 내용이 넓어져서 안 내용도 함께 잰다.
 * relative: 칸 안 sr-only 글자(position: absolute)가 스크롤 상자 밖으로 빠져나와 페이지가 가로로 밀리지 않게(TableScroll과 같은 이유)
 */
export default function ScrollBox({
  labelledBy,
  className = "",
  children,
}: {
  /** 넘칠 때 묶음 이름이 될 요소 id(보통 칸 제목 h2) */
  labelledBy: string;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    const box = ref.current;
    if (!box) return;
    const measure = () => setOverflows(box.scrollWidth > box.clientWidth);
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    for (const child of box.children) observer.observe(child);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      tabIndex={overflows ? 0 : undefined}
      role={overflows ? "group" : undefined}
      aria-labelledby={overflows ? labelledBy : undefined}
      className={`relative overflow-x-auto ${className}`}
    >
      {children}
    </div>
  );
}
