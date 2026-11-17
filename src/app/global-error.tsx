"use client"; // 에러 화면은 브라우저에서 동작해야 해서 클라이언트 컴포넌트다.

// 맨 바깥 틀(layout)까지 깨졌을 때 보이는 화면. layout을 대신해 그려지므로 <html>·<body>와 전역 CSS·글꼴을 직접 불러온다.
// 이 파일이 없으면 Next 기본 영어 화면('This page couldn't load')이 떴다(전수조사). 머리글·바닥글 없이 안내만 둔다.
// 클라이언트 컴포넌트라 metadata를 쓸 수 없어서 탭 제목은 React <title>로 둔다(head로 옮겨 그려진다).
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import ErrorRetryNotice from "@/components/ErrorRetryNotice";
import "./globals.css";

export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="flex min-h-full flex-col font-sans">
        <title>문제가 생겼어요 · KOR Leaguer</title>
        <main className="mx-auto w-full max-w-[67.5rem] flex-1 px-3 pb-10 pt-4 sm:px-6 sm:pt-6">
          <ErrorRetryNotice retry={retry} />
        </main>
      </body>
    </html>
  );
}
