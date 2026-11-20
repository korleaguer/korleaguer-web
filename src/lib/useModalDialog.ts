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
 * 열린 창(나중에 연 것이 뒤). 모달 창이 열리면 창 밖은 누를 수 없고(inert) 창 아래에 깔려서, 창 안에서 별을 누를 때 뜨는
 * 알림('…뺐어요 · 되돌리기')이 어둡게 가려지고 버튼도 눌리지 않았다(이슈 #326). 알림 띠(Toaster)가 맨 위 창 안에 그려지도록 알린다
 */
const openDialogs: HTMLDialogElement[] = [];
const modalListeners = new Set<() => void>();
const emitModal = () => modalListeners.forEach((l) => l());

/** useSyncExternalStore용: 열린 창이 바뀌면 부른다 */
export function subscribeModal(listener: () => void): () => void {
  modalListeners.add(listener);
  return () => modalListeners.delete(listener);
}

/** 지금 맨 위에 열린 창. 없으면 null */
export function topModal(): HTMLDialogElement | null {
  return openDialogs[openDialogs.length - 1] ?? null;
}

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
    if (!dialog.open) {
      // showModal은 창 안 첫 버튼(머리 오른쪽 닫기)에 포커스를 주는데, 아이폰 WebKit은 손가락으로 연 창에서도 그 포커스를
      // :focus-visible로 보아 닫기 버튼에 파란 동그라미 테두리를 그렸다(이슈 #354). 포커스는 창 자체에 둔다(APG 대화상자:
      // 내용이 긴 창은 맨 앞의 정적인 곳에 포커스를 둔다). 키보드로는 Tab 한 번에 첫 버튼으로 간다.
      // 같은 실행 안에서 옮겨 닫기 버튼의 테두리는 한 번도 그려지지 않는다. 창 자체의 테두리는 globals.css가 지운다
      dialog.tabIndex = -1;
      dialog.showModal();
      dialog.focus({ preventScroll: true });
    }
    const root = document.documentElement;
    if (lockCount === 0) overflowBefore = root.style.overflow;
    lockCount += 1;
    root.style.overflow = "hidden";
    openDialogs.push(dialog);
    emitModal();
    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) root.style.overflow = overflowBefore;
      const i = openDialogs.indexOf(dialog);
      if (i >= 0) openDialogs.splice(i, 1);
      emitModal();
      if (dialog.open) dialog.close();
    };
  }, [dialogRef]);
  // 위 effect가 창을 연 다음에 불러야 '열림'을 알린다(한 부품의 effect는 쓴 차례대로 돈다)
  useAppModal(dialogRef);
}
