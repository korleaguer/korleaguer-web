import type { CSSProperties } from "react";
import { textColorOn } from "@/lib/teams";

/** 동그라미 안에 쓸 이름 두 글자(이정후 → 정후). 두 글자 이름은 그대로 */
export function shortName(nameKo: string): string {
  return nameKo.length <= 2 ? nameKo : nameKo.slice(-2);
}

/**
 * 포스팅으로 계약한 선수 동그라미: 계약한 MLB 구단 색 + 이름 두 글자.
 * MLB 도전 카드의 한 줄 그래프와 그 아래 계약 목록이 같은 모양을 써서, 그래프의 동그라미가 누구인지 목록에서 바로 짝지어진다.
 * 올해 계약한 포스팅 선수는 바깥에 초록 테두리(계약 = 초록)를 한 겹 더 두른다.
 */
export function PostingDot({
  nameKo,
  color,
  thisYear,
  size,
}: {
  nameKo: string;
  color: string;
  thisYear: boolean;
  size: number;
}) {
  return (
    <span
      aria-hidden
      className="posting-dot grid shrink-0 place-items-center rounded-full font-extrabold leading-none tracking-[-0.04em]"
      style={
        {
          "--dot": color,
          width: size,
          height: size,
          color: textColorOn(color),
          fontSize: Math.round(size * 0.37),
          boxShadow: thisYear
            ? "0 0 0 2px var(--surface), 0 0 0 4px var(--success-fg)"
            : "0 0 0 2px var(--surface)",
        } as CSSProperties
      }
    >
      {shortName(nameKo)}
    </span>
  );
}
