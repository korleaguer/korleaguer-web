import type { ReactNode } from "react";

/**
 * 선수 숫자 한 줄: '경기 · 판정 · 타율'(투수는 '등판 · 판정 · 평균자책점'). 칸이 좁으면(휴대폰) 모든 줄이 같은 꼴로
 * 첫 줄 '경기 · 타율', 둘째 줄 판정이고, 가까운 @container(26rem = 416px, 글자 배율을 따라간다)가 이보다 넓으면 한 줄이다
 * (사용자 11-21: 줄마다 다른 곳에서 꺾이면 같은 목록 카드가 들쭉날쭉하다). 칸 폭에 맞춰 줄바꿈이 정해지는 한 줄 글 대신
 * 항목마다 줄 자리를 정해 둔다. 항목은 눈으로 보는 순서와 낭독 순서(경기 → 판정 → 타율)가 같다.
 * '·'는 CSS로 앞 항목 끝에 붙여 줄 머리에 오지 않는다. 가까운 @container가 없으면(창 머리·오른쪽 칸) 좁은 꼴(두 줄)이다
 */
export default function StatLine({
  games,
  verdict,
  rate,
  className = "",
}: {
  games: ReactNode;
  verdict?: ReactNode;
  rate?: ReactNode;
  className?: string;
}) {
  // '·'는 앞 항목 끝에 붙인다(줄이 바뀔 때 점이 다음 줄 머리에 오지 않는다). 좁은 꼴(두 줄)은 판정이 둘째 줄이라 경기 뒤 점은 타율이 있을 때만
  const dotAfter = "after:mx-1 after:content-['·']";
  const gamesDot = rate != null ? dotAfter : verdict != null ? "@min-[26rem]:after:mx-1 @min-[26rem]:after:content-['·']" : "";
  return (
    <span className={`flex flex-wrap tabular-nums ${className}`}>
      {games != null && <span className={`whitespace-nowrap ${gamesDot}`}>{games}</span>}
      {verdict != null && (
        <span
          className={`order-last basis-full whitespace-nowrap @min-[26rem]:order-none @min-[26rem]:basis-auto ${rate != null ? "@min-[26rem]:after:mx-1 @min-[26rem]:after:content-['·']" : ""}`}
        >
          {verdict}
        </span>
      )}
      {rate != null && <span className="whitespace-nowrap">{rate}</span>}
    </span>
  );
}
