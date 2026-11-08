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
    <nav aria-label="주요 메뉴" className="flex h-full gap-1">
      {LINKS.map(({ href, label }) => {
        const current = currentOf(href, pathname);
        // 현재 메뉴는 아래쪽 금색 밑줄로 표시한다.
        return (
          <Link
            key={href}
            href={href}
            aria-current={current}
            className={`flex items-center border-b-2 px-2.5 pt-0.5 text-sm font-semibold hover:text-cover-fg ${current ? "border-gold text-cover-fg" : "border-transparent text-cover-muted"}`}
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
