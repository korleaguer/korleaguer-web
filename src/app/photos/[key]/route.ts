// 우리가 호스팅하는 선수 사진. api(GET /api/photos/{이름})가 원본을 처음 한 번만 받아 저장해 두고, 여기서는 그 사진을 그대로 전달한다.
// api는 바깥에 열려 있지 않아서 웹이 이 주소(/photos/mlb-808982, /photos/kbo-si-hwan-roh)로 내보낸다.
// 브라우저는 하루 동안 저장해 두고, 그 뒤에는 ETag로 바뀌었는지만 묻는다(바뀌지 않았으면 304).
import type { NextRequest } from "next/server";

// mlb-808982(지금 MLB 사진), mlb-673490-2024(그 시즌 MLB 사진: MLB 도전 선배의 계약 구단 시절), kbo-…(KBO 사진)
const KEY = /^(mlb-\d{1,10}(-\d{4})?|kbo-[a-z0-9-]{1,40})$/;
// 처음 요청이면 api가 원본을 받는 동안 기다린다(원본 연결 5초 + 읽기 10초 + 간격)
const TIMEOUT_MS = 20_000;
const PASS_HEADERS = ["content-type", "etag", "cache-control", "content-length"];

export async function GET(request: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  if (!KEY.test(key)) return notFound();

  let res: Response;
  try {
    const url = new URL(`/api/photos/${key}`, process.env.API_BASE_URL ?? "http://localhost:8080");
    const ifNoneMatch = request.headers.get("if-none-match");
    res = await fetch(url, {
      cache: "no-store",
      headers: ifNoneMatch ? { "if-none-match": ifNoneMatch } : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    console.warn(`[photos] ${key} 연결 실패:`, e instanceof Error ? e.message : e);
    return new Response(null, { status: 502, headers: { "cache-control": "no-store" } });
  }

  if (res.status !== 200 && res.status !== 304) return notFound();
  const headers = new Headers();
  for (const name of PASS_HEADERS) {
    const value = res.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new Response(res.status === 304 ? null : res.body, { status: res.status, headers });
}

/** 없는 사진: 화면은 이름 첫 글자 원으로 대신한다. 짧게만 저장해 새 사진이 생기면 곧 보이게 한다 */
function notFound() {
  return new Response(null, { status: 404, headers: { "cache-control": "public, max-age=300" } });
}
