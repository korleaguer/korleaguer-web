import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";

/**
 * 내 선수 카드의 별로 선수를 빼면 카드가 사라지면서 그 안에 있던 포커스도 사라진다. 키보드·화면 낭독기로는 페이지 맨 앞으로
 * 돌아간 셈이라 어디까지 봤는지 잃었다(11-17 점검, WCAG 2.4.3). 그때는 그 자리로 올라온 다음 카드의 이름 링크,
 * 뺀 카드가 마지막이면 앞 카드, 아무도 안 남으면 제목(title)으로 옮긴다.
 * 옮기는 것은 포커스를 가진 카드 별로 뺀 선수의 카드가 사라졌을 때뿐이다. 누를 때 그 별이 포커스를 가졌는지(키보드·화면
 * 낭독기로 누르면 click의 detail이 0)와 선수 번호를 남기고(OrderList의 refocusRef와 같은 방식), 그 선수가 빠진 화면이
 * 그려진 직후 포커스가 사라졌으면(body) 옮긴다. 포커스가 body인지만 보면 안 된다: 사파리·iOS(앱 포함)는 마우스·손가락으로
 * 누른 버튼에 포커스를 주지 않아 처음부터 body라서, '선수 고르기' 목록 줄로 빼도 다음 카드 이름으로 focus()가 걸려
 * 화면이 그 카드로 튀었다(11-18 검토). 잃은 포커스가 없으면 옮기지 않는다.
 * 카드는 서버가 다시 그려서 사라지므로, 고른 선수 목록(ids)이 바뀐 화면이 그려진 직후에 본다.
 * 카드(FormCard)는 li에 data-player-id를, 별(MyPlayerToggle)은 data-my-toggle을 둔다.
 */
export function useFocusAfterRemove(ids: readonly number[], title: RefObject<HTMLElement | null>) {
  const prev = useRef(ids);
  /** 마지막으로 누른 것이 포커스를 가진 카드 별이면 그 선수 번호. 다른 것을 누르면 지운다 */
  const pressed = useRef<number | null>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      const star = e.target instanceof Element ? e.target.closest("[data-my-toggle]") : null;
      const card = star?.closest<HTMLElement>("[data-player-id]");
      const focused = document.activeElement === star || e.detail === 0;
      pressed.current = card && focused ? Number(card.dataset.playerId) : null;
    }
    // 잡기 단계(capture)로 문서에서 본다: 카드 목록은 서버 컴포넌트라 onClickCapture를 달 곳이 없고,
    // 별의 onClick보다 먼저 그 별이 포커스를 가졌는지 본다
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useLayoutEffect(() => {
    const before = prev.current;
    prev.current = ids;
    const star = pressed.current;
    // 남긴 별의 선수가 이번에 빠졌을 때만 본다(쿠키에 남은 없는 선수 번호가 빠지는 새로 그리기 등은 그대로 둔다)
    if (star == null || ids.includes(star) || !before.includes(star)) return;
    pressed.current = null;
    const focused = document.activeElement;
    if (focused && focused !== document.body) return;
    // 뺀 카드 뒤 카드부터, 없으면 바로 앞 카드부터(남아 있는 것 중 가장 가까운 카드)
    const removed = before.indexOf(star);
    const near = [...before.slice(removed + 1), ...before.slice(0, removed).reverse()].find((id) => ids.includes(id));
    const link = near == null ? null : document.querySelector<HTMLElement>(`[data-player-id="${near}"] :is(h2, h3) a`);
    (link ?? title.current)?.focus();
  }, [ids, title]);
}
