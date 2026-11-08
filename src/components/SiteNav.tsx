"use client"; // 지금 주소(usePathname)를 읽어서 현재 메뉴를 표시해야 해서 클라이언트 컴포넌트다.

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "홈" },
  { href: "/players", label: "선수" },
];

/** "page": 지금 이 페이지, "true": 이 메뉴 아래 화면(예: /players/1 은 "선수" 아래), 그 외 undefined */
function currentOf(href: string, pathname: string | null) {
  if (pathname == null) return undefined;
  if (pathname === href) return "page";
  return href !== "/" && pathname.startsWith(`${href}/`) ? "true" : undefined;
}

/** 상단 메뉴. pathname이 null이면 현재 메뉴 표시 없이 그린다(주소를 알기 전 자리 표시). */
export function NavLinks({ pathname }: { pathname: string | null }) {
  return (
    <nav aria-label="주요 메뉴" className="flex gap-1">
      {LINKS.map(({ href, label }) => {
        const current = currentOf(href, pathname);
        // 현재 메뉴는 연파랑 알약으로 표시한다.
        return (
          <Link
            key={href}
            href={href}
            aria-current={current}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold ${current ? "bg-accent-soft text-accent-ink" : "text-muted hover:bg-surface-2 hover:text-foreground"}`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export default function SiteNav() {
  return <NavLinks pathname={usePathname()} />;
}
