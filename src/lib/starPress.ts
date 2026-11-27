// 내 선수 별 누름 기록. 별 단추(useMyPlayerToggle)가 남기고 내 선수 화면(useFocusAfterRemove)이 읽어 포커스를 옮긴다.

/**
 * 마지막으로 누른 것이 포커스를 가진 카드 별이면 그 선수 번호와 키보드로 눌렀는지. 다른 것을 누르면 지운다.
 * 훅 밖(모듈)에 두는 까닭: 알림의 '되돌리기'·'다시 시도' 버튼도 카드 별을 대신 누른 것으로 남긴다(noteStarPress).
 * 읽고 지우는 쪽은 내 선수 화면 머리(MyHeader)의 useFocusAfterRemove 하나다
 */
export const starPress: { current: { id: number; keyboard: boolean } | null } = { current: null };

/**
 * 알림 버튼이 카드 별을 대신 누른 것으로 남긴다. 그 버튼이 포커스를 가진 채 눌렸을 때만 부른다(useMyPlayerToggle): 처음에 카드 별로
 * 눌렀거나, 처음 누른 고르기 줄·알약이 없어져 돌려줄 곳이 없을 때(고르기를 닫음, 선수 화면에서 빼고 이 화면으로 옴).
 * 알림은 누르면 사라져서 그 버튼에 있던 포커스도 문서 처음(body)으로 빠졌다(키보드 사용자가 자리를 잃었다, #288 뒤 점검).
 * 남겨 두면 그 선수 카드가 다시 그려질 때(되돌리기) 되살린 카드의 별로, 빠질 때(다시 빼기) 옆 카드 이름으로 옮긴다.
 * 알림 버튼의 onClick은 아래 문서 잡기 단계(capture) 다음에 돌아서, 그 클릭이 이 기록을 지우지 않는다
 */
export function noteStarPress(id: number, keyboard: boolean) {
  starPress.current = { id, keyboard };
}
