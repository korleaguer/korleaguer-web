// 앱(korleaguer-app, 웹뷰)과 주고받는 도우미. 일반 브라우저에서는 모두 아무 일도 하지 않는다.
// 앱이 문서를 그리기 전에 넣어 두는 값과 받는 메시지는 앱 저장소 src/lib/site.ts(APP_BOOT_SCRIPT, WebMessage)와 같아야 한다.

import { useEffect, useSyncExternalStore, type RefObject } from "react";

type AppWindow = Window & {
  /** 옛 앱(0.1.x)에는 features가 없다 */
  KORLeaguerApp?: { features?: unknown };
  ReactNativeWebView?: { postMessage(message: string): void };
};

/**
 * 앱이 할 수 있는 일. "stack" = 화면을 네이티브로 쌓는다(0.2.0~), "haptic" = 손끝 진동, "share" = 기기 공유 창,
 * "news-tab" = 아래 탭에 '뉴스'(/news)가 있고 앱이 보낸 "navigate" 이벤트로 그 탭의 주소를 바꾼다(korleaguer-app#40),
 * "records-tab" = 아래 탭 4번째가 '내 선수'(/my) 대신 '기록'(/records)이라 /my는 쌓아 여는 하위 화면이다(korleaguer-app#46부터 알린다. #45만 있는 빌드는 알리지 않아 /my가 탭 첫 화면처럼 뒤로 버튼이 없다)
 */
export type AppFeature = "stack" | "haptic" | "share" | "news-tab" | "records-tab";

/** 지금 이 웹을 띄운 앱이 그 기능을 갖고 있나. 브라우저나 옛 앱이면 false */
export function appHas(feature: AppFeature): boolean {
  if (typeof window === "undefined") return false;
  const { KORLeaguerApp, ReactNativeWebView } = window as AppWindow;
  const features = KORLeaguerApp?.features;
  return Boolean(ReactNativeWebView) && Array.isArray(features) && features.includes(feature);
}

/** 앱 기능·앱 안인지는 화면을 보는 동안 바뀌지 않으므로 구독할 것이 없다 */
function subscribeNothing(): () => void {
  return () => {};
}

/**
 * 앱에 이 기능이 있나("news-tab": 뉴스 탭, "records-tab": '내 선수' 자리에 기록 탭). 서버에는 앱 정보가 없어 지금 앱(둘 다 있음)으로
 * 보고 그리고, 브라우저에서 화면을 이어받은 뒤 실제 값으로 다시 그린다(렌더 중에 window를 바로 읽으면 서버 HTML과 첫 화면이 달라
 * React가 화면을 통째로 다시 그린다). 서버를 '없음'으로 두면 지금 앱에서 /my를 열 때마다 버튼이 뒤늦게 끼어들어 로고가 옆으로
 * 튀었다(리뷰 지적, 이슈 #262). 이제는 옛 빌드에서만 고쳐 그린다
 */
export function useAppFeature(feature: AppFeature): boolean {
  return useSyncExternalStore(subscribeNothing, () => appHas(feature), () => true);
}

/**
 * 앱(웹뷰) 안인가. 앱은 첫 버전부터 문서를 그리기 전에 <html data-app="ios|android">를 붙인다(globals.css의 in-app 변형과 같은 표시).
 * 브라우저에서만 부른다(서버에는 문서가 없어 false). 화면을 그릴 때는 useInApp을 쓴다
 */
export function isInApp(): boolean {
  return typeof document !== "undefined" && document.documentElement.hasAttribute("data-app");
}

/** 아이폰 앱 안인가(<html data-app="ios">, globals.css의 in-ios-app 변형과 같은 표시). 아래 탭 막대가 웹 위에 떠 있다 */
export function isIosApp(): boolean {
  return typeof document !== "undefined" && document.documentElement.getAttribute("data-app") === "ios";
}

/**
 * 앱(웹뷰) 안인가(isInApp). 서버에서는 브라우저로 보고 그린다(화면 모양이 아니라 누를 때 동작을 고를 때 쓴다)
 */
export function useInApp(): boolean {
  return useSyncExternalStore(subscribeNothing, isInApp, () => false);
}

