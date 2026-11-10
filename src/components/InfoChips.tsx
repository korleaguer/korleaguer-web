import type { PlayerSummary } from "@/lib/api";
import { formatAge } from "@/lib/format";
import LevelChip from "./LevelChip";
import TeamName from "./TeamName";

const CHIP =
  "inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-[0.8125rem] font-semibold leading-5 text-neutral-pill-fg";

/** 선수 기본 정보 알약: 메이저·마이너 · 팀(로고) · 포지션 · 등번호 · 나이. 값이 없는 칸은 뺀다. 하나도 없으면 그리지 않는다. */
export default function InfoChips({ player, className = "" }: { player: PlayerSummary; className?: string }) {
  const age = formatAge(player.age);
  if (!player.level && !player.teamKo && !player.positionKo && !player.jersey && !age) return null;

  return (
    <ul className={`flex flex-wrap gap-1.5 ${className}`}>
      <LevelChip player={player} as="li" />
      {player.teamKo && (
        <li className={CHIP}>
          <TeamName teamKo={player.teamKo} teamAbbr={player.teamAbbr} />
        </li>
      )}
      {player.positionKo && <li className={CHIP}>{player.positionKo}</li>}
      {player.jersey && (
        <li className={CHIP}>
          {/* 한 덩어리로 감싸야 칩의 gap이 "#"과 숫자 사이에 끼지 않는다 */}
          <span>
            <span className="sr-only">등번호 </span>
            <span aria-hidden>#</span>
            {player.jersey}
          </span>
        </li>
      )}
      {age && <li className={CHIP}>{age}</li>}
    </ul>
  );
}
