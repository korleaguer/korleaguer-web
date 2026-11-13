// 기사 대표 사진을 화면 크기에 맞게 줄여 준다: /news/{기사 번호}/photo/{폭}.
// 언론사 원본은 한 장에 30~400KB인데 목록 썸네일은 88×66으로 보인다(홈 한 화면에 사진 48장). 그래서 우리 서버가 원본을 한 번 받아
// 폭 176(썸네일 2배)·704·1280(기사 화면) webp로 줄이고, 줄인 결과는 서버 메모리에 두고 브라우저는 7일 동안 저장한다.
// 아무 주소나 받지 않는다: 우리 기사 번호로만 부르고, 사진 주소는 그 기사 데이터에서 꺼낸다(남이 우리 서버를 사진 변환기로 쓰지 못하게).
// 줄이지 못하면 404를 주고, 화면(NewsThumb·NewsPhoto)은 원본 주소 → 선수 사진 순서로 넘어간다.
import { cacheLife } from "next/cache";
import sharp from "sharp";
import { getNews } from "@/lib/api";

const WIDTHS = new Set([176, 704, 1280]);
/** 언론사 원본을 받는 제한 시간과 최대 크기 */
const TIMEOUT_MS = 10_000;
const MAX_BYTES = 8 * 1024 * 1024;
/** 우리가 누군지 밝힌다(기사 수집기와 같은 이름). 브라우저인 척하지 않는다 */
const USER_AGENT = "korleaguer/0.1 (news thumbnails; personal, non-commercial)";

export async function GET(_request: Request, { params }: RouteContext<"/news/[id]/photo/[w]">) {
  const { id, w } = await params;
  const width = Number(w);
  if (!/^[1-9]\d{0,14}$/.test(id) || !WIDTHS.has(width)) return notFound();

  const news = await getNews(Number(id));
  const source = news.ok ? news.data.imageUrl : null;
  if (!source) return notFound();

  const webp = await resized(source, width);
  if (!webp) return notFound();
  return new Response(Buffer.from(webp, "base64"), {
    headers: {
      "content-type": "image/webp",
      // 같은 기사·폭이면 사진이 바뀌지 않는다
      "cache-control": "public, max-age=604800, immutable",
    },
  });
}

/**
 * 원본을 받아 폭 width로 줄인 webp(base64). 원본보다 키우지 않는다. 실패하면 null.
 * 같은 사진·폭은 서버 메모리에 두고 다시 쓴다(운영 서버는 라즈베리파이라 줄이는 일이 비싸다). 실패는 1분만 둔다.
 */
async function resized(source: string, width: number): Promise<string | null> {
  "use cache";
  try {
    const res = await fetch(source, { headers: { "user-agent": USER_AGENT }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    const type = res.headers.get("content-type") ?? "";
    const length = Number(res.headers.get("content-length") ?? 0);
    if (!res.ok || !type.startsWith("image/") || length > MAX_BYTES) throw new Error(`${res.status} ${type} ${length}`);
    const input = Buffer.from(await res.arrayBuffer());
    if (input.byteLength > MAX_BYTES) throw new Error(`too large ${input.byteLength}`);
    const out = await sharp(input)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 72 })
      .toBuffer();
    cacheLife({ stale: 86_400, revalidate: 86_400, expire: 604_800 });
    return out.toString("base64");
  } catch (e) {
    console.warn(`[news-photo] ${source} 줄이기 실패:`, e instanceof Error ? e.message : e);
    cacheLife({ stale: 60, revalidate: 60, expire: 120 });
    return null;
  }
}

function notFound() {
  return new Response(null, { status: 404, headers: { "cache-control": "public, max-age=60" } });
}
