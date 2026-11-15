"use client"; // 본 때는 이 기기 쿠키에 브라우저가 쓴다(화면이 보인 뒤).

import { useEffect } from "react";
import type { NewsListPlayer } from "@/lib/api";
import { NEWS_SEEN_COOKIE, NEWS_SEEN_MAX_AGE, parseSeen, serializeSeen, toSeconds, type SeenMap } from "@/lib/newsSeen";

/** 지금 이 기기의 본 때(쿠키). 없으면 null */
function readSeen(): SeenMap | null {
  const raw = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${NEWS_SEEN_COOKIE}=`))
    ?.slice(NEWS_SEEN_COOKIE.length + 1);
  return parseSeen(raw);
}

function writeSeen(seen: SeenMap): void {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${NEWS_SEEN_COOKIE}=${serializeSeen(seen)}; Path=/; Max-Age=${NEWS_SEEN_MAX_AGE}; SameSite=Lax${secure}`;
}

/**
 * 뉴스 탭을 본 것을 이 기기에 남긴다(이슈 #210). 그리는 것은 없다.
 * - 처음 온 기기: 지금 있는 선수를 모두 본 것으로 시작한다(처음부터 점이 가득하지 않게)
 * - 선수로 거른 화면: 그 선수를 본 것으로
 * - 전체 화면: 첫 쪽에 기사가 보인 선수만 본 것으로(그 선수의 가장 최근 기사는 늘 그 선수의 다른 기사보다 위라 첫 쪽에 보였다)
 * 이 화면의 '새' 표시와 점은 열 때의 값으로 그렸으므로 그대로 두고, 다음에 열 때부터 바뀐다.
 */
export default function NewsSeenMarker({
  players,
  selected,
  shownWho,
}: {
  players: NewsListPlayer[];
  /** 거른 선수(전체면 null) */
  selected: string | null;
  /** 전체 화면 첫 쪽에 기사가 보인 선수 */
  shownWho: readonly string[];
}) {
  useEffect(() => {
    const before = readSeen();
    const next: SeenMap = {};
    // 지금 고를 수 있는 선수만 남긴다(빠진 선수의 오래된 값이 쌓이지 않게)
    for (const p of players) {
      if (before?.[p.nameKo] !== undefined) next[p.nameKo] = before[p.nameKo];
    }
    const mark = (p: NewsListPlayer) => {
      const latest = toSeconds(p.latestAt);
      if (latest !== null && (next[p.nameKo] ?? 0) < latest) next[p.nameKo] = latest;
    };
    for (const p of players) {
      if (before === null || p.nameKo === selected || (selected === null && shownWho.includes(p.nameKo))) mark(p);
    }
    // 처음 온 기기인데 적을 선수가 없으면(선수 목록이 비었을 때) 쓰지 않는다. 빈 쿠키가 남으면 다음에 '처음 온 기기'가
    // 아니게 되어 모든 선수에 점이 찍힌다
    if (before === null && Object.keys(next).length === 0) return;
    const changed = before === null || serializeSeen(next) !== serializeSeen(before);
    if (changed) writeSeen(next);
  }, [players, selected, shownWho]);

  return null;
}
