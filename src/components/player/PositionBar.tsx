/** 막대 크기: 선수 화면 줄(md)과 홈 성적표 작은 판(sm, 글자처럼 한 단계 작다). Tailwind가 읽게 클래스를 통째로 적는다 */
const SIZE = {
  md: { track: "h-2.5" },
  sm: { track: "h-2" },
} as const;

/**
 * 'MLB 중 위치' 막대 하나: 바탕(0~100) · 채움(둥근 끝, 손잡이 점 없음). 선수 화면 'MLB 타자(투수) 중에서'(LeaguePosition)와
 * 홈 성적표 펼친 곳 작은 판(LeaguePositionCompact)이 같이 쓴다. 두 곳에서 따로 그리던 때는 선수 화면만 고쳐져서, 작은 판은
 * 끝이 안 보이는 바탕·고대비 표시 없음 그대로였다(PR #290 리뷰).
 * 줄 안의 자리(좁은 칸에서 아래 줄로 내리기 등)는 줄마다 달라 className으로 받는다.
 */
export default function PositionBar({
  pct,
  size,
  className = "",
}: {
  /** 1~99(높을수록 좋다). 견줄 선수가 아직 없으면 null(바탕만) */
  pct: number | null;
  size: keyof typeof SIZE;
  className?: string;
}) {
  const top = pct != null && pct >= 50;
  const { track } = SIZE[size];
  return (
    // 바탕은 옅은 안쪽 테두리로 0~100 양 끝을 보인다(흰 카드 위 surface-2만으로는 막대 끝이 거의 안 보였다).
    // data-bar·data-bar-track: 고대비 모드(Windows)에서는 바탕색이 지워져 막대가 사라져서 시스템 색으로 다시 칠한다(globals.css)
    <div aria-hidden data-bar-track className={`relative ${track} rounded-full bg-surface-2 ring-1 ring-muted/30 ring-inset ${className}`}>
      {pct != null && (
        <span
          data-bar={top ? "" : "dim"}
          className={`absolute inset-y-0 left-0 rounded-full ${top ? "bg-accent" : "bg-muted/40"}`}
          style={{ width: `${pct}%` }}
        />
      )}
    </div>
  );
}
