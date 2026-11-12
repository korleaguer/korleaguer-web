// 사이트 기본 미리보기 그림(홈·선수 목록·내 선수 등 따로 그림이 없는 화면). 선수·기사 화면은 각자 그림이 있다.
import { ImageResponse } from "next/og";
import { OG_COLORS, OG_SIZE, OgBrand, ogFonts } from "@/lib/og";
import { SITE_IMAGE_ALT, ogImageMetadata } from "@/lib/share";

// 그림 주소는 /…/opengraph-image/<배포 커밋>이다. 배포마다 주소가 바뀌어 카톡이 옛 그림을 쓰지 않는다(lib/share.ts OG_VERSION).
export function generateImageMetadata() {
  return ogImageMetadata(SITE_IMAGE_ALT);
}

export default async function Image() {
  const fonts = await ogFonts();
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          padding: "0 96px",
          background: `linear-gradient(135deg, ${OG_COLORS.page}, #dfe8ff)`,
          fontFamily: "Pretendard",
        }}
      >
        <OgBrand scale={2.2} />
        <div style={{ marginTop: 44, fontSize: 52, fontWeight: 800, letterSpacing: -1.5, color: OG_COLORS.foreground }}>
          해외파 한국 선수 기록을 한눈에
        </div>
        <div style={{ marginTop: 16, fontSize: 34, fontWeight: 700, color: OG_COLORS.muted }}>
          최근 경기 한 줄 기록 · 시즌 성적 · MLB 도전
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts },
  );
}
