"use client";

// 앱 안 머리글 가운데 제목(토스처럼). 화면의 큰 제목(main의 h1)이 머리글 밑으로 지나가면 로고 대신 그 제목을 보여 주고,
// 다시 올리면 로고로 돌아간다. 머리글은 앱 안에서 위에 붙어 있다(SiteHeader의 in-app:sticky).
// h1은 데이터가 온 뒤(스트리밍) 생기기도 하고 화면 안에서 주소가 바뀌기도 해서, 스크롤할 때와 본문이 바뀔 때마다 그 자리를 다시 본다.
// 스트리밍 중에는 아직 숨겨진 h1(크기 0)이 함께 있어서, 화면에 보이는 h1만 본다.
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function HeaderTitle() {
  const pathname = usePathname();
  const [title, setTitle] = useState<string | null>(null);

  useEffect(() => {
    // 앱 안에서만 머리글이 붙어 있으므로 브라우저에서는 아무것도 하지 않는다
    if (!document.documentElement.hasAttribute("data-app")) return;
    const header = document.querySelector("header");
    if (!header) return;
    let frame = 0;
    const check = () => {
      frame = 0;
      const h1 = [...document.querySelectorAll("main h1")].find((el) => el.getBoundingClientRect().height > 0);
      const passed = h1 !== undefined && h1.getBoundingClientRect().bottom <= header.getBoundingClientRect().bottom;
      setTitle(passed ? (h1.textContent?.trim() ?? null) : null);
    };
    const onScroll = () => {
      frame ||= requestAnimationFrame(check);
    };
    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    // 본문이 바뀌면(데이터 도착, 더 보기) 제목 자리도 바뀐다
    const main = document.querySelector("main");
    const mutations = new MutationObserver(onScroll);
    if (main) mutations.observe(main, { childList: true, subtree: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      mutations.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [pathname]);

  // 머리글(group)에 표시를 붙여 로고를 숨기고 제목을 보인다
  useEffect(() => {
    document.querySelector("header")?.toggleAttribute("data-titled", Boolean(title));
  }, [title]);

  return (
    <span
      // 화면 낭독기는 본문의 h1을 읽으므로 같은 글을 두 번 읽지 않게 숨긴다
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-1/2 hidden max-w-[calc(100%-8rem)] -translate-x-1/2 -translate-y-1/2 truncate text-[1.0625rem] font-extrabold tracking-[-0.02em] opacity-0 transition-opacity duration-200 motion-reduce:transition-none group-data-titled:opacity-100 in-app:block"
    >
      {title}
    </span>
  );
}
