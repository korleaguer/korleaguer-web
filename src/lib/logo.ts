// KOR Leaguer 로고 '혜성 공'(11-12 A1): 파랑 그러데이션 바탕에 쏘아 올린 큰 흰 공과 휘어진 꼬리(흰색 → 투명). 100×100 기준 좌표.
// 웹 머리글(LogoMark), 공유 미리보기 그림(og.tsx)이 이 값을 함께 쓴다. 파비콘 원본은 src/app/icon.svg(같은 모양).
// 앱(korleaguer-app)의 assets/brand/mark.svg도 같은 모양이다. 바꾸면 둘 다 바꾼다.

/** 바탕 그러데이션: 왼쪽 위(밝은 파랑) → 오른쪽 아래(진한 파랑) */
export const LOGO_BG_FROM = "#4d8bff";
export const LOGO_BG_TO = "#1c46d6";
/** 꼬리: 공에 접하는 두 점에서 왼쪽 아래 끝점까지, 위쪽 가장자리가 더 부푼 곡선 */
export const LOGO_TAIL = "M48 26.6Q25.5 50.1 16 86Q42.7 66.5 74 51.4Z";
/** 꼬리 그라데이션: 공 쪽(진함) → 왼쪽 아래(투명) */
export const LOGO_TAIL_FROM = { x: 62, y: 38 };
export const LOGO_TAIL_TO = { x: 18, y: 84 };
export const LOGO_BALL = { cx: 61, cy: 39, r: 18 };

/**
 * 로고 SVG 문자열. rx는 100 기준 모서리 둥글기(0이면 꽉 찬 정사각형).
 * 공유 미리보기 그림처럼 React 요소를 못 쓰는 곳에서 data: 주소로 넣는다.
 */
export function logoSvg(rx = 0): string {
  const f = LOGO_TAIL_FROM;
  const t = LOGO_TAIL_TO;
  const b = LOGO_BALL;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">` +
    `<defs>` +
    `<linearGradient id="bg" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">` +
    `<stop offset="0" stop-color="${LOGO_BG_FROM}"/><stop offset="1" stop-color="${LOGO_BG_TO}"/></linearGradient>` +
    `<linearGradient id="tail" x1="${f.x}" y1="${f.y}" x2="${t.x}" y2="${t.y}" gradientUnits="userSpaceOnUse">` +
    `<stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>` +
    `</defs>` +
    `<rect width="100" height="100" rx="${rx}" fill="url(#bg)"/>` +
    `<path d="${LOGO_TAIL}" fill="url(#tail)"/>` +
    `<circle cx="${b.cx}" cy="${b.cy}" r="${b.r}" fill="#fff"/>` +
    `</svg>`
  );
}
