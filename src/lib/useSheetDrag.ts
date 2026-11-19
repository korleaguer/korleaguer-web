import { useEffect, useRef, type PointerEvent as ReactPointerEvent, type RefObject } from "react";

/*
 * 아래 창의 움직임 숫자는 여기(와 globals.css의 .game-sheet·sheet-scrim-in)에서만 읽힌다. 사용자 11-19 A안 시트형, 이슈 #338.
 * 열기는 CSS가 340ms로 한다(휴대폰 창·덮개 340ms, 640px 이상 200ms). 닫기·끌기는 값이 지금 위치에서 시작해야 해서 여기서 Web Animations로 한다.
 */
/** 아래로 이만큼 끌면 닫는다(px) */
const SWIPE_CLOSE = 96;
/** 이보다 빠르게 아래로 튕기면(마지막 약 100ms, px/ms) 덜 끌었어도 닫는다 */
const FLICK_SPEED = 0.4;
/** 튕김 속도를 재는 구간(ms) */
const FLICK_WINDOW = 100;
/** 닫기 버튼·바깥·Esc로 닫을 때 내려가는 시간(ms) */
const CLOSE_MS = 260;
/** 끌다 놓았을 때 남은 거리 비율에 따라 160~260ms */
const DRAG_CLOSE_MIN_MS = 160;
const DRAG_CLOSE_EXTRA_MS = 100;
/** 놓았는데 덜 끌어서 제자리로 돌아오는 시간(ms) */
const RETURN_MS = 260;
/** 640px 이상 가운데 창이 사라지는 시간(ms) */
const POP_CLOSE_MS = 150;
/** 동작 줄이기: 닫을 때 흐려지는 시간(ms) */
const FADE_MS = 150;
/** 덮개 짙기(열린 상태). CSS의 bg-black/40과 같아야 한다 */
const SCRIM_ALPHA = 0.4;
/** 시트 곡선. globals.css의 --ease-sheet와 같다 */
const EASE_SHEET = "cubic-bezier(0.32, 0.72, 0, 1)";

const scrim = (alpha: number) => `rgba(0, 0, 0, ${alpha})`;
/** 덮개 = 패널 부모 <dialog>의 배경색. 훅 밖 함수로 둔 것은 린트가 ref에서 나온 값의 직접 수정을 막기 때문이다 */
const setScrim = (panel: HTMLElement, color: string) => {
  if (panel.parentElement) panel.parentElement.style.backgroundColor = color;
};

/**
 * 아래 창(휴대폰) 손잡이·머리 줄을 아래로 끌어 닫기. 경기 상세 창과 거론 구단 창이 같이 쓴다.
 * 끄는 동안은 손가락을 따라 내려오고 덮개(<dialog> 배경)도 같이 옅어진다. 놓을 때 SWIPE_CLOSE를 넘었거나 아래로 빠르게 튕겼으면
 * 지금 위치에서 아래로 미끄러져 내려간 뒤 닫고, 아니면 제자리로 돌아온다. 움직임 줄이기 설정이면 바로 닫고 바로 돌아온다.
 * 마우스로는 끌지 않고(PC 가운데 창은 닫기·바깥 누르기·Esc), 머리 줄의 버튼에서 시작한 누름은 버튼에 맡긴다.
 * 창의 다른 닫기(닫기 버튼·바깥 누르기·Esc)는 돌려주는 close로 부른다(아래 close 설명).
 * 뒤로 가기(popstate)로 닫히는 길은 여는 쪽이 부품을 바로 지워서 움직임 없이 닫힌다. 여는 쪽은 고치지 않기로 했다(이슈 #338).
 *
 * 패널의 부모가 <dialog>라는 것에 기댄다(.game-sheet가 dialog의 바로 아래 자식). 덮개를 dialog 배경색으로 그리기 때문이다.
 */
