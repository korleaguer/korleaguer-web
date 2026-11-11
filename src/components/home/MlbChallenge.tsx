import type { PostingPast, PostingPlayer, PostingStatus, PostingSummary } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { kboTeamColor } from "@/lib/teams";
import ExternalLinkIcon from "@/components/ExternalLinkIcon";
import Section from "@/components/Section";
import KboAvatar from "@/components/home/KboAvatar";

/** 지금 포스팅 제도의 협상 기간(일). 그래프 가로축 끝 */
const WINDOW_DAYS = 30;
/** '마감 직전'으로 묶는 날 수(선배 통계 한 줄) */
const NEAR_DEADLINE = 4;


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

function dealText(p: PostingPast): string {
  const d = p.deal;
  if (!d || d.years == null || d.guaranteedUsd == null) return "결렬";
  return `${d.years}년 ${formatUsd(d.guaranteedUsd)}`;
}

/**
 * 비시즌 홈 맨 위: 이번 겨울 MLB에 도전하는(포스팅된) KBO 선수와, 지금 제도 선배들이 마감 며칠 전에 계약했는지.
 * 관련 기사는 우리 화면에 제목·언론사·날짜로 보이고 누르면 원문(언론사)으로 간다.
 */
export default function MlbChallenge({ posting }: { posting: PostingSummary }) {
  if (posting.players.length === 0) return null;
  // PC(lg)에서는 선수 카드와 선배 그래프를 나란히 둔다(카드 한 장이 넓은 화면의 절반만 쓰고 오른쪽이 비지 않게)
  return (
    <div className="grid items-start gap-7 lg:grid-cols-2 lg:gap-6">
      <Section id="mlb-challenge-title" title="이번 겨울 MLB 도전">
        <ul className="-mt-0.5 mb-2 flex flex-wrap gap-1.5 px-1">
          <li className="rounded-full bg-surface px-2.5 py-0.5 text-[0.8125rem] font-semibold leading-5 text-neutral-pill-fg tabular-nums">
            포스팅 {posting.players.length}명
          </li>
        </ul>
        <ul className="grid gap-3">
          {posting.players.map((p) => (
            <PostingCard key={p.nameKo} player={p} history={posting.history} />
          ))}
        </ul>
      </Section>
      {posting.history.some((h) => h.deal != null) && (
        <HistoryChart history={posting.history} players={posting.players} />
      )}
    </div>
  );
}

