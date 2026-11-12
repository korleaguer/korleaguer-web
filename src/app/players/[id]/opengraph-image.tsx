// 선수 페이지를 공유하면 붙는 미리보기 그림: 팀 색 띠, 사진, 이름, 팀·포지션, 시즌 핵심 기록 세 칸(선수 목록 카드와 같은 칸).
// 선수 페이지 머리 카드(PlayerHeader)를 그림으로 옮긴 모양이다.
import { ImageResponse } from "next/og";
import { getPlayer } from "@/lib/api";
import { OG_COLORS, OG_SIZE, OgBrand, mixHex, ogFonts, photoDataUrl } from "@/lib/og";
import { seasonStats } from "@/lib/seasonStats";
import { teamColor } from "@/lib/teams";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "KOR Leaguer 선수 기록";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = /^[1-9]\d{0,9}$/.test(id) ? await getPlayer(Number(id)) : null;
  const fonts = await ogFonts();
  if (!result?.ok) return fallback(fonts);

  const { player, season, hitting, pitching } = result.data;
  const color = teamColor(player.teamAbbr);
  const photo = await photoDataUrl(player.photoUrl);
  const stats = seasonStats(player, hitting, pitching);
  const team = player.returnedKo ? `${player.returnedKo} 복귀` : player.teamKo;
  const subline = [team, player.positionKo, player.freeAgent && !player.returnedKo ? "FA" : null].filter(Boolean).join(" · ");

  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: OG_COLORS.background, fontFamily: "Pretendard" }}>
        {/* 팀 색 띠(웹 .team-band: 팀 색에서 옅은 색으로) */}
        <div style={{ display: "flex", height: 200, background: `linear-gradient(120deg, ${color}, ${mixHex(color, "#ffffff", 0.55)})` }} />
        <div style={{ display: "flex", flex: 1, padding: "0 72px 56px", gap: 48 }}>
          <div
            style={{
              display: "flex",
              width: 256,
              height: 256,
              marginTop: -128,
              borderRadius: 128,
              border: "8px solid #ffffff",
              background: "#f4f5f7",
              overflow: "hidden",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {photo ? (
              <img src={photo} width={240} height={240} style={{ objectFit: "cover" }} alt="" />
            ) : (
              <div style={{ fontSize: 110, fontWeight: 800, color: OG_COLORS.muted }}>{player.nameKo.slice(0, 1)}</div>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", flex: 1, paddingTop: 28 }}>
            <div style={{ fontSize: 84, fontWeight: 800, letterSpacing: -2, color: OG_COLORS.foreground, lineHeight: 1.1 }}>
              {player.nameKo}
            </div>
            {subline && <div style={{ marginTop: 14, fontSize: 36, fontWeight: 700, color: OG_COLORS.muted }}>{subline}</div>}
            <div style={{ display: "flex", flex: 1, alignItems: "flex-end", justifyContent: "space-between" }}>
              {stats ? (
                <div style={{ display: "flex", gap: 56 }}>
                  {stats.map((s) => (
                    <div key={s.label} style={{ display: "flex", flexDirection: "column" }}>
                      <div style={{ fontSize: 28, fontWeight: 700, color: OG_COLORS.muted }}>{s.label}</div>
                      <div style={{ fontSize: 72, fontWeight: 800, letterSpacing: -2, color: OG_COLORS.foreground, lineHeight: 1.1 }}>
                        {s.value}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 32, fontWeight: 700, color: OG_COLORS.muted }}>{season} 시즌 기록 모아보기</div>
              )}
              <OgBrand scale={0.85} />
            </div>
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts },
  );
}

/** 없는 선수·잠깐 못 불러온 경우: 로고만 있는 기본 그림 */
function fallback(fonts: Awaited<ReturnType<typeof ogFonts>>) {
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", background: OG_COLORS.page, fontFamily: "Pretendard" }}>
        <OgBrand scale={2} />
      </div>
    ),
    { ...OG_SIZE, fonts },
  );
}
