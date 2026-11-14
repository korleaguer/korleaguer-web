import type { PlayerDetail } from "@/lib/api";
import { kboTeamColor, teamColor } from "@/lib/teams";
import InfoChips from "@/components/InfoChips";
import PlayerSubline from "@/components/PlayerSubline";
import MyPlayerToggle from "@/components/my/MyPlayerToggle";
import PhotoStage, { type Shot } from "@/components/player/PhotoStage";

/**
 * 선수 페이지 머리 카드. 위쪽 팀 색 띠에 흰 테두리 원형 사진이 걸치고, 아래에 이름 · 영문 이름 · 기본 정보 알약.
 * 사진 오른쪽에 '내 선수' 넣기 버튼. 띠 색은 globals.css의 .team-band가 정한다(다크 모드에서는 어두운 팀 색을 밝힌다).
 * 과거 소속팀(KBO) 시절 사진이 있으면 '소속팀 사진' 알약으로 넘겨 본다(오래된 팀 → 지금 팀, 처음에는 지금 팀).
 * 과거 소속팀 사진은 api가 MLB 사진과 같은 틀(배경 없음, 같은 얼굴 크기)로 맞춘 편집본이라 넘겨도 원 안 얼굴이 그대로다.
 */
export default function PlayerHeader({ player, isMine }: { player: PlayerDetail; isMine: boolean }) {
  const shots: Shot[] = [
    ...player.careerPhotos.map((c, i) => ({
      key: `past-${i}`,
      label: c.teamKo,
      years: c.years,
      photoUrl: c.photoUrl,
      color: kboTeamColor(c.teamKo),
      // 옛 api는 KBO 원본(배경 있는 증명사진, /photos/kbo-…)을 줬다
      frame: c.photoUrl.startsWith("/photos/kbo-") ? ("cover" as const) : ("silo" as const),
    })),
    {
      key: "now",
      label: player.teamKo ?? "지금",
      years: null,
      photoUrl: player.photoUrl,
      color: teamColor(player.teamAbbr),
      frame: "silo" as const,
    },
  ];

  return (
    <section aria-labelledby="player-name" className="card overflow-hidden">
      <PhotoStage
        nameKo={player.nameKo}
        shots={shots}
        initial={shots.length - 1}
        toggle={<MyPlayerToggle playerId={player.id} nameKo={player.nameKo} initialOn={isMine} variant="pill" />}
      >
        <h1 id="player-name" className="mt-2 text-display">
          {player.nameKo}
        </h1>
        <PlayerSubline player={player} className="mt-0.5" />
        <InfoChips player={player} className="mt-3" />
      </PhotoStage>
    </section>
  );
}
