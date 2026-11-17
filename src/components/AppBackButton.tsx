"use client";

// 앱(웹뷰) 안에서만 보이는 '뒤로' 버튼. 앱에는 브라우저의 뒤로 버튼이 없어서, 탭 첫 화면이 아닌 화면(선수 페이지 등)에 둔다.
// 일반 브라우저에서는 in-app 변형이 꺼져 있어 보이지 않는다(globals.css의 @custom-variant in-app).
import { usePathname, useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import { appHas, postToApp, type AppFeature } from "@/lib/app";

/**
 * 앱 아래 탭의 첫 화면. 여기서는 뒤로 버튼을 두지 않는다. 앱(korleaguer-app src/app)의 탭과 같다.
 * 기록(/records)은 '내 선수' 자리에 새로 들어간 탭이다(이슈 #244). 내 선수(/my)와 뉴스(/news)는 앱에 따라 다르다(아래).
 */
const TAB_ROOTS = new Set(["/", "/players", "/records"]);

/** 앱 기능은 바뀌지 않으므로 구독할 것이 없다 */
function subscribeNothing(): () => void {
  return () => {};
}

/**
 * 앱에 이 기능이 있나("news-tab": 뉴스 탭, "records-tab": '내 선수' 자리에 기록 탭). 서버에는 앱 정보가 없어 false로 그리고,
 * 브라우저에서 화면을 이어받은 뒤 실제 값으로 다시 그린다(렌더 중에 window를 바로 읽으면 서버 HTML과 첫 화면이 달라
 * React가 화면을 통째로 다시 그린다)
 */
function useAppFeature(feature: AppFeature): boolean {
  return useSyncExternalStore(subscribeNothing, () => appHas(feature), () => false);
}

/** 돌아갈 기록이 없을 때 갈 곳: 선수 페이지는 선수 목록, 기사 한 건은 뉴스, 나머지는 홈 */
function parentOf(pathname: string): string {
  if (pathname.startsWith("/players/")) return "/players";
  if (pathname.startsWith("/news/")) return "/news";
  return "/";
}

/**
 * 하위 화면을 네이티브로 쌓는 앱(features에 "stack")이면 앱에 이 화면을 닫아 달라고 하고 true.
 * 그 앱에서 선수 화면은 자기만의 웹뷰라 웹 기록이 없어서, 웹 안에서 돌아가면 목록이 같은 화면에 다시 열린다.
 */
function closeAppScreen(): boolean {
  if (!appHas("stack")) return false;
  postToApp({ type: "back" });
  return true;
}

export default function AppBackButton() {
  const pathname = usePathname();
  const router = useRouter();
  // 뉴스(/news)는 뉴스 탭이 있는 앱에서만 탭 첫 화면이고, 옛 앱에서는 쌓인 하위 화면이다.
  // 내 선수(/my)는 반대로 옛 앱('내 선수' 탭)에서만 탭 첫 화면이다. 기록 탭이 있는 앱에서는 알림 '보기'·홈 입구로 쌓아 여는
  // 하위 화면이라 뒤로 버튼을 둔다(전수조사 P1, 이슈 #262)
  const newsTab = useAppFeature("news-tab");
  const recordsTab = useAppFeature("records-tab");
  if (TAB_ROOTS.has(pathname) || (pathname === "/news" && newsTab) || (pathname === "/my" && !recordsTab)) return null;

  return (
    <button
      type="button"
      aria-label="뒤로"
      // 새 앱은 앱이 화면을 닫는다. 옛 앱(탭마다 웹뷰 하나)은 웹 기록으로 돌아가고,
      // 기록이 없으면(주소로 바로 연 경우) 상위 목록으로 간다.
      onClick={() => {
        if (closeAppScreen()) return;
        if (window.history.length > 1) router.back();
        else router.push(parentOf(pathname));
      }}
      // 누르는 자리는 44px(iOS 최소 크기). 화살표가 머리글 왼쪽 여백 선에 오도록 왼쪽으로 당기고, 로고는 버튼 끝에 붙인다.
      className="press -mr-3 -ml-3 hidden size-11 shrink-0 place-items-center rounded-full text-foreground active:bg-surface-2 in-app:grid"
    >
      <svg
        aria-hidden
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M15 5l-7 7 7 7" />
      </svg>
    </button>
  );
}
