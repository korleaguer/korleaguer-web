import type { PostingPast, PostingPlayer, PostingStatus, PostingSummary } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { pinSummary, uniqueByUrl } from "@/lib/news";
import { kboTeamColor, teamColorById } from "@/lib/teams";
import Section from "@/components/Section";
import KboAvatar from "@/components/home/KboAvatar";
import { PostingDot } from "@/components/home/PostingDot";
import PostingNews from "@/components/home/PostingNews";
import PostingTimeline, { type TimelineNow } from "@/components/home/PostingTimeline";

/** 지금 포스팅 제도의 협상 기간(일) */
const WINDOW_DAYS = 30;
/** '마감 직전'으로 묶는 날 수: 그래프의 '마지막 N일' 칸과 역대 계약 통계 한 줄 */
const NEAR_DEADLINE = 4;
/** 포스팅 선수가 여러 명일 때 함께 보여 줄 관련 기사 수 */
const NEWS_LIMIT = 6;

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
  /** 계약한 MLB 구단 색(동그라미) */
  color: string;
  /** 마감 며칠 전에 합의했나(미국 날짜, 마감 당일 0) */
  days: number;
  /** "6년 1억 1,300만 달러" */
  deal: string;
  thisYear: boolean;
  /** 지난 선수는 계약 구단 시절 MLB 사진의 흰 바탕 편집본(/photos/posting-…), 올해 계약한 선수는 KBO 공식 사진. 없으면 null(구단 색 원 + 이름) */
  photoUrl: string | null;
}

/** 지금 제도(2018~)의 지난 포스팅 계약. 결렬은 넣지 않는다(사용자 결정 11-11) */
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
        color: teamColorById(d.mlbTeamId),
        days: h.daysBeforeDeadline,
        deal: `${d.years}년 ${formatUsd(d.guaranteedUsd)}`,
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
        color: teamColorById(d.mlbTeamId),
        days,
        deal: `${d.years}년 ${formatUsd(d.guaranteedUsd)}`,
        thisYear: true,
        photoUrl: p.photoUrl,
      },
    ];
  });
}

/** 협상 중(또는 시작 전)인 선수의 '지금' 자리 */
function nowFaces(players: PostingPlayer[]): TimelineNow[] {
  return players
    .filter((p) => isOpen(p) && p.daysLeft != null)
    .map((p) => ({
      key: p.nameKo,
      nameKo: p.nameKo,
      days: Math.min(WINDOW_DAYS, Math.max(0, p.daysLeft ?? 0)),
      photoUrl: p.photoUrl,
      color: kboTeamColor(p.kboTeam),
    }));
}

/** 카드 안 선수 순서: 협상 중·시작 전(마감 가까운 순) → 계약 → 결과 확인 중 → 결렬 */
function rank(p: PostingPlayer): number {
  if (isOpen(p)) return 0;
  return p.status === "SIGNED" ? 1 : p.status === "CLOSED" ? 2 : 3;
}

/**
 * 비시즌 홈 맨 위: 이번 겨울 MLB에 도전하는(포스팅된) KBO 선수.
 * 포스팅 선수가 몇 명이든 카드 한 장에 모은다(사용자 결정 11-11 "한 카드 안에서 다 같이").
 * 카드 안 한 줄 그래프에 지금 제도에서 계약한 선수들이 마감 며칠 전에 계약했는지를 구단 색 동그라미로 쌓고,
 * 그 아래(PC는 오른쪽) 목록에 같은 동그라미로 계약 내용을 늘 보여 준다(누르지 않아도 보이게).
 * 관련 기사는 카드 안에서 한국어 제목·요약(또는 기사 앞부분)으로 읽히고, 원문(언론사)은 작은 링크로 남는다.
 */
