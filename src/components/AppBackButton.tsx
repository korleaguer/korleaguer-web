"use client";

// 앱(웹뷰) 안에서만 보이는 '뒤로' 버튼. 앱에는 브라우저의 뒤로 버튼이 없어서, 탭 첫 화면이 아닌 화면(선수 페이지 등)에 둔다.
// 일반 브라우저에서는 in-app 변형이 꺼져 있어 보이지 않는다(globals.css의 @custom-variant in-app).
import { usePathname, useRouter } from "next/navigation";

/** 앱 아래 탭의 첫 화면(홈·선수·내 선수). 여기서는 뒤로 버튼을 두지 않는다. 앱(korleaguer-app src/app)의 탭과 같다 */
const TAB_ROOTS = new Set(["/", "/players", "/my"]);

/** 돌아갈 기록이 없을 때 갈 곳: 선수 페이지는 선수 목록, 나머지는 홈 */
function parentOf(pathname: string): string {
  return pathname.startsWith("/players/") ? "/players" : "/";
}

export default function AppBackButton() {
  const pathname = usePathname();
  const router = useRouter();
  if (TAB_ROOTS.has(pathname)) return null;

  return (
    <button
      type="button"
      aria-label="뒤로"
      // 앱의 탭은 첫 화면에서 시작하므로 보통은 기록이 있다. 없으면(주소로 바로 연 경우) 상위 목록으로 간다.
      onClick={() => (window.history.length > 1 ? router.back() : router.push(parentOf(pathname)))}
      // 누르는 자리는 44px(iOS 최소 크기). 화살표가 머리글 왼쪽 여백 선에 오도록 왼쪽으로 당기고, 로고는 버튼 끝에 붙인다.
      className="-mr-3 -ml-3 hidden size-11 shrink-0 place-items-center rounded-full text-foreground active:bg-surface-2 in-app:grid"
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
