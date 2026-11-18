import type { Metadata } from "next";
import { getHome } from "@/lib/api";
import { formatAsOf } from "@/lib/format";
import { SITE_DESCRIPTION, SITE_NAME, shareMeta } from "@/lib/share";
import ApiErrorNotice from "@/components/ApiErrorNotice";
import DataBanners from "@/components/DataBanners";
import LoadingBlock from "@/components/LoadingBlock";
import MlbChallenge from "@/components/home/MlbChallenge";
import OffseasonPlayers from "@/components/home/OffseasonPlayers";
import SeasonFloors from "@/components/home/SeasonFloors";
import SeasonLeaders from "@/components/home/SeasonLeaders";
import SeasonStats from "@/components/home/SeasonStats";
import PageSuspense from "@/components/PageSuspense";

// 제목·설명은 layout 기본값. 공유 카드는 layout과 같고 주소(og:url)만 더한다(layout에 두지 않는 이유는 layout.tsx)
export const metadata: Metadata = shareMeta(SITE_NAME, SITE_DESCRIPTION, "/");

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
  // 데이터 기준 시각은 화면 맨 위 묶음 제목 옆에 한 번만 둔다(시즌 중 층, 비시즌 MLB 도전 카드, 이슈 #277).
  // 포스팅 선수가 없으면 MLB 도전 카드가 그려지지 않아(포스팅 없음·0명) 성적표가 맨 위다
  const asOf = formatAsOf(home.generatedAt);
  return (
    <div className="space-y-7">
      <DataBanners dataMode={home.dataMode} statsAvailable={home.statsAvailable} />
      {/* 비시즌: 층과 '시즌 1위' 카드 대신 선수 전원의 시즌 카드 */}
      {home.offseason ? (
        <>
          {/* 포스팅 시즌: 이번 겨울 MLB에 도전하는 KBO 선수와 선배들의 계약 시기 */}
          {home.posting && <MlbChallenge posting={home.posting} asOf={asOf} />}
          <OffseasonPlayers offseason={home.offseason} asOf={home.posting?.players.length ? undefined : asOf} />
        </>
      ) : (
        <>
          {/* 시즌 중: 선수들이 지금 어디서 뛰나(메이저·트리플A·부상 재활)를 층으로(이슈 #245) */}
          <SeasonFloors recent={home.recent} asOf={asOf} />
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
