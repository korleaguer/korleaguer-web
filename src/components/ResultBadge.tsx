import type { GameResult } from "@/lib/api";

const BASE =
  "inline-flex h-6 min-w-9 shrink-0 items-center justify-center rounded-md px-1.5 text-xs font-bold";

/**
 * 팀 승패 표시: 승 / 패 / 무.
 * 결과가 없으면(경기 전·중 등) 중립 표시만 한다. 상태 문구는 summary가 맡는다.
 */
export default function ResultBadge({ result }: { result: GameResult }) {
  if (result === "W") return <span className={`${BASE} bg-win/15 text-win`}>승</span>;
  if (result === "L") return <span className={`${BASE} bg-loss/15 text-loss`}>패</span>;
  if (result === "T") return <span className={`${BASE} bg-surface-2 text-muted`}>무</span>;
  return (
    <span className={`${BASE} bg-surface-2 text-muted ring-1 ring-line`}>
      <span aria-hidden>–</span>
      <span className="sr-only">결과 없음</span>
    </span>
  );
}
