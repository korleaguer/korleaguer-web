import type { CSSProperties } from "react";
import type { LinkedTeams as LinkedTeamCounts, PostingPast, PostingPlayer, PostingStatus, PostingSummary } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { uniqueByUrl } from "@/lib/news";
import Section from "@/components/Section";
import TeamMark from "@/components/TeamMark";
import { kboTeamColor, teamColor, teamLogoUrl } from "@/lib/teams";
import HistoryToggle from "@/components/home/HistoryToggle";
import KboAvatar from "@/components/home/KboAvatar";
import { PostingDot } from "@/components/home/PostingDot";
import PostingNews from "@/components/home/PostingNews";
import { cacheLife } from "next/cache";

/** 지금 포스팅 제도의 협상 기간(일) */
const WINDOW_DAYS = 30;
/** '마감 직전'으로 묶는 날 수(화면 읽기용 역대 계약 시점 한 문장) */
const NEAR_DEADLINE = 4;
/**
 * 역대 계약 순위 막대의 길이 규칙: 금액이 2배면 막대는 1.5배(사용자 결정 11-11).
 * 정비례면 1위(이정후 1억 1,300만 달러) 말고는 막대가 짧아 아래 선수끼리 차이가 안 보인다. 길이 = (금액 / 1위 금액)^지수
 */
const BAR_EXPONENT = Math.log2(1.5);
/** 아무리 작은 계약도 막대가 점처럼 사라지지 않게 */
const BAR_MIN_SHARE = 0.04;

const STATUS: Record<PostingStatus, { label: string; className: string }> = {
  UPCOMING: { label: "협상 시작 전", className: "bg-fa-bg text-fa-fg" },
  NEGOTIATING: { label: "포스팅 협상 중", className: "bg-fa-bg text-fa-fg" },
  SIGNED: { label: "계약", className: "bg-success-bg text-success-fg" },
  NO_DEAL: { label: "결렬", className: "bg-neutral-pill text-neutral-pill-fg" },
  CLOSED: { label: "결과 확인 중", className: "bg-neutral-pill text-neutral-pill-fg" },
};

/** 그 시간대의 월·일·요일·시 */
function parts(iso: string, timeZone: string) {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const get = (t: string) => f.find((x) => x.type === t)?.value ?? "";
  const days: Record<string, string> = { Sun: "일", Mon: "월", Tue: "화", Wed: "수", Thu: "목", Fri: "금", Sat: "토" };
  const hour = Number(get("hour")) % 24;
  const clock = `${hour < 12 ? "오전" : "오후"} ${hour % 12 === 0 ? 12 : hour % 12}시`;
  return { md: `${get("month")}월 ${get("day")}일`, weekday: days[get("weekday")] ?? "", clock };
}

/** "12월 2일(수) 오전 7시"(한국 시간) */
function deadlineKst(iso: string): string {
  const p = parts(iso, "Asia/Seoul");
  return `${p.md}(${p.weekday}) ${p.clock}`;
}

/** "12월 1일 오후 5시"(미국 동부) */
function deadlineUs(iso: string): string {
  const p = parts(iso, "America/New_York");
  return `${p.md} ${p.clock}`;
}

