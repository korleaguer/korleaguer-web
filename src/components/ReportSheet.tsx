"use client"; // 끌어 닫기·옆으로 밀기 같은 손가락 이벤트와 창 상태가 있어서 클라이언트 컴포넌트다.

// 성적표 줄을 휴대폰에서 누르면 뜨는 아래 창(성적표 목록 틀 SeasonReportRows가 연다).
import { useEffect, useId, useRef, type TouchEvent as ReactTouchEvent } from "react";
import { createPortal } from "react-dom";
import PlayerAvatar from "@/components/PlayerAvatar";
import { useModalDialog } from "@/lib/useModalDialog";
import { useSheetDrag } from "@/lib/useSheetDrag";
import SheetCloseButton from "@/components/SheetCloseButton";
import type { ReportRow } from "@/components/SeasonReportRows";

/** 창 몸을 옆으로 이만큼(px) 이상 밀면 이전·다음 선수로 넘긴다 */
const SWIPE_STEP = 60;

/**
 * 휴대폰에서 줄을 누르면 아래에서 올라오는 창(이슈 #325). 틀은 거론 구단 창(LinkedTeamSheet)·경기 상세 창(GameDetailSheet)과 같다:
 * <dialog>를 body로 띄우고(createPortal), 모달·스크롤 잠금·앱 알림은 useModalDialog, 아래로 끌어 닫기는 useSheetDrag.
 * 머리: 사진 + head + 닫기. 몸: panel(한 번에 이 창에만 그린다). 바닥: '‹ 이전 선수 · n / 6 · 다음 선수 ›'.
 * 몸을 옆으로 밀어도(가로가 세로보다 크고 SWIPE_STEP 이상) 이전·다음으로 넘긴다. 640px 이상(sm~lg)은 가운데 창이 된다.
 * 뒤로 가기·포커스 돌려주기는 여는 쪽(RowList)이 한다(이 부품은 닫힐 때 통째로 지워진다)
 */
export default function ReportSheet({
  rows,
  index,
  onGo,
  onClose,
}: {
  rows: ReportRow[];
  index: number;
  onGo: (id: number) => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const touchRef = useRef<{ x: number; y: number } | null>(null);
  const titleId = `${useId()}title`;
  const row = rows[index];
  const prev = index > 0 ? rows[index - 1] : null;
  const next = index < rows.length - 1 ? rows[index + 1] : null;

  useModalDialog(dialogRef);
  const { onDragStart, onDragMove, onDragEnd, close } = useSheetDrag(panelRef, onClose);
  const navRef = useRef<HTMLElement>(null);

  // 끝 선수로 넘기면 방금 누른 '다음'(첫 선수면 '이전') 버튼이 없어져 포커스가 창 밖(body)으로 떨어진다. 남은 넘기기 버튼으로 옮긴다
  useEffect(() => {
    const focused = document.activeElement;
    if (focused && focused !== document.body) return;
    navRef.current?.querySelector<HTMLElement>("button")?.focus();
  }, [index]);

  const onTouchStart = (e: ReactTouchEvent) => {
    const t = e.touches[0];
    touchRef.current = e.touches.length === 1 && t ? { x: t.clientX, y: t.clientY } : null;
  };
  const onTouchEnd = (e: ReactTouchEvent) => {
    const start = touchRef.current;
    const t = e.changedTouches[0];
    touchRef.current = null;
    if (!start || !t) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) <= Math.abs(dy) || Math.abs(dx) < SWIPE_STEP) return;
    const target = dx < 0 ? next : prev;
    if (target) onGo(target.id);
  };

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
      className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none border-0 bg-black/40 p-0 text-foreground open:flex open:items-end open:justify-center sm:open:items-center"
    >
      <div
        ref={panelRef}
        className="game-sheet flex max-h-[84dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-surface shadow-[var(--shadow-card-hover)] sm:max-h-[80dvh] sm:max-w-lg sm:rounded-2xl"
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
          <div className="flex items-center gap-3 pb-1 pl-4 pr-2 pt-3 sm:pt-4">
            <PlayerAvatar size={44} nameKo={row.photo.nameKo} photoUrl={row.photo.photoUrl} teamAbbr={row.photo.teamAbbr} photoTeamAbbr={row.photo.photoTeamAbbr} eager />
            {/* 창 안에서 다른 선수로 넘기면 화면 낭독기가 새 선수를 읽게 한다(제목만 바뀌고 알림이 없었다) */}
            <div id={titleId} aria-live="polite" className="min-w-0 flex-1">
              {row.head}
            </div>
            <SheetCloseButton onClick={close} />
          </div>
        </div>
        {/* 몸: 선수가 바뀌면 처음부터 다시 그려(key) 스크롤이 맨 위로 돌아온다 */}
        <div key={row.id} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-2 pt-2">
          {row.panel}
        </div>
        {/* 바닥: 목록 순서대로 이전·다음. 끝에서는 그쪽 버튼을 비워 둔다. 아이폰 앱은 아래 탭 막대가 창 위에 떠 있어 그 높이만큼 더 띄운다(globals.css) */}
        <nav
          ref={navRef}
          aria-label="선수 넘기기"
          className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-2 border-t border-line px-2 pb-[calc(env(safe-area-inset-bottom)+0.25rem)] pt-1 in-ios-app:pb-[calc(var(--app-tab-bar)+0.25rem)]"
        >
          {prev ? (
            <button
              type="button"
              onClick={() => onGo(prev.id)}
              className="press flex min-h-11 min-w-0 cursor-pointer items-center justify-start gap-1 rounded-lg px-2 text-label hover:bg-surface-2"
            >
              <span aria-hidden>‹</span>
              <span className="sr-only">이전 선수 </span>
              <span className="truncate">{prev.photo.nameKo}</span>
            </button>
          ) : (
            <span />
          )}
          <span className="text-caption text-muted tabular-nums">
            {index + 1} / {rows.length}
          </span>
          {next ? (
            <button
              type="button"
              onClick={() => onGo(next.id)}
              className="press flex min-h-11 min-w-0 cursor-pointer items-center justify-end gap-1 rounded-lg px-2 text-label hover:bg-surface-2"
            >
              <span className="sr-only">다음 선수 </span>
              <span className="truncate">{next.photo.nameKo}</span>
              <span aria-hidden>›</span>
            </button>
          ) : (
            <span />
          )}
        </nav>
      </div>
    </dialog>,
    document.body,
  );
}
