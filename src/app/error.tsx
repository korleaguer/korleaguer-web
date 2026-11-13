"use client"; // 에러 화면은 브라우저에서 동작해야 해서 클라이언트 컴포넌트다.

import { useTransition } from "react";
import LoadingDots from "@/components/LoadingDots";
import StateNotice, { stateActionClass } from "@/components/StateNotice";

// 예상하지 못한 오류가 나도 흰 화면 대신 이 안내를 보여 준다.
export default function Error({ retry }: { error: unknown; retry: () => void }) {
  // retry는 서버에서 화면을 다시 받아 그린다. 그동안 버튼에 점 3개
  const [pending, startTransition] = useTransition();
  return (
    <StateNotice
      alert
      emoji="😵"
      title="화면을 보여 주다가 문제가 생겼어요"
      detail="다시 불러오면 대부분 괜찮아져요."
      action={
        <button
          type="button"
          aria-busy={pending}
          onClick={() => startTransition(() => retry())}
          className={stateActionClass}
        >
          <LoadingDots loading={pending}>다시 불러오기</LoadingDots>
        </button>
      }
    />
  );
}