/** "11월 2일"(한국 날짜) */
const kstDay = (iso: string) => parts(iso, "Asia/Seoul").md;

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
export function formatKrw(won: number): string {
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

const isOpen = (p: PostingPlayer) => p.status === "NEGOTIATING" || p.status === "UPCOMING";

/** 포스팅으로 계약한 선수 한 명: 지난 겨울에 계약한 선수, 또는 올해 계약한 포스팅 선수 */
interface Signing {
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
/** 카드 안 선수 순서: 협상 중·시작 전(마감 가까운 순) → 계약 → 결과 확인 중 → 결렬 */
function rank(p: PostingPlayer): number {
  if (isOpen(p)) return 0;
  return p.status === "SIGNED" ? 1 : p.status === "CLOSED" ? 2 : 3;
}

/**
 * 비시즌 홈 맨 위: 이번 겨울 MLB에 도전하는(포스팅된) KBO 선수.
 * 포스팅 선수가 몇 명이든 카드 한 장에 모은다(사용자 결정 11-11 "한 카드 안에서 다 같이").
 * 사용자 결정(11-12, 매일 들어오는 사람에게 같은 화면이 반복되지 않게):
 * - 한 명이면 원소속 구단 색 띠 + 띠에 걸친 사진 + 이름 + 흐린 한 줄(구단 · 포지션 · 출생 연도).
 * - '마지막 4일' 그래프 자리에 '행선지로 거론된 구단'(서버가 기사마다 AI로 고른 것, 최근 7일).
 * - '역대 포스팅 계약'은 휴대폰·PC 모두 접기 줄(매일 같은 목록이라 늘 펼쳐 두지 않는다).
 * - 관련 기사: 휴대폰은 2건 + '더 보기', PC는 카드 오른쪽 칸 전체가 기사(3건 + '더 보기'). 기사가 없으면 PC 오른쪽은 역대 계약.
 * 포스팅 선수가 여러 명일 때 모양은 나중에 다듬는다(사용자 11-12 "흔한 상황이 아니라 묻어둘게").
 */
export default async function MlbChallenge({ posting }: { posting: PostingSummary }) {
  // 잠깐 재사용: 같은 데이터면 30초 동안 그려 둔 것을 다시 쓴다(쿠키와 상관없는 부품이라 모두에게 같다).
  // 운영 서버(라즈베리파이 4)는 화면 그리기가 느려서 큰 부품을 매번 그리지 않는다.
  "use cache";
  cacheLife({ stale: 30, revalidate: 30, expire: 300 });
  if (posting.players.length === 0) return null;
  const players = [...posting.players].sort((a, b) => rank(a) - rank(b) || (a.daysLeft ?? 99) - (b.daysLeft ?? 99));
  // 보장액 순위. 같으면 최근 계약이 위
  const signings = [...thisYearSignings(players), ...pastSignings(posting.history)].sort(
    (a, b) => b.amount - a.amount || b.season - a.season,
  );
  const single = players.length === 1 ? players[0] : null;
  const news = newsOf(players);
  // 기사가 하나도 없으면(협상 초반·덜 알려진 선수) PC 오른쪽 칸이 비지 않게 역대 계약을 펼쳐 둔다
  const historyOnRight = news.length === 0 && signings.length > 0;
  // 띠가 있으면 오른쪽 칸을 띠 아래 20px에서 시작한다(띠의 lg:-mt-5가 카드 위 여백을 먹는다)
  const rightPad = single ? "lg:pt-5" : "";
  // 기사도 역대 계약도 없으면 오른쪽 칸 없이 한 칸으로 그린다
  const twoColumns = news.length > 0 || signings.length > 0;
  // 역대 계약이 마감 며칠 전에 몰렸는지는 목록이 접혀 있어 화면 읽기용 한 문장으로 알린다(사용자 11-12: 눈에는 뺀 문장)
  const past = signings.filter((s) => !s.thisYear);
  const late = past.filter((s) => s.days <= NEAR_DEADLINE).length;
  return (
    <Section id="mlb-challenge-title" title="이번 겨울 MLB 도전">
      <ul className="-mt-0.5 mb-2 flex flex-wrap gap-1.5 px-1">
        <li className="rounded-full bg-surface px-2.5 py-0.5 text-[0.8125rem] font-semibold leading-5 text-neutral-pill-fg tabular-nums">
          포스팅 {players.length}명
        </li>
      </ul>
      {/* PC(lg): 왼쪽 선수·거론 구단·역대 계약 접기, 오른쪽 관련 기사. 휴대폰은 위에서 아래로 */}
      <div className={`card p-4 lg:p-5 ${twoColumns ? "lg:grid lg:grid-cols-2 lg:gap-x-8" : ""}`}>
        {single && <HeadBand player={single} />}
        <div className="min-w-0">
          {single ? <PlayerHead player={single} /> : <PlayerRows players={players} />}
          {single && isOpen(single) && single.linkedTeams && <LinkedTeams counts={single.linkedTeams} />}
          {past.length > 0 && (
            <p className="sr-only">
              역대 포스팅 계약 {past.length}건 중 {late}건이 마감 {NEAR_DEADLINE}일 안에 맺어졌어요.
            </p>
          )}
          {signings.length > 0 && (
            <div className={historyOnRight ? "lg:hidden" : undefined}>
              <HistoryToggle
                title={`역대 포스팅 계약 ${signings.length}건`}
                hint={`최고 ${signings[0].nameKo} ${signings[0].years}년 ${signings[0].usd} · 보장액 순`}
              >
                <SigningList signings={signings} head={false} flush />
              </HistoryToggle>
            </div>
          )}
          <div className="lg:hidden">
            <PostingNews items={news} shown={NEWS_SHOWN_PHONE} />
          </div>
        </div>
        {twoColumns && (
          <div className={`hidden lg:block ${rightPad}`}>
            {historyOnRight ? (
              <SigningList signings={signings} />
            ) : (
              <PostingNews items={news} shown={NEWS_SHOWN_PC} flush />
            )}
          </div>
        )}
      </div>
    </Section>
  );
}

/** 카드 맨 위 원소속 KBO 구단 색 띠(선수가 한 명일 때). PC에서도 카드 전체 폭을 가로지른다(두 칸 위) */
function HeadBand({ player: p }: { player: PostingPlayer }) {
  const status = STATUS[p.status] ?? STATUS.CLOSED;
  return (
    <div
      className="posting-band -mx-4 -mt-4 h-[4.5rem] rounded-t-[1rem] lg:col-span-2 lg:-mx-5 lg:-mt-5"
      style={{ "--team": kboTeamColor(p.kboTeam) } as CSSProperties}
    >
      {/* 휴대폰만. PC는 띠가 넓어 알약이 이름에서 멀리 떨어지므로 이름 옆에 둔다(PlayerHead) */}
      {/* 화면 읽기는 이름 다음의 알약이 맡는다(이름보다 먼저 읽히지 않게) */}
      <span
        aria-hidden
        className="absolute right-3 top-3 z-10 rounded-full bg-surface px-2.5 py-0.5 text-xs font-bold text-fa-fg shadow-[var(--shadow-card)] lg:hidden"
      >
        {status.label}
      </span>
    </div>
  );
}

/** 포스팅 선수가 한 명일 때: 띠에 걸친 사진 · 이름 · 흐린 한 줄 · 남은 날과 마감 시각(또는 계약·결렬) */
function PlayerHead({ player: p }: { player: PostingPlayer }) {
  const status = STATUS[p.status] ?? STATUS.CLOSED;
  // 위계상 이름 다음 곁다리 정보라 알약에 담지 않고 흐린 한 줄로 둔다(사용자 11-12 '띠 한 줄')
  const sub = [p.kboTeam, p.positionKo, p.birthYear ? `${p.birthYear}년생` : null].filter(Boolean).join(" · ");
  return (
    <>
      <div className="-mt-9 flex items-start gap-3">
        <span className="relative z-10 shrink-0 rounded-full ring-4 ring-surface">
          <KboAvatar nameKo={p.nameKo} photoUrl={p.photoUrl} size={76} />
        </span>
        {/* 이름·한 줄은 띠 아래에서 시작한다(띠에 걸친 사진 높이 36px + 여백) */}
        <div className="min-w-0 pt-[2.75rem]">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="text-[1.375rem] font-extrabold leading-tight tracking-[-0.02em]">{p.nameKo}</h3>
            <span
              className={`sr-only whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold lg:not-sr-only lg:inline-block ${status.className}`}
            >
              {status.label}
            </span>
          </div>
          <p className="mt-0.5 text-[0.8125rem] leading-snug text-muted">{sub}</p>
        </div>
      </div>

      {isOpen(p) && p.daysLeft != null && (
        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-[0.8125rem] text-muted">협상 마감까지</p>
            <p className="text-[2.75rem] font-extrabold leading-none tracking-[-0.03em] tabular-nums">
              {p.daysLeft === 0 ? "오늘" : `D-${p.daysLeft}`}
            </p>
          </div>
          <p className="text-right text-[0.8125rem] font-semibold leading-snug tabular-nums">
            {deadlineKst(p.deadlineAt)}
            <span className="block text-xs font-normal text-muted">한국 시간 · 미국 {deadlineUs(p.deadlineAt)}</span>
          </p>
        </div>
      )}

      {p.deal && p.deal.years != null && p.deal.guaranteedUsd != null && (
        <p className="mt-4 text-[0.9375rem] font-semibold">
          {p.deal.mlbTeamKo}와 {p.deal.years}년 {formatUsd(p.deal.guaranteedUsd)}
          {p.deal.agreedOn && (
            <span className="block text-xs font-normal text-muted">합의 {formatDate(p.deal.agreedOn)} (미국 날짜)</span>
          )}
        </p>
      )}
      {p.status === "NO_DEAL" && <p className="mt-4 text-sm text-muted">계약하지 못해 {p.kboTeam}에 남아요.</p>}
    </>
  );
}

/** 거론 구단 알약을 몇 개까지 보이나(나머지는 '외 n개 구단') */
const LINKED_SHOWN = 3;
/** 반대 전망 한 줄: 한 구단의 반대 전망이 이보다 많고 거론의 절반 이상일 때만 */
const DOUBT_MIN = 3;

/**
 * '행선지로 거론된 구단'(사용자 11-12 결정). 서버가 기사마다 AI로 고른 최근 며칠 거론을 센다.
 * 기획 판단(11-12): 알약의 숫자는 '이 선수의 행선지로 거론한 기사'만 센다. 반대 전망을 같은 칸에 숫자로 섞으면
 * "그래서 어디 간다는 거지?"가 된다. 다만 숫자를 꾸미지 않도록, 한 구단의 반대 전망이 DOUBT_MIN건 넘고 거론의 절반
 * 이상이면 아래 한 줄로만 알린다. 반대 기사도 아래 '관련 기사'에는 그대로 나온다. 거론된 구단이 없으면 칸을 그리지 않는다.
 */
function LinkedTeams({ counts }: { counts: LinkedTeamCounts }) {
  const linked = counts.teams.filter((t) => t.linked > 0);
  if (linked.length === 0) return null;
  const shown = linked.slice(0, LINKED_SHOWN);
  const more = linked.length - shown.length;
  const doubt = [...counts.teams]
    .filter((t) => t.doubted > DOUBT_MIN && t.doubted * 2 >= t.linked)
    .sort((a, b) => b.doubted - a.doubted)[0];
  return (
    <div className="mt-5">
      <p className="mb-2 flex items-baseline justify-between gap-2 text-[0.8125rem] font-bold">
        <span>행선지로 거론된 구단</span>
        <span className="shrink-0 text-[0.6875rem] font-normal text-muted tabular-nums">최근 {counts.days}일 기사 수</span>
      </p>
      <ul className="flex flex-wrap items-center gap-1.5">
        {shown.map((t) => (
          <li
            key={t.abbreviation}
            className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 py-1 pl-1.5 pr-3 text-[0.8125rem] font-semibold"
          >
            <TeamMark logoUrl={teamLogoUrl(t.abbreviation)} color={teamColor(t.abbreviation)} size="sm" />
            {t.nameKo}
            <span className="font-bold tabular-nums">{t.linked}건</span>
            {t.today && <span className="text-xs font-bold text-accent-ink">오늘</span>}
          </li>
        ))}
        {more > 0 && <li className="px-1 text-xs text-muted tabular-nums">외 {more}개 구단</li>}
      </ul>
      {doubt && (
        <p className="mt-2 text-xs text-muted tabular-nums">
          {doubt.nameKo}는 &apos;필요 없다&apos;는 전망도 {doubt.doubted}건 있었어요
        </p>
      )}
    </div>
  );
}

/** 포스팅 선수가 여러 명일 때: 한 사람 한 줄(사진·이름·구단 | 남은 날이나 결과) */
function PlayerRows({ players }: { players: PostingPlayer[] }) {
  return (
    <ul className="divide-y divide-line">
      {players.map((p) => {
        const signed = p.status === "SIGNED" && p.deal?.mlbTeamKo;
        return (
          <li key={p.nameKo} className="flex items-center gap-3 py-2.5 first:pt-0">
            <KboAvatar nameKo={p.nameKo} photoUrl={p.photoUrl} size={40} />
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-extrabold leading-tight tracking-[-0.02em]">{p.nameKo}</h3>
              <p className="truncate text-xs text-muted">
                {signed ? `${p.kboTeam} → ${p.deal?.mlbTeamKo}` : `${p.kboTeam} · ${p.positionKo}`}
              </p>
            </div>
            <RowResult player={p} />
          </li>
        );
      })}
    </ul>
  );
}

/** 여러 명 줄의 오른쪽: 협상 중이면 남은 날, 계약이면 계약 규모, 그 밖에는 상태 알약 */
function RowResult({ player: p }: { player: PostingPlayer }) {
  const status = STATUS[p.status] ?? STATUS.CLOSED;
  const pill = (
    <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold ${status.className}`}>
      {status.label}
    </span>
  );
  if (p.status === "NEGOTIATING" && p.daysLeft != null) {
    return (
      <div className="shrink-0 text-right">
        <p className="text-[1.375rem] font-extrabold leading-none tracking-[-0.02em] tabular-nums">
          {p.daysLeft === 0 ? "오늘" : `D-${p.daysLeft}`}
        </p>
        <p className="mt-1 text-[0.6875rem] text-muted tabular-nums">{kstDay(p.deadlineAt)} 마감</p>
      </div>
    );
  }
  if (p.status === "UPCOMING") {
    return (
      <div className="shrink-0 text-right">
        {pill}
        <p className="mt-1 text-[0.6875rem] text-muted tabular-nums">{kstDay(p.windowOpensAt)} 시작</p>
      </div>
    );
  }
  if (p.status === "SIGNED" && p.deal?.years != null && p.deal.guaranteedUsd != null) {
    return (
      <div className="shrink-0 text-right">
        {pill}
        <p className="mt-1 text-xs font-semibold tabular-nums">
          {p.deal.years}년 {formatUsd(p.deal.guaranteedUsd)}
        </p>
      </div>
    );
  }
  return <div className="shrink-0">{pill}</div>;
}

/**
 * '역대 포스팅 계약' 보장액 순위: 얼굴 · 이름 · 연도·구단 · 마감 며칠 전 / 잉크 막대 + 금액(달러↔원화).
 * 막대는 위 '지금' 진행 막대와 헷갈리지 않게 바탕 줄 없이, 왼쪽이 거의 투명하고 금액 쪽으로 진해지는 글자색 막대다
 * (`.ink-bar`). 파랑·신호색·팀 색을 쓰지 않는다(The One Blue Rule, 어두운 화면에서 갈색·남색 팀 색이 묻힘).
 * 길이는 금액이 2배면 1.5배(BAR_EXPONENT).
 */
function SigningList({
  signings,
  maxAmount,
  head = true,
  foot = true,
  flush = false,
}: {
  signings: Signing[];
  /** 막대 길이 기준(1위 금액). 목록을 나눠 그릴 때 넘긴다 */
  maxAmount?: number;
  head?: boolean;
  foot?: boolean;
  /** 위 선·여백 없이(접기 안에 넣을 때) */
  flush?: boolean;
}) {
  const top = maxAmount ?? Math.max(...signings.map((s) => s.amount));
  return (
    <div className={flush ? "" : "mt-4 border-t border-line pt-3 lg:mt-0 lg:border-t-0 lg:pt-0"}>
      {head && (
        <p className="mb-1 flex items-baseline justify-between gap-2 text-[0.8125rem] font-bold">
          역대 포스팅 계약
          <span className="shrink-0 text-[0.6875rem] font-normal text-muted">보장액 순</span>
        </p>
      )}
      <ul className="money-flip-pause divide-y divide-line">
        {signings.map((s) => {
          // 1위 금액이 0이면(보장액 0만 있는 경우) 나눗셈이 NaN이 되지 않게 모두 최소 길이
          const share = top > 0 ? Math.max(BAR_MIN_SHARE, Math.pow(s.amount / top, BAR_EXPONENT)) : BAR_MIN_SHARE;
          return (
            <li key={s.key} className="flex items-center gap-3 py-2.5">
              <PostingDot nameKo={s.nameKo} photoUrl={s.photoUrl} size={30} />
              <div className="min-w-0 flex-1">
                <p className="flex items-baseline gap-1.5">
                  <span className="shrink-0 text-sm font-bold leading-5">{s.nameKo}</span>
                  {s.thisYear && (
                    <span className="shrink-0 self-center rounded-full bg-success-bg px-1.5 text-[0.625rem] font-bold leading-4 text-success-fg">
                      올해
                    </span>
                  )}
                  <span className="truncate text-xs text-muted tabular-nums">
                    {s.season}
                    {s.teamKo ? ` · ${s.teamKo}` : ""}
                  </span>
                  <span className="ml-auto shrink-0 text-xs text-muted tabular-nums">
                    {/* '마감 22일 전'은 위 'D-20'(남은 날)과 같은 축으로 읽혀서, 계약 시점임을 문장으로 쓴다(11-12 PC 평가) */}
                    {s.days === 0 ? "마감 당일 계약" : `${s.days}일 남기고 계약`}
                  </span>
                </p>
                <div className="mt-1.5 flex items-center gap-2">
                  <i aria-hidden className="ink-bar" style={{ "--share": share.toFixed(4) } as CSSProperties} />
                  <span className="text-[0.8125rem] font-bold tabular-nums">
                    <DealMoney years={s.years} usd={s.usd} krw={s.krw} align="start" />
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {foot && (
        <p className="mt-1.5 pb-1 text-[0.6875rem] leading-relaxed text-muted">
          보장액(옵션 제외) · 원화는 계약 당시 환율 · 막대는 금액 2배면 1.5배 길이. 출처: MLB Trade Rumors·ECB 등
        </p>
      )}
    </div>
  );
}

/**
 * 계약 금액: 달러와 원화(합의일 환율 어림)를 4초마다 번갈아 보인다(사용자 요청 11-11, globals.css .money-flip).
 * 두 값을 한 칸에 겹쳐 두어 바뀌어도 줄이 흔들리지 않는다. 연수("6년")도 함께 바꿔야 둘 다 오른쪽 끝에 붙는다
 * (연수를 칸 밖에 두면 짧은 원화일 때 연수와 금액 사이가 벌어진다). 화면 읽기 프로그램에는 두 값을 한 번에 읽힌다.
 * 모든 줄이 한꺼번에 바뀐다. 목록에 마우스를 올리면 멈춘다(.money-flip-pause).
 */
function DealMoney({
  years,
  usd,
  krw,
  align = "end",
}: {
  years: number;
  usd: string;
  krw: string | null;
  /** 두 값을 겹친 칸 안 정렬. 막대 끝에 붙일 때는 왼쪽(start) */
  align?: "start" | "end";
}) {
  if (!krw) return <>{`${years}년 ${usd}`}</>;
  return (
    <>
      <span className="sr-only">{`${years}년 ${usd}, 원화로 ${krw}`}</span>
      <span aria-hidden className={align === "start" ? "money-flip money-flip-start" : "money-flip"}>
        <span>{`${years}년 ${usd}`}</span>
        <span>{`${years}년 ${krw}`}</span>
      </span>
    </>
  );
}

/** 관련 기사 중 처음부터 보이는 수(사용자 11-12 결정). 나머지는 '기사 n건 더 보기' */
const NEWS_SHOWN_PHONE = 2;
const NEWS_SHOWN_PC = 3;
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
