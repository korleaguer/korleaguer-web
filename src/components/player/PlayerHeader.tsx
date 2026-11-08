import type { CSSProperties } from "react";
import type { PlayerDetail } from "@/lib/api";
import { teamColor } from "@/lib/teams";
import InfoChips from "@/components/InfoChips";
import PlayerAvatar from "@/components/PlayerAvatar";

/**
 * 선수 페이지 머리 카드. 위쪽 팀 색 띠에 흰 테두리 원형 사진이 걸치고, 아래에 이름 · 영문 이름 · 기본 정보 알약.
 * 띠 색은 globals.css의 .team-band가 정한다(다크 모드에서는 어두운 팀 색을 밝힌다).
 */
export default function PlayerHeader({ player }: { player: PlayerDetail }) {
  const color = teamColor(player.teamAbbr);

  return (
    <section aria-labelledby="player-name" className="card overflow-hidden">
      <div aria-hidden className="team-band h-[68px]" style={{ "--team": color } as CSSProperties} />
      <div className="-mt-11 px-4 pb-4 sm:px-5 sm:pb-5">
        <PlayerAvatar
          size={96}
          ring
          nameKo={player.nameKo}
          photoUrl={player.photoUrl}
          teamAbbr={player.teamAbbr}
        />
        <h1 id="player-name" className="mt-2 text-2xl font-extrabold leading-tight tracking-[-0.02em]">
          {player.nameKo}
        </h1>
        {player.nameEn && (
          <p className="mt-0.5 text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-muted">
            {player.nameEn}
          </p>
        )}
        <InfoChips player={player} className="mt-3" />
      </div>
    </section>
  );
}
