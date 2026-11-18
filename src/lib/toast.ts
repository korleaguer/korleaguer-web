// 알림 띠(토스트) 상태. 어디서든 toast("…")를 부르면 화면의 Toaster가 머리글 아래에 잠깐 띄운다.
// 토스(TDS Toast)처럼 한 번에 하나만 보이고, 새 알림이 오면 앞의 것을 바꾼다. 3초(버튼이 있으면 10초) 뒤 사라진다.

export interface ToastAction {
  label: string;
  /** 누르면 갈 주소(우리 사이트 안). 앱 안에서는 앱이 그 탭·화면을 연다 */
  href?: string;
  /**
   * 누르면 할 일. 알림은 누르면 사라져서 그 버튼에 있던 포커스도 사라진다(문서 처음으로 돌아간 셈이라 키보드·화면 낭독기가
   * 자리를 잃었다). press.focused면 할 일이 닿는 곳(되돌린 별 등)으로 포커스를 옮겨 준다
   */
  onClick?: (press: ToastPress) => void;
}

/** 알림 버튼을 누른 방식 */
export interface ToastPress {
  /** 버튼이 포커스를 가진 채 눌렸다(키보드, 크롬의 마우스 누름). 사파리·iOS는 마우스·손가락으로 누른 버튼에 포커스를 주지 않는다 */
  focused: boolean;
  /** 키보드로 눌렀다(click의 detail 0). 그때만 포커스를 옮긴 곳이 보이게 화면을 움직인다 */
  keyboard: boolean;
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
