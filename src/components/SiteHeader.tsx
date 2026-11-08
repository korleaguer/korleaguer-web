import Link from "next/link";
import { Suspense } from "react";
import SiteNav, { NavLinks } from "./SiteNav";

/** 맨 위 흰 머리글. 파란 'K' 상자 + 코리거, 알약 모양 메뉴 */
export default function SiteHeader() {
  return (
    <header className="bg-surface shadow-[0_1px_0_var(--line)]">
      <div className="mx-auto flex h-14 max-w-[67.5rem] items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-[7px] rounded-lg">
          <span
            aria-hidden
            className="grid size-[26px] place-items-center rounded-lg bg-accent text-sm font-extrabold text-accent-fg"
          >
            K
          </span>
          <span className="text-lg font-extrabold tracking-[-0.03em]">코리거</span>
        </Link>
        {/* 현재 주소는 요청 때 알 수 있는 경우가 있어서 Suspense가 필요하다. 그동안은 표시 없는 메뉴를 보여 준다. */}
        <Suspense fallback={<NavLinks pathname={null} />}>
          <SiteNav />
        </Suspense>
        <span className="ml-auto hidden text-xs text-muted md:inline">한국 MLB 선수 경기 기록 모아보기</span>
      </div>
    </header>
  );
}
