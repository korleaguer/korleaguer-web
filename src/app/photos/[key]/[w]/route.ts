// 작은 선수 사진: /photos/{이름}/{폭}. 표·목록·뉴스 알약의 24~56px 사진 원에 원본(MLB 사진 360px, 장당 약 18KB)을
// 그대로 받던 것을, 화면 배율(2배·3배)에 맞는 폭의 webp(장당 1~5KB)로 줄여 준다(전수조사, 화면은 lib/photo의 smallPhoto).
// api(GET /api/photos/{이름})의 원본을 한 번 받아 줄이고, 줄인 결과는 서버 메모리에 두며 브라우저는 하루 저장한다
// (원본 주소 /photos/{이름}처럼 하루. 선수 사진은 소속이 바뀌면 같은 이름으로 새 사진이 되므로 기사 사진처럼 7일 고정하지 않는다).
// 아무 폭이나 받지 않는다: 정해 둔 폭(SMALL_PHOTO_WIDTHS)과 우리 사진 이름만. 원본보다 키우지 않는다(KBO 사진은 94px).
// 줄이지 못하면 원본 주소로 넘겨서 화면은 원본을 받아 그대로 보인다(원본도 없으면 원본 주소가 404를 주고 화면은 이니셜 원으로).
import { cacheLife } from "next/cache";
import sharp from "sharp";
import { apiUrl } from "@/lib/apiUrl";
import { PHOTO_KEY, SMALL_PHOTO_WIDTHS } from "@/lib/photo";

/** 처음 요청이면 api가 원본을 받는 동안 기다린다(원본 사진 경로와 같다) */
const TIMEOUT_MS = 20_000;

export async function GET(_request: Request, { params }: RouteContext<"/photos/[key]/[w]">) {
  const { key, w } = await params;
  const width = Number(w);
  if (!PHOTO_KEY.test(key) || !(SMALL_PHOTO_WIDTHS as readonly number[]).includes(width) || String(width) !== w) {
    return new Response(null, { status: 404, headers: { "cache-control": "public, max-age=300" } });
  }

  const webp = await resized(key, width);
  if (!webp) {
    return new Response(null, { status: 307, headers: { location: `/photos/${key}`, "cache-control": "no-store" } });
  }
  return new Response(Buffer.from(webp, "base64"), {
    headers: { "content-type": "image/webp", "cache-control": "public, max-age=86400" },
  });
}

/**
 * api 원본을 받아 폭 width의 webp(base64)로 줄인다. 원본보다 키우지 않는다. 실패하면 null.
 * 같은 사진·폭은 서버 메모리에 두고 다시 쓴다(운영 서버는 라즈베리파이라 줄이는 일이 비싸다). 하루 지나면 원본을 다시 보고, 실패는 1분만 둔다.
 * 품질 82는 기사 사진 줄이기와 같다(원본과 나란히 견줘 정한 값).
 */
async function resized(key: string, width: number): Promise<string | null> {
  "use cache";
  try {
    const url = apiUrl(`/api/photos/${key}`);
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) throw new Error(`api ${res.status}`);
    const input = Buffer.from(await res.arrayBuffer());
    const out = await sharp(input, { limitInputPixels: 4_000_000 })
      .autoOrient()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    cacheLife({ stale: 86_400, revalidate: 86_400, expire: 604_800 });
    return out.toString("base64");
  } catch (e) {
    console.warn(`[photos] ${key} ${width}px 줄이기 실패:`, e instanceof Error ? e.message : e);
    cacheLife({ stale: 60, revalidate: 60, expire: 120 });
    return null;
  }
}
