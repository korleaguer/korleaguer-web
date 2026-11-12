// 기사 페이지를 공유하면 붙는 미리보기 그림: 언론사·날짜와 제목. 기사 사진은 언론사 것이라 그림에 넣지 않는다.
import { ImageResponse } from "next/og";
import { getNews } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { OG_COLORS, OG_SIZE, OgBrand, ogFonts } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "KOR Leaguer 관련 기사 요약";

/** 제목은 세 줄(한 줄에 한글 23자 안팎)까지. 넘치면 잘라 '…'을 붙인다 */
const MAX_TITLE = 66;

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = /^[1-9]\d{0,14}$/.test(id) ? await getNews(Number(id)) : null;
  const fonts = await ogFonts();
  const news = result?.ok ? result.data : null;
  const fullTitle = news ? (news.titleKo ?? news.title) : "관련 기사";
  const title = fullTitle.length > MAX_TITLE ? `${fullTitle.slice(0, MAX_TITLE - 1).trimEnd()}…` : fullTitle;

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: OG_COLORS.background, fontFamily: "Pretendard" }}>
        <div style={{ display: "flex", width: 20, background: OG_COLORS.accent }} />
        <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "72px 80px 56px" }}>
          {news && (
            <div style={{ fontSize: 32, fontWeight: 700, color: OG_COLORS.muted }}>
              {news.publisher} · {formatDate(news.publishedAt)}
            </div>
          )}
          {/* 한국어는 낱말 중간에서 줄을 바꾸지 않는다(웹의 keep-all). 그림 도구는 keep-all을 몰라서 낱말마다 상자로 감싼다 */}
          <div style={{ display: "flex", flexWrap: "wrap", marginTop: 24, fontSize: 60, fontWeight: 800, letterSpacing: -1.5, lineHeight: 1.35, color: OG_COLORS.foreground }}>
            {title.split(/\s+/).map((word, i) => (
              <span key={i} style={{ marginRight: 16 }}>
                {word}
              </span>
            ))}
          </div>
          <div style={{ display: "flex", flex: 1, alignItems: "flex-end", justifyContent: "space-between" }}>
            <div style={{ fontSize: 30, fontWeight: 700, color: OG_COLORS.accent }}>AI 요약으로 읽기</div>
            <OgBrand scale={0.85} />
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts },
  );
}
