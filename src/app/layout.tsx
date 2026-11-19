import type { Metadata } from "next";
// Pretendard 글꼴. 글꼴 파일을 빌드 결과에 넣어 우리 서버가 주고, 한글은 화면에 쓴 글자 조각(unicode-range)만 받는다.
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, shareMeta } from "@/lib/share";
import AppBridge from "@/components/AppBridge";
import HiddenTransitionGuard from "@/components/HiddenTransitionGuard";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import SkipLink from "@/components/SkipLink";
import Toaster from "@/components/Toaster";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "KOR Leaguer",
    // 하위 페이지 제목 뒤에 붙는다. 예: "이정후 2026 기록 · KOR Leaguer"
    template: "%s · KOR Leaguer",
  },
  description: SITE_DESCRIPTION,
  // 공유 미리보기 그림 주소(og:image)를 절대 주소로 만드는 기준
  metadataBase: new URL(SITE_URL),
  // 카톡·SNS에 링크를 보내면 붙는 카드. 그림은 app/opengraph-image.tsx(화면별 그림이 있으면 그것).
  // 주소(og:url)는 두지 않는다: 자기 카드가 없는 화면(없는 주소, 잠깐 못 불러온 선수·기사)까지 홈 주소를 물려받는다. 홈은 page.tsx에서
  ...shareMeta(SITE_NAME, SITE_DESCRIPTION),
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: 앱(웹뷰)이 React보다 먼저 <html>에 data-app 속성을 붙인다. 이 요소의 속성 차이는 그대로 둔다.
    <html lang="ko" className="h-full antialiased" suppressHydrationWarning>
      <head>
        {/* 숨은 문서에서 건너뛴 화면 전환 오류를 콘솔에 띄우지 않는다. 본문 스트리밍 스크립트보다 먼저 들어야 해서 head 안 */}
        <HiddenTransitionGuard />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        {/* 맨 앞: 키보드로 처음 Tab을 누르면 보이는 '본문 바로가기' */}
        <SkipLink />
        <AppBridge />
        <SiteHeader />
        {/* tabIndex는 두지 않는다. 늘 두면 본문 글자·빈 곳을 마우스로 누를 때마다 main이 포커스를 받아, 다음 Tab이 본문 맨 위로 가고
            화면도 위로 튄다. '본문 바로가기'가 누를 때만 붙였다가 포커스가 떠나면 뗀다(SkipLink).
            그때 본문 전체에 포커스 테두리가 그려지면 어색해서 끈다 */}
        <main
          id="main"
          className="mx-auto w-full max-w-[67.5rem] flex-1 px-3 pb-10 pt-4 focus:outline-none sm:px-6 sm:pt-6"
        >
          {children}
        </main>
        <SiteFooter />
        {/* 알림 띠(내 선수 넣기·빼기, 링크 복사 등). 띄우는 쪽은 src/lib/toast.ts */}
        <Toaster />
      </body>
    </html>
  );
}
