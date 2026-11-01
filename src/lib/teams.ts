// 팀 대표 색과 로고 주소. api가 주는 팀 약어(teamAbbr)로 찾고, 모르는 팀이면 회색 점을 쓴다.
// 약어는 api의 TeamNames와 같게 맞췄다(CWS/CHW처럼 쓰는 곳마다 다른 약어도 함께 둔다).
const TEAM_COLORS: Record<string, string> = {
  ARI: "#A71930", AZ: "#A71930",
  ATH: "#003831", OAK: "#003831",
  ATL: "#CE1141",
  BAL: "#DF4601",
  BOS: "#BD3039",
  CHC: "#0E3386",
  CWS: "#27251F", CHW: "#27251F",
  CIN: "#C6011F",
  CLE: "#00385D",
  COL: "#333366",
  DET: "#0C2340",
  HOU: "#EB6E1F",
  KC: "#004687", KCR: "#004687",
  LAA: "#BA0021",
  LAD: "#005A9C",
  MIA: "#00A3E0",
  MIL: "#12284B",
  MIN: "#002B5C",
  NYM: "#002D72",
  NYY: "#0C2340",
  PHI: "#E81828",
  PIT: "#FDB827",
  SD: "#2F241D", SDP: "#2F241D",
  SF: "#FD5A1E", SFG: "#FD5A1E",
  SEA: "#005C5C",
  STL: "#C41E3A",
  TB: "#092C5C", TBR: "#092C5C",
  TEX: "#003278",
  TOR: "#134A8E",
  WSH: "#AB0003", WSN: "#AB0003", WAS: "#AB0003",
};

// 팀 약어 → MLB 팀 번호. 로고 주소에 쓴다. 약어는 위 색 표처럼 쓰는 곳마다 다른 것도 함께 둔다.
const MLB_TEAM_IDS: Record<string, number> = {
  ARI: 109, AZ: 109,
  ATH: 133, OAK: 133,
  ATL: 144,
  BAL: 110,
  BOS: 111,
  CHC: 112,
  CWS: 145, CHW: 145,
  CIN: 113,
  CLE: 114,
  COL: 115,
  DET: 116,
  HOU: 117,
  KC: 118, KCR: 118,
  LAA: 108,
  LAD: 119,
  MIA: 146,
  MIL: 158,
  MIN: 142,
  NYM: 121,
  NYY: 147,
  PHI: 143,
  PIT: 134,
  SD: 135, SDP: 135,
  SF: 137, SFG: 137,
  SEA: 136,
  STL: 138,
  TB: 139, TBR: 139,
  TEX: 140,
  TOR: 141,
  WSH: 120, WSN: 120, WAS: 120,
};

const FALLBACK = "#6B7280";

export function teamColor(teamAbbr: string | null): string {
  return (teamAbbr && TEAM_COLORS[teamAbbr]) || FALLBACK;
}

/**
 * 팀 로고 주소. 모르는 팀이거나 환경변수 NEXT_PUBLIC_TEAM_LOGOS가 "off"이면 null(색 점으로 대신한다).
 * 로고는 MLB 상표라서, 공개하기 전에 허락을 받거나 "off"로 끈다.
 * NEXT_PUBLIC_ 값은 빌드할 때 코드에 박힌다. 바꾸면 다시 빌드해야 한다.
 */
export function teamLogoUrl(teamAbbr: string | null): string | null {
  if (process.env.NEXT_PUBLIC_TEAM_LOGOS === "off") return null;
  const id = teamAbbr ? MLB_TEAM_IDS[teamAbbr] : undefined;
  return typeof id === "number" ? `https://www.mlbstatic.com/team-logos/${id}.svg` : null;
}

/** 팀 색 위에 올릴 글자색. 밝은 색(피츠버그 노랑 등)이면 검정, 아니면 흰색 */
export function textColorOn(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 160 ? "#111111" : "#ffffff";
}
