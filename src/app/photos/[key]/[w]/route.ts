// 줄인 선수 사진: /photos/{이름}/{폭}. 표·목록·뉴스 알약의 24~56px 사진 원에 원본(MLB 사진 360px, 장당 약 18KB)을
// 그대로 받던 것을, 화면 배율(2배·3배)에 맞는 폭의 webp(장당 1~5KB)로 줄여 준다(전수조사, 화면은 lib/photo의 smallPhoto).
// 선수 페이지 머리 사진 무대(96px 원)도 192·288px로 받는다(과거 소속팀 편집본 288px PNG 약 88KB를 webp로, 전수조사 L341).
// api(GET /api/photos/{이름})의 원본을 한 번 받아 줄이고, 줄인 결과는 서버 메모리에 두며 브라우저는 하루 저장한다
// (원본 주소 /photos/{이름}처럼 하루. 선수 사진은 소속이 바뀌면 같은 이름으로 새 사진이 되므로 기사 사진처럼 7일 고정하지 않는다).
// 아무 폭이나 받지 않는다: 정해 둔 폭(SMALL_PHOTO_WIDTHS)과 우리 사진 이름만. 원본보다 키우지 않는다(원본이 그 폭보다 작으면 원본 폭
// 그대로. 지금 KBO 사진 kbo-…은 256px 편집본이라 가장 큰 폭 288px만 256px로 준다).
// 줄이지 못하면 원본 주소로 넘겨서 화면은 원본을 받아 그대로 보인다(원본도 없으면 원본 주소가 404를 주고 화면은 이니셜 원으로).
import { cacheLife } from "next/cache";
import sharp from "sharp";
import { apiUrl } from "@/lib/apiUrl";
import { PHOTO_KEY, SMALL_PHOTO_WIDTHS, photoVersion } from "@/lib/photo";

/** 처음 요청이면 api가 원본을 받는 동안 기다린다(원본 사진 경로와 같다) */
const TIMEOUT_MS = 20_000;

export async function GET(request: Request, { params }: RouteContext<"/photos/[key]/[w]">) {
  const { key, w } = await params;
  const width = Number(w);
  if (!PHOTO_KEY.test(key) || !(SMALL_PHOTO_WIDTHS as readonly number[]).includes(width) || String(width) !== w) {
    return new Response(null, { status: 404, headers: { "cache-control": "public, max-age=300" } });
  }

  // api가 준 내용 버전(?v=). 현재 내용과 같은 버전이면 api가 immutable로 답한 것이라 이 응답도 1년 저장한다
  const version = photoVersion(new URL(request.url).searchParams.get("v"));
  const result = await resized(key, width, version);
  if (!result) {
    const query = version ? `?v=${version}` : "";
    return new Response(null, { status: 307, headers: { location: `/photos/${key}${query}`, "cache-control": "no-store" } });
  }
  return new Response(Buffer.from(result.webp, "base64"), {
    headers: {
      "content-type": "image/webp",
      "cache-control": result.immutable ? "public, max-age=31536000, immutable" : "public, max-age=86400",
    },
  });
}

/**
 * api 원본을 받아 폭 width의 webp(base64)로 줄인다. 원본보다 키우지 않는다. 실패하면 null.
 * 같은 사진·폭은 서버 메모리에 두고 다시 쓴다(운영 서버는 라즈베리파이라 줄이는 일이 비싸다). 하루 지나면 원본을 다시 보고, 실패는 1분만 둔다.
 * 품질 82는 기사 사진 줄이기와 같다(원본과 나란히 견줘 정한 값).
 */
async function resized(key: string, width: number, version: string | null): Promise<{ webp: string; immutable: boolean } | null> {
  "use cache";
  try {
    const url = apiUrl(`/api/photos/${key}`);
    if (version) url.searchParams.set("v", version);
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) throw new Error(`api ${res.status}`);
    const input = Buffer.from(await res.arrayBuffer());
    const out = await sharp(input, { limitInputPixels: 4_000_000 })
      .autoOrient()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    cacheLife({ stale: 86_400, revalidate: 86_400, expire: 604_800 });
    return { webp: out.toString("base64"), immutable: /\bimmutable\b/.test(res.headers.get("cache-control") ?? "") };
  } catch (e) {
    console.warn(`[photos] ${key} ${width}px 줄이기 실패:`, e instanceof Error ? e.message : e);
    cacheLife({ stale: 60, revalidate: 60, expire: 120 });
    return null;
  }
}
