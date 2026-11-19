// 기사 대표 사진을 화면 크기에 맞게 줄여 준다: /news/{기사 번호}/photo/{크기}.
// 언론사 원본은 한 장에 30~400KB인데 목록 썸네일은 88×66으로 보인다(홈 한 화면에 사진 48장). 그래서 우리 서버가 원본을 한 번 받아
// 화면에 보이는 크기의 webp로 줄이고, 줄인 결과는 서버 메모리에 두고 브라우저는 7일 동안 저장한다.
// 화질은 원본과 구분이 안 되게 한다(사용자 11-13 "화질 저하는 싫다"): 썸네일은 칸(4:3)과 똑같이 잘라 2배·3배 화면 크기로
// (세로로 긴 인물 사진은 기사 페이지 사진처럼 위쪽 20%에 맞춰 잘라 얼굴이 남게 한다, 이슈 #220),
// 기사 사진은 폭만 맞춘다(원본보다 키우지 않는다). 품질 82. 원본·옛 방식(폭 176, 품질 72: 3배 화면에서 흐림)과 나란히 비교해 정했다.
// 아무 주소나 받지 않는다: 우리 기사 번호로만 부르고, 사진 주소는 그 기사 데이터에서 꺼낸다(남이 우리 서버를 사진 변환기로 쓰지 못하게).
// 줄이지 못하면 404를 주고, 화면(NewsThumb·NewsPhoto)은 원본 주소 → 선수 사진 순서로 넘어간다.
import { cacheLife } from "next/cache";
import sharp from "sharp";
import { getNews } from "@/lib/api";
import { NEWS_ID } from "@/lib/ids";

/**
 * 크기 이름 → 줄이는 방법. 주소에 크기를 그대로 써서, 방법을 바꾸면 이름도 바꾼다(브라우저가 7일 저장한 옛 사진을 쓰지 않게).
 * - 176x132-top·264x198-top: 목록 썸네일 칸(88×66)의 2배·3배 화면. 칸과 같은 4:3으로 잘라 화면이 다시 자르거나 늘리지 않게 한다.
 *   가로가 남으면 가운데, 세로가 남으면 위쪽 20%에 맞춘다(옛 이름 176x132·264x198은 세로도 가운데를 잘라 눈 높이에서 잘렸다)
 * - 720w·1280w: 기사 화면 사진(휴대폰 화면 폭, PC 628px 칸의 2배). 폭만 맞춘다
 */
const SIZES: Record<string, { width: number; height?: number }> = {
  "176x132-top": { width: 176, height: 132 },
  "264x198-top": { width: 264, height: 198 },
  "720w": { width: 720 },
  "1280w": { width: 1280 },
};
/** 언론사 원본을 받는 제한 시간과 최대 크기 */
const TIMEOUT_MS = 10_000;
const MAX_BYTES = 8 * 1024 * 1024;
/** 우리가 누군지 밝힌다(기사 수집기와 같은 이름). 브라우저인 척하지 않는다 */
const USER_AGENT = "korleaguer/0.1 (news thumbnails; personal, non-commercial)";

export async function GET(_request: Request, { params }: RouteContext<"/news/[id]/photo/[w]">) {
  const { id, w } = await params;
  const size = Object.hasOwn(SIZES, w) ? SIZES[w] : null;
  if (!NEWS_ID.test(id) || !size) return notFound();

  const news = await getNews(Number(id));
  const source = news.ok ? news.data.imageUrl : null;
  if (!source) return notFound();

  const webp = await resized(source, size.width, size.height ?? null);
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
 * 원본을 받아 줄인 webp(base64). height가 있으면 그 칸 비율로 먼저 잘라(cropFor) 칸 크기로 줄이고, 없으면 폭만 맞춘다.
 * 원본보다 키우지 않는다. 실패하면 null.
 * 같은 사진·폭은 서버 메모리에 두고 다시 쓴다(운영 서버는 라즈베리파이라 줄이는 일이 비싸다). 실패는 1분만 둔다.
 */
async function resized(source: string, width: number, height: number | null): Promise<string | null> {
  "use cache";
  try {
    const input = await download(source);
    const image = sharp(input, { limitInputPixels: 40_000_000 }).autoOrient();
    if (height) {
      // 휴대폰 사진처럼 EXIF 방향이 있으면 돌린 뒤 크기(autoOrient)로 자를 곳을 정한다
      const { autoOrient } = await image.metadata();
      image.extract(cropFor(autoOrient.width, autoOrient.height, width / height));
    }
    const out = await image
      .resize(height ? { width, height, fit: "cover", withoutEnlargement: true } : { width, withoutEnlargement: true })
      .webp({ quality: 82 })
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
 * w×h 사진에서 ratio(폭/높이) 칸에 들어갈 곳. 가로가 남으면 가운데를, 세로가 남으면 위쪽 20% 지점을 남긴다
 * (기사 페이지 사진 NewsPhoto의 object-position 50% 20%와 같은 계산). 기사 사진은 세로로 긴 인물 사진이 많아
 * 가운데를 자르면 눈 높이에서 잘린다(운영 기사 146장 중 세로 37장, 이슈 #220).
 */
function cropFor(w: number, h: number, ratio: number) {
  if (w / h > ratio) {
    const width = Math.max(1, Math.round(h * ratio));
    return { left: Math.round((w - width) / 2), top: 0, width, height: h };
  }
  const height = Math.max(1, Math.round(w / ratio));
  return { left: 0, top: Math.round((h - height) * 0.2), width: w, height };
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
