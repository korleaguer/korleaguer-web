import type { HitterSeason, PitcherSeason, PlayerSummary } from "@/lib/api";
import { formatEra, formatRate } from "@/lib/format";

/** 기록 한 칸(이름과 값) */
export interface Stat {
  label: string;
  value: string;
}

/**
 * 선수 한 명의 시즌 핵심 기록 세 칸(선수 목록 카드, 공유 미리보기 그림).
 * 타자끼리, 투수끼리 같은 칸이 같은 자리에 와서 나란히 비교할 수 있다. 기록이 없으면 null
 */
export function seasonStats(
  player: Pick<PlayerSummary, "role">,
  hitting: HitterSeason | null,
  pitching: PitcherSeason | null,
): Stat[] | null {
  if (player.role === "PITCHER") {
    return pitching
      ? [
          { label: "평균자책점", value: formatEra(pitching.era) },
          { label: "승-패", value: `${pitching.wins}-${pitching.losses}` },
          { label: "탈삼진", value: String(pitching.strikeouts) },
        ]
      : null;
  }
  return hitting
    ? [
        { label: "타율", value: formatRate(hitting.avg) },
        { label: "홈런", value: String(hitting.homeRuns) },
        { label: "OPS", value: formatRate(hitting.ops) },
      ]
    : null;
}
