import type { Metadata } from "next";
import { Suspense } from "react";
import { getHome, getPlayers } from "@/lib/api";
import { readMyPlayers } from "@/lib/myPlayers";
import ApiErrorNotice from "@/components/ApiErrorNotice";
import DataBanners from "@/components/DataBanners";
import LoadingBlock from "@/components/LoadingBlock";
import PlayerCard from "@/components/players/PlayerCard";
import { shareMeta } from "@/lib/share";

// <title>: "선수 · KOR Leaguer" (뒷부분은 layout의 template이 붙인다)
const DESCRIPTION = "한국 MLB 선수 모아보기. 선수별 시즌 성적을 한눈에 봅니다.";

export const metadata: Metadata = {
  title: "선수",
  description: DESCRIPTION,
  ...shareMeta("선수 · KOR Leaguer", DESCRIPTION),
};

// 선수 목록. 데이터는 요청마다 api에서 새로 받는다.
export default function PlayersPage() {
  return (
    <div className="space-y-4">
      <h1 className="px-1 text-2xl font-extrabold tracking-[-0.02em]">선수</h1>
      <Suspense fallback={<LoadingBlock rows={6} />}>
        <PlayersContent />
      </Suspense>
    </div>
  );
}

async function PlayersContent() {
  // 목록은 /api/players, 시즌 성적은 /api/home에서 받아 playerId로 합친다.
  const [playersResult, homeResult, myIds] = await Promise.all([getPlayers(), getHome(), readMyPlayers()]);
  if (!playersResult.ok) return <ApiErrorNotice failure={playersResult.failure} />;
  if (!homeResult.ok) return <ApiErrorNotice failure={homeResult.failure} />;

  const players = playersResult.data;
  const home = homeResult.data;
  const hitters = new Map(home.hitters.map((h) => [h.playerId, h]));
  const pitchers = new Map(home.pitchers.map((p) => [p.playerId, p]));

  return (
    <div className="space-y-4">
      <DataBanners dataMode={home.dataMode} statsAvailable={home.statsAvailable} />
      <p className="px-1 text-sm font-medium text-muted">{`${players.length}명 · ${home.season} 시즌 기록`}</p>
      {players.length === 0 ? (
        <p className="card px-5 py-10 text-center text-sm text-muted">
          아직 등록된 선수가 없습니다.
        </p>
      ) : (
        <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {players.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              hitting={hitters.get(player.id) ?? null}
              pitching={pitchers.get(player.id) ?? null}
              isMine={myIds.includes(player.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
