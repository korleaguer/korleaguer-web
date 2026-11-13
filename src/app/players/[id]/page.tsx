import type { Metadata } from "next";
import { getPlayer } from "@/lib/api";
import { playerShareImage, shareMeta } from "@/lib/share";
import { readMyPlayers } from "@/lib/myPlayers";
import ApiErrorNotice from "@/components/ApiErrorNotice";
import DataBanners from "@/components/DataBanners";
import LoadingBlock from "@/components/LoadingBlock";
import NotFoundNotice from "@/components/NotFoundNotice";
import CareerSeasons from "@/components/player/CareerSeasons";
import GameLog from "@/components/player/GameLog";
import LeaguePosition from "@/components/player/LeaguePosition";
import PlayerHeader from "@/components/player/PlayerHeader";
import PlayerInfo from "@/components/player/PlayerInfo";
import PlayerNews from "@/components/player/PlayerNews";
import RosterMoves from "@/components/player/RosterMoves";
import SeasonSummary from "@/components/player/SeasonSummary";
import WrcTrend from "@/components/player/WrcTrend";
import Section from "@/components/Section";
import { buildWrcTrend } from "@/lib/wrcTrend";
import PageSuspense from "@/components/PageSuspense";

type Props = PageProps<"/players/[id]">;

/** 주소의 id가 1 이상 10자리 이하 정수가 아니면 null */
function parseId(id: string): number | null {
  return /^[1-9]\d{0,9}$/.test(id) ? Number(id) : null;
}

// <title>: "이정후 2026 기록 · KOR Leaguer" (뒷부분은 layout의 template이 붙인다)
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = parseId((await params).id);
  const result = id == null ? null : await getPlayer(id);
  if (!result?.ok) {
    // 없는 선수는 검색에 걸리지 않게 noindex
    const missing = result == null || result.failure === "notFound";
    return missing
      ? { title: "선수를 찾을 수 없어요", robots: { index: false, follow: false } }
      : { title: "선수 기록" };
  }

  const { player, season } = result.data;
  const title = `${player.nameKo} ${season} 기록`;
  const description = `${player.nameKo}${player.nameEn ? `(${player.nameEn})` : ""} ${season} 시즌 성적과 경기별 한 줄 기록`;
  // 공유 카드 그림은 og/[v]/route.tsx(사진·핵심 기록). 주소에 배포 커밋이 들어가 카톡이 옛 그림을 쓰지 않는다
  return { title, description, ...shareMeta(title, description, playerShareImage(player.id)) };
}

export default function PlayerPage({ params }: Props) {
  return (
    <PageSuspense fallback={<LoadingBlock rows={8} />}>
      <PlayerContent params={params} />
    </PageSuspense>
  );
}

// 없는 선수는 notFound() 대신 안내를 직접 그린다.
// (Suspense 안에서 notFound()를 부르면 서버 HTML에는 안내가 없고 브라우저 JS가 나중에 그린다.)
async function PlayerContent({ params }: Pick<Props, "params">) {
  const id = parseId((await params).id);
  if (id == null) return <NotFoundNotice />;

  const [result, myIds] = await Promise.all([getPlayer(id), readMyPlayers()]);
  if (!result.ok) {
    if (result.failure === "notFound") return <NotFoundNotice />;
    return <ApiErrorNotice failure={result.failure} />;
  }

  const { dataMode, statsAvailable, season, player, hitting, pitching, games, moves, saber, seasons, news } = result.data;
  // 타격 흐름(누적 wRC+)은 타자만. 마지막 점을 MLB 공식 시즌 wRC+에 맞춘다
  const trend = saber?.kind === "hitter" && saber.wrcPlus != null ? buildWrcTrend(games, saber.wrcPlus) : null;
  return (
    <div className="space-y-4 sm:space-y-5">
      <DataBanners dataMode={dataMode} statsAvailable={statsAvailable} />
      <PlayerHeader player={player} isMine={myIds.includes(player.id)} />
      {/* 넓은 화면: 왼쪽 시즌 성적·MLB 안 위치·흐름·경기 기록·시즌별 기록 | 오른쪽 선수 정보·기사·이동 기록 */}
      <div className="space-y-7 pt-2 lg:grid lg:grid-cols-[minmax(0,1fr)_21.25rem] lg:items-start lg:gap-x-4 lg:space-y-0">
        <div className="min-w-0 space-y-7">
          <SeasonSummary
            season={season}
            statsAvailable={statsAvailable}
            hitting={hitting}
            pitching={pitching}
          />
          {saber && <LeaguePosition saber={saber} />}
          {trend && (
            <Section id="trend-title" title="타격 흐름" aside="누적 wRC+">
              <WrcTrend points={trend} />
            </Section>
          )}
          {/* 기사는 휴대폰에선 경기 기록 위, PC에선 오른쪽 칸(사용자 11-12: PC 오른쪽 칸은 관련 기사) */}
          {news.length > 0 && (
            <div className="lg:hidden">
              <PlayerNews id="news-title" news={news} photoUrl={player.photoUrl} />
            </div>
          )}
          <GameLog games={games} />
          <CareerSeasons seasons={seasons} />
        </div>
        {/* 오른쪽 칸: 선수 정보 + 기사(PC) + 이동 기록(메이저·마이너 오간 날짜) */}
        <div className="min-w-0 space-y-7">
          <PlayerInfo player={player} />
          {news.length > 0 && (
            <div className="hidden lg:block">
              <PlayerNews id="news-title-pc" news={news} photoUrl={player.photoUrl} />
            </div>
          )}
          {moves && <RosterMoves moves={moves} />}
        </div>
      </div>
    </div>
  );
}