function PostingCard({ player: p, history }: { player: PostingPlayer; history: PostingPast[] }) {
  const status = STATUS[p.status] ?? STATUS.CLOSED;
  const color = kboTeamColor(p.kboTeam);
  const open = p.status === "NEGOTIATING" || p.status === "UPCOMING";
  const signed = history.filter((h) => h.daysBeforeDeadline != null);
  const near = signed.filter((h) => (h.daysBeforeDeadline ?? 99) <= NEAR_DEADLINE).length;
  const sub = [p.kboTeam, p.positionKo, p.birthYear ? `${p.birthYear}년생` : null].filter(Boolean).join(" · ");
  const pct = Math.round(Math.min(1, Math.max(0, p.elapsedRatio)) * 1000) / 10;

  return (
    <li className="card p-4">
      <div className="flex items-center gap-3">
        <KboAvatar nameKo={p.nameKo} photoUrl={p.photoUrl} color={color} />
        <div className="min-w-0">
          <h3 className="text-xl font-extrabold leading-tight tracking-[-0.02em]">{p.nameKo}</h3>
          <p className="truncate text-[0.8125rem] text-muted">{sub}</p>
        </div>
        <span
          className={`ml-auto self-start whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold ${status.className}`}
        >
          {status.label}
        </span>
      </div>

      {open && (
        <>
          <div className="mt-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-[0.8125rem] text-muted">협상 마감까지</p>
              <p className="text-[2.75rem] font-extrabold leading-none tracking-[-0.03em]">
                {p.daysLeft === 0 ? "오늘" : `D-${p.daysLeft}`}
              </p>
            </div>
            <p className="text-right text-[0.8125rem] font-semibold leading-snug tabular-nums">
              {deadlineKst(p.deadlineAt)}
              <span className="block text-xs font-normal text-muted">
                한국 시간 · 미국 {deadlineUs(p.deadlineAt)}
              </span>
            </p>
          </div>
          <div
            role="progressbar"
            aria-label="30일 협상 기간 중 지난 정도"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            className="relative mt-3.5 h-2 rounded-full bg-surface-2"
          >
            <i className="absolute inset-y-0 left-0 rounded-full bg-accent" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-1.5 flex justify-between text-xs text-muted tabular-nums">
            <span>{kstDay(p.windowOpensAt)} 시작</span>
            <span>{kstDay(p.deadlineAt)} 마감</span>
          </div>
          {signed.length > 0 && (
            <p className="mt-3.5 rounded-xl bg-surface-2 px-3 py-2.5 text-[0.8125rem] leading-relaxed">
              지금 제도에서 포스팅 계약 {signed.length}건 중{" "}
              <b className="font-bold">
                {near}건이 마감 {NEAR_DEADLINE}일 안에
              </b>{" "}
              결론 났어요.
            </p>
          )}
        </>
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

      {p.news.length > 0 && (
        <div className="mt-3.5 border-t border-line pt-3">
          <p className="flex items-baseline justify-between text-[0.8125rem] font-bold">
            관련 기사
            <span className="text-[0.6875rem] font-normal text-muted">언론사 제목 · 누르면 원문</span>
          </p>
          <ul className="mt-1 divide-y divide-line">
            {p.news.map((n) => (
              <li key={n.url}>
                <a
                  href={n.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block py-2.5 text-sm font-semibold leading-snug hover:underline"
                >
                  {n.title} <ExternalLinkIcon />
                  <span className="mt-0.5 block text-xs font-normal text-muted tabular-nums">
                    {n.publisher} · {formatDate(n.publishedAt)}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}

/** 마감까지 남은 날 d를 가로 위치(%)로: 왼쪽 D-30 → 오른쪽 마감 */
const x = (d: number) => `${((WINDOW_DAYS - Math.min(WINDOW_DAYS, Math.max(0, d))) / WINDOW_DAYS) * 100}%`;

/** 그래프 한 줄: 지난 포스팅 기록이나 올해 계약한 선수 */
interface ChartRow {
  key: string;
  nameKo: string;
  season: number;
  teamKo: string | null;
  /** 마감 며칠 전에 합의했나(미국 날짜, 마감 당일 0) */
  days: number;
  /** "6년 1억 1,300만 달러" */
  deal: string;
  thisYear: boolean;
}

/** '지금' 이름표 하나. 마감이 2일 안으로 붙은 선수들은 이름표 하나로 묶는다(이름이 겹치지 않게) */
interface NowMark {
  names: { nameKo: string; days: number }[];
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

/** 올해 계약한 포스팅 선수(합의 보도일 → 협상 마감일, 미국 날짜). 결렬·결과 확인 중은 넣지 않는다 */
function thisYearRows(players: PostingPlayer[]): ChartRow[] {
  return players.flatMap((p) => {
    const deal = p.deal;
    if (p.status !== "SIGNED" || !deal?.agreedOn || deal.years == null || deal.guaranteedUsd == null) return [];
    const days = dayDiff(deal.agreedOn, etDate(p.deadlineAt));
    if (days < 0 || days > WINDOW_DAYS) return [];
    return [
      {
        key: `now-${p.nameKo}`,
        nameKo: p.nameKo,
        season: Number(etDate(p.windowOpensAt).slice(0, 4)),
        teamKo: deal.mlbTeamKo,
        days,
        deal: `${deal.years}년 ${formatUsd(deal.guaranteedUsd)}`,
        thisYear: true,
      },
    ];
  });
}

/** 협상 중인 선수들의 '지금' 위치(왼쪽 D-30 → 오른쪽 마감 순). 2일 안으로 붙으면 이름표 하나 */
function nowMarks(players: PostingPlayer[]): NowMark[] {
  const open = players
    .filter((p) => (p.status === "NEGOTIATING" || p.status === "UPCOMING") && p.daysLeft != null)
    .map((p) => ({ nameKo: p.nameKo, days: Math.min(WINDOW_DAYS, Math.max(0, p.daysLeft ?? 0)) }))
    .sort((a, b) => b.days - a.days);
  const marks: NowMark[] = [];
  for (const m of open) {
    const last = marks[marks.length - 1];
    if (last && last.names[0].days - m.days <= 2) last.names.push(m);
    else marks.push({ names: [m] });
  }
  return marks;
}

/** 이름표는 눈금에서 오른쪽으로 쓴다. 마감 쪽(오른쪽 40%)에서는 눈금에서 왼쪽으로 써서 막대 밖으로 넘치지 않게 한다 */
function anchor(days: number): string {
  const share = (WINDOW_DAYS - days) / WINDOW_DAYS;
  return share > 0.6 ? "translate-x-[calc(-100%+0.375rem)]" : "translate-x-[-0.375rem]";
}

function HistoryChart({ history, players }: { history: PostingPast[]; players: PostingPlayer[] }) {
  // 결렬은 넣지 않는다(사용자 결정 11-11). 올해 계약한 포스팅 선수도 같은 기준으로 '올해' 표시와 함께 넣는다
  const past: ChartRow[] = history
    .filter((h) => h.deal != null && h.daysBeforeDeadline != null)
    .map((h) => ({
      key: `${h.nameKo}-${h.season}`,
      nameKo: h.nameKo,
      season: h.season,
      teamKo: h.deal?.mlbTeamKo ?? null,
      days: h.daysBeforeDeadline ?? 0,
      deal: dealText(h),
      thisYear: false,
    }));
  const rows = [...thisYearRows(players), ...past].sort((a, b) => b.days - a.days || b.season - a.season);
  const marks = nowMarks(players);
  const ticks = [...new Set(marks.flatMap((m) => m.names.map((n) => n.days)))];
  const anyThisYear = rows.some((r) => r.thisYear);
  return (
    <Section id="posting-history-title" title="선배들은 마감 며칠 전에 계약했나">
      <p className="-mt-1 mb-3 px-1 text-[0.8125rem] text-muted">
        지금 포스팅 제도(2018~) · 30일 협상 마감 기준, 합의 보도 날짜(미국)
      </p>
      <div className="card p-4">
        <ul className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-xs" aria-hidden>
          <li className="inline-flex items-center gap-1.5">
            <i className="size-2.5 rounded-full bg-accent" />
            계약
          </li>
          {anyThisYear && (
            <li className="inline-flex items-center gap-1.5">
              <ThisYearTag />
              올해 계약
            </li>
          )}
          {ticks.length > 0 && (
            <li className="inline-flex items-center gap-1.5">
              <i className="h-3.5 w-0.5 rounded-full bg-foreground/70" />
              포스팅 중인 선수의 지금
            </li>
          )}
        </ul>
        {/*
          선수 한 명 = 두 줄. 1줄: 이름 | 30일 막대 위 점, 2줄: 연도·팀 | 금액(오른쪽 정렬, 숫자 칸 맞춤).
          점·축 눈금·'지금' 눈금은 막대 안쪽 폭(양쪽 점 반지름 6px 안쪽)의 같은 좌표를 쓴다.
          '지금'은 협상 중인 선수마다 막대 위 같은 자리 눈금이고, 축 아래 '지금' 줄에 이름표가 붙는다.
        */}
        <div className="mt-3" aria-hidden>
          <div className="grid grid-cols-[6.5rem_1fr] gap-x-3">
            <span />
            <div className="relative h-4">
              <div className="absolute inset-x-1.5 inset-y-0">
                {[30, 20, 10, 0].map((d) => (
                  <span
                    key={d}
                    className="absolute top-0 -translate-x-1/2 whitespace-nowrap text-[0.6875rem] leading-4 text-muted tabular-nums"
                    style={{ left: x(d) }}
                  >
                    {d === 0 ? "마감" : `D-${d}`}
                  </span>
                ))}
              </div>
            </div>
          </div>
          {/* '지금' 이름표: 선수(2일 안으로 붙은 선수는 묶음)마다 한 줄. 눈금 자리에서 시작해 아래 막대의 눈금과 맞는다 */}
          {marks.length > 0 && (
            <div className="mt-1 grid grid-cols-[6.5rem_1fr] gap-x-3">
              <span className="text-[0.6875rem] leading-5 text-muted">지금</span>
              <div>
                {marks.map((m) => (
                  <div key={m.names.map((n) => n.nameKo).join("·")} className="relative h-5">
                    <div className="absolute inset-x-1.5 inset-y-0">
                      <span
                        className={`absolute top-0 whitespace-nowrap text-[0.6875rem] font-semibold leading-5 tabular-nums ${anchor(m.names[0].days)}`}
                        style={{ left: x(m.names[0].days) }}
                      >
                        {m.names.map((n) => `${n.nameKo} ${n.days === 0 ? "오늘 마감" : `D-${n.days}`}`).join(" · ")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <ul className="mt-1.5">
            {rows.map((r) => (
              <li
                key={r.key}
                className="grid grid-cols-[6.5rem_1fr] items-center gap-x-3 gap-y-0.5 border-t border-line py-2.5"
              >
                <p className="flex min-w-0 items-center gap-1 text-[0.8125rem] font-bold leading-5">
                  <span className="truncate">{r.nameKo}</span>
                  {r.thisYear && <ThisYearTag />}
                </p>
                <div className="relative h-5">
                  <i className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-surface-2" />
                  <div className="absolute inset-x-1.5 inset-y-0">
                    {ticks.map((t) => (
                      <i
                        key={t}
                        className="absolute top-1/2 h-3.5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/70"
                        style={{ left: x(t) }}
                      />
                    ))}
                    <i
                      className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent shadow-[0_0_0_2px_var(--surface)]"
                      style={{ left: x(r.days) }}
                    />
                  </div>
                </div>
                <p className="truncate whitespace-nowrap text-[0.6875rem] leading-4 text-muted tabular-nums">
                  {r.season}
                  {r.teamKo ? ` · ${r.teamKo}` : ""}
                </p>
                <p className="truncate text-right text-[0.6875rem] leading-4 tabular-nums">
                  <span className="font-semibold">{r.days === 0 ? "마감 당일" : `D-${r.days}`}</span>
                  {` · ${r.deal}`}
                </p>
              </li>
            ))}
          </ul>
        </div>
        <table className="sr-only">
          <caption>포스팅 계약: 마감 며칠 전 계약했나</caption>
          <thead>
            <tr>
              <th>선수</th>
              <th>겨울</th>
              <th>구단</th>
              <th>마감까지 남은 날</th>
              <th>보장 계약</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key}>
                <td>{r.thisYear ? `${r.nameKo}(올해)` : r.nameKo}</td>
                <td>{r.season}</td>
                <td>{r.teamKo}</td>
                <td>{r.days}일</td>
                <td>{r.deal}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {marks.length > 0 && (
          <p className="sr-only">
            {`지금 포스팅 협상 중: ${marks
              .flatMap((m) => m.names)
              .map((n) => `${n.nameKo} 마감까지 ${n.days}일`)
              .join(", ")}`}
          </p>
        )}
        <p className="mt-3 text-xs leading-relaxed text-muted">
          금액은 보장액(옵션·인센티브 제외). 출처: MLB Trade Rumors 등 계약 보도
        </p>
      </div>
    </Section>
  );
}

/** 올해 계약한 선수 표시 */
function ThisYearTag() {
  return (
    <span className="shrink-0 rounded-full bg-accent-soft px-1.5 text-[0.625rem] font-bold leading-4 text-accent-ink">
      올해
    </span>
  );
}
