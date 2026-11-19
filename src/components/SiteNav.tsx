"use client"; // 지금 주소(usePathname)를 읽어서 현재 메뉴를 표시해야 해서 클라이언트 컴포넌트다.

import { usePathname } from "next/navigation";
import PillNav from "./PillNav";

const LINKS = [
  { href: "/", label: "홈" },
  { href: "/players", label: "선수" },
  { href: "/news", label: "뉴스" },
];

/**
 * "page": 지금 이 페이지, "true": 이 메뉴 아래 화면(예: /players/1 은 "선수", 기사 한 건 /news/1 은 "뉴스" 아래), 그 외 undefined.
 */
function currentOf(href: string, pathname: string | null) {
  if (pathname == null) return undefined;
  if (pathname === href) return "page";
  if (href === "/") return undefined;
  return pathname.startsWith(`${href}/`) ? "true" : undefined;
}

/** 상단 메뉴. pathname이 null이면 현재 메뉴 표시 없이 그린다(주소를 알기 전 자리 표시). 현재 메뉴는 연파랑 알약이 미끄러져 표시한다. */
export function NavLinks({ pathname }: { pathname: string | null }) {
  return (
    // 앱 안에서는 숨긴다. 앱 아래 탭(홈·선수·뉴스)이 같은 일을 한다.
    <PillNav
      label="주요 메뉴"
      className="gap-0.5 in-app:hidden sm:gap-1"
      itemClass="whitespace-nowrap px-2.5 py-1.5 text-button sm:px-3"
      idleClass="text-muted hover:bg-surface-2 hover:text-foreground"
      items={LINKS.map(({ href, label }) => ({ href, label, current: currentOf(href, pathname) }))}
    />
  );
}

export default function SiteNav() {
  return <NavLinks pathname={usePathname()} />;
}
