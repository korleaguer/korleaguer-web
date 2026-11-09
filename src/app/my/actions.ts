"use server";

import { cookies } from "next/headers";
import {
  MY_PLAYERS_COOKIE,
  MY_PLAYERS_MAX,
  MY_PLAYERS_MAX_AGE,
  parseMyPlayers,
  serializeMyPlayers,
} from "@/lib/myPlayers";

/**
 * 선수를 '내 선수'에 넣거나 뺀다. on=true면 넣고(맨 뒤에), false면 뺀다.
 * 쿠키를 바꾸면 Next.js가 지금 화면을 서버에서 다시 그린다.
 * 이미 20명이면 더 넣지 않고 false를 돌려준다.
 */
export async function setMyPlayer(playerId: number, on: boolean): Promise<boolean> {
  // 서버 함수는 브라우저가 아무 값이나 보낼 수 있으니 id가 양의 정수인지 확인한다.
  if (!Number.isInteger(playerId) || playerId < 1) return false;

  const ids = parseMyPlayers((await cookies()).get(MY_PLAYERS_COOKIE)?.value);
  const has = ids.includes(playerId);
  if (on === has) return true;
  if (on && ids.length >= MY_PLAYERS_MAX) return false;

  const next = on ? [...ids, playerId] : ids.filter((id) => id !== playerId);
  await saveMyPlayers(next);
  return true;
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
