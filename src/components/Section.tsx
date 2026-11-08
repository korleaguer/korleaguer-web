import type { ReactNode } from "react";

interface Props {
  title: string;
  /** 제목 오른쪽에 붙는 작은 글씨 */
  aside?: ReactNode;
  /** 제목의 id (aria-labelledby용) */
  id?: string;
  children: ReactNode;
}

/** 제목이 붙은 묶음. 제목은 카드 밖 회색 바탕 위에 두고, 내용은 아래 카드들이 맡는다. */
export default function Section({ title, aside, id, children }: Props) {
  return (
    <section aria-labelledby={id} className="min-w-0">
      <div className="mb-2.5 flex items-baseline justify-between gap-x-3 px-1">
        <h2 id={id} className="text-[1.1875rem] font-extrabold tracking-[-0.02em]">
          {title}
        </h2>
        {aside && <div className="shrink-0 text-xs text-muted tabular-nums">{aside}</div>}
      </div>
      {children}
    </section>
  );
}
