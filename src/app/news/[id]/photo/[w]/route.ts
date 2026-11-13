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
    const input = await download(source);
    const out = await sharp(input, { limitInputPixels: 40_000_000 })
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

/**
 * 원본을 받는다. 다른 주소로 넘기면 https 바깥 주소일 때만 3번까지 따라간다(서버 안쪽 주소로 새지 않게).
 * 이미지가 아니거나 8MB를 넘으면 받는 도중 멈춘다(길이 헤더가 없어도 메모리에 다 올리지 않는다).
 */
async function download(source: string): Promise<Buffer> {
  let url = source;
  for (let hop = 0; hop < 4; hop++) {
    if (!isPublicHttps(url)) throw new Error(`not public https: ${url}`);
    const res = await fetch(url, {
      headers: { "user-agent": USER_AGENT },
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.status >= 300 && res.status < 400) {
      const next = res.headers.get("location");
      if (!next) break;
      url = new URL(next, url).toString();
      continue;
    }
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !type.startsWith("image/") || !res.body) throw new Error(`${res.status} ${type}`);
    if (Number(res.headers.get("content-length") ?? 0) > MAX_BYTES) throw new Error("too large");
    const chunks: Uint8Array[] = [];
    let size = 0;
    const reader = res.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) {
        await reader.cancel();
        throw new Error("too large");
      }
      chunks.push(value);
    }
    return Buffer.concat(chunks);
  }
  throw new Error("too many redirects");
}

/** https이고, 서버 안쪽(이름에 점이 없는 도커 이름, localhost, 사설 IP 숫자 주소)이 아닌가 */
function isPublicHttps(url: string): boolean {
  try {
    const { protocol, hostname } = new URL(url);
    if (protocol !== "https:" || !hostname.includes(".") || hostname === "localhost") return false;
    return !/^(\d+\.){3}\d+$/.test(hostname) && !hostname.startsWith("[");
  } catch {
    return false;
  }
}

function notFound() {
  return new Response(null, { status: 404, headers: { "cache-control": "public, max-age=60" } });
}
