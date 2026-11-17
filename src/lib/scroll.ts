/**
 * 가로로 미는 알약 줄(list)에서 item이 줄 밖에 있으면 가로로만 밀어 보이게 한다.
 * scrollIntoView는 페이지 세로 위치까지 움직여서 쓰지 않는다(읽던 자리가 튄다).
 * - nearest: 넘친 쪽 끝에 margin만큼 띄워 붙인다(선수 페이지 달 알약·바로 가기 탭)
 * - center: 줄 가운데쯤에 둔다(뉴스 탭 선수 고르기: 고른 선수 앞뒤가 함께 보이게)
 * 위치는 화면 좌표로 잰다. offsetLeft는 줄이나 조상이 position을 가지면 기준이 달라진다
 */
export function revealInRow(list: HTMLElement, item: HTMLElement, align: "nearest" | "center" = "nearest", margin = 8) {
  if (list.scrollWidth <= list.clientWidth) return;
  const box = list.getBoundingClientRect();
  const rect = item.getBoundingClientRect();
  // 줄 안쪽(스크롤되는 내용) 기준 item의 왼쪽·오른쪽 끝
  const left = rect.left - box.left - list.clientLeft + list.scrollLeft;
  const right = left + rect.width;
  if (left >= list.scrollLeft && right <= list.scrollLeft + list.clientWidth) return;
  if (align === "center") list.scrollLeft = left - (list.clientWidth - rect.width) / 2;
  else list.scrollLeft = left < list.scrollLeft ? left - margin : right - list.clientWidth + margin;
}
