// 공유 미리보기 그림(og:image) 공통 부품. 카톡·문자·SNS에 링크를 보내면 이 그림이 카드로 붙는다.
// 그림은 next/og(ImageResponse)가 서버에서 그린다. 한글을 그리려면 글꼴 파일을 직접 넘겨야 해서 Pretendard OTF를 읽는다
// (WOFF2는 못 읽는다). 운영 이미지(standalone)에 이 파일이 들어가게 next.config의 outputFileTracingIncludes에 적어 두었다.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

/** 카톡·페이스북·X가 권하는 큰 카드 크기(1.91:1) */
export const OG_SIZE = { width: 1200, height: 630 };

export const OG_COLORS = {
  background: "#ffffff",
  page: "#eef0f3",
  foreground: "#111827",
  muted: "#5b6270",
  accent: "#2563eb",
  line: "#eceef1",
};

const FONT_DIR = join(process.cwd(), "node_modules/pretendard/dist/public/static");

let fonts: Promise<{ name: string; data: Buffer; weight: 700 | 800; style: "normal" }[]> | null = null;

/** Pretendard 굵게(700)·더 굵게(800). 처음 한 번만 읽고 서버가 켜져 있는 동안 다시 쓴다 */
export function ogFonts() {
  fonts ??= Promise.all([
    readFile(join(FONT_DIR, "Pretendard-Bold.otf")),
    readFile(join(FONT_DIR, "Pretendard-ExtraBold.otf")),
  ]).then(([bold, extraBold]) => [
    { name: "Pretendard", data: bold, weight: 700 as const, style: "normal" as const },
    { name: "Pretendard", data: extraBold, weight: 800 as const, style: "normal" as const },
  ]);
  return fonts;
}

/** 오른쪽 아래 'K KOR Leaguer' 표시(웹 머리글 로고와 같은 모양) */
export function OgBrand({ scale = 1 }: { scale?: number }) {
  const box = 52 * scale;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 * scale }}>
      <div
        style={{
          width: box,
          height: box,
          borderRadius: 16 * scale,
          background: OG_COLORS.accent,
          color: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 30 * scale,
          fontWeight: 800,
        }}
      >
        K
      </div>
      <div style={{ fontSize: 36 * scale, fontWeight: 800, letterSpacing: -1 * scale, color: OG_COLORS.foreground }}>
        KOR Leaguer
      </div>
    </div>
  );
}

/** 두 색을 섞는다(웹 .team-band의 color-mix와 같은 띠를 그리려고). amount는 b의 비율 */
export function mixHex(a: string, b: string, amount: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const channel = (shift: number) => {
    const x = (pa >> shift) & 255;
    const y = (pb >> shift) & 255;
    return Math.round(x + (y - x) * amount);
  };
  return `#${[16, 8, 0].map((s) => channel(s).toString(16).padStart(2, "0")).join("")}`;
}

/**
 * 선수 사진을 그림에 넣을 수 있게 PNG data: 주소로 받는다. 우리가 호스팅하는 사진(/photos/…)은 api에서 바로 받는다
 * (웹의 /photos 경로와 같은 곳). 못 받으면 null(이름 첫 글자 원으로 대신한다).
 */
export async function photoDataUrl(photoUrl: string | null): Promise<string | null> {
  if (!photoUrl) return null;
  const key = /^\/photos\/([a-z0-9-]{1,60})$/.exec(photoUrl)?.[1];
  const url = key
    ? new URL(`/api/photos/${key}`, process.env.API_BASE_URL ?? "http://localhost:8080")
    : /^https?:\/\//i.test(photoUrl)
      ? new URL(photoUrl)
      : null;
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5_000) });
    if (!res.ok) return null;
    if (!(res.headers.get("content-type") ?? "").startsWith("image/")) return null;
    // 우리 사진은 WebP인데 그림 도구가 WebP를 못 그려서(빈 칸이 된다) PNG로 바꾼다. 그림 속 사진 원(240px)의 두 배 크기로 줄여 둔다
    const png = await sharp(Buffer.from(await res.arrayBuffer()))
      .resize(480, 480, { fit: "cover", position: "top" })
      .png()
      .toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}
