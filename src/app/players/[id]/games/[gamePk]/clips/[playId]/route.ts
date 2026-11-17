// 경기 상세 창 타석 ▶: 그 공 영상 주소(MLB 서버 mp4). GET /players/{선수}/games/{경기}/clips/{공 번호}
// 경기 상세와 같은 이유로 서버 함수 대신 GET이다(11-17 전수조사). 그 경기 상세에 나온 공 번호만 api가 MLB에 묻는다.
import type { NextRequest } from "next/server";
import { getClip } from "@/lib/api";
import { failed, ID, PLAY_ID } from "../../../ids";

export async function GET(_request: NextRequest, { params }: RouteContext<"/players/[id]/games/[gamePk]/clips/[playId]">) {
  const { id, gamePk, playId } = await params;
  if (!ID.test(id) || !ID.test(gamePk) || !PLAY_ID.test(playId)) return failed(404);
  const result = await getClip(Number(id), Number(gamePk), playId);
  if (!result.ok || !result.data.mp4Url) return failed(404);
  // 공 영상 주소는 바뀌지 않는다(api도 하루 둔다)
  return Response.json({ mp4Url: result.data.mp4Url }, { headers: { "cache-control": "private, max-age=86400" } });
}
