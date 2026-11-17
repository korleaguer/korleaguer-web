import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { getNewsList, type NewsListPlayer } from "@/lib/api";
import { readMyPlayers } from "@/lib/myPlayers";
import { NEWS_QUERY_MAX, newsHref } from "@/lib/news";
import { hasNewSince, NEWS_SEEN_COOKIE, parseSeen, toSeconds } from "@/lib/newsSeen";
import { shareMeta } from "@/lib/share";
import ApiErrorNotice from "@/components/ApiErrorNotice";
import LoadingBlock from "@/components/LoadingBlock";
import PageSuspense from "@/components/PageSuspense";
import StateNotice, { stateActionClass } from "@/components/StateNotice";
import NewsFeed from "@/components/news/NewsFeed";
import NewsPlayerPicker from "@/components/news/NewsPlayerPicker";
import NewsSearch from "@/components/news/NewsSearch";
import NewsSeenMarker from "@/components/news/NewsSeenMarker";

// <title>: "뉴스 · KOR Leaguer" (뒷부분은 layout의 template이 붙인다)
const TITLE = "뉴스";
const DESCRIPTION = "해외파 한국 선수 기사 모아보기. 선수별로 골라 보고, 영어 기사는 한국어 요약으로 읽어요.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  // 공유 주소(og:url)는 두지 않는다. 선수로 거른 링크(?player=이정후)를 많이 보내서, '/news'로 정하면 전체 목록으로 열린다
  ...shareMeta(TITLE, DESCRIPTION),
};

type Props = PageProps<"/news">;

/**
 * 뉴스 탭(이슈 #206). 선수 기사를 한곳에서 늦은 순으로 본다. 홈·선수 화면의 '전체 기사 보기'가 이 화면을
 * 그 선수로 거른 채(?player=이정후) 연다. 휴대폰은 위에 선수 고르기 한 줄과 아래 목록, PC는 왼쪽 칸에 선수 목록이다.
 */
export default function NewsTabPage({ searchParams }: Props) {
  return (
    <div className="space-y-4">
      <h1 className="px-1 text-display">뉴스</h1>
      <PageSuspense fallback={<LoadingBlock rows={8} />}>
        <NewsContent searchParams={searchParams} />
      </PageSuspense>
    </div>
  );
}

