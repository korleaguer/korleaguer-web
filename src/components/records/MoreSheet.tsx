"use client"; // 누르면 아래 창(PC는 옆 칸)을 열고 닫는 상태와 주소 기록이 있어서 클라이언트 컴포넌트다.

import { useRef, type ReactNode } from "react";
import BottomSheet from "@/components/BottomSheet";
import Chevron from "@/components/Chevron";
import { useHistorySheet } from "@/lib/useHistorySheet";

/**
 * 기록 화면 가운데 묶음('넘은 기록'·'통산 순위')의 '전체 보기'(사용자 11-22 결정, 이슈 #407).
 * 예전 ShowMore는 그 자리에서 펼쳐 아래 '한 시즌 최다'를 밀어냈다. 이제 휴대폰은 아래 창, PC(1024px 이상)는 오른쪽 옆 칸에
 * 전체 목록을 연다(BottomSheet side). 뒤로 가기·주소 기록은 useHistorySheet가 맡는다.
 * 목록(children)은 창이 열렸을 때만 그린다. stateKey는 묶음마다 달라야 한다(같으면 한 묶음을 열 때 다른 묶음도 같이 열린다).
 */
export default function MoreSheet({
  label,
  sheetTitle,
  stateKey,
  children,
}: {
  /** 버튼 글자. 예: "전체 18명 보기" */
  label: string;
  /** 창 머리 제목 */
  sheetTitle: string;
  stateKey: string;
  /** 창 몸에 그릴 전체 목록(줄 모음) */
  children: ReactNode;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { open, openSheet, close } = useHistorySheet(stateKey, buttonRef);
  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="dialog"
        onClick={openSheet}
        className="press-soft flex min-h-11 w-full cursor-pointer items-center justify-center gap-1 text-label text-accent-ink"
      >
        {label}
        <Chevron small />
      </button>
      {open && (
        <BottomSheet title={sheetTitle} onClose={close} bodyClassName="px-0" widthClassName="sm:max-w-lg lg:max-w-[26rem]" side>
          <ul className="divide-y divide-line">{children}</ul>
        </BottomSheet>
      )}
    </>
  );
}
