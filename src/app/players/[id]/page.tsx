import type { Metadata } from "next";
import { Suspense } from "react";
import { getPlayer } from "@/lib/api";
import ApiErrorNotice from "@/components/ApiErrorNotice";
import DataBanners from "@/components/DataBanners";
import LoadingBlock from "@/components/LoadingBlock";
import NotFoundNotice from "@/components/NotFoundNotice";
import GameLog from "@/components/player/GameLog";
import PlayerHeader from "@/components/player/PlayerHeader";
import SeasonSummary from "@/components/player/SeasonSummary";

type Props = PageProps<"/players/[id]">;

/** 주소의 id가 1 이상 10자리 이하 정수가 아니면 null */
function parseId(id: string): number | null {
  return /^[1-9]\d{0,9}$/.test(id) ? Number(id) : null;
}

// <title>: "이정후 2026 기록 · 코리거" (뒷부분은 layout의 template이 붙인다)
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = parseId((await params).id);
  const result = id == null ? null : await getPlayer(id);
  if (!result?.ok) {
    // 없는 선수는 검색에 걸리지 않게 noindex
    const missing = result == null || result.failure === "notFound";
    return missing
      ? { title: "선수를 찾을 수 없습니다", robots: { index: false, follow: false } }
      : { title: "선수 기록" };
  }

  const { player, season } = result.data;
  return {
    title: `${player.nameKo} ${season} 기록`,
    description: `${player.nameKo}${player.nameEn ? `(${player.nameEn})` : ""} ${season} 시즌 성적과 경기별 한 줄 기록`,
  };
}

export default function PlayerPage({ params }: Props) {
  return (
    <Suspense fallback={<LoadingBlock rows={8} />}>
      <PlayerContent params={params} />
    </Suspense>
  );
}

// 없는 선수는 notFound() 대신 안내를 직접 그린다.
// (Suspense 안에서 notFound()를 부르면 서버 HTML에는 안내가 없고 브라우저 JS가 나중에 그린다.)
async function PlayerContent({ params }: Pick<Props, "params">) {
  const id = parseId((await params).id);
  if (id == null) return <NotFoundNotice />;

  const result = await getPlayer(id);
  if (!result.ok) {
    if (result.failure === "notFound") return <NotFoundNotice />;
    return <ApiErrorNotice failure={result.failure} />;
  }

  const { dataMode, statsAvailable, season, player, hitting, pitching, games } = result.data;
  return (
    <div className="space-y-4">
      <DataBanners dataMode={dataMode} statsAvailable={statsAvailable} />
      <PlayerHeader player={player} />
      <SeasonSummary
        season={season}
        statsAvailable={statsAvailable}
        hitting={hitting}
        pitching={pitching}
      />
      <GameLog games={games} />
    </div>
  );
}
