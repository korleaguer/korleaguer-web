"use server";

import { cookies } from "next/headers";
import {
  MY_PLAYERS_COOKIE,
  MY_PLAYERS_MAX,
  MY_PLAYERS_MAX_AGE,
  parseMyPlayers,
  serializeMyPlayers,
} from "@/lib/myPlayers";

/** '내 선수' 목록의 한 자리: 번호(0부터)와 바로 앞 선수 id(맨 앞이면 null) */
type Slot = { at: number; after: number | null };

/**
 * 선수를 '내 선수'에 넣거나 뺀다. on=true면 넣고(slot이 있으면 그 자리에, 없으면 맨 뒤에), false면 뺀다.
 * 쿠키를 바꾸면 Next.js가 지금 화면을 서버에서 다시 그린다.
 * 돌려주는 값은 그 선수의 자리: 넣었으면 들어간 자리, 뺐으면 빠지기 전 자리다. '되돌리기'가 이 자리를 slot으로
 * 다시 보내 원래 자리에 넣는다(맨 뒤로 가서 화면·뉴스 선수 순서가 바뀌었다, 11-17 점검).
 * 이미 20명이면 더 넣지 않고 null을 돌려준다.
 */
export async function setMyPlayer(playerId: number, on: boolean, slot?: Slot): Promise<Slot | null> {
  // 서버 함수는 브라우저가 아무 값이나 보낼 수 있으니 id가 양의 정수인지 확인한다.
  if (!Number.isInteger(playerId) || playerId < 1) return null;

  const ids = parseMyPlayers((await cookies()).get(MY_PLAYERS_COOKIE)?.value);
  const index = ids.indexOf(playerId);
  if (on && index >= 0) return slotAt(ids, index);
  // 이미 없으면 뺄 것이 없다. 되돌리면 맨 뒤에 넣는다
  if (!on && index < 0) return slotAt(ids, ids.length);
  if (on && ids.length >= MY_PLAYERS_MAX) return null;

  if (!on) {
    await saveMyPlayers(ids.filter((id) => id !== playerId));
    return slotAt(ids, index);
  }
  const to = insertIndex(ids, slot);
  await saveMyPlayers([...ids.slice(0, to), playerId, ...ids.slice(to)]);
  return slotAt(ids, to);
}

/** ids의 index 자리(그 자리 바로 앞 선수와 함께) */
function slotAt(ids: readonly number[], index: number): Slot {
  return { at: index, after: index > 0 ? ids[index - 1] : null };
}

/**
 * 다시 넣을 번호. 바로 앞에 있던 선수가 아직 있으면 그 뒤에 넣는다: 번호만 보면 알림이 떠 있는 10초 사이 순서를 바꾸거나
 * 다른 화면에서 넣고 빼면 다른 자리에 들어갔다(A, B, C에서 B를 빼고 C를 맨 앞으로 옮긴 뒤 되돌리면 C, B, A, 11-18 리뷰).
 * 맨 앞이었거나 앞 선수가 그사이 빠졌으면 번호대로. 자리는 브라우저가 아무 값이나 보낼 수 있어서 정수만 받고 0 ~ 지금 인원으로
 * 자른다. 자리가 없으면(처음 넣기) 맨 뒤
 */
function insertIndex(ids: readonly number[], slot: Slot | undefined): number {
  if (typeof slot !== "object" || slot === null) return ids.length;
  const after = typeof slot.after === "number" && Number.isInteger(slot.after) ? ids.indexOf(slot.after) : -1;
  if (after >= 0) return after + 1;
  return typeof slot.at === "number" && Number.isInteger(slot.at) ? Math.min(Math.max(slot.at, 0), ids.length) : ids.length;
}

/**
 * '내 선수' 화면 순서를 바꾼다. order에 없는 선수(그사이 다른 화면에서 넣은 선수)는 맨 뒤에 남기고,
 * 쿠키에 없는 id는 무시한다. 넣기·빼기는 하지 않는다.
 */
export async function setMyPlayersOrder(order: number[]): Promise<void> {
  // 서버 함수는 브라우저가 아무 값이나 보낼 수 있으니, 쿠키에 있는 id만 받아들인다.
  if (!Array.isArray(order)) return;
  const ids = parseMyPlayers((await cookies()).get(MY_PLAYERS_COOKIE)?.value);
  const known = new Set(ids);
  const front = [...new Set(order.filter((id) => known.has(id)))];
  const rest = ids.filter((id) => !front.includes(id));
  await saveMyPlayers([...front, ...rest]);
}

async function saveMyPlayers(ids: number[]): Promise<void> {
  (await cookies()).set(MY_PLAYERS_COOKIE, serializeMyPlayers(ids), {
    path: "/",
    maxAge: MY_PLAYERS_MAX_AGE,
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
}
