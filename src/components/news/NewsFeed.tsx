"use client"; // '기사 더 보기'로 받은 기사를 이어 붙여야 해서 클라이언트 컴포넌트다.

import { useEffect, useRef, useState, useTransition } from "react";
import type { NewsListItem } from "@/lib/api";
import { loadMoreNews } from "@/app/news/actions";
import { formatDate, kstDayKey } from "@/lib/format";
import { isNewArticle, type SeenMap } from "@/lib/newsSeen";
import LoadingDots from "@/components/LoadingDots";
import NewsTitleList from "@/components/news/NewsTitleList";

/**
 * 뉴스 탭 기사 목록. 서버가 그린 첫 쪽(20줄) 아래 '기사 더 보기'를 누르면 다음 쪽을 받아 이어 붙인다.
 * 목록 맨 아래라 펼쳐도 밀려 내려가는 내용이 없다(홈 카드의 '더 보기'를 이 탭으로 옮긴 까닭, 이슈 #206).
 * 저절로 이어 받지 않는다(끝없이 이어지면 아래 안내 글에 닿을 수 없다).
 * 날짜별로 묶어 머리줄(오늘·어제·11월 13일(금))을 두고, 줄에는 시각만 둔다(이슈 #214, 다음 스포츠의 날짜별 보기 참고).
 *
 * @param player 거른 선수(전체면 null). 다음 쪽도 같은 선수로 받는다
 * @param photos 선수 이름 → 사진. 기사 사진이 없거나 안 뜨면 그 선수 사진을 대신 보인다
 * @param seen   이 화면을 열 때의 '본 때'(선수별). 그 뒤 나온 기사 줄에 '새'를 붙인다. 이어 받은 쪽도 같은 값으로 본다
 *               (화면을 연 뒤 본 때가 바뀌어도 이 화면에서는 처음 값을 쓴다)
 * @param query  검색어(없으면 null). 다음 쪽도 같은 말로 받고, 제목에서 굵게 보인다
 */
export default function NewsFeed({
  items: first,
  next: firstNext,
  player,
  photos,
  seen = null,
  query = null,
}: {
  items: NewsListItem[];
  next: string | null;
  player: string | null;
  photos: Record<string, string | null>;
  query?: string | null;
  seen?: SeenMap | null;
}) {
  // 보이는 줄 전부(첫 쪽 + 이어 받은 쪽). 앱에 돌아와 화면을 다시 받으면(router.refresh) 첫 쪽이 새로 오는데,
  // 새 기사가 맨 위에 붙어도 받아 둔 쪽을 버리지 않고 합친다(키를 바꿔 처음부터 그리면 읽던 아래 목록이 사라진다)
  const [rows, setRows] = useState(first);
  const [firstSeen, setFirstSeen] = useState(first);
  if (first !== firstSeen) {
    setFirstSeen(first);
    setRows((shown) => merge(first, shown));
  }
  // 본 때는 이 목록을 처음 그릴 때 값으로 고정한다. 보고 있는 동안 NewsSeenMarker가 쿠키를 바꾸고, 앱에 돌아와 화면을
  // 다시 받으면(router.refresh) 새 값이 오는데, 그대로 쓰면 보던 줄의 '새'가 한꺼번에 꺼진다
  const [seenAtOpen] = useState(seen);
  const [next, setNext] = useState(firstNext);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();
  const listRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  // 마지막 쪽을 받으면 '기사 더 보기'가 사라져 그 버튼에 있던 포커스가 갈 곳을 잃는다(키보드·화면 낭독기가 문서 처음으로
  // 돌아갔다). 그때 새로 붙은 첫 기사로 옮기려고, 받기 전 줄 수를 적어 둔다(다음 그림 뒤에 옮긴다)
  const focusRowAt = useRef<number | null>(null);
  useEffect(() => {
    const at = focusRowAt.current;
    if (at === null) return;
    focusRowAt.current = null;
    // 줄마다 기사 링크가 하나다. 새로 붙은 줄이 없으면(마지막 쪽이 비었으면) 마지막 줄로
    const links = listRef.current?.querySelectorAll<HTMLElement>("li > a") ?? [];
    (links[at] ?? links[links.length - 1])?.focus({ preventScroll: true });
  }, [rows]);

  function load() {
    if (!next || pending) return;
    const shownCount = rows.length;
    startTransition(async () => {
      const result = await loadMoreNews(player, next, query);
      if (!result.ok) {
        setFailed(true);
        return;
      }
      setFailed(false);
      if (result.next === null && document.activeElement === moreRef.current) focusRowAt.current = shownCount;
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
    isNew: isNewArticle(seenAtOpen, player ? [player] : n.who, n.publishedAt),
  }));

  return (
    <div ref={listRef} className="space-y-4">
      {byDay(items).map((day) => (
        <section key={day.key} aria-labelledby={`news-day-${day.key}`}>
          {/* 오늘·어제는 보는 때에 따라 달라서 서버와 브라우저가 자정 근처에 다르게 그릴 수 있다 */}
          <h2 id={`news-day-${day.key}`} className="mb-1.5 px-1 text-label text-muted" suppressHydrationWarning>
            {day.label}
          </h2>
          <div className="card px-4 py-1">
            <NewsTitleList items={day.items} timeOnly highlight={query} />
          </div>
        </section>
      ))}
      {failed && (
        <p role="alert" className="text-center text-meta text-muted">
          기사를 더 불러오지 못했어요
        </p>
      )}
      {next && (
        <button
          ref={moreRef}
          type="button"
          onClick={load}
          aria-busy={pending}
          className="card press-soft flex min-h-12 w-full cursor-pointer items-center justify-center gap-1 text-label text-accent-ink"
        >
          <LoadingDots loading={pending}>{failed ? "다시 시도" : "기사 더 보기"}</LoadingDots>
          {pending && <span className="sr-only"> 불러오는 중</span>}
        </button>
      )}
    </div>
  );
}

