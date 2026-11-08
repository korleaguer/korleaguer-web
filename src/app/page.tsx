import { Suspense } from "react";
import { getHome } from "@/lib/api";
import { formatDate, formatTime } from "@/lib/format";
import ApiErrorNotice from "@/components/ApiErrorNotice";
import DataBanners from "@/components/DataBanners";
import LoadingBlock from "@/components/LoadingBlock";
import Leaderboard from "@/components/home/Leaderboard";
import RecentGames from "@/components/home/RecentGames";
import SeasonStats from "@/components/home/SeasonStats";

// 홈 화면. 데이터는 요청마다 api에서 새로 받는다.
export default function HomePage() {
  return (
    <>
      {/* 눈에는 안 보이고 화면 낭독기만 읽는 페이지 제목 */}
      <h1 className="sr-only">코리거 — 한국 MLB 선수 경기 기록</h1>
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
  const meta = `${home.season} 시즌 · 기준 ${formatDate(home.generatedAt)} ${formatTime(home.generatedAt)}`;
  return (
    <div className="space-y-8">
      <DataBanners dataMode={home.dataMode} statsAvailable={home.statsAvailable} />
      {/* 넓은 화면: 1줄 = 최근 경기 제목, 2줄 = 최근 경기 목록 | 순위판 */}
      <div className="grid gap-y-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:grid-rows-[auto_auto] lg:gap-x-6 lg:gap-y-3">
        <RecentGames recent={home.recent} meta={meta} className="lg:row-span-2" />
        <div className="lg:col-start-2 lg:row-start-2">
          <Leaderboard statsAvailable={home.statsAvailable} hitters={home.hitters} />
        </div>
      </div>
      <SeasonStats
        season={home.season}
        statsAvailable={home.statsAvailable}
        hitters={home.hitters}
        pitchers={home.pitchers}
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
