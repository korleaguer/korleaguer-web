import type { ReactNode } from "react";

interface Props {
  title: string;
  /** 제목 오른쪽에 붙는 작은 글씨 */
  aside?: ReactNode;
  children: ReactNode;
}

/** 제목이 붙은 카드 */
export default function Section({ title, aside, children }: Props) {
  return (
    <section className="overflow-hidden rounded-xl border border-line bg-surface">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-line px-4 py-2.5">
        <h2 className="text-sm font-bold">{title}</h2>
        {aside && <div className="text-xs text-muted">{aside}</div>}
      </div>
      {children}
    </section>
  );
}
