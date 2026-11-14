"use client"; // 지금 주소(usePathname)를 읽어서 현재 메뉴를 표시해야 해서 클라이언트 컴포넌트다.

import { usePathname } from "next/navigation";
import PillNav from "./PillNav";

const LINKS = [
  { href: "/", label: "홈" },
  { href: "/players", label: "선수" },
  { href: "/my", label: "내 선수" },
];

/**
 * "page": 지금 이 페이지, "true": 이 메뉴 아래 화면(예: /players/1 은 "선수" 아래), 그 외 undefined.
 * 기사 페이지(/news/1)는 홈의 관련 기사에서 들어오므로 "홈" 아래다.
 */
function currentOf(href: string, pathname: string | null) {
  if (pathname == null) return undefined;
  if (pathname === href) return "page";
  if (href === "/") return pathname.startsWith("/news/") ? "true" : undefined;
  return pathname.startsWith(`${href}/`) ? "true" : undefined;
}

/** 상단 메뉴. pathname이 null이면 현재 메뉴 표시 없이 그린다(주소를 알기 전 자리 표시). 현재 메뉴는 연파랑 알약이 미끄러져 표시한다. */
export function NavLinks({ pathname }: { pathname: string | null }) {
  return (
    // 앱 안에서는 숨긴다. 앱 아래 탭(홈·선수·내 선수)이 같은 일을 한다.
    <PillNav
      label="주요 메뉴"
      className="gap-1 in-app:hidden"
      itemClass="px-3 py-1.5 text-button"
      idleClass="text-muted hover:bg-surface-2 hover:text-foreground"
      items={LINKS.map(({ href, label }) => ({ href, label, current: currentOf(href, pathname) }))}
    />
  );
}

export default function SiteNav() {
  return <NavLinks pathname={usePathname()} />;
}
