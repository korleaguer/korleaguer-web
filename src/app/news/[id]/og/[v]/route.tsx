// 기사 페이지를 공유하면 붙는 미리보기 그림: 언론사·날짜와 제목. 기사 사진은 언론사 것이라 그림에 넣지 않는다.
import { ImageResponse } from "next/og";
import { getNews } from "@/lib/api";
import { NEWS_ID } from "@/lib/ids";
import { OG_COLORS, OG_SIZE, OgBrand, ogFallbackImage, ogFonts } from "@/lib/og";
import { NEWS_SUMMARY_CUE, newsShareLines } from "@/lib/share";

// 주소: /news/[id]/og/<판 번호>. 판 번호는 배포 커밋(lib/share.ts OG_VERSION)이고 그림에는 쓰지 않는다.
// 카카오톡이 미리보기 그림을 주소 기준으로 저장해 두어서, 배포마다 주소가 바뀌게 판 번호를 넣는다(이슈 #157).
// 페이지의 og:image는 page.tsx의 shareMeta가 이 주소를 가리킨다. 요청 때 그린다(데이터가 매일 바뀜).

/** 제목은 세 줄(한 줄에 한글 23자 안팎)까지. 넘치면 잘라 '…'을 붙인다 */
const MAX_TITLE = 66;

export async function GET(_request: Request, { params }: RouteContext<"/news/[id]/og/[v]">) {
  const { id } = await params;
  const result = NEWS_ID.test(id) ? await getNews(Number(id)) : null;
  const fonts = await ogFonts();
  // 없는 기사·잠깐 못 불러온 경우: 로고만 있는 그림. 예전에는 제목 자리에 '관련 기사'를 그려 아무 기사인 것처럼 보였다
  if (!result?.ok) return ogFallbackImage(fonts);

  // 언론사·날짜 줄과 제목, 'AI 요약으로 읽기'를 그릴지. 페이지의 그림 대체 글(lib/share.ts newsShareImage)도 같은 함수로 만든다
  const { source, title: fullTitle, summary } = newsShareLines(result.data);
  const title = fullTitle.length > MAX_TITLE ? `${fullTitle.slice(0, MAX_TITLE - 1).trimEnd()}…` : fullTitle;

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: OG_COLORS.background, fontFamily: "Pretendard" }}>
        <div style={{ display: "flex", width: 20, background: OG_COLORS.accent }} />
        <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "72px 80px 56px" }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: OG_COLORS.muted }}>
            {/* 글자 조각이 여러 개면 그림 도구가 display:flex를 요구해서(없으면 그림 실패 → 502) 한 문자열로 넣는다 */}
            {source}
          </div>
          {/* 한국어는 낱말 중간에서 줄을 바꾸지 않는다(웹의 keep-all). 그림 도구는 keep-all을 몰라서 낱말마다 상자로 감싼다 */}
          <div style={{ display: "flex", flexWrap: "wrap", marginTop: 24, fontSize: 60, fontWeight: 800, letterSpacing: -1.5, lineHeight: 1.35, color: OG_COLORS.foreground }}>
            {title.split(/\s+/).map((word, i) => (
              <span key={i} style={{ marginRight: 16 }}>
                {word}
              </span>
            ))}
          </div>
          {/* 'AI 요약으로 읽기'는 요약이 있을 때만(요약이 아직 없으면 기사 페이지는 기사 앞부분을 보인다). 없으면 로고만 오른쪽에 */}
          <div style={{ display: "flex", flex: 1, alignItems: "flex-end", justifyContent: summary ? "space-between" : "flex-end" }}>
            {summary && <div style={{ fontSize: 30, fontWeight: 700, color: OG_COLORS.accent }}>{NEWS_SUMMARY_CUE}</div>}
            <OgBrand scale={0.85} />
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts },
  );
}
