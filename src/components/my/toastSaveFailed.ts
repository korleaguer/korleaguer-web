import type { ActionFailure } from "@/lib/callAction";
import { toast, type ToastPress } from "@/lib/toast";

/**
 * 내 선수 저장(별 넣기·빼기, 화면 순서) 실패 알림(빨간 느낌표). 별과 순서 목록이 같이 쓴다.
 * - 다시 하면 될 수 있으면(연결 끊김·서버 오류) '저장하지 못했어요' + '다시 시도'(retry).
 * - 이 화면이 옛 배포라 서버가 저장을 모르면 다시 해도 같아서 '새 버전이 나와 저장하지 못했어요' + '다시 불러오기'(페이지를 새로
 *   받는다. 안내 띠의 ReloadButton과 같은 말). 글에는 '다시 불러와 주세요'를 쓰지 않는다(버튼과 같은 말)
 */
export function toastSaveFailed(failure: ActionFailure, retry: (press: ToastPress) => void): void {
  if (failure === "stale") {
    toast("새 버전이 나와 저장하지 못했어요", {
      tone: "error",
      action: { label: "다시 불러오기", onClick: () => window.location.reload() },
    });
    return;
  }
  toast("저장하지 못했어요", { tone: "error", action: { label: "다시 시도", onClick: retry } });
}
