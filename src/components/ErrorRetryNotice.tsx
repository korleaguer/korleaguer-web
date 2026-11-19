"use client"; // 다시 불러오는 동안 버튼에 점을 보여야 해서 클라이언트 컴포넌트다.

import { useTransition } from "react";
import LoadingDots from "./LoadingDots";
import StateNotice, { stateActionClass } from "./StateNotice";

/**
 * 화면을 그리다 예상하지 못한 오류가 났을 때의 안내. 화면 오류(app/error.tsx)와 맨 바깥 틀 오류(app/global-error.tsx)가 같이 쓴다.
 * retry는 서버에서 화면을 다시 받아 그린다. 그동안 버튼에 점 3개.
 * 화면(제목 h1 포함)을 통째로 대신하므로 안내 제목이 h1이다.
 */
export default function ErrorRetryNotice({ retry }: { retry: () => void }) {
  const [pending, startTransition] = useTransition();
  return (
    <StateNotice
      alert
      level={1}
      emoji="😵"
      title="화면을 보여 주다가 문제가 생겼어요"
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
