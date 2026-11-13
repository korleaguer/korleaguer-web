import type { ReactNode } from "react";

/**
 * 빈 화면·오류 화면(토스처럼): 큰 이모지 하나 + 제목 + 설명 한 줄 + 다음에 할 일 버튼.
 * 이모지는 그림이라 화면 낭독기는 건너뛴다. 한 화면에 이모지는 하나만 쓴다(앱인토스 그래픽 규칙).
 */
export default function StateNotice({
  emoji,
  title,
  detail,
  action,
  alert = false,
}: {
  emoji: string;
  title: string;
  detail?: ReactNode;
  /** 다음에 할 일 버튼. 글은 누르면 무엇이 되는지 보이게("다시 불러오기", "홈으로 가기") */
  action?: ReactNode;
  /** 오류면 true: 화면 낭독기가 바로 읽는다 */
  alert?: boolean;
}) {
  return (
    <div role={alert ? "alert" : undefined} className="card flex flex-col items-center px-5 py-10 text-center">
      <span aria-hidden className="text-[2.5rem] leading-none">
        {emoji}
      </span>
      <p className="mt-4 text-base font-bold">{title}</p>
      {detail != null && <p className="mt-1.5 text-sm text-muted">{detail}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/**
 * StateNotice의 버튼 모양(회색 알약). 링크·버튼 어느 쪽에도 붙인다.
 * 버튼은 파랗게 칠하지 않는다(DESIGN.md The One Blue Rule, 이슈 #200). 기사 '원문 보기'와 같은 surface-2 바탕이다
 */
export const stateActionClass =
  "press inline-flex h-11 items-center rounded-full bg-surface-2 px-5 text-[0.9375rem] font-bold transition hover:bg-line";
