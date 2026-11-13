import { getHome } from "@/lib/api";
import { formatDate, formatTime } from "@/lib/format";
import ApiErrorNotice from "@/components/ApiErrorNotice";
import DataBanners from "@/components/DataBanners";
import LoadingBlock from "@/components/LoadingBlock";
import MlbChallenge from "@/components/home/MlbChallenge";
import OffseasonPlayers from "@/components/home/OffseasonPlayers";
import RecentGames from "@/components/home/RecentGames";
import SeasonLeaders from "@/components/home/SeasonLeaders";
import SeasonStats from "@/components/home/SeasonStats";
import PageSuspense from "@/components/PageSuspense";

// 홈 화면. 데이터는 요청마다 api에서 새로 받는다.
export default function HomePage() {
  return (
    <>
      {/* 눈에는 안 보이고 화면 낭독기만 읽는 페이지 제목 */}
      <h1 className="sr-only">KOR Leaguer — 해외파 한국 선수 기록 모아보기</h1>
      <PageSuspense fallback={<HomeLoading />}>
        <HomeContent />
      </PageSuspense>
    </>
  );
}

async function HomeContent() {
  const result = await getHome();
  if (!result.ok) return <ApiErrorNotice failure={result.failure} />;

  const home = result.data;
  const asOf = `기준 ${formatDate(home.generatedAt)} ${formatTime(home.generatedAt)}`;
  return (
    <div className="space-y-7">
      <DataBanners dataMode={home.dataMode} statsAvailable={home.statsAvailable} />
      {/* 비시즌: 지난 경기 한 줄과 '시즌 1위' 카드 대신 선수 전원의 시즌 카드 */}
      {home.offseason ? (
        <>
          {/* 포스팅 시즌: 이번 겨울 MLB에 도전하는 KBO 선수와 선배들의 계약 시기 */}
          {home.posting && <MlbChallenge posting={home.posting} />}
          <OffseasonPlayers offseason={home.offseason} />
        </>
      ) : (
        <>
          <RecentGames recent={home.recent} asOf={asOf} />
          <SeasonLeaders
            season={home.season}
            statsAvailable={home.statsAvailable}
            ranking={home.ranking}
            hitters={home.hitters}
          />
        </>
      )}
      <SeasonStats
        season={home.season}
        statsAvailable={home.statsAvailable}
        ranking={home.ranking}
        hitters={home.hitters}
        pitchers={home.pitchers}
        minorHitters={home.minorHitters}
        minorPitchers={home.minorPitchers}
        folded={home.offseason != null}
      />
    </div>
  );
}

function HomeLoading() {
  return (
    <div className="space-y-4">
      <LoadingBlock rows={6} />
      <LoadingBlock rows={4} />
    </div>
  );
}
