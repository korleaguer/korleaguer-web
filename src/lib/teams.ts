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

// MLB 팀 번호 → 팀 색. 번호만 아는 곳(포스팅 계약 구단 등)에서 쓴다. 같은 번호의 다른 약어는 색도 같다.
const COLOR_BY_TEAM_ID: Record<number, string> = Object.fromEntries(
  Object.entries(MLB_TEAM_IDS).map(([abbr, id]) => [id, TEAM_COLORS[abbr] ?? FALLBACK]),
);

/** MLB 팀 번호로 팀 색. 모르는 번호면 회색 */
export function teamColorById(teamId: number | null | undefined): string {
  return (teamId != null && COLOR_BY_TEAM_ID[teamId]) || FALLBACK;
}

/**
 * 팀 로고 주소. 모르는 팀이거나 환경변수 NEXT_PUBLIC_TEAM_LOGOS가 "off"이면 null(색 점으로 대신한다).
 * 로고는 MLB 상표라서, 공개하기 전에 허락을 받거나 "off"로 끈다.
 * NEXT_PUBLIC_ 값은 빌드할 때 코드에 박힌다. 바꾸면 다시 빌드해야 한다.
 */
export function teamLogoUrl(teamAbbr: string | null): string | null {
  return teamLogoUrlById(teamAbbr ? MLB_TEAM_IDS[teamAbbr] : null);
}

/** 팀 번호로 로고 주소(마이너 팀도 MLB 공식 로고 주소에 있다). 번호를 모르거나 로고를 껐으면 null */
export function teamLogoUrlById(teamId: number | null | undefined): string | null {
  if (process.env.NEXT_PUBLIC_TEAM_LOGOS === "off") return null;
  return typeof teamId === "number" ? `https://www.mlbstatic.com/team-logos/${teamId}.svg` : null;
}

/** WCAG 상대 휘도(0 검정 ~ 1 흰색) */
function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

/**
 * 팀 색 위에 올릴 글자색(사진이 없을 때 이니셜). 흰색과 검정(#111111) 가운데 그 색과 대비가 더 큰 쪽.
 * 예전에는 밝기 공식(160 넘으면 검정)으로 골라 마이애미 하늘색·샌프란시스코·휴스턴 주황·볼티모어 주황의 흰 글자가
 * 2.87~4.19:1이었다(WCAG 1.4.3, 전수조사). 이제 30색 모두 4.5:1 이상이고, 바뀌는 건 그 네 팀뿐이다.
 */
export function textColorOn(hex: string): string {
  const l = luminance(hex);
  const onWhite = 1.05 / (l + 0.05);
  const onBlack = (l + 0.05) / (luminance("#111111") + 0.05);
  return onBlack > onWhite ? "#111111" : "#ffffff";
}

/** 어두운 모드에서 카드·점수 띠 바탕 가운데 가장 밝은 색(--surface-2). 팀 색 원·고리는 이 색과 3:1 이상이어야 보인다(WCAG 1.4.11) */
const DARK_CARD = "#222731";
/** 3:1이 모자란 어두운 팀을 밝힐 때 흰색을 섞는 몫(sRGB). 36~40% 범위, 어두운 팀 모두 3:1을 넘는다(11-21 사용자 결정) */
const DARK_LIFT = 0.38;

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function mixWhite(hex: string, share: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (shift: number) => Math.round(((n >> shift) & 255) * (1 - share) + 255 * share);
  return `#${[16, 8, 0].map((s) => ch(s).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

/**
 * 선수 사진 원 바탕·이니셜 원·경기 카드 로고 고리에 칠할 팀 색(밝은 모드 / 어두운 모드). 모르는 팀이면 null.
 * 어두운 모드에서 카드와 3:1이 안 나오는 어두운 팀(남색·갈색·검정 계열)만 밝힌다. 샌프란시스코 같은 밝은 팀은 그대로다
 * (밝히면 활약 주황과 헷갈린다). lightText·darkText는 그 색 위에 올릴 이니셜 글자색이다
 */
export function teamFill(
  teamAbbr: string | null,
): { light: string; dark: string; lightText: string; darkText: string } | null {
  if (!teamAbbr || !TEAM_COLORS[teamAbbr]) return null;
  const light = TEAM_COLORS[teamAbbr];
  const dark = contrast(light, DARK_CARD) < 3 ? mixWhite(light, DARK_LIFT) : light;
  return { light, dark, lightText: textColorOn(light), darkText: textColorOn(dark) };
}

// KBO 구단 대표 색(한글 구단 이름으로 찾는다). 포스팅 선수 원·선수 페이지 과거 소속팀 띠에 쓴다.
const KBO_COLORS: Record<string, string> = {
  "한화 이글스": "#FC4E00",
  "LG 트윈스": "#C30452",
  "키움 히어로즈": "#570514",
  "SSG 랜더스": "#CE0E2D",
  "KIA 타이거즈": "#EA0029",
  "삼성 라이온즈": "#074CA1",
  "두산 베어스": "#131230",
  "롯데 자이언츠": "#041E42",
  "NC 다이노스": "#315288",
  "KT 위즈": "#000000",
};

/** KBO 구단 대표 색. 모르는 구단이면 회색 */
export function kboTeamColor(team: string | null | undefined): string {
  return (team && KBO_COLORS[team]) || "#8a919c";
}
