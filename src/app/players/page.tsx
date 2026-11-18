import type { Metadata } from "next";
import { getHome, getPlayers } from "@/lib/api";
import { formatAsOf } from "@/lib/format";
import { readMyPlayers } from "@/lib/myPlayers";
import ApiErrorNotice from "@/components/ApiErrorNotice";
import DataBanners, { StatsFailedBanner } from "@/components/DataBanners";
import { PlayersSkeleton } from "@/components/PageSkeleton";
import PlayerCard from "@/components/players/PlayerCard";
import StateNotice from "@/components/StateNotice";
import PageSuspense from "@/components/PageSuspense";
import { WordGroup } from "@/components/Words";
import { shareMeta, SITE_NAME } from "@/lib/share";

// <title>: "선수 · KOR Leaguer" (뒷부분은 layout의 template이 붙인다)
const TITLE = "선수";
const DESCRIPTION = "해외파 한국 선수 모아보기. 선수별 시즌 기록을 한눈에 봐요.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  ...shareMeta(`${TITLE} · ${SITE_NAME}`, DESCRIPTION, "/players"),
};

// 선수 목록. 데이터는 요청마다 api에서 새로 받는다.
export default function PlayersPage() {
  return (
    <div className="space-y-4">
      <h1 className="px-1 text-display">선수</h1>
      <PageSuspense fallback={<PlayersSkeleton />}>
        <PlayersContent />
      </PageSuspense>
    </div>
  );
}

async function PlayersContent() {
  // 목록은 /api/players, 시즌 성적은 /api/home에서 받아 playerId로 합친다.
  const [playersResult, homeResult, myIds] = await Promise.all([getPlayers(), getHome(), readMyPlayers()]);
  if (!playersResult.ok) return <ApiErrorNotice failure={playersResult.failure} />;
  const players = playersResult.data;
  // 시즌 기록(홈 api)만 못 받았으면 오류 화면으로 카드까지 버리지 않는다. 받은 선수 카드는 그리고(기록 칸 없이) 맨 위 띠로
  // 알린다(11-17 전수조사, 단계적 저하). 선수가 없으면 보여 줄 것이 없어 예전처럼 오류 안내다.
  // 카드 목록은 성공·실패가 같은 경로로 그린다(맨 위 띠와 개수 줄만 다르다). 따로 두면 칸·카드 속성을 고칠 때 한쪽만 고쳐진다
  if (!homeResult.ok && players.length === 0) return <ApiErrorNotice failure={homeResult.failure} />;
  const home = homeResult.ok ? homeResult.data : null;
  const hitters = new Map(home?.hitters.map((h) => [h.playerId, h]));
  const pitchers = new Map(home?.pitchers.map((p) => [p.playerId, p]));
  const minorHitters = new Map(home?.minorHitters.map((h) => [h.playerId, h]));
  const minorPitchers = new Map(home?.minorPitchers.map((p) => [p.playerId, p]));

  return (
    <div className="space-y-4">
      {home ? (
        <>
          <DataBanners dataMode={home.dataMode} statsAvailable={home.statsAvailable} />
          {/* 시즌 기록이 언제 것인지: 기록이 홈 응답에서 오므로 그 기준 시각(홈과 같은 꼴, 이슈 #277).
              기준 글은 한 덩어리로 줄을 넘기고 '·'는 '기준'에 붙여 줄 끝에 홀로 남지 않게 한다 */}
          <p className="px-1 text-meta text-muted">
            {`${players.length}명 · ${home.season} 시즌 기록 `}
            <WordGroup text={`·\u00a0${formatAsOf(home.generatedAt)}`} />
          </p>
        </>
      ) : (
        <>
          <StatsFailedBanner />
          <p className="px-1 text-meta text-muted">{`${players.length}명`}</p>
        </>
      )}
      {players.length === 0 ? (
        <StateNotice emoji="⚾" title="아직 등록된 선수가 없어요" detail="선수가 등록되면 여기에 선수마다 카드가 생겨요." />
      ) : (
        <ul
          // grid-cols-1: 칸 폭을 화면에 묶는다(기본 auto 칸은 큰 글씨에서 카드 내용만큼 넓어져 화면 밖으로 나간다)
          className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {players.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              hitting={hitters.get(player.id) ?? null}
              pitching={pitchers.get(player.id) ?? null}
              minorHitting={minorHitters.get(player.id) ?? null}
              minorPitching={minorPitchers.get(player.id) ?? null}
              statsMissing={!home}
              isMine={myIds.includes(player.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