export default function MlbChallenge({ posting }: { posting: PostingSummary }) {
  if (posting.players.length === 0) return null;
  const players = [...posting.players].sort((a, b) => rank(a) - rank(b) || (a.daysLeft ?? 99) - (b.daysLeft ?? 99));
  const signings = [...thisYearSignings(players), ...pastSignings(posting.history)].sort(
    (a, b) => b.days - a.days || Number(b.thisYear) - Number(a.thisYear) || b.season - a.season,
  );
  const single = players.length === 1 ? players[0] : null;
  return (
    <Section id="mlb-challenge-title" title="이번 겨울 MLB 도전">
      <ul className="-mt-0.5 mb-2 flex flex-wrap gap-1.5 px-1">
        <li className="rounded-full bg-surface px-2.5 py-0.5 text-[0.8125rem] font-semibold leading-5 text-neutral-pill-fg tabular-nums">
          포스팅 {players.length}명
        </li>
      </ul>
      {/* PC(lg): 왼쪽 선수·그래프, 오른쪽 역대 계약 목록, 아래 관련 기사 두 줄. 휴대폰은 위에서 아래로 */}
      <div className="card p-4 lg:grid lg:grid-cols-2 lg:gap-x-8 lg:p-5">
        <div className="min-w-0">
          {single ? <PlayerHead player={single} /> : <PlayerRows players={players} />}
          <Timeline players={players} single={single} signings={signings} />
        </div>
        {signings.length > 0 && <SigningList signings={signings} />}
        <News players={players} />
      </div>
    </Section>
  );
}

