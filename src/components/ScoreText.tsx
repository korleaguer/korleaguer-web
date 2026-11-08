import type { GameLine } from "@/lib/api";
import { formatScore } from "@/lib/format";

/** 점수 "5 - 3". 화면 낭독기는 "5 대 3"으로 읽는다. 경기 전이라 점수가 없으면 그리지 않는다. */
export default function ScoreText({
  line,
  className = "",
}: {
  line: Pick<GameLine, "teamScore" | "opponentScore">;
  className?: string;
}) {
  const score = formatScore(line);
  if (score == null) return null;
  return (
    <span className={`tabular-nums ${className}`}>
      <span aria-hidden>{score}</span>
      <span className="sr-only">{`${line.teamScore} 대 ${line.opponentScore}`}</span>
    </span>
  );
}
