import type { Metadata } from "next";
// Pretendard 글꼴. 글꼴 파일을 빌드 결과에 넣어 우리 서버가 주고, 한글은 화면에 쓴 글자 조각(unicode-range)만 받는다.
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import { SITE_NAME, SITE_URL, shareMeta } from "@/lib/share";
import AppBridge from "@/components/AppBridge";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import Toaster from "@/components/Toaster";
import "./globals.css";

const DESCRIPTION = "한국 MLB 선수들의 최근 경기 한 줄 기록과 시즌 성적을 모아 봐요.";

export const metadata: Metadata = {
  title: {
    default: "KOR Leaguer",
    // 하위 페이지 제목 뒤에 붙는다. 예: "이정후 2026 기록 · KOR Leaguer"
    template: "%s · KOR Leaguer",
  },
  description: DESCRIPTION,
  // 공유 미리보기 그림 주소(og:image)를 절대 주소로 만드는 기준
  metadataBase: new URL(SITE_URL),
  // 카톡·SNS에 링크를 보내면 붙는 카드. 그림은 app/opengraph-image.tsx(화면별 그림이 있으면 그것)
  ...shareMeta(SITE_NAME, DESCRIPTION),
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: 앱(웹뷰)이 React보다 먼저 <html>에 data-app 속성을 붙인다. 이 요소의 속성 차이는 그대로 둔다.
    <html lang="ko" className="h-full antialiased" suppressHydrationWarning>
      <body className="flex min-h-full flex-col font-sans">
        <AppBridge />
        <SiteHeader />
        <main className="mx-auto w-full max-w-[67.5rem] flex-1 px-3 pb-10 pt-4 sm:px-6 sm:pt-6">
          {children}
        </main>
        <SiteFooter />
        {/* 알림 띠(내 선수 넣기·빼기, 링크 복사 등). 띄우는 쪽은 src/lib/toast.ts */}
        <Toaster />
      </body>
    </html>
  );
}
