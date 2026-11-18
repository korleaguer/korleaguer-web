import { getHome } from "@/lib/api";
import { formatDate, formatTime } from "@/lib/format";
import ApiErrorNotice from "@/components/ApiErrorNotice";
import DataBanners from "@/components/DataBanners";
import LoadingBlock from "@/components/LoadingBlock";
import MlbChallenge from "@/components/home/MlbChallenge";
import OffseasonPlayers from "@/components/home/OffseasonPlayers";
import SeasonFloors, { preloadFloors } from "@/components/home/SeasonFloors";
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
  // 선수 목록을 /api/home과 함께 받기 시작한다(층·비시즌 성적표가 둘 다 쓴다, 전수조사 L309)
  preloadFloors();
  const result = await getHome();
  if (!result.ok) return <ApiErrorNotice failure={result.failure} />;

  const home = result.data;
  const asOf = `기준 ${formatDate(home.generatedAt)} ${formatTime(home.generatedAt)}`;
  return (
    <div className="space-y-7">
      <DataBanners dataMode={home.dataMode} statsAvailable={home.statsAvailable} />
      {/* 비시즌: 층과 '한국 선수 중 1위' 카드 대신 선수 전원의 시즌 카드 */}
      {home.offseason ? (
        <>
          {/* 포스팅 시즌: 이번 겨울 MLB에 도전하는 KBO 선수와 선배들의 계약 시기 */}
          {home.posting && <MlbChallenge posting={home.posting} />}
          <OffseasonPlayers offseason={home.offseason} />
        </>
      ) : (
        <>
          {/* 시즌 중: 선수들이 지금 어디서 뛰나(메이저·트리플A·부상 재활)를 층으로(이슈 #245).
              층은 따로 Suspense로 나누지 않는다(전수조사 L309 검토): 나누면 /api/my가 늦을 때 1위 카드·기록 표가 층 뼈대 아래 먼저
              그려졌다가 층이 들어오며 375px에서 415px 밀렸다. 층 높이는 층·선수 수·맞대결·화면 폭마다 달라 뼈대로 맞출 수 없고,
              api가 빠르면 React가 0.3초 안에 끝난 경계를 함께 보여 나눈 이득도 없다. 기다림은 선수 목록 미리 받기(위)로 줄인다 */}
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
