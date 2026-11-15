// 뉴스 탭 '본 때': 선수마다 마지막으로 본 가장 최근 기사의 발행 시각(초). 가입 없이 이 기기 쿠키에 둔다(이슈 #210).
// 서버(화면 그리기)는 이 값으로 새 기사가 있는 선수를 앞에 세우고 점을 찍고, 브라우저(NewsSeenMarker)가 본 뒤 값을 바꾼다.
// 값 모양: "이름:초|이름:초"(이름은 encodeURIComponent). 쿠키가 아예 없으면 처음 온 기기다.

export const NEWS_SEEN_COOKIE = "kl_news_seen";
/** 쿠키 수명: 1년 */
export const NEWS_SEEN_MAX_AGE = 60 * 60 * 24 * 365;
/** 선수 수 상한(이상한 값이 쌓여 쿠키가 커지지 않게) */
const MAX_PLAYERS = 50;

/** 선수 이름 → 마지막으로 본 가장 최근 기사 발행 시각(유닉스 초) */
export type SeenMap = Record<string, number>;

/** 쿠키 값 → 본 때. 쿠키가 없으면 null(처음 온 기기). 이상한 칸은 버린다 */
export function parseSeen(value: string | undefined): SeenMap | null {
  if (value === undefined) return null;
  const out: SeenMap = {};
  for (const part of value.split("|").slice(0, MAX_PLAYERS)) {
    const at = part.lastIndexOf(":");
    if (at <= 0) continue;
    const seconds = Number(part.slice(at + 1));
    if (!Number.isSafeInteger(seconds) || seconds <= 0) continue;
    let name: string;
    try {
      name = decodeURIComponent(part.slice(0, at));
    } catch {
      continue;
    }
    if (name !== "" && name.length <= 50) out[name] = seconds;
  }
  return out;
}

export function serializeSeen(seen: SeenMap): string {
  return Object.entries(seen)
    .slice(0, MAX_PLAYERS)
    .map(([name, seconds]) => `${encodeURIComponent(name)}:${seconds}`)
    .join("|");
}

/** ISO 시각 → 유닉스 초. 모르는 값이면 null */
export function toSeconds(iso: string | null): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? Math.floor(ms / 1000) : null;
}

/**
 * 이 선수에게 지난번에 본 뒤 새 기사가 있나. 처음 온 기기(seen null)는 아무도 새롭지 않다.
 * 본 적 없는 선수(새로 생긴 포스팅 선수 등)는 기사가 있으면 새롭다
 */
export function hasNewSince(seen: SeenMap | null, name: string, latestAt: string | null): boolean {
  if (seen === null) return false;
  const latest = toSeconds(latestAt);
  if (latest === null) return false;
  const last = seen[name];
  return last === undefined || latest > last;
}

/**
 * 이 기사가 지난번에 본 뒤 나왔나(목록의 '새' 표시). 처음 온 기기이거나 본 적 없는 선수면 표시하지 않는다
 * (새로 생긴 선수의 기사가 모두 '새'로 덮이지 않게. 그 선수는 알약의 점으로 알린다)
 */
export function isNewArticle(seen: SeenMap | null, who: readonly string[], publishedAt: string): boolean {
  if (seen === null) return false;
  const at = toSeconds(publishedAt);
  if (at === null) return false;
  return who.some((name) => seen[name] !== undefined && at > seen[name]);
}