/** 하루치 기사 묶음 */
interface Day<T> {
  /** 묶음 열쇠(날짜, 같은 날짜가 떨어져 다시 나오면 몇 번째인지 붙인다) */
  key: string;
  /** 한국 날짜 "2026-11-15" */
  date: string;
  /** 머리줄: 오늘·어제·"11월 13일(금)" */
  label: string;
  items: T[];
}

/** 기사를 한국 날짜별로 묶는다(서버가 준 늦은 순 그대로, 같은 날은 한 묶음) */
function byDay<T extends { publishedAt: string }>(items: T[]): Day<T>[] {
  const today = kstDayKey(new Date());
  const yesterday = today ? kstDayKey(new Date(Date.parse(`${today}T12:00:00+09:00`) - 86_400_000)) : null;
  const days: Day<T>[] = [];
  for (const item of items) {
    const date = kstDayKey(item.publishedAt) ?? "unknown";
    const last = days.at(-1);
    if (last && last.date === date) {
      last.items.push(item);
      continue;
    }
    const label = date === today ? "오늘" : date === yesterday ? "어제" : formatDate(item.publishedAt);
    // 같은 기사 묶음의 대표가 늦게 실린 사본이면 드물게 같은 날짜가 떨어져 다시 나올 수 있어, 그때만 열쇠에 몇 번째인지 붙인다.
    // 묶음 순번을 붙이면 맨 위에 새 날짜가 생길 때(자정 뒤 새로 받은 첫 쪽) 아래 묶음이 모두 다시 그려진다
    const seenTimes = days.filter((d) => d.date === date).length;
    days.push({ key: seenTimes === 0 ? date : `${date}-${seenTimes + 1}`, date, label, items: [item] });
  }
  return days;
}

/**
 * a 다음에 a에 없는 b의 줄을 잇는다(순서는 서버가 준 그대로, 같은 기사는 a 쪽 값). 이어 받은 쪽은 커서가 있어 겹치지 않고,
 * 새로 받은 첫 쪽(a)은 받아 둔 목록(b)보다 늦은 기사만 새로 더한다
 */
function merge(a: NewsListItem[], b: NewsListItem[]): NewsListItem[] {
  const seen = new Set(a.map((n) => n.id ?? n.url));
  return [...a, ...b.filter((n) => !seen.has(n.id ?? n.url))];
}
