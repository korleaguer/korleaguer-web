// 선수 페이지 공유 카드 그림(한국인 순위 카드, 이슈 #381): 1080×1350(4:5). 공유 창이 미리보기로 보이고, '그림 보내기'가 이 그림을 파일로 보낸다.
// 사진·팀 색·로고 없이 순위 목록과 선수만 그린다(사진 권리 걱정 없음). 카드 안에는 설명 글을 넣지 않는다: 큰 글씨, 순위 목록, 막대(끊김 표시), 출처 줄뿐이다.
// 주소: /players/[id]/og/card/<판 번호>. 판 번호는 배포 커밋(lib/share.ts OG_VERSION)이고 그림에는 쓰지 않는다(옛 그림이 남지 않게).
import { ImageResponse } from "next/og";
import { parseId } from "@/lib/ids";
import { OG_COLORS, OgBrand, ogFonts } from "@/lib/og";
import { SITE_URL } from "@/lib/share";
import { getShareCard } from "@/lib/shareCard";

const SIZE = { width: 1080, height: 1350 };
/** 선수 줄 막대 색(웹 파랑)과 다른 줄 막대 색 */
const BAR_ME = OG_COLORS.accent;
const BAR_OTHER = "#d3d8e0";

export async function GET(_request: Request, { params }: RouteContext<"/players/[id]/og/card/[v]">) {
  const playerId = parseId((await params).id);
  const card = playerId == null ? null : await getShareCard(playerId);
  // 카드를 만들 수 없는 선수: 공유 창이 그림 대신 링크 복사만 보인다. 잠깐의 api 오류가 오래 남지 않게 저장하지 않는다
  if (!card) return new Response("카드를 만들 수 없어요", { status: 404, headers: { "cache-control": "no-store" } });
  const fonts = await ogFonts();
  const url = `${SITE_URL.replace(/^https?:\/\//, "")}/players/${playerId}`;

  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: "#ffffff", fontFamily: "Pretendard", padding: "80px 72px 0" }}>
        <div style={{ fontSize: 34, fontWeight: 700, color: OG_COLORS.muted }}>{card.title}</div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 24 }}>
          <div style={{ fontSize: 112, fontWeight: 800, letterSpacing: -3, color: OG_COLORS.foreground, lineHeight: 1.12 }}>{card.name}</div>
          <div style={{ fontSize: 112, fontWeight: 800, letterSpacing: -3, color: OG_COLORS.foreground, lineHeight: 1.12 }}>{card.headline}</div>
        </div>
        <div style={{ marginTop: 22, fontSize: 40, fontWeight: 700, color: OG_COLORS.muted }}>{card.sub}</div>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center", gap: 30, paddingBottom: 20 }}>
          {card.rows.map((row) => (
            <div key={`${row.rank}-${row.name}`} style={{ display: "flex", alignItems: "center", gap: 22 }}>
              <div style={{ display: "flex", width: 44, fontSize: 34, fontWeight: 700, color: row.me ? BAR_ME : OG_COLORS.muted }}>{row.rank}</div>
              <div style={{ display: "flex", width: 190, fontSize: 40, fontWeight: row.me ? 800 : 700, color: row.me ? BAR_ME : OG_COLORS.foreground }}>{row.name}</div>
              <div style={{ display: "flex", position: "relative", flex: 1, height: 22 }}>
                <div style={{ display: "flex", width: `${Math.round(row.ratio * 100)}%`, height: 22, borderRadius: 11, background: row.me ? BAR_ME : BAR_OTHER }} />
                {row.broken && (
                  // 끊김 표시: 막대 끝쪽에 흰 사선 두 줄(설명 글 대신)
                  <div style={{ display: "flex", position: "absolute", left: "80%", top: -6, width: 34, height: 34 }}>
                    <div style={{ position: "absolute", left: 4, top: 0, width: 8, height: 34, background: "#ffffff", transform: "rotate(22deg)" }} />
                    <div style={{ position: "absolute", left: 20, top: 0, width: 8, height: 34, background: "#ffffff", transform: "rotate(22deg)" }} />
                  </div>
                )}
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", minWidth: 150, fontSize: 40, fontWeight: row.me ? 800 : 700, color: row.me ? BAR_ME : OG_COLORS.foreground }}>{row.value}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: `3px solid ${OG_COLORS.line}`, height: 150 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <OgBrand scale={0.8} />
            <div style={{ fontSize: 26, fontWeight: 700, color: OG_COLORS.muted }}>{card.source}</div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: OG_COLORS.accent }}>{url}</div>
        </div>
      </div>
    ),
    {
      ...SIZE,
      fonts,
      // x-card-alt: 공유 창이 그림 대체 글로 쓴다(한글이라 주소 인코딩)
      headers: { "cache-control": "public, max-age=300, must-revalidate", "x-card-alt": encodeURIComponent(card.alt) },
    },
  );
}
