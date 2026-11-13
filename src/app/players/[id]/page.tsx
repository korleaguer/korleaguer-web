import type { Metadata } from "next";
import { getPlayer } from "@/lib/api";
import { playerShareImage, shareMeta } from "@/lib/share";
import { readMyPlayers } from "@/lib/myPlayers";
import ApiErrorNotice from "@/components/ApiErrorNotice";
import DataBanners from "@/components/DataBanners";
import LoadingBlock from "@/components/LoadingBlock";
import NotFoundNotice from "@/components/NotFoundNotice";
import GameLog from "@/components/player/GameLog";
import PlayerHeader from "@/components/player/PlayerHeader";
import PlayerInfo from "@/components/player/PlayerInfo";
import RosterMoves from "@/components/player/RosterMoves";
import SeasonSummary from "@/components/player/SeasonSummary";
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

  const { dataMode, statsAvailable, season, player, hitting, pitching, games, moves } = result.data;
  return (
    <div className="space-y-4 sm:space-y-5">
      <DataBanners dataMode={dataMode} statsAvailable={statsAvailable} />
      <PlayerHeader player={player} isMine={myIds.includes(player.id)} />
      {/* 넓은 화면: 왼쪽 시즌 성적·경기 기록 | 오른쪽 선수 정보 */}
      <div className="space-y-7 pt-2 lg:grid lg:grid-cols-[minmax(0,1fr)_21.25rem] lg:items-start lg:gap-x-4 lg:space-y-0">
        <div className="min-w-0 space-y-7">
          <SeasonSummary
            season={season}
            statsAvailable={statsAvailable}
            hitting={hitting}
            pitching={pitching}
          />
          <GameLog games={games} moves={moves ?? []} />
        </div>
        {/* 오른쪽 칸: 선수 정보 + 이동 기록(메이저·마이너 오간 날짜) */}
        <div className="min-w-0 space-y-7">
          <PlayerInfo player={player} />
          {moves && <RosterMoves moves={moves} />}
        </div>
      </div>
    </div>
  );
}
