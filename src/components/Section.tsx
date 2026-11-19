import type { ReactNode } from "react";
import Words from "@/components/Words";

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
      {/* 자리가 모자라면(큰 글씨 등) 오른쪽 작은 글씨가 다음 줄로 내려간다. 제목이 낱말마다 쪼개지지 않게.
          내려가서도 줄보다 길면(앱 큰 글씨 2배의 '잘한 순 · 기준 …'은 375px 화면에서 약 349px, 줄은 311px) 줄 폭 안에서
          띄어쓰기마다 줄을 바꾼다. 전에는 줄지 않아 화면 밖으로 넘쳤다. 줄을 나눌 때는 줄기 전 폭을 보므로 제목과 한 줄에
          들어가던 배치는 그대로다 */}
      <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 px-1">
        <h2 id={id} className="text-title">
          {title}
        </h2>
        {aside && (
          <div className="max-w-full shrink-0 text-caption text-muted tabular-nums">
            {typeof aside === "string" ? <Words text={aside} /> : aside}
          </div>
        )}
      </div>
      {children}
    </Tag>
  );
}
