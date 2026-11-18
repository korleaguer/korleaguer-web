"use client"; // 누르면 주소에 #을 남기지 않고 본문으로 포커스를 옮겨야 해서 클라이언트 컴포넌트다.

import { focusContainer } from "@/lib/focus";

/**
 * '본문 바로가기'(KRDS 반복 영역 건너뛰기, WCAG 2.4.1). 키보드로 처음 Tab을 누르면 왼쪽 위에 나타나고,
 * 누르면 머리글 메뉴를 건너뛰어 본문(main#main)으로 포커스를 옮긴다. 평소에는 보이지 않고 낭독기는 읽는다.
 * 주소에 '#main'을 남기지 않는다(바로 가기 탭처럼). 화면을 이어받기 전에는 보통 링크(#main)로 같은 곳에 간다
 * (그때는 브라우저가 다음 Tab의 시작점을 본문으로 옮긴다).
 * main은 원래 포커스를 받지 않아서, 누를 때만 tabindex를 붙였다가 포커스가 떠나면 뗀다(focusContainer).
 */
export default function SkipLink() {
  return (
    <a
      href="#main"
      onClick={(e) => {
        const main = document.getElementById("main");
        if (!main) return;
        e.preventDefault();
        focusContainer(main);
      }}
      className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-xl focus:bg-surface focus:px-4 focus:py-3 focus:text-button focus:shadow-[var(--shadow-card-hover)]"
    >
      본문 바로가기
    </a>
  );
}
