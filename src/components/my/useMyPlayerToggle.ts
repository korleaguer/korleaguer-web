import { useOptimistic, useState, useTransition } from "react";
import { setMyPlayer } from "@/app/my/actions";
import { haptic } from "@/lib/app";

/**
 * '내 선수' 넣기·빼기. 누르는 즉시 화면이 바뀌고(optimistic), 쿠키가 바뀌면 서버가 화면을 다시 그린다.
 * 20명이 꽉 차서 못 넣으면 limited가 true가 되고 원래 모양으로 돌아간다.
 */
export function useMyPlayerToggle(playerId: number, initialOn: boolean) {
  const [on, setOptimisticOn] = useOptimistic(initialOn);
  const [pending, startTransition] = useTransition();
  const [limited, setLimited] = useState(false);

  function toggle() {
    const next = !on;
    setLimited(false);
    // 앱 안이면 손끝 진동: 빼기는 누르는 순간 가벼운 톡.
    // 넣기는 꽉 차서(20명) 못 넣을 수 있어서, 서버 결과를 받은 뒤 성공 또는 실패 진동 하나만 울린다.
    if (!next) haptic("tap");
    startTransition(async () => {
      setOptimisticOn(next);
      const ok = await setMyPlayer(playerId, next);
      if (!ok) setLimited(true);
      if (next) haptic(ok ? "success" : "error");
    });
  }

  return { on, pending, limited, toggle };
}
