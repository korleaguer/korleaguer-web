import { useEffect, type RefObject } from "react";
import { useAppModal } from "@/lib/app";

/**
 * 열린 창 수와 첫 창이 열리기 전 <html>의 overflow. 창이 겹치면(성적표 창 위 거론 구단 창, 이슈 #325) 창마다 열 때 값을 저장했다가
 * 되돌리면, React가 둘을 한꺼번에 지울 때(기사로 이동·폭 바뀜) 정리를 부모 → 자식 순서로 돌려 바깥 창이 ''로 되돌린 뒤
 * 안쪽 창이 자기가 저장한 'hidden'으로 다시 덮었다(다음 화면이 스크롤되지 않음). 그래서 첫 잠금 때만 저장하고 마지막 해제 때만 되돌린다
 */
let lockCount = 0;
let overflowBefore = "";

/**
 * 화면을 덮는 창(<dialog>: 경기 상세·거론 구단·성적표 창)을 그려져 있는 동안 모달로 연다. 창들이 같이 쓴다.
 * 같은 묶음을 창마다 복사해 두면 다음 창이 하나를 빠뜨리기 쉬워 한 곳에 모았다(#302 리뷰).
 * - showModal: 포커스가 창 안에 머물고 뒤 화면은 누를 수 없다.
 * - 열린 동안 뒤 페이지가 스크롤되지 않게 <html>의 overflow를 잠근다(창이 겹쳐도 맞게 풀리게 수를 센다, 위).
 * - 앱 안이면 창이 열려 있는 동안 앱에 알린다(useAppModal). 앱은 그동안 아이폰 왼쪽 끝 밀어 닫기와 아래 탭 누름을 막는다.
 * 부품이 지워지면 창을 닫고 잠금을 푼다. 닫기(닫기 버튼·바깥 누르기·Esc·끌어 닫기)는 부르는 쪽이 부품을 지워서 한다.
 */
export function useModalDialog(dialogRef: RefObject<HTMLDialogElement | null>): void {
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    const root = document.documentElement;
    if (lockCount === 0) overflowBefore = root.style.overflow;
    lockCount += 1;
    root.style.overflow = "hidden";
    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) root.style.overflow = overflowBefore;
      if (dialog.open) dialog.close();
    };
  }, [dialogRef]);
  // 위 effect가 창을 연 다음에 불러야 '열림'을 알린다(한 부품의 effect는 쓴 차례대로 돈다)
  useAppModal(dialogRef);
}
