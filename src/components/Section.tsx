import type { ReactNode } from "react";

interface Props {
  title: string;
  /** 제목 오른쪽에 붙는 작은 글씨 */
  aside?: ReactNode;
  /**
   * true면 흰 면 없이 페이지 바탕 위에 바로 놓는다(홈 순위판·시즌 성적).
   * 홈에서 흰 면은 최근 경기 목록 하나만 쓴다.
   */
  plain?: boolean;
  children: ReactNode;
}

/** 제목이 붙은 묶음. 기본은 테두리 없는 흰 면이고, 바탕색 차이로만 구분한다. */
export default function Section({ title, aside, plain = false, children }: Props) {
  return (
    <section className={plain ? "min-w-0" : "overflow-hidden rounded-[10px] bg-surface"}>
      <div
        className={`flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 ${plain ? "pb-2" : "px-4 pb-2 pt-4"}`}
      >
        <h2 className="text-base font-bold">{title}</h2>
        {aside && <div className="text-xs text-muted">{aside}</div>}
      </div>
      {children}
    </section>
  );
}
