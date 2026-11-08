import type { Metadata } from "next";
import { Hahmlet } from "next/font/google";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import "./globals.css";

// 워드마크·페이지 제목 글꼴. 빌드할 때 받아 우리 서버가 주므로 방문자 브라우저는 구글에 요청하지 않는다.
// 한글 글자는 필요한 조각만 그때그때 받는다(미리 받는 건 라틴 글자뿐).
const hahmlet = Hahmlet({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-hahmlet",
});

export const metadata: Metadata = {
  title: {
    default: "코리거",
    // 하위 페이지 제목 뒤에 붙는다. 예: "이정후 2026 기록 · 코리거"
    template: "%s · 코리거",
  },
  description: "한국 MLB 선수들의 최근 경기 한 줄 기록과 시즌 성적을 모아 봅니다.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`h-full antialiased ${hahmlet.variable}`}>
      <body className="flex min-h-full flex-col font-sans">
        <SiteHeader />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-8 pt-5">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
