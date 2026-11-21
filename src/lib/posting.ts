import type { PostingPast, PostingPlayer, PostingStatus, PostingSummary } from "@/lib/api";
import { uniqueByUrl } from "@/lib/news";

/** 지금 포스팅 제도의 협상 기간(일) */
const WINDOW_DAYS = 30;

/** 상태 이름. 줄인 카드(MlbChallengeCompact)와 창 본문(PostingSheetBody)이 같은 말을 쓴다 */
export const STATUS_LABEL: Record<PostingStatus, string> = {
  UPCOMING: "협상 시작 전",
  NEGOTIATING: "협상 중",
  SIGNED: "계약",
  NO_DEAL: "결렬",
  CLOSED: "결과 확인 중",
};

/** 남은 날 글자: 마감 당일 '오늘', 아니면 'D-19'. 화면 낭독기용 글은 줄마다 다르다 */
export const dDayText = (daysLeft: number) => (daysLeft === 0 ? "오늘" : `D-${daysLeft}`);

/** 1억 1,300만 달러 · 800만 달러 */
export function formatUsd(usd: number): string {
  const man = Math.round(usd / 10_000);
  const eok = Math.floor(man / 10_000);
  const rest = man % 10_000;
  const parts = [eok > 0 ? `${eok}억` : "", rest > 0 ? `${rest.toLocaleString("ko-KR")}만` : ""].filter(Boolean);
  return `${parts.join(" ")} 달러`;
}

/**
 * 원화 어림값: 1억 원 이상은 억 단위로 반올림(1,480억 원 · 1조 2,000억 원), 그보다 작으면 만 단위(5,900만 원).
 * 합의일 환율로 계산한 '대략'이라 앞에 '약'을 붙여 쓴다.
 */
function formatKrw(won: number): string {
  if (won < 100_000_000) return `${Math.round(won / 10_000).toLocaleString("ko-KR")}만 원`;
  const eokTotal = Math.round(won / 100_000_000);
  const jo = Math.floor(eokTotal / 10_000);
  const eok = eokTotal % 10_000;
  const parts = [jo > 0 ? `${jo}조` : "", eok > 0 ? `${eok.toLocaleString("ko-KR")}억` : ""].filter(Boolean);
  return `${parts.join(" ")} 원`;
}

