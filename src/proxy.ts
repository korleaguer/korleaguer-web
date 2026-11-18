import { NextResponse, type NextRequest } from "next/server";
import { apiUrl } from "@/lib/apiUrl";
import { NEWS_ID, PLAYER_ID } from "@/lib/ids";

/**
 * 없는 선수·기사 주소에 HTTP 404를 준다(검색엔진이 안내만 있는 200을 soft 404로 보지 않게, 11-17 전수조사).
 *
 * 선수·기사 화면(page.tsx)도 없는 주소면 '찾는 선수가 없어요' 안내와 noindex를 그리지만, cacheComponents는 미리 그린 뼈대를
 * 먼저 보내서(그때 200이 정해진다) 페이지 안에서는 상태를 바꿀 수 없다(맨 앞 notFound()도 효과가 없었다, #283).
 * 그래서 Next 문서가 권하는 대로 그리기 전에 여기서 확인한다.
 * - 화면이 받지 않는 id(숫자가 아님 등)는 api를 묻지 않고 404.
 * - 숫자 id는 api에 HEAD로 있는지만 물어 404면 404. api 오류이거나 1초를 넘기면 확인 없이 그린다(화면이 안내를 고른다).
 * 404는 어느 화면에도 없는 주소로 돌려 공통 404 화면(app/not-found.tsx)을 그린다. Next가 상태 404·noindex·저장 금지를 붙인다.
 * 상태만 404로 바꾸고 page.tsx를 그대로 그리는 방법은 미리 그린 뼈대의 200이 덮어써서 되지 않는다.
 */
export async function proxy(request: NextRequest) {
  if (request.method !== "GET" && request.method !== "HEAD") return NextResponse.next();
  const match = /^\/(players|news)\/([^/]+)$/.exec(request.nextUrl.pathname);
  if (!match) return NextResponse.next();

  const route = ROUTES[match[1] as keyof typeof ROUTES];
  const id = decode(match[2]);
  if (id == null || !route.id.test(id) || (await apiStatus(`${route.api}${id}`)) === 404) {
    return NextResponse.rewrite(new URL(NOT_FOUND_PATH, request.url));
  }
  return NextResponse.next();
}

/** id 모양은 화면(page.tsx)과 같은 lib/ids 규칙을 쓴다. 다르면 화면은 안내를 그리는데 상태는 200(또는 그 반대)이 된다 */
const ROUTES = {
  players: { id: PLAYER_ID, api: "/api/players/" },
  news: { id: NEWS_ID, api: "/api/news/" },
} as const;

/** 어느 화면에도 없는 주소. 밑줄로 시작하는 폴더는 주소가 되지 않아(app 폴더 규칙) 화면 주소와 겹칠 일이 없다 */
const NOT_FOUND_PATH = "/_missing";

/** 확인을 기다리는 가장 긴 시간. 넘기면 확인 없이 그린다(화면은 api를 다시 묻고 결과에 맞는 안내를 고른다) */
const CHECK_TIMEOUT_MS = 1000;

/** 주소의 id 마디를 화면이 받는 params처럼 푼다('%31' → '1'). %가 잘못 쓰였으면 null */
function decode(segment: string): string | null {
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

/**
 * api 상태 코드만 받는다(본문 없는 HEAD). 화면을 열 때마다 api를 한 번 더 부르는 일이라 가볍게 한다.
 * HEAD 전용 처리가 없는 옛 api도 GET과 같은 상태 코드를 준다(Spring이 GET 처리로 답한다). 연결 실패·시간 초과는 null
 */
async function apiStatus(path: string): Promise<number | null> {
  try {
    const res = await fetch(apiUrl(path), { method: "HEAD", signal: AbortSignal.timeout(CHECK_TIMEOUT_MS) });
    return res.status;
  } catch (e) {
    console.warn(`[proxy] ${path} 확인 실패:`, e instanceof Error ? e.message : e);
    return null;
  }
}

export const config = {
  // :id는 한 마디라 공유 그림(/og/…)·기사 사진(/photo/…) 같은 아래 주소는 걸리지 않는다.
  // 브라우저 안 이동·미리 받기(RSC 요청)와 서버 함수 호출은 건너뛴다: 상태 코드는 문서 요청에서만 뜻이 있고, 이동마다 api를
  // 한 번 더 부르지 않게 한다. Next가 빌드 때 읽으므로 값은 변수로 빼지 않고 그대로 적는다
  matcher: [
    {
      source: "/players/:id",
      missing: [
        { type: "header", key: "rsc" },
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "next-action" },
      ],
    },
    {
      source: "/news/:id",
      missing: [
        { type: "header", key: "rsc" },
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "next-action" },
      ],
    },
  ],
};
