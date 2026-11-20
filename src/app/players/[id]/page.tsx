import type { Metadata } from "next";
import { Suspense } from "react";
import { getPlayer, getRecords } from "@/lib/api";
import { formatAsOf } from "@/lib/format";
import { parseId } from "@/lib/ids";
import { playerShareImage, shareMeta } from "@/lib/share";
import { pickRankRows } from "@/lib/koreanRank";
import { readMyPlayers } from "@/lib/myPlayers";
import ApiErrorNotice from "@/components/ApiErrorNotice";
import DataBanners from "@/components/DataBanners";
import { PlayerSkeleton } from "@/components/PageSkeleton";
import NotFoundNotice from "@/components/NotFoundNotice";
import InfoTip from "@/components/InfoTip";
import CareerSeasons from "@/components/player/CareerSeasons";
import GameLog from "@/components/player/GameLog";
import JumpNav, { type JumpTarget } from "@/components/player/JumpNav";
import KoreanRecords from "@/components/player/KoreanRecords";
import LeaguePosition from "@/components/player/LeaguePosition";
import PlayerHeader from "@/components/player/PlayerHeader";
import PlayerNews from "@/components/player/PlayerNews";
import RosterMoves from "@/components/player/RosterMoves";
import SeasonSummary from "@/components/player/SeasonSummary";
import WrcTrend from "@/components/player/WrcTrend";
import Section from "@/components/Section";
import { buildWrcTrend } from "@/lib/wrcTrend";
import PageSuspense from "@/components/PageSuspense";

type Props = PageProps<"/players/[id]">;

/** 주소의 ?game=(경기 상세 창을 여는 경기 번호)이 1~10자리 숫자가 아니면 null. 숫자 검사는 GameCalendar와 같다 */
function parseGame(game: string | string[] | undefined): string | null {
  // 경기 창(GameCalendar)이 숫자로 읽는 것과 같은 값으로(?game=007 → 7)
  return typeof game === "string" && /^\d{1,10}$/.test(game) ? String(Number(game)) : null;
}

// <title>: "이정후 2026 기록 · KOR Leaguer" (뒷부분은 layout의 template이 붙인다)
export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
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
  const description = `${player.nameKo}${player.nameEn ? `(${player.nameEn})` : ""} ${season} 시즌 성적과 경기 기록`;
  // 공유 카드 그림은 og/[v]/route.tsx(사진·핵심 기록). 주소에 배포 커밋이 들어가 카톡이 옛 그림을 쓰지 않는다.
  // 그림의 대체 글은 그림과 같은 데이터로 그림 속 글(팀·포지션·기록)을 적는다
  // 공유 주소(og:url)에는 경기 상세 창 주소(?game=경기번호)를 남긴다. '/players/{id}'로 정하면 경기 창 링크가 창 없는
  // 선수 화면으로 열린다(og:url을 따르는 페이스북 등). 화면을 바꾸지 않는 다른 ?값(utm 등)은 넣지 않는다
  const game = parseGame((await searchParams).game);
  const path = game ? `/players/${player.id}?game=${game}` : `/players/${player.id}`;
  return { title, description, ...shareMeta(title, description, path, playerShareImage(result.data)) };
}

export default function PlayerPage({ params }: Props) {
  return (
    <PageSuspense fallback={<PlayerSkeleton />}>
      <PlayerContent params={params} />
    </PageSuspense>
  );
}

/** '한국인 통산 기록' 칸. 기록을 못 받았으면 줄 없이 '역대 기록' 줄만 둔다 */
async function PlayerKoreanRecords({ playerId }: { playerId: number }) {
  const records = await getRecords();
  return <KoreanRecords rows={records.ok ? pickRankRows(records.data.next, playerId) : []} />;
}