/** 미국 동부 날짜 "2026-12-01" */
function etDate(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function dayDiff(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

export const isOpen = (p: PostingPlayer) => p.status === "NEGOTIATING" || p.status === "UPCOMING";

/** 포스팅으로 계약한 선수 한 명: 지난 겨울에 계약한 선수, 또는 올해 계약한 포스팅 선수 */
export interface Signing {
  key: string;
  nameKo: string;
  season: number;
  teamKo: string | null;
  /** 마감 며칠 전에 합의했나(미국 날짜, 마감 당일 0) */
  days: number;
  /** 보장 연수 */
  years: number;
  /** 보장액(달러). 순위와 막대 길이에 쓴다 */
  amount: number;
  /** "1억 1,300만 달러" */
  usd: string;
  /** 합의일 환율로 어림한 원화 "약 1,480억 원". 환율을 모르면 null(달러만 보인다) */
  krw: string | null;
  thisYear: boolean;
  /** 지난 선수는 계약 구단 시절 MLB 사진의 흰 바탕 편집본(/photos/posting-…), 올해 계약한 선수는 KBO 공식 사진. 없으면 null(회색 원 + 이름) */
  photoUrl: string | null;
}

/** 계약 규모: 연수, 달러 보장액, 합의일 환율로 어림한 원화 */
function money(years: number, usd: number, krwPerUsd: number | null): Pick<Signing, "years" | "amount" | "usd" | "krw"> {
  return { years, amount: usd, usd: formatUsd(usd), krw: krwPerUsd ? `약 ${formatKrw(usd * krwPerUsd)}` : null };
}

/** 지난 포스팅 계약(2012~, 제도를 나누지 않는다). 결렬은 넣지 않는다(사용자 결정 11-11) */
function pastSignings(history: PostingPast[]): Signing[] {
  return history.flatMap((h) => {
    const d = h.deal;
    if (!d || h.daysBeforeDeadline == null || d.years == null || d.guaranteedUsd == null) return [];
    return [
      {
        key: `${h.nameKo}-${h.season}`,
        nameKo: h.nameKo,
        season: h.season,
        teamKo: d.mlbTeamKo,
        days: h.daysBeforeDeadline,
        ...money(d.years, d.guaranteedUsd, d.krwPerUsd),
        thisYear: false,
        photoUrl: h.photoUrl ?? null,
      },
    ];
  });
}

/** 올해 계약한 포스팅 선수(합의 보도일 → 협상 마감일, 미국 날짜). 결렬·결과 확인 중은 넣지 않는다 */
function thisYearSignings(players: PostingPlayer[]): Signing[] {
  return players.flatMap((p) => {
    const d = p.deal;
    if (p.status !== "SIGNED" || !d?.agreedOn || d.years == null || d.guaranteedUsd == null) return [];
    const days = dayDiff(d.agreedOn, etDate(p.deadlineAt));
    if (days < 0 || days > WINDOW_DAYS) return [];
    return [
      {
        key: `now-${p.nameKo}`,
        nameKo: p.nameKo,
        season: Number(etDate(p.windowOpensAt).slice(0, 4)),
        teamKo: d.mlbTeamKo,
        days,
        ...money(d.years, d.guaranteedUsd, d.krwPerUsd),
        thisYear: true,
        photoUrl: p.photoUrl,
      },
    ];
  });
}
/** 역대 순위: 보장액이 더 큰 계약 수 + 1(같은 금액은 공동 순위, 리뷰 #235) */
export function historyRank(signings: Signing[], amount: number): number {
  return signings.filter((s) => s.amount > amount).length + 1;
}

/** 카드 안 선수 순서: 협상 중·시작 전(마감 가까운 순) → 계약 → 결과 확인 중 → 결렬 */
function rank(p: PostingPlayer): number {
  if (isOpen(p)) return 0;
  return p.status === "SIGNED" ? 1 : p.status === "CLOSED" ? 2 : 3;
}

/** 여러 명이어도 관련 기사는 이만큼까지(서버는 선수마다 12건) */
const NEWS_MAX = 12;

/**
 * 관련 기사. 여러 명이면 모두의 기사를 모아(같은 기사는 읽을거리가 많은 사본 하나) 선수 이름을 붙이고 늦은 순으로 둔다.
 * 기사 수는 서버가 정한다(선수마다 최대 12건).
 */
function newsOf(players: PostingPlayer[]) {
  const multi = players.length > 1;
  return uniqueByUrl(
    players.flatMap((p) => p.news.map((n) => ({ ...n, who: multi ? p.nameKo : null, playerPhotoUrl: p.photoUrl }))),
  )
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, NEWS_MAX);
}

/**
 * 줄인 카드(MlbChallengeCompact)와 그 창 본문(PostingSheetBody)이 같이 쓰는 포스팅 상태 계산.
 * 두 곳이 따로 계산하면 줄에는 있는데 창에는 없는 말이 생긴다(#384 리뷰).
 */
export function derivePosting(posting: PostingSummary) {
  const players = [...posting.players].sort((a, b) => rank(a) - rank(b) || (a.daysLeft ?? 99) - (b.daysLeft ?? 99));
  // 보장액 순위. 같으면 최근 계약이 위
  const signings = [...thisYearSignings(players), ...pastSignings(posting.history)].sort(
    (a, b) => b.amount - a.amount || b.season - a.season,
  );
  // 역대 계약은 올해 계약한 선수가 있을 때만(협상 중·결렬이면 보이지 않는다)
  const signedNow = signings.some((s) => s.thisYear);
  /** 올해 계약한 선수의 역대 순위(보장액 순, 같은 금액은 공동 순위). 순위에 없으면 null */
  const rankOf = (nameKo: string) => {
    const s = signings.find((x) => x.thisYear && x.nameKo === nameKo);
    return s ? historyRank(signings, s.amount) : null;
  };
  return {
    players,
    /** 포스팅 선수가 한 명일 때 그 선수 */
    single: players.length === 1 ? players[0] : null,
    signings,
    signedNow,
    rankOf,
    news: newsOf(players),
  };
}
