"use client"; // 누르면 아래 창을 열고 닫는 상태와 주소 기록이 있어서 클라이언트 컴포넌트다.

import { useRef, type ReactNode } from "react";
import BottomSheet from "@/components/BottomSheet";
import { useHistorySheet } from "@/lib/useHistorySheet";
import LinkArrow from "@/components/LinkArrow";

/** 창을 열며 쌓은 주소 기록 표시(history.state의 키). 다른 창들의 표시와 다르다 */
const HISTORY_STATE = "korleaguerHistorySheet";

/**
 * MLB 도전 카드의 '역대 포스팅 계약' 줄(사용자 11-12 결정: 매일 같은 목록이 늘 펼쳐져 있지 않게, 이슈 #326).
 * 줄 모양은 HistoryToggle과 같고(제목 + 흐린 둘째 줄 + 오른쪽 글자), 누르면 줄 아래로 펼쳐 카드를 밀어 내리는 대신
 * 아래에서 올라오는 창(640px 이상은 가운데 창)에 목록을 보인다. 그래서 오른쪽은 '펼치기'가 아니라 다른 곳을 연다는 '보기 ›'.
 * 목록(children)은 창이 열렸을 때만 그린다. 창 안 '달러·원화' 고르기(MoneyUnitScope)는 열 때마다 새로 시작한다.
 * 비시즌 홈 '시즌 기록' 표는 밑에 밀 내용이 없어 계속 HistoryToggle을 쓴다.
 */
export default function HistorySheetRow({
  title,
  sheetTitle = title,
  stateKey = HISTORY_STATE,
  hint,
  children,
  className = "mt-4 border-t border-line",
}: {
  title: string;
  /** 창 머리 제목. 줄 제목과 다를 때만(줄 제목에는 위 카드의 이름이 이미 있어 빼고, 창에서는 이름을 붙인다) */
  sheetTitle?: string;
  /** 주소 기록 표시 이름. 이 창 안에 다른 HistorySheetRow가 들어가면 서로 달라야 한다(같으면 바깥 창을 열 때 안쪽 창도 같이 열린다) */
  stateKey?: string;
  /** 둘째 줄. 금액처럼 아이폰에서 갈리면 안 되는 낱말은 Words로 감싸 넘긴다 */
  hint: ReactNode;
  /** 창 몸에 그릴 목록 */
  children: ReactNode;
  className?: string;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { open, openSheet, close } = useHistorySheet(stateKey, buttonRef);
  return (
    <div className={className}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="dialog"
        onClick={openSheet}
        className="@container press-soft flex w-full cursor-pointer items-center gap-3 py-3 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-label">{title}</span>
          {/* 둘째 줄은 보통 한 줄로 두고 넘치면 '…'. 줄이 17rem보다 좁으면(큰 글씨) 자르지 않고 다음 줄로 흘린다.
              2배에서 '1위 이정후 6…'만 남아 무엇이 들어 있는지 알 수 없었다(이슈 #264) */}
          <span className="mt-0.5 block truncate text-caption text-muted tabular-nums @max-[17rem]:whitespace-normal">{hint}</span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-0.5 text-label text-accent-ink">
          보기
          <LinkArrow />
        </span>
      </button>
      {open && (
        <BottomSheet title={sheetTitle} onClose={close}>
          {children}
        </BottomSheet>
      )}
    </div>
  );
}
