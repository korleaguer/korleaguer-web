import { useOptimistic, useTransition } from "react";
import { setMyPlayer } from "@/app/my/actions";
import { haptic } from "@/lib/app";
import { withObjectParticle } from "@/lib/format";
import { toast } from "@/lib/toast";

/**
 * '내 선수' 넣기·빼기. 누르는 즉시 화면이 바뀌고(optimistic), 쿠키가 바뀌면 서버가 화면을 다시 그린다.
 * 결과는 알림 띠로 알린다(토스처럼): 넣으면 '보기', 빼면 '되돌리기' 버튼. 20명이 꽉 차서 못 넣으면 원래 모양으로 돌아가고 그렇다고 알린다.
 */
export function useMyPlayerToggle(playerId: number, initialOn: boolean, nameKo: string) {
  const [on, setOptimisticOn] = useOptimistic(initialOn);
  const [pending, startTransition] = useTransition();

  /** undo: '되돌리기'로 다시 넣는 중(이때는 '보기' 버튼을 붙이지 않는다) */
  function set(next: boolean, undo = false) {
    // 앱 안이면 손끝 진동: 빼기는 누르는 순간 가벼운 톡.
    // 넣기는 꽉 차서(20명) 못 넣을 수 있어서, 서버 결과를 받은 뒤 성공 또는 실패 진동 하나만 울린다.
    if (!next) haptic("tap");
    startTransition(async () => {
      setOptimisticOn(next);
      const ok = await setMyPlayer(playerId, next);
      if (next) haptic(ok ? "success" : "error");
      if (!ok) {
        toast("내 선수는 20명까지 넣을 수 있어요", { tone: "error" });
        return;
      }
      const name = withObjectParticle(nameKo);
      if (next) {
        // 이미 내 선수 화면이면 '보기'는 필요 없다(누르는 때의 주소로 판단해 훅이 주소를 구독하지 않게)
        const onMyPage = window.location.pathname === "/my";
        toast(`${name} 내 선수에 넣었어요`, {
          tone: "success",
          action: undo || onMyPage ? undefined : { label: "보기", href: "/my" },
        });
      } else {
        toast(`${name} 내 선수에서 뺐어요`, { action: { label: "되돌리기", onClick: () => set(true, true) } });
      }
    });
  }

  return { on, pending, toggle: () => set(!on) };
}
