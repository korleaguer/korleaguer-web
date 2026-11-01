import type { Metadata } from "next";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import "./globals.css";

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
    <html lang="ko" className="h-full antialiased">
      <body className="flex min-h-full flex-col font-sans">
        <SiteHeader />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-4">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
