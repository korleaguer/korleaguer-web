"use client"; // 누르면 페이지를 다시 불러와야 해서 클라이언트 컴포넌트다.

import { useState } from "react";
import LoadingDots from "./LoadingDots";
import { stateActionClass } from "./StateNotice";

/** 데이터를 못 받았을 때 '다시 불러오기'. 서버에서 다시 받도록 페이지를 새로 연다. 새 화면이 올 때까지 점 3개 */
export default function ReloadButton() {
  const [loading, setLoading] = useState(false);
  return (
    <button
      type="button"
      aria-busy={loading}
      onClick={() => {
        setLoading(true);
        window.location.reload();
        // 새로고침이 막혀 이 화면에 그대로 있으면 점을 멈춘다
        setTimeout(() => setLoading(false), 10_000);
      }}
      className={stateActionClass}
    >
      <LoadingDots loading={loading}>다시 불러오기</LoadingDots>
    </button>
  );
}
