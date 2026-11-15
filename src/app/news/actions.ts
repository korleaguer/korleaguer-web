"use server";

import { getNewsList, type NewsListItem } from "@/lib/api";

export type MoreNews = { ok: true; items: NewsListItem[]; next: string | null } | { ok: false };

/**
 * 뉴스 탭 '기사 더 보기': 다음 쪽 기사. player는 지금 거른 선수(전체면 null), before는 앞 쪽의 next.
 * 서버 함수는 브라우저가 아무 값이나 보낼 수 있으니 모양을 확인한다(커서는 api가 다시 확인한다).
 */
export async function loadMoreNews(player: string | null, before: string): Promise<MoreNews> {
  if (player !== null && (typeof player !== "string" || player.length > 50)) return { ok: false };
  if (typeof before !== "string" || before === "" || before.length > 64) return { ok: false };
  const result = await getNewsList(player, before);
  if (!result.ok) return { ok: false };
  return { ok: true, items: result.data.items, next: result.data.next };
}
