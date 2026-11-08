import Link from "next/link";
import { Suspense } from "react";
import SiteNav, { NavLinks } from "./SiteNav";

/** 맨 위 남색 머리띠(여권 표지). 금박 워드마크 + 메뉴 */
export default function SiteHeader() {
  return (
    <header className="border-b border-gold/40 bg-cover text-cover-fg">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4">
        <Link href="/" className="flex items-baseline gap-2 text-gold">
          <span className="font-display text-[1.375rem] font-bold leading-none">코리거</span>
          <span aria-hidden className="hidden text-[0.625rem] font-semibold tracking-[0.22em] sm:inline">
            KORLEAGUER
          </span>
        </Link>
        <span className="rounded-full px-2 py-0.5 text-xs font-semibold text-cover-muted ring-1 ring-cover-muted/40">
          야구
        </span>
        {/* 현재 주소는 요청 때 알 수 있는 경우가 있어서 Suspense가 필요하다. 그동안은 표시 없는 메뉴를 보여 준다. */}
        <Suspense fallback={<NavLinks pathname={null} />}>
          <SiteNav />
        </Suspense>
        <span className="ml-auto hidden text-xs text-cover-muted md:inline">
          한국 MLB 선수 경기 기록 모아보기
        </span>
      </div>
    </header>
  );
}
