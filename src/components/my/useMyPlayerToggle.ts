import { useOptimistic, useTransition } from "react";
import { setMyPlayer } from "@/app/my/actions";
import { haptic } from "@/lib/app";
import { withObjectParticle } from "@/lib/format";
import { toast } from "@/lib/toast";

/**
 * '내 선수' 넣기·빼기. 누르는 즉시 화면이 바뀌고(optimistic), 쿠키가 바뀌면 서버가 화면을 다시 그린다.
 * 결과는 알림 띠로 알린다(토스처럼): 넣으면 '보기', 빼면 '되돌리기' 버튼. 20명이 꽉 차서 못 넣으면 원래 모양으로 돌아가고,
 * 한 명을 빼고 넣으라고 알린다(내 선수 화면이 아니면 '내 선수 정리' 버튼).
 */
export function useMyPlayerToggle(playerId: number, initialOn: boolean, nameKo: string) {
  const [on, setOptimisticOn] = useOptimistic(initialOn);
  const [pending, startTransition] = useTransition();

  /**
   * undoAt: '되돌리기'로 다시 넣는 중이면 빠지기 전 자리. 그 자리에 다시 넣고, '보기' 버튼은 붙이지 않는다
   * (맨 뒤로 넣으면 내 선수 화면 카드·뉴스 선수 순서가 바뀌었다, 11-17 점검)
   */
  function set(next: boolean, undoAt?: number) {
    const undo = undoAt !== undefined;
    // 앱 안이면 손끝 진동: 빼기는 누르는 순간 가벼운 톡.
    // 넣기는 꽉 차서(20명) 못 넣을 수 있어서, 서버 결과를 받은 뒤 성공 또는 실패 진동 하나만 울린다.
    if (!next) haptic("tap");
    startTransition(async () => {
      setOptimisticOn(next);
      // 넣었으면 들어간 자리, 뺐으면 빠지기 전 자리. 20명이 차서 못 넣었으면 null
      const index = await setMyPlayer(playerId, next, undoAt);
      const ok = index != null;
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
        toast(`${name} 내 선수에서 뺐어요`, { action: { label: "되돌리기", onClick: () => set(true, index) } });
      }
    });
  }

  return { on, pending, toggle: () => set(!on) };
}
