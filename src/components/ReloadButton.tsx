"use client"; // 누르면 페이지를 다시 불러와야 해서 클라이언트 컴포넌트다.

import { useState } from "react";
import LoadingDots from "./LoadingDots";
import { stateActionClass } from "./StateNotice";

/**
 * 데이터를 못 받았을 때 '다시 불러오기'. 서버에서 다시 받도록 페이지를 새로 연다. 새 화면이 올 때까지 점 3개.
 * 모양은 놓이는 자리에 맞춘다(기본은 오류 화면의 회색 알약, 호박색 안내 띠 안에서는 흰 알약)
 */
export default function ReloadButton({ className = stateActionClass }: { className?: string }) {
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
      className={className}
    >
      <LoadingDots loading={loading}>다시 불러오기</LoadingDots>
    </button>
  );
}
