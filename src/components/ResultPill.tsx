import type { GameResult } from "@/lib/api";

const STYLE = {
  W: "bg-accent text-accent-fg",
  L: "bg-neutral-pill text-neutral-pill-fg",
  T: "bg-neutral-pill text-foreground",
} as const;
const WORD = { W: "승", L: "패", T: "무" } as const;

/**
 * 팀 승패 알약: 승(채운 파랑) / 패·무(회색). 결과가 없으면(경기 전·중) 그리지 않는다. 상태 문구는 summary가 맡는다.
 * 화면 낭독기는 "팀 승"처럼 읽는다.
 */
export default function ResultPill({ result, className = "" }: { result: GameResult; className?: string }) {
  if (result === null) return null;
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-badge ${STYLE[result]} ${className}`}
    >
      <span className="sr-only">팀 </span>
      {WORD[result]}
    </span>
  );
}
