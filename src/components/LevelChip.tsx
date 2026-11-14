import type { PlayerSummary } from "@/lib/api";

/**
 * 메이저·마이너·FA 알약. 메이저는 파란 점 + "메이저", 마이너는 빈 점 + "마이너 · 팀 이름",
 * FA는 보라 알약(소속이 바뀌는 일의 색) + 점선 빈 점 + "FA".
 * 국내 리그로 돌아간 선수는 회색 알약 + 회색 점 + "LG 트윈스 복귀"(이제 해외에서 뛰지 않는다: '시즌 끝'처럼 조용히).
 * 모르면 그리지 않는다. 같은 줄의 다른 알약(팀·포지션)과 크기를 맞춘다.
 */
export default function LevelChip({
  player,
  as: Tag = "span",
  className = "",
}: {
  player: Pick<PlayerSummary, "level" | "levelTeam" | "freeAgent" | "returnedKo">;
  as?: "span" | "li";
  className?: string;
}) {
  if (player.returnedKo) {
    return (
      <Tag
        className={`inline-flex min-w-0 items-center gap-1.5 rounded-full bg-neutral-pill px-2.5 py-1 text-label text-neutral-pill-fg ${className}`}
      >
        <span aria-hidden className="size-2 shrink-0 rounded-full bg-muted" />
        <span className="truncate">{`${player.returnedKo} 복귀`}</span>
      </Tag>
    );
  }
  if (player.freeAgent) {
    return (
      <Tag
        className={`inline-flex min-w-0 items-center gap-1.5 rounded-full bg-fa-bg px-2.5 py-1 text-label text-fa-fg ${className}`}
      >
        <span aria-hidden className="size-2 shrink-0 rounded-full border-[1.5px] border-dashed border-fa-fg" />
        <span className="truncate">FA</span>
      </Tag>
    );
  }
  if (!player.level) return null;
  const minors = player.level === "MINORS";

  return (
    <Tag
      className={`inline-flex min-w-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-label ${minors ? "bg-neutral-pill text-neutral-pill-fg" : "bg-surface-2 text-neutral-pill-fg"} ${className}`}
    >
      <span
        aria-hidden
        className={`size-2 shrink-0 rounded-full ${minors ? "border-[1.5px] border-neutral-pill-fg" : "bg-accent"}`}
      />
      <span className="truncate">
        {minors ? `마이너${player.levelTeam ? ` · ${player.levelTeam}` : ""}` : "메이저"}
      </span>
    </Tag>
  );
}
