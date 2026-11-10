import { Suspense } from "react";
import { getHome } from "@/lib/api";
import { formatDate, formatTime } from "@/lib/format";
import ApiErrorNotice from "@/components/ApiErrorNotice";
import DataBanners from "@/components/DataBanners";
import LoadingBlock from "@/components/LoadingBlock";
import RecentGames from "@/components/home/RecentGames";
import SeasonLeaders from "@/components/home/SeasonLeaders";
import SeasonStats from "@/components/home/SeasonStats";

// 홈 화면. 데이터는 요청마다 api에서 새로 받는다.
export default function HomePage() {
  return (
    <>
      {/* 눈에는 안 보이고 화면 낭독기만 읽는 페이지 제목 */}
      <h1 className="sr-only">KOR Leaguer — 한국 MLB 선수 경기 기록</h1>
      <Suspense fallback={<HomeLoading />}>
        <HomeContent />
      </Suspense>
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
      <RecentGames recent={home.recent} asOf={asOf} />
      <SeasonLeaders
        season={home.season}
        statsAvailable={home.statsAvailable}
        ranking={home.ranking}
        hitters={home.hitters}
      />
      <SeasonStats
        season={home.season}
        statsAvailable={home.statsAvailable}
        ranking={home.ranking}
        hitters={home.hitters}
        pitchers={home.pitchers}
        minorHitters={home.minorHitters}
        minorPitchers={home.minorPitchers}
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
