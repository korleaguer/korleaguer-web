"use client"; // 누르면 아래 창을 열고 닫는 상태와 주소 기록이 있어서 클라이언트 컴포넌트다.

import { useRef, type ReactNode } from "react";
import BottomSheet from "@/components/BottomSheet";
import { useHistorySheet } from "@/lib/useHistorySheet";

/**
 * 누르면 아래 창(640px 이상은 가운데 창)을 여는 버튼(이슈 #420). 버튼 안 모양(label)과 창 몸(children)은 서버에서 그려 넘긴다.
 * HistorySheetRow·MoreSheet와 같은 방식(useHistorySheet: 뒤로 가기로 닫힘)이고 버튼 모양만 부르는 쪽이 정한다.
 * 창 몸은 열렸을 때만 그린다. stateKey는 한 화면에서 창마다 달라야 한다(같으면 하나를 열 때 다른 것도 같이 열린다).
 */
export default function SheetOpener({
  label,
  sheetTitle,
  stateKey,
  className,
  children,
}: {
  /** 버튼 안에 그릴 것 */
  label: ReactNode;
  /** 창 머리 제목 */
  sheetTitle: string;
  stateKey: string;
  /** 버튼 클래스(누름 영역 44px 이상은 부르는 쪽이 지킨다) */
  className: string;
  /** 창 몸 */
  children: ReactNode;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { open, openSheet, close } = useHistorySheet(stateKey, buttonRef);
  return (
    <>
      <button ref={buttonRef} type="button" aria-haspopup="dialog" onClick={openSheet} className={className}>
        {label}
      </button>
      {open && (
        <BottomSheet title={sheetTitle} onClose={close}>
          {children}
        </BottomSheet>
      )}
    </>
  );
}
