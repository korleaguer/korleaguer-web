import { useEffect, useRef, useState, type RefObject } from "react";

/** 주소 기록 표시가 이 창(stateKey)의 것인가 */
const marked = (state: unknown, stateKey: string) => (state as Record<string, unknown> | null)?.[stateKey] === true;

/**
 * 버튼을 누르면 뜨는 아래 창(선수 고르기·역대 계약 등)의 열림 상태와 주소 기록. 성적표 창(SeasonReportRows)·거론 구단 창
 * (LinkedTeams)과 같은 방식을 한 곳에 모았다(이슈 #326). 기존 창들은 이번에 고치지 않았다.
 * - 열 때 history.pushState({[stateKey]: true})로 기록을 하나 쌓아 뒤로 가기(안드로이드 뒤로 버튼 포함)로 닫힌다.
 *   이미 이 표시가 있으면 쌓지 않고 바꿔 쓴다.
 * - 닫기는 내가 쌓은 기록이면 history.back()(popstate가 창을 닫는다), 아니면 바로 닫는다. 닫기 버튼·바깥 누르기·Esc·끌어 닫기가
 *   popstate 전에 겹쳐 들어와도 뒤로 가기는 한 번만(closingRef, 두 번이면 앞 화면을 떠난다).
 * - ownsEntryRef: history.state의 표시만 보면 안 된다. 앱이 화면으로 돌아올 때 부르는 router.refresh()가 Next 16에서 우리 표시를
 *   지워서(이슈 #256) 그 뒤 닫으면 쌓은 기록이 남는다. 지워진 걸 알아채면 효과에서 표시를 다시 붙인다(새 객체로).
 * - popstate는 캡처 단계로 받는다: Next가 popstate를 먼저 처리해 부품을 다시 그리면 '표시 다시 붙이기' 효과가 ownsEntryRef가 아직
 *   켜진 채로 돌아 돌아온 앞 기록에 표시를 붙인다(닫아도 창이 다시 열렸다, #325 리뷰). window에서는 캡처 listener가 먼저 불리므로
 *   Next보다 먼저 ownsEntryRef를 끈다.
 * - 부품이 지워지거나 숨겨지면(Next Activity) 창을 닫아 두고 포커스는 돌려주지 않는다. 되살아나면 기록대로 다시 연다.
 * - 닫힌 뒤 포커스가 body로 떨어졌으면 창을 연 버튼(triggerRef)으로 돌려준다(WAI-ARIA APG Dialog).
 */
export function useHistorySheet(stateKey: string, triggerRef: RefObject<HTMLElement | null>) {
  const [open, setOpen] = useState(false);
  const ownsEntryRef = useRef(false);
  const closingRef = useRef(false);
  /** 창이 열려 있었나(닫힌 뒤 포커스를 돌려줄지 가린다) */
  const wasOpenRef = useRef(false);

  useEffect(() => {
    const sync = () => {
      closingRef.current = false;
      const isMarked = marked(window.history.state, stateKey);
      ownsEntryRef.current = isMarked;
      setOpen(isMarked);
    };
    sync();
    window.addEventListener("popstate", sync, { capture: true });
    return () => {
      window.removeEventListener("popstate", sync, { capture: true });
      wasOpenRef.current = false;
      setOpen(false);
    };
  }, [stateKey]);

  // router.refresh()가 지운 표시를 다시 붙인다. 부품이 다시 그려질 때마다 돈다
  useEffect(() => {
    if (!open || !ownsEntryRef.current) return;
    const state = window.history.state;
    if (marked(state, stateKey)) return;
    window.history.replaceState({ ...state, [stateKey]: true }, "");
  });

  useEffect(() => {
    if (open) {
      wasOpenRef.current = true;
      return;
    }
    if (!wasOpenRef.current) return;
    wasOpenRef.current = false;
    const focused = document.activeElement;
    if (focused && focused !== document.body) return;
    const trigger = triggerRef.current;
    if (trigger?.isConnected) trigger.focus();
  }, [open, triggerRef]);

  const openSheet = () => {
    if (!marked(window.history.state, stateKey)) window.history.pushState({ [stateKey]: true }, "");
    ownsEntryRef.current = true;
    closingRef.current = false;
    setOpen(true);
  };
  const close = () => {
    if (closingRef.current) return;
    if (ownsEntryRef.current) {
      closingRef.current = true;
      window.history.back();
    } else setOpen(false);
  };

  return { open, openSheet, close };
}
