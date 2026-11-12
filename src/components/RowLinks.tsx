"use client"; // 줄을 누르면 페이지를 옮겨야 해서(router) 클라이언트 컴포넌트다.

import type { MouseEvent, ReactNode } from "react";
import { useRouter } from "next/navigation";

/**
 * 안에서 `data-href`를 단 줄(tbody·tr)을 누르면 그 주소로 간다(이슈 #158).
 * 표의 이름 칸은 가로로 밀어도 고정(sticky)이라, 카드처럼 이름 링크의 ::after를 줄 전체로 넓힐 수 없다
 * (sticky 칸이 ::after의 기준이 돼 이름 칸만 덮는다). 그래서 누름 하나만 받아 옮긴다.
 * 키보드·화면 낭독기는 줄 안의 이름 링크로 가므로 이 처리는 마우스·터치용 지름길이다.
 * 안의 링크·버튼을 누를 때, 글자를 끌어 고를 때, Ctrl/⌘ 누름(새 탭)은 브라우저 기본 동작에 맡긴다.
 */
export default function RowLinks({ className, children }: { className?: string; children: ReactNode }) {
  const router = useRouter();

  function onClick(e: MouseEvent<HTMLDivElement>) {
    if (e.defaultPrevented || e.button !== 0) return;
    const target = e.target as Element;
    if (target.closest("a, button, input, select, textarea, summary, label")) return;
    const row = target.closest<HTMLElement>("[data-href]");
    const href = row?.dataset.href;
    if (!href) return;
    if (window.getSelection()?.toString()) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey) {
      window.open(href, "_blank", "noopener");
      return;
    }
    router.push(href);
  }

  return (
    // 누름은 키보드로 갈 수 있는 이름 링크가 대신하므로 여기에는 역할(role)을 주지 않는다
    <div className={className} onClick={onClick}>
      {children}
    </div>
  );
}
