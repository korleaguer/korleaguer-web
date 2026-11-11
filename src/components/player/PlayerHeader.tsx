import type { CSSProperties } from "react";
import type { PlayerDetail } from "@/lib/api";
import { teamColor } from "@/lib/teams";
import InfoChips from "@/components/InfoChips";
import PlayerSubline from "@/components/PlayerSubline";
import PlayerAvatar from "@/components/PlayerAvatar";
import MyPlayerToggle from "@/components/my/MyPlayerToggle";

/**
 * 선수 페이지 머리 카드. 위쪽 팀 색 띠에 흰 테두리 원형 사진이 걸치고, 아래에 이름 · 영문 이름 · 기본 정보 알약.
 * 사진 오른쪽에 '내 선수' 넣기 버튼. 띠 색은 globals.css의 .team-band가 정한다(다크 모드에서는 어두운 팀 색을 밝힌다).
 */
export default function PlayerHeader({ player, isMine }: { player: PlayerDetail; isMine: boolean }) {
  const color = teamColor(player.teamAbbr);

  return (
    <section aria-labelledby="player-name" className="card overflow-hidden">
      <div aria-hidden className="team-band h-[68px]" style={{ "--team": color } as CSSProperties} />
      <div className="-mt-11 px-4 pb-4 sm:px-5 sm:pb-5">
        <div className="flex items-end justify-between gap-3">
          <PlayerAvatar
            size={96}
            ring
            nameKo={player.nameKo}
            photoUrl={player.photoUrl}
            teamAbbr={player.teamAbbr}
          />
          <MyPlayerToggle playerId={player.id} nameKo={player.nameKo} initialOn={isMine} variant="pill" />
        </div>
        <h1 id="player-name" className="mt-2 text-2xl font-extrabold leading-tight tracking-[-0.02em]">
          {player.nameKo}
        </h1>
        <PlayerSubline player={player} className="mt-0.5" />
        <InfoChips player={player} className="mt-3" />
      </div>
    </section>
  );
}
