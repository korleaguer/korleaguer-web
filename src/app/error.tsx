"use client"; // 에러 화면은 브라우저에서 동작해야 해서 클라이언트 컴포넌트다.

import StateNotice, { stateActionClass } from "@/components/StateNotice";

// 예상하지 못한 오류가 나도 흰 화면 대신 이 안내를 보여 준다.
export default function Error({ retry }: { error: unknown; retry: () => void }) {
  return (
    <StateNotice
      alert
      emoji="😵"
      title="화면을 보여 주다가 문제가 생겼어요"
      detail="다시 불러오면 대부분 괜찮아져요."
      action={
        <button type="button" onClick={() => retry()} className={stateActionClass}>
          다시 불러오기
        </button>
      }
    />
  );
}
