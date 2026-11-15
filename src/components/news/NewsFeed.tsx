"use client"; // '기사 더 보기'로 받은 기사를 이어 붙여야 해서 클라이언트 컴포넌트다.

import { useState, useTransition } from "react";
import type { NewsListItem } from "@/lib/api";
import { loadMoreNews } from "@/app/news/actions";
import LoadingDots from "@/components/LoadingDots";
import NewsTitleList from "@/components/news/NewsTitleList";

/**
 * 뉴스 탭 기사 목록. 서버가 그린 첫 쪽(20줄) 아래 '기사 더 보기'를 누르면 다음 쪽을 받아 이어 붙인다.
 * 목록 맨 아래라 펼쳐도 밀려 내려가는 내용이 없다(홈 카드의 '더 보기'를 이 탭으로 옮긴 까닭, 이슈 #206).
 * 저절로 이어 받지 않는다(끝없이 이어지면 아래 안내 글에 닿을 수 없다).
 *
 * @param player 거른 선수(전체면 null). 다음 쪽도 같은 선수로 받는다
 * @param photos 선수 이름 → 사진. 기사 사진이 없거나 안 뜨면 그 선수 사진을 대신 보인다
 */
export default function NewsFeed({
  items: first,
  next: firstNext,
  player,
  photos,
}: {
  items: NewsListItem[];
  next: string | null;
  player: string | null;
  photos: Record<string, string | null>;
}) {
  // 보이는 줄 전부(첫 쪽 + 이어 받은 쪽). 앱에 돌아와 화면을 다시 받으면(router.refresh) 첫 쪽이 새로 오는데,
  // 새 기사가 맨 위에 붙어도 받아 둔 쪽을 버리지 않고 합친다(키를 바꿔 처음부터 그리면 읽던 아래 목록이 사라진다)
  const [rows, setRows] = useState(first);
  const [firstSeen, setFirstSeen] = useState(first);
  if (first !== firstSeen) {
    setFirstSeen(first);
    setRows((shown) => merge(first, shown));
  }
  const [next, setNext] = useState(firstNext);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  function load() {
    if (!next || pending) return;
    startTransition(async () => {
      const result = await loadMoreNews(player, next);
      if (!result.ok) {
        setFailed(true);
        return;
      }
      setFailed(false);
      setRows((shown) => merge(shown, result.items));
      setNext(result.next);
    });
  }

  // 전체 보기에서는 줄마다 누구 기사인지 붙인다(같은 기사가 여러 선수에 걸리면 '김혜성·김하성'). 한 선수만 보면 붙이지 않는다.
  // 기사 사진이 없을 때 대신 보일 선수 사진: 거른 선수의 기사면 그 선수, 아니면 첫 선수
  const items = rows.map((n) => ({
    ...n,
    who: player ? null : n.who.join("·") || null,
    playerPhotoUrl: photos[player && n.who.includes(player) ? player : (n.who[0] ?? "")] ?? null,
  }));

  return (
    <div className="card px-4 py-1">
      <NewsTitleList items={items} />
      {failed && (
        <p role="alert" className="border-t border-line py-2.5 text-center text-meta text-muted">
          기사를 더 불러오지 못했어요
        </p>
      )}
      {next && (
        <button
          type="button"
          onClick={load}
          aria-busy={pending}
          className="press-soft flex min-h-11 w-full cursor-pointer items-center justify-center gap-1 border-t border-line py-2.5 text-label text-accent-ink"
        >
          <LoadingDots loading={pending}>{failed ? "다시 시도" : "기사 더 보기"}</LoadingDots>
          {pending && <span className="sr-only"> 불러오는 중</span>}
        </button>
      )}
    </div>
  );
}

/**
 * a 다음에 a에 없는 b의 줄을 잇는다(순서는 서버가 준 그대로, 같은 기사는 a 쪽 값). 이어 받은 쪽은 커서가 있어 겹치지 않고,
 * 새로 받은 첫 쪽(a)은 받아 둔 목록(b)보다 늦은 기사만 새로 더한다
 */
function merge(a: NewsListItem[], b: NewsListItem[]): NewsListItem[] {
  const seen = new Set(a.map((n) => n.id ?? n.url));
  return [...a, ...b.filter((n) => !seen.has(n.id ?? n.url))];
}
