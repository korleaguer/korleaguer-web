// KOR Leaguer 로고 '만루'(11-12 사용자 결정): 남색 상자에 마름모 세 개. 중계 화면 구석의 주자 표시에서 1·2·3루가 모두 켜진 모양이다.
// 한국 선수 전원을 한 화면에 모아 보는 서비스를 '만루'로 나타낸다. 켜진 베이스 뒤로 옅은 빛이 번진다. 100×100 기준 좌표.
// 웹 머리글(LogoMark), 공유 미리보기 그림(og.tsx)이 이 값을 함께 쓴다. 파비콘 원본은 src/app/icon.svg(같은 모양).
// 앱(korleaguer-app)의 assets/brand/mark.svg도 같은 모양이다. 바꾸면 둘 다 바꾼다.

/** 바탕 그러데이션: 왼쪽 위(남색) → 오른쪽 아래(거의 검은 남색) */
export const LOGO_BG_FROM = "#16306e";
export const LOGO_BG_TO = "#060d22";
/** 베이스(45도 돌린 둥근 정사각형) 한 변과 모서리 둥글기 */
export const LOGO_BASE_SIDE = 19;
export const LOGO_BASE_RADIUS = 2.28;
/** 베이스 가운데: 2루(위), 1루(오른쪽), 3루(왼쪽). 사이 간격 3.6, 세 개 묶음이 상자 가운데에 오게 */
export const LOGO_BASES = [
  { x: 50, y: 41.76 },
  { x: 65.24, y: 57 },
  { x: 34.76, y: 57 },
] as const;
/** 켜진 베이스 뒤로 번지는 빛 색(흐림 3.2, 불투명도 0.55) */
export const LOGO_GLOW = "#7fb0ff";

function baseRects(fill: string): string {
  const s = LOGO_BASE_SIDE;
  return LOGO_BASES.map(
    (b) =>
      `<rect x="${b.x - s / 2}" y="${b.y - s / 2}" width="${s}" height="${s}" rx="${LOGO_BASE_RADIUS}" ` +
      `transform="rotate(45 ${b.x} ${b.y})" fill="${fill}"/>`,
  ).join("");
}

/**
 * 로고 SVG 문자열. rx는 100 기준 모서리 둥글기(0이면 꽉 찬 정사각형).
 * 공유 미리보기 그림처럼 React 요소를 못 쓰는 곳에서 data: 주소로 넣는다.
 */
export function logoSvg(rx = 0): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">` +
    `<defs>` +
    `<linearGradient id="bg" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">` +
    `<stop offset="0" stop-color="${LOGO_BG_FROM}"/><stop offset="1" stop-color="${LOGO_BG_TO}"/></linearGradient>` +
    `<filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3.2"/></filter>` +
    `</defs>` +
    `<rect width="100" height="100" rx="${rx}" fill="url(#bg)"/>` +
    `<g filter="url(#glow)" opacity=".55">${baseRects(LOGO_GLOW)}</g>` +
    baseRects("#fff") +
    `</svg>`
  );
}
