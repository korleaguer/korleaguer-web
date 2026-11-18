// 경기 달력 상세 창이 받는 경기 상세(타석별 기록·하이라이트): GET /players/{선수}/games/{경기}[?final=1]
// 예전에는 서버 함수(Server Action)였다. 서버 함수는 한 번에 하나씩 차례로 보내져서, 창의 ‹ ›로 빠르게 넘기면 앞 경기 요청이
// 끝날 때까지 줄을 섰고 취소도 되지 않았다(11-17 전수조사, Next 문서: 읽기는 Route Handler). GET이라 브라우저가 앞 요청을
// 취소하고, 끝난 경기는 저장해 두었다가 다시 열 때 바로 쓴다.
import type { NextRequest } from "next/server";
import { getGameDetail } from "@/lib/api";
import { parseId } from "@/lib/ids";
import { failed } from "../ids";

export async function GET(request: NextRequest, { params }: RouteContext<"/players/[id]/games/[gamePk]">) {
  const { id, gamePk } = await params;
  const playerId = parseId(id);
  const game = parseId(gamePk);
  if (playerId == null || game == null) return failed(404);
  const result = await getGameDetail(playerId, game);
  if (!result.ok) return failed(result.failure === "notFound" ? 404 : 502);
  // api가 다른 선수·경기를 돌려주면 버린다(서버 함수 때와 같은 확인)
  if (result.data.playerId !== playerId || result.data.gamePk !== game) return failed(502);
  // 끝난 경기(웹이 final=1로 알린다)의 받은 상세만 브라우저가 10분 둔다. 진행 중인 경기는 새 타석이 생기고,
  // 아직 못 받은 상세(available=false)는 곧 받게 되니 두지 않는다. 사람마다 같은 공개 기록이지만 앞단에는 두지 않는다(private)
  const keep = request.nextUrl.searchParams.get("final") === "1" && result.data.available;
  return Response.json(result.data, { headers: { "cache-control": keep ? "private, max-age=600" : "no-store" } });
}
