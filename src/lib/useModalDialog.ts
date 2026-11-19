import { useEffect, type RefObject } from "react";
import { useAppModal } from "@/lib/app";

/**
 * 화면을 덮는 창(<dialog>: 경기 상세·거론 구단 창)을 그려져 있는 동안 모달로 연다. 두 창이 같이 쓴다.
 * 같은 묶음을 창마다 복사해 두면 다음 창이 하나를 빠뜨리기 쉬워 한 곳에 모았다(#302 리뷰).
 * - showModal: 포커스가 창 안에 머물고 뒤 화면은 누를 수 없다.
 * - 열린 동안 뒤 페이지가 스크롤되지 않게 <html>의 overflow를 잠근다.
 * - 앱 안이면 창이 열려 있는 동안 앱에 알린다(useAppModal). 앱은 그동안 아이폰 왼쪽 끝 밀어 닫기와 아래 탭 누름을 막는다.
 * 부품이 지워지면 창을 닫고 잠금을 푼다. 닫기(닫기 버튼·바깥 누르기·Esc·끌어 닫기)는 부르는 쪽이 부품을 지워서 한다.
 */
export function useModalDialog(dialogRef: RefObject<HTMLDialogElement | null>): void {
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    const root = document.documentElement;
    const before = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = before;
      if (dialog.open) dialog.close();
    };
  }, [dialogRef]);
  // 위 effect가 창을 연 다음에 불러야 '열림'을 알린다(한 부품의 effect는 쓴 차례대로 돈다)
  useAppModal(dialogRef);
}