export function useSheetDrag(panelRef: RefObject<HTMLElement | null>, onClose: () => void) {
  const drag = useRef<{ y: number; dy: number; moves: { t: number; dy: number }[] } | null>(null);
  /** 내려가며 닫히는 중이면 그 타이머를 치우는 함수. 그동안은 다시 닫지도 끌지도 않고, 창이 먼저 지워지면 치운다 */
  const closing = useRef<(() => void) | null>(null);
  useEffect(() => () => closing.current?.(), []);

  /** 지금 위치에서 시작해 창·덮개를 같이 움직인다. 끝나면(또는 시간+50ms 타이머가 먼저 오면) 한 번만 done */
  const play = (
    panel: HTMLElement,
    dialog: HTMLElement,
    panelTo: Keyframe,
    scrimTo: string,
    ms: number,
    done: () => void,
  ) => {
    const style = getComputedStyle(panel);
    const options = { duration: ms, easing: EASE_SHEET, fill: "forwards" as const };
    const a = panel.animate([{ transform: style.transform, opacity: style.opacity }, panelTo], options);
    const b = dialog.animate(
      [{ backgroundColor: getComputedStyle(dialog).backgroundColor }, { backgroundColor: scrimTo }],
      options,
    );
    let timer = 0;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      window.clearTimeout(timer);
      done();
    };
    // 탭이 숨겨지면 애니메이션이 끝나지 않을 수 있어 타이머도 둔다. 먼저 오는 쪽에서 한 번만 끝낸다
    timer = window.setTimeout(finish, ms + 50);
    Promise.all([a.finished, b.finished]).then(finish, () => {});
    return () => {
      finished = true;
      window.clearTimeout(timer);
    };
  };

  /** 아래로(또는 흐려지며) 사라진 뒤 onClose. 닫는 중에는 같은 길로 두 번 오지 않는다 */
  const slideOut = (ms: number, pop: boolean) => {
    const panel = panelRef.current;
    const dialog = panel?.parentElement;
    if (!panel || !dialog) {
      onClose();
      return;
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const panelTo: Keyframe = reduced
      ? { opacity: 0 }
      : pop
        ? { opacity: 0, transform: "scale(0.98)" }
        : { transform: "translateY(100%)" };
    const duration = reduced ? FADE_MS : pop ? POP_CLOSE_MS : ms;
    closing.current = play(panel, dialog, panelTo, scrim(0), duration, onClose);
  };

  const onDragStart = (e: ReactPointerEvent<HTMLElement>) => {
    const panel = panelRef.current;
    if (!panel || closing.current || e.pointerType === "mouse" || (e.target as HTMLElement).closest("button")) return;
    drag.current = { y: e.clientY, dy: 0, moves: [] };
    // 열리거나 돌아오는 중이면 멈추고 손가락을 바로 따라오게 한다. 도는 애니메이션이 인라인 transform을 이기기 때문에 취소해야 한다
    panel.getAnimations().forEach((a) => a.cancel());
    panel.parentElement?.getAnimations().forEach((a) => a.cancel());
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onDragMove = (e: ReactPointerEvent<HTMLElement>) => {
    const d = drag.current;
    const panel = panelRef.current;
    if (!d || !panel) return;
    d.dy = Math.max(0, e.clientY - d.y);
    panel.style.transform = `translateY(${d.dy}px)`;
    // 덮개는 내려간 만큼 옅어진다
    const ratio = Math.min(1, d.dy / Math.max(1, panel.offsetHeight));
    setScrim(panel, scrim(SCRIM_ALPHA * (1 - ratio)));
    const now = e.timeStamp;
    d.moves.push({ t: now, dy: d.dy });
    while (d.moves.length > 1 && d.moves[0].t < now - FLICK_WINDOW) d.moves.shift();
  };

  const onDragEnd = () => {
    const d = drag.current;
    const panel = panelRef.current;
    const dialog = panel?.parentElement;
    drag.current = null;
    if (!d || !panel || !dialog) return;
    const first = d.moves[0];
    const last = d.moves[d.moves.length - 1];
    const speed =
      first && last && last.t > first.t && performance.now() - last.t < FLICK_WINDOW
        ? (last.dy - first.dy) / (last.t - first.t)
        : 0;
    const close = d.dy > SWIPE_CLOSE || speed > FLICK_SPEED;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      panel.style.transform = "";
      setScrim(panel, "");
      if (close) onClose();
      return;
    }
    if (close) {
      const remaining = Math.max(0, 1 - d.dy / Math.max(1, panel.offsetHeight));
      slideOut(DRAG_CLOSE_MIN_MS + DRAG_CLOSE_EXTRA_MS * remaining, false);
      return;
    }
    // 제자리로: 지금 위치에서 같은 곡선으로 돌아오고, 끝나면 인라인 스타일을 비운다(돌아오는 중에 다시 끌면 onDragStart가 취소한다)
    play(panel, dialog, { transform: "none" }, scrim(SCRIM_ALPHA), RETURN_MS, () => {
      panel.style.transform = "";
      setScrim(panel, "");
      panel.getAnimations().forEach((a) => a.cancel());
      dialog.getAnimations().forEach((a) => a.cancel());
    });
  };

  /**
   * 끌기 말고 다른 길로 닫을 때(닫기 버튼·바깥 누르기·Esc). 창은 지금 위치에서 아래로 내려가고(640px 이상은 살짝 작아지며 흐려지고)
   * 덮개도 같이 옅어진 뒤 onClose를 부른다. 그동안 dialog는 열어 둔다(dialog.close()를 먼저 부르면 top layer에서 빠져 바로 사라진다).
   * 내려가는 중에 다시 불린 close·끌기는 무시한다: onClose를 두 번 부르면 뒤로 가기로 닫는 창(경기 상세·거론 구단)은 popstate가
   * 창을 지우기 전에 뒤로 가기가 두 번 일어나 페이지를 떠날 수 있었다(PR #291 리뷰)
   */
  const close = () => {
    if (closing.current) return;
    drag.current = null;
    slideOut(CLOSE_MS, window.matchMedia("(min-width: 40rem)").matches);
  };

  return { onDragStart, onDragMove, onDragEnd, close };
}
