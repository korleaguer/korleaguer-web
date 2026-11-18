import { useEffect, useRef, type PointerEvent as ReactPointerEvent, type RefObject } from "react";

/** 아래로 이만큼 끌면 닫는다(px) */
const SWIPE_CLOSE = 96;
/** 놓은 뒤 미끄러지는 시간(ms) */
const SLIDE_MS = 200;

/**
 * 아래 창(휴대폰) 손잡이·머리 줄을 아래로 끌어 닫기. 경기 상세 창과 거론 구단 창이 같이 쓴다.
 * 끄는 동안은 손가락을 따라 내려온다. 놓을 때 SWIPE_CLOSE를 넘었으면 아래로 미끄러져 내려간 뒤 닫고, 아니면 제자리로
 * 미끄러져 돌아온다. 예전에는 놓는 순간 제자리로 순간이동하거나 움직임 없이 사라졌다(11-17 전수조사).
 * 움직임 줄이기 설정이면 바로 닫고 바로 돌아온다. 마우스로는 끌지 않고(PC 가운데 창은 닫기·바깥 누르기·Esc),
 * 머리 줄의 버튼에서 시작한 누름은 버튼에 맡긴다.
 * 창의 다른 닫기(닫기 버튼·바깥 누르기·Esc)는 돌려주는 close로 부른다(아래 close 설명).
 */
export function useSheetDrag(panelRef: RefObject<HTMLElement | null>, onClose: () => void) {
  const drag = useRef<{ y: number; dy: number } | null>(null);
  /** 미끄러져 닫히는 중이면 그 타이머·이벤트를 치우는 함수. 그동안은 다시 끌지 않고, 창이 먼저 지워지면 치운다 */
  const closing = useRef<(() => void) | null>(null);
  useEffect(() => () => closing.current?.(), []);

  const onDragStart = (e: ReactPointerEvent<HTMLElement>) => {
    const panel = panelRef.current;
    if (!panel || closing.current || e.pointerType === "mouse" || (e.target as HTMLElement).closest("button")) return;
    drag.current = { y: e.clientY, dy: 0 };
    // 돌아오던 중이면 멈추고 손가락을 바로 따라오게 한다
    panel.style.transition = "none";
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onDragMove = (e: ReactPointerEvent<HTMLElement>) => {
    const d = drag.current;
    const panel = panelRef.current;
    if (!d || !panel) return;
    d.dy = Math.max(0, e.clientY - d.y);
    panel.style.transform = `translateY(${d.dy}px)`;
  };

  const onDragEnd = () => {
    const d = drag.current;
    const panel = panelRef.current;
    drag.current = null;
    if (!d || !panel) return;
    const close = d.dy > SWIPE_CLOSE;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      panel.style.transition = "";
      if (close) onClose();
      else panel.style.transform = "";
      return;
    }
    panel.style.transition = `transform ${SLIDE_MS}ms var(--ease-out-expo)`;
    if (!close) {
      panel.style.transform = "";
      return;
    }
    panel.style.transform = "translateY(100%)";
    // 다 내려가면 닫는다. transitionend가 오지 않을 수 있어(탭이 숨겨짐 등) 타이머도 두고, 먼저 오는 쪽에서 한 번만 닫는다.
    // 창 안 다른 요소(버튼 색 등)의 transitionend도 올라오므로 창 자신의 transform만 본다
    let timer = 0;
    const cleanup = () => {
      window.clearTimeout(timer);
      panel.removeEventListener("transitionend", onEnd);
      closing.current = null;
    };
    const finish = () => {
      cleanup();
      onClose();
    };
    const onEnd = (event: TransitionEvent) => {
      if (event.target === panel && event.propertyName === "transform") finish();
    };
    panel.addEventListener("transitionend", onEnd);
    timer = window.setTimeout(finish, SLIDE_MS + 20);
    closing.current = cleanup;
  };

  /**
   * 끌기 말고 다른 길로 닫을 때. 미끄러져 닫히는 200ms 사이에 불리면 그 타이머를 먼저 치우고 지금 닫는다. onClose를 바로 부르면
   * 타이머가 한 번 더 불러서, 뒤로 가기로 닫는 창(경기 상세·거론 구단)은 popstate가 창을 지우기 전에 뒤로 가기가 두 번 일어나
   * 페이지를 떠날 수 있었다(PR #291 리뷰)
   */
  const close = () => {
    closing.current?.();
    onClose();
  };

  return { onDragStart, onDragMove, onDragEnd, close };
}
