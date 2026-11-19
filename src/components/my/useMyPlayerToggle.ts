import { useOptimistic, useRef, useTransition } from "react";
import { setMyPlayer } from "@/app/my/actions";
import { haptic } from "@/lib/app";
import { callAction } from "@/lib/callAction";
import { moveFocus } from "@/lib/focus";
import { withObjectParticle } from "@/lib/format";
import { toast, type ToastPress } from "@/lib/toast";
import { toastSaveFailed } from "./toastSaveFailed";
import { noteStarPress } from "./useFocusAfterRemove";

/** '내 선수' 목록의 한 자리(setMyPlayer가 돌려준다): 번호와 바로 앞 선수 id */
type Slot = NonNullable<Awaited<ReturnType<typeof setMyPlayer>>>;

/**
 * '내 선수' 넣기·빼기. 누르는 즉시 화면이 바뀌고(optimistic), 쿠키가 바뀌면 서버가 화면을 다시 그린다.
 * 결과는 알림 띠로 알린다(토스처럼): 넣으면 '보기', 빼면 '되돌리기' 버튼. 20명이 꽉 차서 못 넣으면 원래 모양으로 돌아가고,
 * 한 명을 빼고 넣으라고 알린다(내 선수 화면이 아니면 '내 선수 정리' 버튼).
 * 저장하지 못하면(연결 끊김·서버 오류) 원래 모양으로 돌아가고 '저장하지 못했어요' + '다시 시도'를 알린다(이 화면이 옛 배포면
 * '다시 불러오기', toastSaveFailed). 예전에는 화면 전체가 오류 화면(error.tsx)으로 바뀌어 보던 화면을 잃었다(전수조사 L324).
 * ref는 이 훅을 쓰는 버튼에 단다: 알림 버튼을 누르면 알림과 함께 사라지는 포커스를 이 버튼으로 돌려준다(refocus).
 */
export function useMyPlayerToggle(playerId: number, initialOn: boolean, nameKo: string) {
  const [on, setOptimisticOn] = useOptimistic(initialOn);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLButtonElement>(null);

  /**
   * 알림 버튼('되돌리기'·'다시 시도')을 누르면 알림이 사라지며 그 버튼에 있던 포커스도 문서 처음(body)으로 빠졌다
   * (키보드 사용자가 자리를 잃었다, #288 뒤 점검). 그 버튼이 포커스를 가졌으면(키보드, 크롬의 마우스) 이 버튼으로 돌려준다.
   * 내 선수 화면 카드의 별이면 카드가 빠지거나 되살아날 때 그 화면이 다시 옮긴다(useFocusAfterRemove): 카드 별로 뺀 뒤
   * '되돌리기'면 누른 별은 카드째 사라져 없으므로 되살린 카드의 별로, '다시 시도'로 다시 빼면 옆 카드 이름으로
   */
  function refocus(press: ToastPress) {
    if (!press.focused) return;
    const button = ref.current;
    if (button?.isConnected) moveFocus(button, press.keyboard);
    if (!button?.isConnected || button.closest("[data-player-id]")) noteStarPress(playerId, press.keyboard);
  }

  /**
   * undoAt: '되돌리기'로 다시 넣는 중이면 빠지기 전 자리(번호와 바로 앞 선수). 그 선수 뒤(없으면 그 번호)에 다시 넣고,
   * '보기' 버튼은 붙이지 않는다(맨 뒤로 넣으면 내 선수 화면 카드·뉴스 선수 순서가 바뀌었다, 11-17 점검)
   */
  function set(next: boolean, undoAt?: Slot) {
    const undo = undoAt !== undefined;
    // 앱 안이면 손끝 진동: 빼기는 누르는 순간 가벼운 톡.
    // 넣기는 꽉 차서(20명) 못 넣을 수 있어서, 서버 결과를 받은 뒤 성공 또는 실패 진동 하나만 울린다.
    if (!next) haptic("tap");
    startTransition(async () => {
      setOptimisticOn(next);
      // 서버까지 닿지 못했거나(연결 끊김) 서버가 실패했거나 이 화면이 옛 배포면 실패 값으로 받는다(callAction)
      const result = await callAction(() => setMyPlayer(playerId, next, undoAt));
      if (!result.ok) {
        // 쿠키는 그대로라 별은 이 전환이 끝나며 원래 모양으로 돌아간다(useOptimistic).
        // 같은 일(되돌리기였으면 그 자리로 다시 넣기)을 한 번 더 하는 버튼을 둔다(옛 배포면 '다시 불러오기')
        haptic("error");
        toastSaveFailed(
          result.failure,
          (press) => {
            refocus(press);
            set(next, undoAt);
          },
          `my-player:${playerId}`,
        );
        return;
      }
      // 넣었으면 들어간 자리, 뺐으면 빠지기 전 자리. 20명이 차서 못 넣었으면 null
      const slot = result.value;
      const ok = slot != null;
      if (next) haptic(ok ? "success" : "error");
      // 이미 내 선수 화면이면 그 화면으로 가는 버튼('보기'·'내 선수 정리')은 필요 없다(누르는 때의 주소로 판단해 훅이 주소를 구독하지 않게)
      const onMyPage = window.location.pathname === "/my";
      if (!ok) {
        // 무엇을 하면 되는지까지 알린다('20명까지 넣을 수 있어요'만 말하고 끝났다, 11-17 점검). 다른 화면이면 빼러 가는 버튼
        toast("내 선수 20명이 다 찼어요. 한 명을 빼고 넣어 주세요", {
          tone: "error",
          action: onMyPage ? undefined : { label: "내 선수 정리", href: "/my" },
        });
        return;
      }
      const name = withObjectParticle(nameKo);
      if (next) {
        toast(`${name} 내 선수에 넣었어요`, {
          tone: "success",
          action: undo || onMyPage ? undefined : { label: "보기", href: "/my" },
        });
      } else {
        toast(`${name} 내 선수에서 뺐어요`, {
          action: {
            label: "되돌리기",
            onClick: (press) => {
              refocus(press);
              set(true, slot);
            },
          },
        });
      }
    });
  }

  return { on, pending, toggle: () => set(!on), ref };
}