// 없는 선수는 notFound() 대신 안내를 직접 그린다.
// (Suspense 안에서 notFound()를 부르면 서버 HTML에는 안내가 없고 브라우저 JS가 나중에 그린다.)
// 주소를 바로 열면 src/proxy.ts가 먼저 확인해 HTTP 404(공통 404 화면)를 준다. 이 안내는 앱 안 이동(RSC 요청)과
// proxy가 확인을 건너뛴 때(api 오류·1초 넘김과 그 뒤 10초)에 보인다.
async function PlayerContent({ params }: Pick<Props, "params">) {
  const id = parseId((await params).id);
  if (id == null) return <NotFoundNotice message="찾는 선수가 없어요" />;

  const [result, myIds] = await Promise.all([getPlayer(id), readMyPlayers()]);
  if (!result.ok) {
    if (result.failure === "notFound") return <NotFoundNotice message="찾는 선수가 없어요" />;
    // 선수 이름(h1)을 그리지 못했으니 안내 제목이 이 화면의 h1이다
    return <ApiErrorNotice failure={result.failure} level={1} />;
  }

  const {
    dataMode,
    statsAvailable,
    season,
    generatedAt,
    player,
    hitting,
    pitching,
    minorHitting,
    minorPitching,
    games,
    moves,
    saber,
    seasons,
    news,
    minorGames,
  } = result.data;
  // 타격 흐름(누적 wRC+)은 타자만. 마지막 점을 MLB 공식 시즌 wRC+에 맞추고 정규시즌 경기만 쌓는다(경기 종류가 없는 옛 api면 정규시즌 경기 수로 어림)
  const trend =
    saber?.kind === "hitter" && saber.wrcPlus != null ? buildWrcTrend(games, saber.wrcPlus, hitting?.games ?? null) : null;
  // 바로 가기 탭(휴대폰·태블릿): 있는 칸만, 휴대폰에서 쌓이는 순서대로. id는 각 칸 제목(h2)
  const jumps: JumpTarget[] = [
    { id: "season-title", label: "성적" },
    ...(news.length > 0 ? [{ id: "news-title", label: "기사" }] : []),
    { id: "games-title", label: "경기" },
    ...(seasons.length > 0 ? [{ id: "seasons-title", label: "시즌별" }] : []),
    ...(moves ? [{ id: "moves-title", label: "이동" }] : []),
  ];
  return (
    <div className="space-y-4 sm:space-y-5">
      <DataBanners dataMode={dataMode} statsAvailable={statsAvailable} />
      <PlayerHeader player={player} isMine={myIds.includes(player.id)} />
      <JumpNav targets={jumps} />
      {/* 넓은 화면: 왼쪽 시즌 성적·MLB 중 위치(백분위)·한국인 통산 기록·흐름·경기 기록·시즌별 기록 | 오른쪽 기사·이동 기록.
          선수 정보(투타·키·생년월일·데뷔)는 머리 카드 알약 아래 한 줄이다(이슈 #236) */}
      <div className="space-y-7 pt-2 lg:grid lg:grid-cols-[minmax(0,1fr)_21.25rem] lg:items-start lg:gap-x-4 lg:space-y-0">
        <div className="min-w-0 space-y-7">
          <SeasonSummary
            season={season}
            statsAvailable={statsAvailable}
            hitting={hitting}
            pitching={pitching}
            minorHitting={minorHitting}
            minorPitching={minorPitching}
            // 데이터 기준 시각은 첫 묶음(시즌 성적) 제목 옆. 서버가 아직 주지 않으면 빼고 그린다(이슈 #277)
            asOf={generatedAt ? formatAsOf(generatedAt) : undefined}
          />
          {saber && <LeaguePosition saber={saber} />}
          {/* 보조 칸이라 기록(/api/records)이 늦어도 본문이 기다리지 않게 따로 그린다 */}
          <Suspense fallback={null}>
            <PlayerKoreanRecords playerId={player.id} />
          </Suspense>
          {trend && (
            <Section
              id="trend-title"
              title="타격 흐름"
              aside="누적 · 리그 평균 대비"
              // 그래프 아래 설명 줄을 대신한다(이슈 #327). 중간 값은 표준 가중치로 어림해 마지막 점(MLB 공식)에 맞춰 옮긴 값이라 공식 값처럼 읽히지 않게 밝힌다(lib/wrcTrend)
              info={
                <InfoTip
                  title="타격 흐름"
                  lines={[
                    "'평균보다 12% 잘 침'은 리그 평균 타자를 100으로 한 값(wRC+ 112)이에요. 눈금은 평균보다 몇 % 위·아래인지예요",
                    "50타석부터 그려요",
                    "중간 값은 어림, 마지막 값만 MLB 공식이에요",
                    "옆으로 훑으면(마우스는 올리면) 그날까지 값이 보여요",
                  ]}
                />
              }
            >
              <WrcTrend points={trend} moves={moves ?? []} />
            </Section>
          )}
          {/* 기사는 휴대폰에선 경기 기록 위, PC에선 오른쪽 칸(사용자 11-12: PC 오른쪽 칸은 관련 기사) */}
          {news.length > 0 && (
            <div className="lg:hidden">
              <PlayerNews id="news-title" news={news} photoUrl={player.photoUrl} player={player.nameKo} />
            </div>
          )}
          <GameLog playerId={player.id} games={games} minorGames={minorGames} moves={moves ?? []} role={player.role} />
          <CareerSeasons seasons={seasons} />
        </div>
        {/* 오른쪽 칸: 기사(PC) + 이동 기록(메이저·마이너 오간 날짜).
            PC 기사는 본문 옆 보조 칸이라 aside(보조 영역 '기사')로 그려 낭독기 영역 목록에서 바로 간다(키보드로는 달력 버튼 30여 개 뒤).
            이동 기록은 휴대폰에서 본문 끝이라 그대로 둔다 */}
        <div className="min-w-0 space-y-7">
          {news.length > 0 && (
            <div className="hidden lg:block">
              <PlayerNews id="news-title-pc" news={news} photoUrl={player.photoUrl} player={player.nameKo} as="aside" />
            </div>
          )}
          {moves && <RosterMoves moves={moves} />}
        </div>
      </div>
    </div>
  );
}