/** 포스팅 선수가 한 명일 때: 크게(사진·이름·남은 날·마감 시각) */
function PlayerHead({ player: p }: { player: PostingPlayer }) {
  const status = STATUS[p.status] ?? STATUS.CLOSED;
  const sub = [p.kboTeam, p.positionKo, p.birthYear ? `${p.birthYear}년생` : null].filter(Boolean).join(" · ");
  return (
    <>
      <div className="flex items-center gap-3">
        <KboAvatar nameKo={p.nameKo} photoUrl={p.photoUrl} color={kboTeamColor(p.kboTeam)} />
        <div className="min-w-0">
          <h3 className="text-xl font-extrabold leading-tight tracking-[-0.02em]">{p.nameKo}</h3>
          {/* 좁은 휴대폰에서는 상태 알약에 밀려 두 줄이 된다(말줄임으로 '년생'이 잘리지 않게) */}
          <p className="text-[0.8125rem] leading-snug text-muted">{sub}</p>
        </div>
        <span
          className={`ml-auto self-start whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold ${status.className}`}
        >
          {status.label}
        </span>
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

/** 포스팅 선수가 여러 명일 때: 한 사람 한 줄(사진·이름·구단 | 남은 날이나 결과) */
function PlayerRows({ players }: { players: PostingPlayer[] }) {
  return (
    <ul className="divide-y divide-line">
      {players.map((p) => {
        const signed = p.status === "SIGNED" && p.deal?.mlbTeamKo;
        return (
          <li key={p.nameKo} className="flex items-center gap-3 py-2.5 first:pt-0">
            <KboAvatar nameKo={p.nameKo} photoUrl={p.photoUrl} color={kboTeamColor(p.kboTeam)} size={40} />
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

/** 한 줄 그래프와 그 뜻을 한 문장으로 */
function Timeline({
  players,
  single,
  signings,
}: {
  players: PostingPlayer[];
  single: PostingPlayer | null;
  signings: Signing[];
}) {
  const now = nowFaces(players);
  if (signings.length === 0 && now.length === 0) return null;
  const past = signings.filter((s) => !s.thisYear);
  const near = past.filter((s) => s.days <= NEAR_DEADLINE).length;
  const openDays = single && isOpen(single) ? single.daysLeft : null;
  const earlier = openDays != null ? past.filter((s) => s.days > openDays) : null;
  return (
    <div className="mt-5">
      {signings.length > 0 && (
        <p className="mb-2 flex items-baseline justify-between gap-2 text-[0.8125rem] font-bold">
          역대 계약은 마감 며칠 전이었나
          <span className="shrink-0 text-[0.6875rem] font-normal text-muted">지금 제도(2018~)</span>
        </p>
      )}
      <PostingTimeline
        dots={signings.map((s) => ({ key: s.key, nameKo: s.nameKo, color: s.color, days: s.days, thisYear: s.thisYear, photoUrl: s.photoUrl }))}
        now={now}
        fill={single?.status === "NEGOTIATING"}
        startLabel={single ? `${kstDay(single.windowOpensAt)} 시작` : "협상 시작"}
        endLabel={single ? `${kstDay(single.deadlineAt)} 마감` : "마감"}
        lateDays={NEAR_DEADLINE}
      />
      {past.length > 0 && (
        <p className="mt-2 text-[0.8125rem] leading-relaxed text-neutral-pill-fg">
          {earlier == null ? (
            <>
              {past.length}명 중{" "}
              <b className="font-bold text-foreground">
                {near}명은 마감 {NEAR_DEADLINE}일 안에
              </b>{" "}
              계약했어요.
            </>
          ) : (
            <>
              {earlier.length === 0 ? (
                "아직 이맘때 계약한 선수는 없어요. "
              ) : (
                <>
                  지금보다 먼저 계약한 선수는{" "}
                  <b className="font-bold text-foreground">{earlier.map((s) => s.nameKo).join("·")}</b>
                  {earlier.length === 1 ? "뿐이고, " : ` ${earlier.length}명이고, `}
                </>
              )}
              {past.length}명 중{" "}
              <b className="font-bold text-foreground">
                {near}명은 마감 {NEAR_DEADLINE}일 안에
              </b>{" "}
              계약했어요.
            </>
          )}
          {signings.some((s) => s.thisYear) && " 초록 테두리는 올해 계약이에요."}
        </p>
      )}
    </div>
  );
}

/** 역대 계약 목록: 그래프와 같은 동그라미 · 이름 · 연도·구단 | 마감 며칠 전 · 보장액. 누르지 않아도 늘 보인다 */
function SigningList({ signings }: { signings: Signing[] }) {
  return (
    <div className="mt-3 lg:mt-0">
      <p className="mb-1 hidden items-baseline justify-between gap-2 text-[0.8125rem] font-bold lg:flex">
        역대 계약
        <span className="shrink-0 text-[0.6875rem] font-normal text-muted">합의 보도 날짜(미국) 기준</span>
      </p>
      <ul className="divide-y divide-line">
        {signings.map((s) => (
          <li key={s.key} className="flex items-center gap-3 py-2.5">
            <PostingDot nameKo={s.nameKo} color={s.color} thisYear={s.thisYear} photoUrl={s.photoUrl} size={30} />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-sm font-bold leading-5">
                {s.nameKo}
                {s.thisYear && (
                  <span className="shrink-0 rounded-full bg-success-bg px-1.5 text-[0.625rem] font-bold leading-4 text-success-fg">
                    올해
                  </span>
                )}
              </p>
              <p className="truncate text-xs text-muted tabular-nums">
                {s.season}
                {s.teamKo ? ` · ${s.teamKo}` : ""}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[0.8125rem] font-bold leading-5 tabular-nums">
                {s.days === 0 ? "마감 당일" : `D-${s.days}`}
              </p>
              <p className="text-xs text-neutral-pill-fg tabular-nums">{s.deal}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-1.5 text-[0.6875rem] leading-relaxed text-muted">
        금액은 보장액(옵션·인센티브 제외), 날짜는 합의 보도 기준(미국). 출처: MLB Trade Rumors 등
      </p>
    </div>
  );
}

/**
 * 관련 기사. 여러 명이면 모두의 기사를 모아(같은 기사는 읽을거리가 많은 사본 하나) 선수 이름을 붙이고 늦은 순으로 둔다.
 * AI 요약 기사 하나는 자르기 전에 맨 앞으로 옮긴다(늦은 순으로 자르면 국내 기사에 밀려 빠진다).
 */
function News({ players }: { players: PostingPlayer[] }) {
  const multi = players.length > 1;
  const merged = uniqueByUrl(players.flatMap((p) => p.news.map((n) => ({ ...n, who: multi ? p.nameKo : null }))));
  const items = pinSummary(merged.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))).slice(
    0,
    multi ? NEWS_LIMIT : 5,
  );
  return <PostingNews items={items} />;
}
