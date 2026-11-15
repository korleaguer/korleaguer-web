"use client";

// 앱(korleaguer-app, 웹뷰)이 보내는 이벤트를 받는다. 일반 브라우저에서는 이벤트가 오지 않으므로 아무 일도 하지 않는다.
// 이벤트 이름과 모양은 앱 저장소 src/lib/site.ts의 appEventScript와 같아야 한다.
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const APP_EVENT = "korleaguer:app";

type AppEvent =
  /** 다른 탭에 갔다가 이 탭으로 돌아왔다 */
  | { type: "focus" }
  /** 보고 있는 탭을 한 번 더 눌렀다. path = 그 탭의 첫 화면 */
  | { type: "tab-root"; path: string }
  /**
   * 이 탭 첫 화면을 다른 주소로 바꿔 달라(뉴스 탭이 있는 앱, korleaguer-app#40). 다른 탭의 '전체 기사 보기'
   * (/news?player=이정후)를 누르면 앱이 뉴스 탭으로 옮기고 이미 열린 뉴스 탭 웹에 이 이벤트를 보낸다
   */
  | { type: "navigate"; path: string };

/** 우리 사이트 안 경로만 받는다("/players"는 되고 "//다른곳"·"https://..."은 안 됨) */
function isSitePath(path: unknown): path is string {
  return typeof path === "string" && path.startsWith("/") && !path.startsWith("//");
}

export default function AppBridge() {
  const router = useRouter();

  useEffect(() => {
    function onAppEvent(event: Event) {
      const detail = (event as CustomEvent<AppEvent | undefined>).detail;
      if (detail?.type === "focus") {
        // 그사이 다른 탭에서 '내 선수'를 바꿨을 수 있다. 서버에서 다시 그려 오되 스크롤 위치는 그대로 둔다.
        router.refresh();
      } else if (detail?.type === "tab-root" && isSitePath(detail.path)) {
        // 탭 첫 화면이면 맨 위로(기기의 '동작 줄이기'가 켜져 있으면 미끄러지지 않고 바로), 아니면 첫 화면으로(새로고침 없이 이동).
        // 뉴스 탭만: 이미 맨 위인데 선수로 거른 화면(?player=)이면 거르기를 풀어 전체로 돌린다(내 선수 기간 등 다른 탭 고르기는 그대로)
        const here = window.location.pathname === detail.path;
        const filteredNews = detail.path === "/news" && window.location.search !== "";
        if (here && (window.scrollY > 0 || !filteredNews)) {
          const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
        } else if (here) {
          router.replace(detail.path);
        } else {
          router.push(detail.path);
        }
      } else if (detail?.type === "navigate" && isSitePath(detail.path)) {
        // 기록을 쌓지 않는다(뉴스 탭의 선수 고르기와 같다). 바뀐 화면은 맨 위부터
        router.replace(detail.path);
      }
    }
    window.addEventListener(APP_EVENT, onAppEvent);
    return () => window.removeEventListener(APP_EVENT, onAppEvent);
  }, [router]);

  return null;
}
