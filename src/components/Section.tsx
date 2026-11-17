import type { ReactNode } from "react";

interface Props {
  title: string;
  /** 제목 오른쪽에 붙는 작은 글씨 */
  aside?: ReactNode;
  /** 제목의 id (aria-labelledby용) */
  id?: string;
  /**
   * 묶음 요소. 기본은 이름 붙은 영역(section). 본문 옆 보조 칸(선수 화면 PC 오른쪽 '기사')은 aside로 그려 보조 영역(complementary)이
   * 된다. 바깥을 aside로 감싸면 안의 section과 같은 이름의 영역이 둘 겹쳐서, 이 요소 하나를 바꾼다
   */
  as?: "section" | "aside";
  children: ReactNode;
}

/** 제목이 붙은 묶음. 제목은 카드 밖 회색 바탕 위에 두고, 내용은 아래 카드들이 맡는다. */
export default function Section({ title, aside, id, as: Tag = "section", children }: Props) {
  return (
    <Tag aria-labelledby={id} className="min-w-0">
      {/* 자리가 모자라면(큰 글씨 등) 오른쪽 작은 글씨가 다음 줄로 내려간다. 제목이 낱말마다 쪼개지지 않게 */}
      <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 px-1">
        <h2 id={id} className="text-title">
          {title}
        </h2>
        {aside && <div className="shrink-0 text-caption text-muted tabular-nums">{aside}</div>}
      </div>
      {children}
    </Tag>
  );
}
