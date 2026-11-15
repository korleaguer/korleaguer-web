"use server";

import { getClip, getGameDetail, type GameDetail } from "@/lib/api";

export type GameDetailResult = { ok: true; detail: GameDetail } | { ok: false };
export type ClipResult = { ok: true; mp4Url: string } | { ok: false };

const ID = /^[1-9]\d{0,9}$/;
const PLAY_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** 브라우저가 보낸 번호가 1 이상 10자리 이하 정수인지 */
function validId(value: unknown): value is number {
  return typeof value === "number" && ID.test(String(value));
}

/**
 * 경기 달력 상세 창: 선수 한 명의 경기 한 개(타석별 기록·하이라이트).
 * 서버 함수는 브라우저가 아무 값이나 보낼 수 있으니 모양을 확인한다(그 선수 경기인지는 api가 다시 확인한다).
 */
export async function loadGameDetail(playerId: number, gamePk: number): Promise<GameDetailResult> {
  if (!validId(playerId) || !validId(gamePk)) return { ok: false };
  const result = await getGameDetail(playerId, gamePk);
  if (!result.ok || result.data.playerId !== playerId || result.data.gamePk !== gamePk) return { ok: false };
  return { ok: true, detail: result.data };
}

/** 타석 ▶: 그 공 영상 주소(그 경기 상세에 나온 공 번호만 api가 묻는다) */
export async function loadClip(playerId: number, gamePk: number, playId: string): Promise<ClipResult> {
  if (!validId(playerId) || !validId(gamePk) || typeof playId !== "string" || !PLAY_ID.test(playId)) {
    return { ok: false };
  }
  const result = await getClip(playerId, gamePk, playId);
  if (!result.ok || !result.data.mp4Url) return { ok: false };
  return { ok: true, mp4Url: result.data.mp4Url };
}
