"use client"; // 에러 화면은 브라우저에서 동작해야 해서 클라이언트 컴포넌트다.

import ErrorRetryNotice from "@/components/ErrorRetryNotice";

// 예상하지 못한 오류가 나도 흰 화면 대신 이 안내를 보여 준다. 머리글·바닥글(layout)은 그대로 남는다.
export default function Error({ retry }: { error: unknown; retry: () => void }) {
  return <ErrorRetryNotice retry={retry} />;
}
