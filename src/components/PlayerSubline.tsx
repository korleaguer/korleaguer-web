import type { PlayerSummary } from "@/lib/api";

/**
 * 한글 이름 아래 작고 흐린 줄: 영문 이름 · 등번호 ("JUNG HOO LEE · #51").
 * 등번호는 팀·포지션처럼 자주 찾는 정보가 아니라서 정보 알약 대신 여기에 둔다.
 * 좁은 칸에서는 영문 이름만 말줄임되고 등번호는 남는다. 둘 다 없으면 그리지 않는다.
 */
export default function PlayerSubline({
  player,
  className = "",
}: {
  player: Pick<PlayerSummary, "nameEn" | "jersey">;
  className?: string;
}) {
  const { nameEn, jersey } = player;
  if (!nameEn && !jersey) return null;

  return (
    <p
      className={`flex min-w-0 gap-1 text-micro uppercase tracking-[0.08em] text-muted ${className}`}
    >
      {nameEn && <span className="truncate">{nameEn}</span>}
      {nameEn && jersey && <span aria-hidden>·</span>}
      {jersey && (
        // 한 덩어리로 감싸야 줄의 gap이 "#"과 숫자 사이에 끼지 않는다
        <span className="shrink-0 tabular-nums">
          <span className="sr-only">등번호 </span>
          <span aria-hidden>#</span>
          {jersey}
        </span>
      )}
    </p>
  );
}
