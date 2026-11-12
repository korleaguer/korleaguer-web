// 알림 띠(토스트) 상태. 어디서든 toast("…")를 부르면 화면의 Toaster가 머리글 아래에 잠깐 띄운다.
// 토스(TDS Toast)처럼 한 번에 하나만 보이고, 새 알림이 오면 앞의 것을 바꾼다. 3초(버튼이 있으면 5초) 뒤 사라진다.

export interface ToastAction {
  label: string;
  /** 누르면 갈 주소(우리 사이트 안). 앱 안에서는 앱이 그 탭·화면을 연다 */
  href?: string;
  onClick?: () => void;
}

export interface ToastItem {
  id: number;
  message: string;
  /** success: 초록 체크, error: 빨간 느낌표, info: 아이콘 없음 */
  tone: "success" | "error" | "info";
  action?: ToastAction;
}

let current: ToastItem | null = null;
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

/** 알림 띠를 띄운다. 이미 떠 있으면 바꾼다 */
export function toast(message: string, options: { tone?: ToastItem["tone"]; action?: ToastAction } = {}): void {
  current = { id: nextId++, message, tone: options.tone ?? "info", action: options.action };
  emit();
}

/** 이 알림이 아직 떠 있으면 내린다(시간이 다 됐거나 밀어 치웠을 때) */
export function dismissToast(id: number): void {
  if (current?.id !== id) return;
  current = null;
  emit();
}

export function subscribeToast(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function currentToast(): ToastItem | null {
  return current;
}
