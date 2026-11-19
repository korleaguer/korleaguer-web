import type { Metadata } from "next";
import { getHome, getPlayers, getTimeline, type PlayerSummary } from "@/lib/api";
import { formatAsOf } from "@/lib/format";
import { readMyPlayers } from "@/lib/myPlayers";
import ApiErrorNotice from "@/components/ApiErrorNotice";
import DataBanners, { StatsFailedBanner } from "@/components/DataBanners";
import { PlayersSkeleton } from "@/components/PageSkeleton";
import PlayerCard from "@/components/players/PlayerCard";
import PlayerTimeline from "@/components/players/PlayerTimeline";
import StateNotice from "@/components/StateNotice";
import PageSuspense from "@/components/PageSuspense";
import { WordGroup } from "@/components/Words";
import { shareMeta, SITE_NAME } from "@/lib/share";

// <title>: "선수 · KOR Leaguer" (뒷부분은 layout의 template이 붙인다)
const TITLE = "선수";
const DESCRIPTION = "해외파 한국 선수들이 올해 어디서 뛰었는지 한눈에.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  ...shareMeta(`${TITLE} · ${SITE_NAME}`, DESCRIPTION, "/players"),
};

/**
 * 사진을 바로 받을(eager) 앞 카드 수: PC 3칸 × 2줄. 실측(사진 윗변): PC 1280×720 3칸 178·446px, 태블릿 768×1024 2칸
 * 178·412·646px라 둘 다 6장이 첫 화면이다. 휴대폰(375×812, 1칸)은 3장만 첫 화면이고 4~6번째(872~1374px)는 일찍 받는 셈이지만,
 * 56px 원 사진(2배 화면 장당 3~4KB)이고, lazy여도 크롬은 화면 아래 1250px 안의 사진을 화면 배치 직후 받아서 비용이 거의 없다.
 * 나머지는 lazy 그대로(전수조사 L270: 첫 화면 사진을 lazy로 두면 화면 배치를 마친 뒤에야 받기 시작한다)
 */
const EAGER_CARDS = 6;

// 선수 목록. 데이터는 요청마다 api에서 새로 받는다.
export default function PlayersPage({ searchParams }: PageProps<"/players">) {
  return (
    <div className="space-y-4">
      <h1 className="px-1 text-display">선수</h1>
      <PageSuspense fallback={<PlayersSkeleton />}>
        <PlayersContent searchParams={searchParams} />
      </PageSuspense>
    </div>
  );
}

/** ?season=2025 → 2025. 모르는 값이면 0(서버가 지금 시즌을 고른다) */
function parseSeason(value: string | string[] | undefined): number {
  const n = typeof value === "string" && /^\d{4}$/.test(value) ? Number(value) : 0;
  return n >= 2000 ? n : 0;
}

async function PlayersContent({ searchParams }: Pick<PageProps<"/players">, "searchParams">) {
  const season = parseSeason((await searchParams).season);
  // 연표(/api/players/timeline)는 선수 목록과 같이 받는다. 옛 api라 연표가 없으면(404·실패) 아래 선수 카드 목록으로 대신 그린다.
  const [playersResult, timelineResult, myIds] = await Promise.all([getPlayers(), getTimeline(season), readMyPlayers()]);
  if (!playersResult.ok) return <ApiErrorNotice failure={playersResult.failure} />;
  if (playersResult.data.length > 0 && timelineResult.ok) {
    return <PlayerTimeline players={playersResult.data} timeline={timelineResult.data} myIds={myIds} />;
  }
  return <PlayerCards players={playersResult.data} myIds={myIds} />;
}

/** 선수 카드 목록(연표를 못 받았을 때와 선수가 없을 때). 목록은 /api/players, 시즌 성적은 /api/home에서 받아 playerId로 합친다. */
async function PlayerCards({ players, myIds }: { players: PlayerSummary[]; myIds: number[] }) {
  const homeResult = await getHome();
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
          {players.map((player, i) => (
            <PlayerCard
              key={player.id}
              player={player}
              hitting={hitters.get(player.id) ?? null}
              pitching={pitchers.get(player.id) ?? null}
              minorHitting={minorHitters.get(player.id) ?? null}
              minorPitching={minorPitchers.get(player.id) ?? null}
              statsMissing={!home}
              isMine={myIds.includes(player.id)}
              eagerPhoto={i < EAGER_CARDS}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
