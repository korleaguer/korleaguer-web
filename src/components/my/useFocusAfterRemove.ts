import { useLayoutEffect, useRef, type RefObject } from "react";

/**
 * 내 선수 카드의 별로 선수를 빼면 카드가 사라지면서 그 안에 있던 포커스도 사라진다. 키보드·화면 낭독기로는 페이지 맨 앞으로
 * 돌아간 셈이라 어디까지 봤는지 잃었다(11-17 점검, WCAG 2.4.3). 그때는 그 자리로 올라온 다음 카드의 이름 링크,
 * 뺀 카드가 마지막이면 앞 카드, 아무도 안 남으면 제목(title)으로 옮긴다.
 * 포커스가 사라진 경우(body)만 옮긴다: '선수 고르기' 목록에서 빼면 포커스가 그 줄에 남아 있어 그대로 둔다.
 * 카드는 서버가 다시 그려서 사라지므로, 고른 선수 목록(ids)이 바뀐 화면이 그려진 직후에 본다.
 * 카드(FormCard)는 li에 data-player-id를 둔다.
 */
export function useFocusAfterRemove(ids: readonly number[], title: RefObject<HTMLElement | null>) {
  const prev = useRef(ids);
  useLayoutEffect(() => {
    const before = prev.current;
    prev.current = ids;
    const removed = before.findIndex((id) => !ids.includes(id));
    if (removed < 0) return;
    const focused = document.activeElement;
    if (focused && focused !== document.body) return;
    // 뺀 카드 뒤 카드부터, 없으면 바로 앞 카드부터(남아 있는 것 중 가장 가까운 카드)
    const near = [...before.slice(removed + 1), ...before.slice(0, removed).reverse()].find((id) => ids.includes(id));
    const link = near == null ? null : document.querySelector<HTMLElement>(`[data-player-id="${near}"] :is(h2, h3) a`);
    (link ?? title.current)?.focus();
  }, [ids, title]);
}
