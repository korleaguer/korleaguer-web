// 경기 상세 창 타석 ▶: 그 공 영상 주소(MLB 서버 mp4). GET /players/{선수}/games/{경기}/clips/{공 번호}
// 경기 상세와 같은 이유로 서버 함수 대신 GET이다(11-17 전수조사). 그 경기 상세에 나온 공 번호만 api가 MLB에 묻는다.
import type { NextRequest } from "next/server";
import { getClip } from "@/lib/api";
import { parseId, PLAY_ID } from "@/lib/ids";
import { failed } from "../../../ids";

export async function GET(_request: NextRequest, { params }: RouteContext<"/players/[id]/games/[gamePk]/clips/[playId]">) {
  const { id, gamePk, playId } = await params;
  const playerId = parseId(id);
  const game = parseId(gamePk);
  if (playerId == null || game == null || !PLAY_ID.test(playId)) return failed(404);
  const result = await getClip(playerId, game, playId);
  // 영상이 없으면(api 404: 그 경기에 없는 공이거나 Savant에서 영상을 찾지 못함, 또는 빈 주소) 404 → 화면은 '영상이 아직 없어요'.
  // api에 닿지 못했거나 이상한 응답이면 502 → 화면은 '불러오지 못했어요, 다시 눌러 주세요'(11-17 전수조사 L405, 경기 상세와 같은 나눔)
  if (!result.ok) return failed(result.failure === "notFound" ? 404 : 502);
  if (!result.data.mp4Url) return failed(404);
  // 공 영상 주소는 바뀌지 않는다(api도 하루 둔다)
  return Response.json({ mp4Url: result.data.mp4Url }, { headers: { "cache-control": "private, max-age=86400" } });
}
