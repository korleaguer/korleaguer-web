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
  level = 2,
}: {
  emoji: string;
  title: string;
  detail?: ReactNode;
  /** 다음에 할 일 버튼. 글은 누르면 무엇이 되는지 보이게("다시 불러오기", "홈으로 가기") */
  action?: ReactNode;
  /** 오류면 true: 화면 낭독기가 바로 읽는다 */
  alert?: boolean;
  /**
   * 제목 단계. 이 안내가 화면을 통째로 대신해 다른 h1이 없으면(없는 주소·선수·기사, 화면 오류) 1, 제목(h1)이 있는 화면 안의
   * 빈·오류 안내면 2(기본). 기본을 1로 두면 h1이 둘이 되어 앱 머리글 가운데 제목(HeaderTitle, main의 첫 h1)이 엉뚱한 글을 잡는다
   */
  level?: 1 | 2;
}) {
  // 보이는 제목은 제목 태그로(WCAG 1.3.1). 예전에는 <p>라 낭독기 제목 목록에 없었다(전수조사). 모양은 단계와 상관없이 같다
  const Heading = level === 1 ? "h1" : "h2";
  return (
    <div role={alert ? "alert" : undefined} className="card flex flex-col items-center px-5 py-10 text-center">
      {/* eslint-disable-next-line no-restricted-syntax -- 상태 안내 이모지(그림 글자, 40px) */}
      <span aria-hidden className="text-[2.5rem] leading-none">
        {emoji}
      </span>
      <Heading className="mt-4 text-heading">{title}</Heading>
      {detail != null && <p className="mt-1.5 text-body text-muted">{detail}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/**
 * StateNotice의 버튼 모양(회색 알약). 링크·버튼 어느 쪽에도 붙인다.
 * 버튼은 파랗게 칠하지 않는다(DESIGN.md The One Blue Rule, 이슈 #200). 기사 '원문 보기'와 같은 surface-2 바탕이다.
 * 고대비 모드(Windows)에서는 바탕이 지워져 글자만 남으므로 1px 테두리로 버튼 모양을 남긴다(링크로 쓸 때도)
 */
export const stateActionClass =
  "press inline-flex h-[max(2.75rem,44px)] items-center rounded-full bg-surface-2 px-5 text-button transition hover:bg-line forced-colors:border";
