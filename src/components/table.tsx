// 기록 표에서 같이 쓰는 칸(셀) 모양.
import type { ReactNode } from "react";

interface CellProps {
  children: ReactNode;
  /** 글자는 왼쪽, 숫자는 오른쪽 정렬 */
  align?: "left" | "right" | "center";
  className?: string;
}

const ALIGN = { left: "text-left", right: "text-right", center: "text-center" };

/** 열 제목 */
export function Th({
  children,
  align = "right",
  sticky,
  className = "",
}: CellProps & { sticky?: boolean }) {
  return (
    <th
      scope="col"
      className={`whitespace-nowrap border-b border-line bg-(--table-head-bg,var(--surface-2)) px-3 py-2 text-xs font-semibold text-muted ${ALIGN[align]} ${sticky ? "sticky left-0 z-10" : ""} ${className}`}
    >
      {children}
    </th>
  );
}

/** 행 제목(선수 이름 칸). 가로로 밀어도 고정된다. */
export function RowHeader({ children }: { children: ReactNode }) {
  return (
    <th
      scope="row"
      className="sticky left-0 z-10 whitespace-nowrap bg-(--table-bg,var(--surface)) px-3 py-2 text-left font-semibold"
    >
      {children}
    </th>
  );
}

/** 일반 칸. strong이면 1위 값으로 금색 굵게 표시하고, 화면 낭독기에는 "(1위)"를 읽어 준다. */
export function Td({
  children,
  align = "right",
  strong,
  className = "",
}: CellProps & { strong?: boolean }) {
  return (
    <td
      className={`whitespace-nowrap px-3 py-2 ${ALIGN[align]} ${strong ? "font-bold text-gold-ink" : ""} ${className}`}
    >
      {children}
      {strong && <span className="sr-only"> (1위)</span>}
    </td>
  );
}

/**
 * 표가 화면보다 넓으면 표 안에서만 가로로 밀린다(페이지 전체는 밀리지 않음). 밀 내용이 남으면 오른쪽 끝에 그림자가 진다.
 * relative가 없으면 칸 안의 sr-only(position: absolute) 글자가 스크롤 영역 밖으로 빠져나와 페이지가 가로로 밀린다.
 * 표 바탕색은 부모가 --table-bg / --table-head-bg로 바꿀 수 있다(기본은 흰 면).
 */
export function TableScroll({ children }: { children: ReactNode }) {
  return (
    <div className="table-scroll relative overflow-x-auto">
      <table className="w-full border-collapse text-sm tabular-nums">{children}</table>
    </div>
  );
}
