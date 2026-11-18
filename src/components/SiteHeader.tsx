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
    <header data-site-header className="group bg-surface shadow-[0_1px_0_var(--line)] in-app:sticky in-app:top-0 in-app:z-40">
      <div className="relative mx-auto flex h-14 max-w-[67.5rem] items-center gap-3 px-4 sm:px-6">
        {/* 앱(웹뷰) 안의 하위 화면에서만 보이는 '뒤로'. 현재 주소를 읽으므로 SiteNav처럼 Suspense 안에 둔다. */}
        <Suspense fallback={null}>
          <AppBackButton />
        </Suspense>
        {/* 브라우저에서는 홈으로 가는 링크. 앱 안에서는 숨기고 아래 글자 로고를 보인다 */}
        <Link
          href="/"
          className="flex items-center gap-[7px] rounded-lg transition-[opacity,scale] duration-200 active:scale-[0.96] motion-reduce:transition-none motion-reduce:active:scale-100 motion-reduce:active:opacity-70 in-app:hidden"
        >
          <Brand />
        </Link>
        {/* 앱 안에서는 누를 수 없는 글자 로고. 홈은 앱 아래 '홈' 탭이 맡고, 다른 탭에서 누르면 탭 표시와 화면이 어긋난다.
            예전에는 링크에 손가락만 막아 두어 키보드·화면 낭독기로는 여전히 링크였고, 제목이 떠서 투명할 때도 포커스가 갔다(전수조사).
            제목이 뜨면(data-titled) 흐려진 뒤 visibility도 숨겨 낭독에서도 빠진다. 크기·간격은 위 링크와 같아 머리글 배치는 그대로다.
            앱은 누르는 것에만 글자 선택을 막는데(globals.css) 이 로고는 링크가 아니게 되어 그 목록에서 빠지므로, 길게 눌러도 글자가
            잡히거나 복사 메뉴가 뜨지 않게 직접 막는다 */}
        <span className="hidden items-center gap-[7px] transition-[opacity,visibility] duration-200 select-none motion-reduce:transition-none in-app:flex group-data-titled:invisible group-data-titled:opacity-0">
          <Brand />
        </span>
        {/* 현재 주소는 요청 때 알 수 있는 경우가 있어서 Suspense가 필요하다. 그동안은 표시 없는 메뉴를 보여 준다. */}
        <Suspense fallback={<NavLinks pathname={null} />}>
          <SiteNav />
        </Suspense>
        <span className="ml-auto hidden text-caption text-muted md:inline">해외파 한국 선수 기록 모아보기</span>
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

/** 로고 상자 + 워드마크 'KOR Leaguer'. 브라우저에서는 홈 링크 안에, 앱 안에서는 링크 없이 그린다 */
function Brand() {
  return (
    <>
      <LogoMark className="size-[1.625rem] shrink-0" />
      {/* 영어 이름이라 화면 낭독기가 영어로 읽게 lang="en". 워드마크만 자간을 heading(-0.02em)보다 한 단계 좁힌다.
          좁은 휴대폰(384px 이하, 아이폰 미니·SE 등)은 메뉴 4칸(홈·선수·뉴스·내 선수)이 한 줄에 들어가게 글자를 숨기고 로고 그림만 둔다(낭독기는 읽는다) */}
      <span lang="en" className="whitespace-nowrap text-heading tracking-[-0.03em] max-[24rem]:sr-only">
        KOR Leaguer
      </span>
    </>
  );
}
