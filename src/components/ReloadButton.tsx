"use client"; // 누르면 페이지를 다시 불러와야 해서 클라이언트 컴포넌트다.

import { stateActionClass } from "./StateNotice";

/** 데이터를 못 받았을 때 '다시 불러오기'. 서버에서 다시 받도록 페이지를 새로 연다 */
export default function ReloadButton() {
  return (
    <button type="button" onClick={() => window.location.reload()} className={stateActionClass}>
      다시 불러오기
    </button>
  );
}
