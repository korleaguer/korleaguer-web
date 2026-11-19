// 포커스를 옮기는 도우미: 원래 포커스를 받지 않는 상자(본문 main, '더 보기'로 펼친 내용)로 옮기기, 누른 버튼이 사라지거나
// 옮겨져 갈 곳을 잃은 포커스를 다시 두기.

/**
 * el로 포커스를 옮긴다. scroll이 false면 화면은 그대로 둔다(preventScroll).
 * 누른 버튼이 사라지거나 옮겨진 뒤 포커스를 다시 둘 때 쓴다: 키보드로 눌렀으면 옮긴 곳이 보이게 화면을 움직이고, 마우스·손가락이면
 * 움직이지 않는다(크롬·안드로이드는 마우스·손가락으로 누른 버튼에도 포커스를 줘서, 그때 focus()가 화면을 끌어당기면 보던 자리가 튀었다,
 * 11-18 리뷰). 이 규칙을 여기 한 곳에 둔다(PR #301 리뷰: 같은 식이 네 곳에 있었다)
 */
export function moveFocus(el: HTMLElement | null | undefined, scroll: boolean): void {
  el?.focus(scroll ? undefined : { preventScroll: true });
}

/**
 * 상자(el)로 포커스를 옮긴다. tabindex="-1"은 이때만 붙이고 포커스가 떠나면 뗀다(GOV.UK 본문 바로가기 방식).
 * 늘 붙여 두면 마우스로 상자 안의 글자·빈 곳을 누를 때마다 상자가 포커스를 받는다. 그러면 다음 Tab이 누른 자리 다음이 아니라
 * 상자 안 첫 링크·버튼으로 가고 화면도 그리로 튄다(검토: 선수 화면을 내려 '시즌별 기록' 제목을 누르고 Tab → 맨 위 '내 선수' 버튼).
 * tabindex가 없으면 브라우저가 누른 자리를 다음 Tab의 시작점으로 쓴다.
 * 링크·버튼처럼 원래 포커스를 받는 것에는 쓰지 않는다. 이미 tabindex가 있으면(앞에서 붙이고 아직 포커스가 떠나지 않았으면) 포커스만 옮긴다.
 */
export function focusContainer(el: HTMLElement, options?: FocusOptions) {
  if (!el.hasAttribute("tabindex")) {
    el.setAttribute("tabindex", "-1");
    el.addEventListener("blur", () => el.removeAttribute("tabindex"), { once: true });
  }
  el.focus(options);
}
