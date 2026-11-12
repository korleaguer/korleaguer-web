import Link from "next/link";
import { Suspense } from "react";
import AppBackButton from "./AppBackButton";
import HeaderTitle from "./HeaderTitle";
import LogoMark from "./LogoMark";
import ShareButton from "./ShareButton";
import SiteNav, { NavLinks } from "./SiteNav";

/**
 * 맨 위 흰 머리글. 로고 상자(파란 바탕에 쏘아 올린 공) + KOR Leaguer, 알약 모양 메뉴.
 * 앱 안에서는 위에 붙어 있고(토스처럼), 화면 제목이 지나가면 로고 대신 가운데에 그 제목을 보인다(HeaderTitle).
 */
export default function SiteHeader() {
  return (
    <header className="group bg-surface shadow-[0_1px_0_var(--line)] in-app:sticky in-app:top-0 in-app:z-40">
      <div className="relative mx-auto flex h-14 max-w-[67.5rem] items-center gap-3 px-4 sm:px-6">
        {/* 앱(웹뷰) 안의 하위 화면에서만 보이는 '뒤로'. 현재 주소를 읽으므로 SiteNav처럼 Suspense 안에 둔다. */}
        <Suspense fallback={null}>
          <AppBackButton />
        </Suspense>
        {/* 앱 안에서는 누를 수 없다. 홈은 앱 아래 '홈' 탭이 맡고, 다른 탭에서 누르면 탭 표시와 화면이 어긋난다. */}
        <Link
          href="/"
          className="flex items-center gap-[7px] rounded-lg transition-[opacity,scale] duration-200 active:scale-[0.96] motion-reduce:transition-none in-app:pointer-events-none group-data-titled:opacity-0"
        >
          <LogoMark className="size-[1.625rem] shrink-0" />
          {/* 영어 이름이라 화면 낭독기가 영어로 읽게 lang="en" */}
          <span lang="en" className="whitespace-nowrap text-lg font-extrabold tracking-[-0.03em]">
            KOR Leaguer
          </span>
        </Link>
        {/* 현재 주소는 요청 때 알 수 있는 경우가 있어서 Suspense가 필요하다. 그동안은 표시 없는 메뉴를 보여 준다. */}
        <Suspense fallback={<NavLinks pathname={null} />}>
          <SiteNav />
        </Suspense>
        <span className="ml-auto hidden text-xs text-muted md:inline">한국 MLB 선수 경기 기록 모아보기</span>
        {/* 앱 안에서만: 화면 제목이 지나가면 가운데에 그 제목. 현재 주소가 바뀌면 다시 보므로 Suspense 안에 둔다 */}
        <Suspense fallback={null}>
          <HeaderTitle />
        </Suspense>
        {/* 앱 안에서만 보이는 공유 버튼. 현재 주소를 읽으므로 Suspense 안에 둔다 */}
        <Suspense fallback={null}>
          <ShareButton />
        </Suspense>
      </div>
    </header>
  );
}
