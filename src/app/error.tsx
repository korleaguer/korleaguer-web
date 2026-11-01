"use client"; // 에러 화면은 브라우저에서 동작해야 해서 클라이언트 컴포넌트다.

// 예상하지 못한 오류가 나도 흰 화면 대신 이 안내를 보여 준다.
export default function Error({ retry }: { error: unknown; retry: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-line bg-surface px-5 py-10 text-center">
      <p className="text-base font-bold">화면을 그리는 중 문제가 생겼습니다</p>
      <button
        type="button"
        onClick={() => retry()}
        className="mt-3 rounded-md border border-line px-3 py-1.5 text-sm font-semibold hover:bg-surface-2"
      >
        다시 시도
      </button>
    </div>
  );
}
