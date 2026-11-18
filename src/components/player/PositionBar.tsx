/** 막대 크기: 선수 화면 줄(md)과 홈 성적표 작은 판(sm, 글자처럼 한 단계 작다). Tailwind가 읽게 클래스를 통째로 적는다 */
const SIZE = {
  md: { track: "h-2", dot: "size-4" },
  sm: { track: "h-1.5", dot: "size-3" },
} as const;

/**
 * 'MLB 중 위치' 막대 하나: 바탕(0~100) · 채움 · 가운데 선(MLB 중간) · 점. 선수 화면 'MLB 타자(투수) 중에서'(LeaguePosition)와
 * 홈 성적표 펼친 곳 작은 판(LeaguePositionCompact)이 같이 쓴다. 두 곳에서 따로 그리던 때는 선수 화면만 고쳐져서, 작은 판은
 * 바탕과 거의 같은 색 1px 가운데 선(채움 밑이라 파랑에 덮임)·끝이 안 보이는 바탕·고대비 표시 없음 그대로였다(PR #290 리뷰).
 * 줄 안의 자리(좁은 칸에서 아래 줄로 내리기 등)는 줄마다 달라 className으로 받는다.
 */
export default function PositionBar({
  pct,
  size,
  className = "",
}: {
  /** 1~99(높을수록 좋다). 견줄 선수가 아직 없으면 null(바탕과 가운데 선만) */
  pct: number | null;
  size: keyof typeof SIZE;
  className?: string;
}) {
  const top = pct != null && pct >= 50;
  const { track, dot } = SIZE[size];
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
      {/* 가운데 선(MLB 중간): 각주가 읽으라고 하는 기준선이라 바탕 대비 3:1이 되게 muted 70%로, 파랑 채움 위에서도 보이게
          채움 위에 카드색 1px 테두리를 둘러 그린다. 점보다는 아래라 점이 가운데 근처면 점이 선을 덮는다.
          선 폭(w-0.5)이 rem이라 큰 글씨에서 굵어져도 막대 가운데에 오게 제 폭의 반만큼 당긴다(-ml-px로 1px만 당기면 2배에서 4px 선이
          가운데보다 1px 오른쪽이었다) */}
      <span data-bar="dim" className="absolute inset-y-[-3px] left-1/2 w-0.5 -translate-x-1/2 bg-muted/70 ring-1 ring-surface" />
      {pct != null && (
        <span
          data-bar={top ? "" : "dim"}
          className={`absolute top-1/2 ${dot} -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface ${top ? "bg-accent" : "bg-muted"}`}
          style={{ left: `${pct}%` }}
        />
      )}
    </div>
  );
}
