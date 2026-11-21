"use client"; // 창을 열고 닫고(모달), 아래로 끌어 닫아야 해서 클라이언트 컴포넌트다.

import { useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useModalDialog } from "@/lib/useModalDialog";
import { useSheetDrag } from "@/lib/useSheetDrag";
import SheetCloseButton from "@/components/SheetCloseButton";

/**
 * 아래에서 올라오는 창(640px 이상은 가운데 창)의 틀(이슈 #326). 거론 구단 창(LinkedTeamSheet)·성적표 창과 같은 모양이다:
 * <dialog>를 body로 띄우고(createPortal), 모달·스크롤 잠금·앱 알림은 useModalDialog, 아래로 끌어 닫기는 useSheetDrag.
 * 머리 줄(손잡이 + 제목 + 닫기)에만 끌기를 건다. 몸 안에서 끌어 옮기는 것(내 선수 순서 목록)이 끌어 닫기와 부딪히지 않게.
 * 닫기·바깥 누르기·Esc는 모두 onClose로 간다(주소 기록은 여는 쪽 useHistorySheet가 맡는다). 닫힐 때 이 부품은 통째로 지워진다.
 */
export default function BottomSheet({
  title,
  onClose,
  children,
  bodyClassName = "px-4",
  widthClassName = "sm:max-w-lg",
  side = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** 몸 좌우 여백 */
  bodyClassName?: string;
  /** 가운데 창(640px 이상) 최대 폭 */
  widthClassName?: string;
  /** PC(1024px 이상)에서는 가운데 창이 아니라 오른쪽에 붙은 옆 칸으로 연다(기록 화면 '전체 보기', 이슈 #407). 휴대폰·태블릿은 그대로 */
  side?: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useModalDialog(dialogRef);
  const { onDragStart, onDragMove, onDragEnd, close } = useSheetDrag(panelRef, onClose);

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === dialogRef.current) close();
      }}
      className={`fixed inset-0 m-0 h-full max-h-none w-full max-w-none border-0 bg-black/40 p-0 text-foreground open:flex open:items-end open:justify-center sm:open:items-center${side ? " lg:open:items-stretch lg:open:justify-end" : ""}`}
    >
      <div
        ref={panelRef}
        data-side={side ? "" : undefined}
        className={`game-sheet flex max-h-[84dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-surface shadow-[var(--shadow-card-hover)] sm:max-h-[80dvh] sm:rounded-2xl ${side ? "lg:h-full lg:max-h-none lg:rounded-none lg:rounded-l-2xl " : ""}${widthClassName}`}
      >
        {/* 끌어 닫는 머리: 앱 안에서도 길게 눌러 글자가 잡히지 않게 select-none */}
        <div
          className="shrink-0 touch-none select-none"
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
        >
          <div aria-hidden className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-line sm:hidden" />
          <div className="flex items-center gap-2.5 pb-1 pl-4 pr-2 pt-3 sm:pt-4">
            <h2 id={titleId} className="min-w-0 flex-1 text-heading">
              {title}
            </h2>
            <SheetCloseButton onClick={close} />
          </div>
        </div>
        {/* 아이폰 앱은 아래 탭 막대가 창 위에 떠 있어 그 높이(--app-tab-bar, 홈 표시줄 포함)만큼 더 띄운다(globals.css) */}
        <div
          className={`min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[calc(env(safe-area-inset-bottom)+0.5rem)] in-ios-app:pb-[calc(var(--app-tab-bar)+0.5rem)] ${bodyClassName}`}
        >
          {children}
        </div>
      </div>
    </dialog>,
    document.body,
  );
}
