// KOR Leaguer 로고 '혜성 공': 파란 바탕에 쏘아 올린 흰 공과 꼬리(흰색 → 투명). 100×100 기준 좌표.
// 웹 머리글(LogoMark), 공유 미리보기 그림(og.tsx)이 이 값을 함께 쓴다. 파비콘 원본은 src/app/icon.svg(같은 모양).
// 앱(korleaguer-app)의 assets/brand/mark.svg도 같은 모양이다. 바꾸면 둘 다 바꾼다.

export const LOGO_BLUE = "#2563eb";
/** 꼬리: 공에 접하는 두 점과 왼쪽 아래 끝점을 잇는 삼각형 */
export const LOGO_TAIL = "M51.4 27.4L20 80L72.6 48.6Z";
/** 꼬리 그라데이션: 공 가운데(진함) → 왼쪽 아래(투명) */
export const LOGO_TAIL_FROM = { x: 62, y: 38 };
export const LOGO_TAIL_TO = { x: 22, y: 78 };
export const LOGO_BALL = { cx: 62, cy: 38, r: 15 };

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
    `<defs><linearGradient id="tail" x1="${f.x}" y1="${f.y}" x2="${t.x}" y2="${t.y}" gradientUnits="userSpaceOnUse">` +
    `<stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>` +
    `</linearGradient></defs>` +
    `<rect width="100" height="100" rx="${rx}" fill="${LOGO_BLUE}"/>` +
    `<path d="${LOGO_TAIL}" fill="url(#tail)"/>` +
    `<circle cx="${b.cx}" cy="${b.cy}" r="${b.r}" fill="#fff"/>` +
    `</svg>`
  );
}
