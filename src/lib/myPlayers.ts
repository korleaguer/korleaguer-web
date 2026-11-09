// '내 선수'로 고른 선수 id 목록. 가입 없이 이 기기 쿠키에 "1.5.2"처럼 고른 순서대로 저장한다.
// 서버 컴포넌트와 서버 함수(actions.ts)에서만 쓴다.
import { cookies } from "next/headers";

export const MY_PLAYERS_COOKIE = "kl_my";
/** api가 한 번에 받는 최대 인원과 같다 */
export const MY_PLAYERS_MAX = 20;
/** 쿠키 수명: 1년 */
export const MY_PLAYERS_MAX_AGE = 60 * 60 * 24 * 365;

/** 쿠키 값 → id 목록. 이상한 값은 버리고, 겹치면 처음 것만, 최대 20명 */
export function parseMyPlayers(value: string | undefined): number[] {
  if (!value) return [];
  const ids = value
    .split(".")
    .filter((part) => /^[1-9]\d{0,9}$/.test(part))
    .map(Number);
  return [...new Set(ids)].slice(0, MY_PLAYERS_MAX);
}

export function serializeMyPlayers(ids: readonly number[]): string {
  return ids.join(".");
}

/** 지금 요청의 쿠키에서 고른 선수 id 목록을 읽는다 */
export async function readMyPlayers(): Promise<number[]> {
  return parseMyPlayers((await cookies()).get(MY_PLAYERS_COOKIE)?.value);
}
