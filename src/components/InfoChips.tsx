import type { PlayerSummary } from "@/lib/api";
import { formatAge } from "@/lib/format";
import LevelChip from "./LevelChip";
import TeamName from "./TeamName";

const CHIP =
  "inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-[0.8125rem] font-semibold leading-5 text-neutral-pill-fg";

/**
 * 선수 기본 정보 알약: 메이저·마이너 · 팀(로고) · 포지션 · 나이. 값이 없는 칸은 뺀다. 하나도 없으면 그리지 않는다.
 * 등번호는 덜 중요한 정보라 알약 대신 영문 이름 옆(PlayerSubline)에 둔다.
 */
export default function InfoChips({ player, className = "" }: { player: PlayerSummary; className?: string }) {
  const age = formatAge(player.age);
  if (!player.level && !player.teamKo && !player.positionKo && !age) return null;

  return (
    <ul className={`flex flex-wrap gap-1.5 ${className}`}>
      <LevelChip player={player} as="li" />
      {player.teamKo && (
        <li className={CHIP}>
          {/* FA·국내 복귀 선수의 팀 칸은 마지막 MLB 팀이라 '전'을 붙인다('FA' 옆 '애틀랜타'는 아직 소속처럼 읽혔다, 점검 11-13) */}
          <TeamName
            teamKo={player.teamKo}
            teamAbbr={player.teamAbbr}
            prefix={player.freeAgent || player.returnedKo ? "전" : undefined}
          />
        </li>
      )}
      {player.positionKo && <li className={CHIP}>{player.positionKo}</li>}
      {age && <li className={CHIP}>{age}</li>}
    </ul>
  );
}
