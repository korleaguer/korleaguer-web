import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";

/**
 * 마지막으로 누른 것이 포커스를 가진 카드 별이면 그 선수 번호와 키보드로 눌렀는지. 다른 것을 누르면 지운다.
 * 훅 밖(모듈)에 두는 까닭: 알림의 '되돌리기'·'다시 시도' 버튼도 카드 별을 대신 누른 것으로 남긴다(noteStarPress).
 * 이 훅은 내 선수 화면 머리(MyHeader)에 하나만 있다
 */
let pressedStar: { id: number; keyboard: boolean } | null = null;

/**
 * 알림 버튼이 카드 별을 대신 누른 것으로 남긴다. 그 버튼이 포커스를 가진 채 눌렸을 때만 부른다(useMyPlayerToggle).
 * 알림은 누르면 사라져서 그 버튼에 있던 포커스도 문서 처음(body)으로 빠졌다(키보드 사용자가 자리를 잃었다, #288 뒤 점검).
 * 남겨 두면 그 선수 카드가 다시 그려질 때(되돌리기) 되살린 카드의 별로, 빠질 때(다시 빼기) 옆 카드 이름으로 옮긴다.
 * 알림 버튼의 onClick은 아래 문서 잡기 단계(capture) 다음에 돌아서, 그 클릭이 이 기록을 지우지 않는다
 */
export function noteStarPress(id: number, keyboard: boolean) {
  pressedStar = { id, keyboard };
}

/**
 * 내 선수 카드의 별로 선수를 빼면 카드가 사라지면서 그 안에 있던 포커스도 사라진다. 키보드·화면 낭독기로는 페이지 맨 앞으로
 * 돌아간 셈이라 어디까지 봤는지 잃었다(11-17 점검, WCAG 2.4.3). 그때는 그 자리로 올라온 다음 카드의 이름 링크,
 * 뺀 카드가 마지막이면 앞 카드, 아무도 안 남으면 제목(title)으로 옮긴다.
 * 알림의 '되돌리기'로 그 카드를 되살리면 되살린 카드의 별로 옮긴다(알림과 함께 사라진 포커스, noteStarPress).
 * 옮기는 것은 포커스를 가진 카드 별로 뺀(되돌린) 선수의 카드가 사라졌을(다시 그려졌을) 때뿐이다. 누를 때 그 별이 포커스를 가졌는지
 * (키보드로 누르면 click의 detail이 0. iOS VoiceOver의 두 번 탭은 WebKit이 버튼에 focus()를 준 뒤 detail 1인 click을 보낸다)와
 * 선수 번호를 남기고(OrderList의 refocusRef와 같은 방식), 그 화면이 그려진 직후 포커스가 사라졌으면(body) 옮긴다.
 * 포커스가 body인지만 보면 안 된다: 사파리·iOS(앱 포함)는 마우스·손가락으로 누른 버튼에 포커스를 주지 않아 처음부터 body라서,
 * '선수 고르기' 목록 줄로 빼도 다음 카드 이름으로 focus()가 걸려 화면이 그 카드로 튀었다(11-18 검토). 잃은 포커스가 없으면 옮기지 않는다.
 * 키보드로 뺐을 때만 옮긴 곳이 보이게 화면을 움직인다. 크롬·안드로이드는 마우스·손가락으로 누른 버튼에도 포커스를 줘서 여기로 오는데,
 * 그때 focus()가 화면을 앞 카드 이름·맨 위 제목으로 끌어올리지 않게 preventScroll로 옮긴다(11-18 리뷰). 화면 낭독기는 제 커서를 따라 움직인다.
 * 카드는 서버가 다시 그려서 사라지므로, 고른 선수 목록(ids)이 바뀐 화면이 그려진 직후에 본다.
 * 카드(FormCard)는 li에 data-player-id를, 별(MyPlayerToggle)은 data-my-toggle을, 알림(Toaster)은 data-toast를 둔다.
 */
export function useFocusAfterRemove(ids: readonly number[], title: RefObject<HTMLElement | null>) {
  const prev = useRef(ids);

  useEffect(() => {
    // 다른 화면에서 남은 기록은 버린다(이 화면 카드를 누른 것이 아니다)
    pressedStar = null;
    function onClick(e: MouseEvent) {
      const star = e.target instanceof Element ? e.target.closest("[data-my-toggle]") : null;
      const card = star?.closest<HTMLElement>("[data-player-id]");
      const keyboard = e.detail === 0;
      const focused = document.activeElement === star || keyboard;
      pressedStar = card && focused ? { id: Number(card.dataset.playerId), keyboard } : null;
    }
    // 잡기 단계(capture)로 문서에서 본다: 카드 목록은 서버 컴포넌트라 onClickCapture를 달 곳이 없고,
    // 별의 onClick보다 먼저 그 별이 포커스를 가졌는지 본다
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useLayoutEffect(() => {
    const before = prev.current;
    prev.current = ids;
    const press = pressedStar;
    if (press == null) return;
    // 남긴 별의 선수가 이번에 빠졌거나 되살아났을 때만 본다(쿠키에 남은 없는 선수 번호가 빠지는 새로 그리기 등은 그대로 둔다)
    const removed = before.includes(press.id) && !ids.includes(press.id);
    const restored = !before.includes(press.id) && ids.includes(press.id);
    if (!removed && !restored) return;
    pressedStar = null;
    // 잃은 포커스가 없으면 옮기지 않는다. 알림 버튼으로 되돌렸으면, 서버가 빨리 답할 때 포커스가 아직 사라지는 중인 알림에 남아 있다
    const focused = document.activeElement;
    if (focused && focused !== document.body && !focused.closest("[data-toast]")) return;
    const options = press.keyboard ? undefined : { preventScroll: true };
    if (restored) {
      document.querySelector<HTMLElement>(`[data-player-id="${press.id}"] [data-my-toggle]`)?.focus(options);
      return;
    }
    // 뺀 카드 뒤 카드부터, 없으면 바로 앞 카드부터(남아 있는 것 중 가장 가까운 카드)
    const at = before.indexOf(press.id);
    const near = [...before.slice(at + 1), ...before.slice(0, at).reverse()].find((id) => ids.includes(id));
    const link = near == null ? null : document.querySelector<HTMLElement>(`[data-player-id="${near}"] :is(h2, h3) a`);
    (link ?? title.current)?.focus(options);
  }, [ids, title]);
}
