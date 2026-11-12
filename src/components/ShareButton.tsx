"use client";

// 앱(웹뷰) 안 머리글 오른쪽의 공유 버튼(토스처럼 위쪽 오른쪽 하나). 일반 브라우저에서는 브라우저의 공유를 쓰므로 숨긴다.
// 누르면 지금 화면 주소를 공유한다. 받는 쪽에는 미리보기 그림(opengraph-image)이 카드로 붙는다.
// - 공유를 아는 앱(features에 "share"): 앱이 기기 공유 창을 연다
// - 옛 앱: 기기 공유(navigator.share), 그것도 없으면 주소를 복사하고 알림 띠로 알린다
import { usePathname } from "next/navigation";
import { appHas, postToApp } from "@/lib/app";
import { toast } from "@/lib/toast";

/** 공유할 것이 없는 화면(사람마다 다른 '내 선수') */
const NOT_SHARED = new Set(["/my"]);

export default function ShareButton() {
  const pathname = usePathname();
  if (NOT_SHARED.has(pathname)) return null;

  async function share() {
    const url = window.location.href;
    // 제목의 ' · KOR Leaguer'는 공유 카드에 사이트 이름이 따로 붙으므로 뺀다
    const title = document.title.replace(/ · KOR Leaguer$/, "");
    if (appHas("share")) {
      postToApp({ type: "share", url, title });
      return;
    }
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url });
      } catch {
        // 공유 창을 닫은 것도 오류로 온다. 할 일 없음
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast("링크를 복사했어요", { tone: "success" });
    } catch {
      // 복사도 못 하는 환경이면 조용히 둔다
    }
  }

  return (
    <button
      type="button"
      aria-label="공유"
      onClick={share}
      // 누르는 자리는 44px(iOS 최소 크기). 아이콘이 머리글 오른쪽 여백 선에 오도록 오른쪽으로 당긴다(AppBackButton과 대칭)
      className="press -mr-3 ml-auto hidden size-11 shrink-0 place-items-center rounded-full text-foreground active:bg-surface-2 in-app:grid"
    >
      <svg
        aria-hidden
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 14V3.5" />
        <path d="m7.5 7.5 4.5-4.5 4.5 4.5" />
        <path d="M8.5 10H7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1.5" />
      </svg>
    </button>
  );
}
