import type { RosterMove } from "@/lib/api";
import { moveTone } from "@/lib/moves";

/**
 * 이동 알약(이동 기록 칸·경기 달력 아래 그달 이동 줄). 색은 lib/moves.
 * 위기(부상자 명단·DFA·방출·출장 정지)는 회색 알약 앞에 빨간 점을 둔다: 빨강은 점에만 쓰고 글자는 본문색이라
 * '좋은 활약' 주황 알약과 색만으로 헷갈리지 않는다(사용자 11-17 '추천대로'). 점은 그림이라 화면 낭독기는 이름만 읽는다.
 */
export default function MovePill({ move, className = "" }: { move: RosterMove; className?: string }) {
  const tone = moveTone(move);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full py-0.5 text-badge ${tone.className} ${className}`}>
      {tone.setback && <span aria-hidden className="size-[7px] shrink-0 rounded-full bg-danger-fg" />}
      {move.labelKo}
    </span>
  );
}
