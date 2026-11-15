import type { Metadata } from "next";
import Link from "next/link";
import { getNewsList } from "@/lib/api";
import { newsHref } from "@/lib/news";
import { shareMeta } from "@/lib/share";
import ApiErrorNotice from "@/components/ApiErrorNotice";
import LoadingBlock from "@/components/LoadingBlock";
import PageSuspense from "@/components/PageSuspense";
import StateNotice from "@/components/StateNotice";
import NewsFeed from "@/components/news/NewsFeed";
import NewsPlayerPicker from "@/components/news/NewsPlayerPicker";

// <title>: "뉴스 · KOR Leaguer" (뒷부분은 layout의 template이 붙인다)
const DESCRIPTION = "해외파 한국 선수 기사 모아보기. 선수별로 골라 보고, 영어 기사는 한국어 요약으로 읽어요.";

export const metadata: Metadata = {
  title: "뉴스",
  description: DESCRIPTION,
  ...shareMeta("뉴스 · KOR Leaguer", DESCRIPTION),
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
  const raw = (await searchParams).player;
  const wanted = typeof raw === "string" && raw.trim() !== "" ? raw.trim() : null;
  const result = await getNewsList(wanted, null);
  if (!result.ok) return <ApiErrorNotice failure={result.failure} />;

  const { players, player, items, next } = result.data;
  // 기사가 없는 선수(또는 이름이 틀린 주소)를 달라고 했으면 api가 거르지 않고 빈 목록을 준다
  const unknown = wanted !== null && player === null;
  const selected = players.find((p) => p.nameKo === player) ?? null;
  const photos = Object.fromEntries(players.map((p) => [p.nameKo, p.photoUrl]));

  return (
    // PC: 왼쪽 선수 목록은 내려도 따라온다(sticky). 목록은 줄이 너무 길지 않게 폭을 묶는다
    <div className="space-y-3 lg:grid lg:grid-cols-[12rem_minmax(0,48rem)] lg:items-start lg:gap-6 lg:space-y-0">
      <div className="lg:sticky lg:top-6">
        <NewsPlayerPicker players={players} selected={unknown ? null : player} />
      </div>
      <div className="min-w-0 space-y-2.5">
        {selected?.playerId != null && (
          // 이 선수의 경기 기록·시즌 성적은 선수 화면에. 기사만 보다가 바로 넘어갈 수 있게 목록 위 오른쪽에 둔다
          <div className="flex justify-end px-1">
            <Link
              href={`/players/${selected.playerId}`}
              className="press-soft text-meta font-semibold text-accent-ink hover:underline"
            >
              {`${selected.nameKo} 선수 화면 ›`}
            </Link>
          </div>
        )}
        {unknown ? (
          <StateNotice
            emoji="🔎"
            title={`${wanted} 선수 기사가 없어요`}
            detail="지금 모으는 선수의 기사만 보여요."
            action={
              <Link href={newsHref(null)} replace className="press text-label text-accent-ink">
                전체 기사 보기
              </Link>
            }
          />
        ) : items.length === 0 ? (
          <StateNotice emoji="📰" title="아직 기사가 없어요" detail="새 기사가 나오면 30분 안에 여기에 모여요." />
        ) : (
          <NewsFeed key={`${player ?? ""}:${items[0]?.id ?? ""}`} items={items} next={next} player={player} photos={photos} />
        )}
      </div>
    </div>
  );
}