/**
 * 아이폰 앱 아래 탭 막대가 웹 화면 아래를 덮는 높이(px, 화면 아래 끝부터 홈 표시줄까지 포함). 아이폰 앱이 아니면 0.
 * 값은 globals.css의 --app-tab-bar 하나다(앱이 실제 높이를 넣고, 넣지 않은 옛 앱은 84px). 그 높이를 준 보이지 않는 빈 칸을
 * 잠깐 넣어 잰다: 변수를 글자로 읽어 풀지 않아도 되고, 같은 변수를 쓰는 다른 속성(html의 scroll-padding-bottom)이 나중에
 * 바뀌어도 따라 틀어지지 않는다(#302 리뷰)
 */
export function iosTabBarHeight(): number {
  if (!isIosApp()) return 0;
  const probe = document.createElement("div");
  probe.style.cssText = "position:absolute;visibility:hidden;pointer-events:none;width:0;height:var(--app-tab-bar)";
  document.body.append(probe);
  const height = probe.getBoundingClientRect().height;
  probe.remove();
  return height;
}

/** 앱에 메시지를 보낸다. 앱 안이 아니면 아무 일도 하지 않는다 */
export function postToApp(message: { type: string } & Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  (window as AppWindow).ReactNativeWebView?.postMessage(JSON.stringify(message));
}

/** 지금 열려 있는 웹 안 창(모달) 수. 0에서 1이 될 때 '열림', 0으로 돌아갈 때 '닫힘'을 앱에 알린다 */
let openModals = 0;

/**
 * 이 창(<dialog>, 화면을 덮는 모달: 경기 상세·거론 구단 창)이 모달로 열려 있는 동안 앱에 알린다({type:"modal", open}).
 * 부품이 그려졌는지가 아니라 실제 창에 묶는다(#302 리뷰): 창이 열려 있을 때만 '열림'을 보내고, 창이 닫히거나(close) 지워지면 '닫힘'.
 * 창을 여는 훅(lib/useModalDialog.ts)이 showModal 다음에 부른다. 창마다 따로 부르지 않는다.
 * 앱은 그동안 아이폰 왼쪽 끝 밀어 닫기와 아래 탭 누름을 막는다. 창이 떠 있는데 뒤 화면이 통째로 닫히거나 탭이 넘어가지 않게
 * (Apple HIG Modality, 11-17 전수조사). 창이 겹쳐 열려도 첫 창이 열릴 때와 마지막 창이 닫힐 때 한 번씩만 보낸다.
 * 앱 밖에서는 아무 일도 하지 않고, 이 메시지를 모르는 옛 앱은 버린다(korleaguer-app src/lib/site.ts의 WebMessage).
 * 앱 시작 스크립트도 새 문서마다 dialog[open]으로 한 번 보내고 안드로이드는 열고 닫힘도 지켜보지만, 앱은 받은 값을 그대로 쓰고
 * 둘 다 같은 창 상태를 따라가서 겹쳐 와도 같다
 */
export function useAppModal(dialogRef: RefObject<HTMLDialogElement | null>): void {
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog?.open) return;
    openModals += 1;
    if (openModals === 1) postToApp({ type: "modal", open: true });
    let closed = false;
    const release = () => {
      if (closed) return;
      closed = true;
      openModals -= 1;
      if (openModals === 0) postToApp({ type: "modal", open: false });
    };
    // 지워지기 전에 창이 먼저 닫혀도 그때 알린다. 닫았다 다시 연 창(개발 모드 StrictMode)에 늦게 도착한 close는 창이 열려 있어 거른다
    const onClose = () => {
      if (!dialog.open) release();
    };
    dialog.addEventListener("close", onClose);
    return () => {
      dialog.removeEventListener("close", onClose);
      release();
    };
  }, [dialogRef]);
}

/**
 * 손끝 진동 종류(토스 앱인토스 triggerHaptic의 tap·tick·success·error와 같은 쓰임).
 * - tap: 가벼운 톡(빼기, 잡기)
 * - select: 고르기 틱(칸 옮기기, 사진·막대 고르기)
 * - success / error: 성공·실패(내 선수 넣기 / 꽉 차서 못 넣음)
 */
export type HapticStyle = "tap" | "select" | "success" | "error";

/** 앱에 손끝 진동을 요청한다. 진동을 아는 앱(features에 "haptic")에만 보낸다 */
export function haptic(style: HapticStyle): void {
  if (appHas("haptic")) postToApp({ type: "haptic", style });
}