async function NewsContent({ searchParams }: Pick<Props, "searchParams">) {
  const params = await searchParams;
  const raw = params.player;
  const wanted = typeof raw === "string" && raw.trim() !== "" ? raw.trim() : null;
  // 선수 이름은 짧다. 너무 긴 값(api가 400으로 거절한다)은 묻지 않고 '모르는 선수'로 본다
  const tooLong = wanted !== null && wanted.length > 50;
  // 검색어(이슈 #214). api 상한보다 길면 잘라서 찾는다
  const rawQ = params.q;
  const q = typeof rawQ === "string" && rawQ.trim() !== "" ? rawQ.trim().slice(0, NEWS_QUERY_MAX) : null;
  const [result, myIds, cookieStore] = await Promise.all([
    getNewsList(tooLong ? null : wanted, null, q),
    readMyPlayers(),
    cookies(),
  ]);
  if (!result.ok) return <ApiErrorNotice failure={result.failure} />;

  const { player, items, next, topics } = result.data;
  // 본 때(이 기기 쿠키). 열 때의 값으로 순서·점·'새'를 그리고, 본 것은 NewsSeenMarker가 남긴다
  const seen = parseSeen(cookieStore.get(NEWS_SEEN_COOKIE)?.value);
  const mine = result.data.players.filter((p) => p.playerId !== null && myIds.includes(p.playerId)).map((p) => p.nameKo);
  const fresh = result.data.players.filter((p) => hasNewSince(seen, p.nameKo, p.latestAt)).map((p) => p.nameKo);
  const players = orderPlayers(result.data.players, myIds, fresh);
  // 기사가 없는 선수(또는 이름이 틀린 주소)를 달라고 했으면 api가 거르지 않고 빈 목록을 준다
  const unknown = wanted !== null && (tooLong || player === null);
  const selected = players.find((p) => p.nameKo === player) ?? null;
  const photos = Object.fromEntries(players.map((p) => [p.nameKo, p.photoUrl]));

  return (
    // 휴대폰: 선수 알약 → 그 선수 기사에 자주 나온 말 알약(검색은 그 줄의 돋보기) → 목록.
    // PC: 왼쪽 칸에 선수 목록(내려도 따라온다), 오른쪽 칸에 검색창·자주 나온 말과 목록(줄이 너무 길지 않게 폭을 묶는다)
    <div className="space-y-3 lg:grid lg:grid-cols-[12rem_minmax(0,48rem)] lg:grid-rows-[auto_1fr] lg:items-start lg:gap-x-6 lg:gap-y-3 lg:space-y-0">
      <div className="lg:sticky lg:top-6 lg:col-start-1 lg:row-span-2 lg:row-start-1">
        <NewsPlayerPicker players={players} selected={unknown ? null : player} mine={mine} fresh={fresh} query={q} />
        {/* 검색 결과는 그 선수 기사를 다 본 것이 아니라 본 때를 남기지 않는다(처음 온 기기의 시작값만) */}
        <NewsSeenMarker
          players={players}
          selected={unknown || q ? null : player}
          shownWho={player === null && !unknown && !q ? [...new Set(items.flatMap((n) => n.who))] : []}
        />
      </div>
      <div className="lg:col-start-2 lg:row-start-1">
        <NewsSearch player={unknown ? null : player} query={q} topics={topics} />
      </div>
      <div className="min-w-0 space-y-2.5 lg:col-start-2 lg:row-start-2">
        {selected?.playerId != null && (
          // 이 선수의 경기 기록·시즌 성적은 선수 화면에. 기사만 보다가 바로 넘어갈 수 있게 목록 위 오른쪽에 둔다
          <div className="flex justify-end px-1">
            <Link
              href={`/players/${selected.playerId}`}
              className="press-soft tap-target text-meta font-semibold text-accent-ink hover:underline"
            >
              {`${selected.nameKo} 선수 화면 ›`}
            </Link>
          </div>
        )}
        {unknown ? (
          <StateNotice
            emoji="🔎"
            title={tooLong ? "찾는 선수 기사가 없어요" : `${wanted} 선수 기사가 없어요`}
            detail="지금 모으는 선수의 기사만 보여요."
            action={
              <Link href={newsHref(null)} replace className={stateActionClass}>
                전체 기사 보기
              </Link>
            }
          />
        ) : items.length === 0 && next === null && q ? (
          // 검색 결과가 없을 때(먼저 설계할 화면): 무엇을 찾았는지와 다음에 할 일
          <StateNotice
            emoji="🔎"
            title={`‘${q}’ 기사가 없어요`}
            detail={player ? `${player} 기사에는 없어요. 전체에서 찾거나 다른 말로 찾아보세요.` : "다른 말로 찾아보세요."}
            action={
              <Link href={player ? newsHref(null, q) : newsHref(null)} replace className={stateActionClass}>
                {player ? "전체 기사에서 찾기" : "검색 지우기"}
              </Link>
            }
          />
        ) : items.length === 0 && next === null ? (
          <StateNotice emoji="📰" title="아직 기사가 없어요" detail="새 기사가 나오면 30분 안에 여기에 모여요." />
        ) : (
          // 선수·검색어를 바꾸면 받아 둔 쪽을 비운다(같은 화면이면 새로 받은 첫 쪽을 받아 둔 목록에 합친다, NewsFeed)
          <NewsFeed
            key={`${player ?? ""}:${q ?? ""}`}
            items={items}
            next={next}
            player={player}
            photos={photos}
            seen={seen}
            query={q}
          />
        )}
      </div>
    </div>
  );
}

/**
 * 선수 고르기 순서(이슈 #210, 사용자 11-15): ★내 선수(고른 순서) → 지난번에 본 뒤 새 기사가 있는 선수(가장 최근 기사 순)
 * → 나머지(api 순서: 포스팅 선수 먼저, 그다음 명단 순). 보고 싶은 선수가 휴대폰 첫 화면에 들어오게 한다.
 * 처음 온 기기는 새 기사가 있는 선수가 없어 내 선수 다음은 api 순서 그대로다.
 */
function orderPlayers(
  players: NewsListPlayer[],
  myIds: readonly number[],
  fresh: readonly string[],
): NewsListPlayer[] {
  const myRank = (p: NewsListPlayer) => (p.playerId === null ? -1 : myIds.indexOf(p.playerId));
  const mineFirst = players.filter((p) => myRank(p) >= 0).sort((a, b) => myRank(a) - myRank(b));
  const rest = players.filter((p) => myRank(p) < 0);
  const newest = (p: NewsListPlayer) => toSeconds(p.latestAt) ?? 0;
  const withNews = rest.filter((p) => fresh.includes(p.nameKo)).sort((a, b) => newest(b) - newest(a));
  const others = rest.filter((p) => !fresh.includes(p.nameKo));
  return [...mineFirst, ...withNews, ...others];
}
