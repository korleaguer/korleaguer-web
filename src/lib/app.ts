// 앱(korleaguer-app, 웹뷰)과 주고받는 도우미. 일반 브라우저에서는 모두 아무 일도 하지 않는다.
// 앱이 문서를 그리기 전에 넣어 두는 값과 받는 메시지는 앱 저장소 src/lib/site.ts(APP_BOOT_SCRIPT, WebMessage)와 같아야 한다.

type AppWindow = Window & {
  /** 옛 앱(0.1.x)에는 features가 없다 */
  KORLeaguerApp?: { features?: unknown };
  ReactNativeWebView?: { postMessage(message: string): void };
};

/** 앱이 할 수 있는 일. "stack" = 화면을 네이티브로 쌓는다(0.2.0~), "haptic" = 손끝 진동(0.2.0 다음 빌드~) */
export type AppFeature = "stack" | "haptic";

/** 지금 이 웹을 띄운 앱이 그 기능을 갖고 있나. 브라우저나 옛 앱이면 false */
export function appHas(feature: AppFeature): boolean {
  if (typeof window === "undefined") return false;
  const { KORLeaguerApp, ReactNativeWebView } = window as AppWindow;
  const features = KORLeaguerApp?.features;
  return Boolean(ReactNativeWebView) && Array.isArray(features) && features.includes(feature);
}

/** 앱에 메시지를 보낸다. 앱 안이 아니면 아무 일도 하지 않는다 */
export function postToApp(message: { type: string } & Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  (window as AppWindow).ReactNativeWebView?.postMessage(JSON.stringify(message));
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
