import Link from "next/link";
import { Suspense } from "react";
import SiteNav, { NavLinks } from "./SiteNav";

export default function SiteHeader() {
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
        <Link href="/" className="text-lg font-extrabold tracking-tight">
          코리거
        </Link>
        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold text-muted ring-1 ring-line">
          야구
        </span>
        {/* 현재 주소는 요청 때 알 수 있는 경우가 있어서 Suspense가 필요하다. 그동안은 표시 없는 메뉴를 보여 준다. */}
        <Suspense fallback={<NavLinks pathname={null} />}>
          <SiteNav />
        </Suspense>
        <span className="ml-auto hidden text-xs text-muted sm:inline">
          한국 MLB 선수 경기 기록 모아보기
        </span>
      </div>
    </header>
  );
}
