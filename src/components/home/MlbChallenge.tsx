import type { CSSProperties } from "react";
import type { PostingPast, PostingPlayer, PostingStatus, PostingSummary } from "@/lib/api";
import { formatDate } from "@/lib/format";
import ExternalLinkIcon from "@/components/ExternalLinkIcon";
import Section from "@/components/Section";

/** 지금 포스팅 제도의 협상 기간(일). 그래프 가로축 끝 */
const WINDOW_DAYS = 30;
/** '마감 직전'으로 묶는 날 수(선배 통계 한 줄) */
const NEAR_DEADLINE = 4;

/** KBO 구단 대표 색(원 바탕). 모르는 구단이면 회색 */
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
  const negotiating = posting.players.filter((p) => p.status === "NEGOTIATING" || p.status === "UPCOMING");
  const now = negotiating[0];
  return (
    <>
      <Section id="mlb-challenge-title" title="이번 겨울 MLB 도전">
        <ul className="-mt-0.5 mb-2 flex flex-wrap gap-1.5 px-1">
          <li className="rounded-full bg-surface px-2.5 py-0.5 text-[0.8125rem] font-semibold leading-5 text-neutral-pill-fg tabular-nums">
            포스팅 {posting.players.length}명
          </li>
        </ul>
        <ul className="grid items-start gap-3 lg:grid-cols-2">
          {posting.players.map((p) => (
            <PostingCard key={p.nameKo} player={p} history={posting.history} />
          ))}
        </ul>
      </Section>
      {posting.history.length > 0 && <HistoryChart history={posting.history} now={now} />}
    </>
  );
}

function PostingCard({ player: p, history }: { player: PostingPlayer; history: PostingPast[] }) {
  const status = STATUS[p.status] ?? STATUS.CLOSED;
  const color = KBO_COLORS[p.kboTeam] ?? "var(--no-team)";
  const open = p.status === "NEGOTIATING" || p.status === "UPCOMING";
  const signed = history.filter((h) => h.daysBeforeDeadline != null);
  const near = signed.filter((h) => (h.daysBeforeDeadline ?? 99) <= NEAR_DEADLINE).length;
  const sub = [p.kboTeam, p.positionKo, p.birthYear ? `${p.birthYear}년생` : null].filter(Boolean).join(" · ");
  const pct = Math.round(Math.min(1, Math.max(0, p.elapsedRatio)) * 1000) / 10;

  return (
    <li className="card p-4">
      <div className="flex items-center gap-3">
        <div
          aria-hidden
          className="grid size-13 shrink-0 place-items-center rounded-full text-[1.1875rem] font-extrabold text-white"
          style={{ background: color }}
        >
          {p.nameKo.slice(0, 1)}
        </div>
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

function HistoryChart({ history, now }: { history: PostingPast[]; now?: PostingPlayer }) {
  const rows = [...history].sort(
    (a, b) => (b.daysBeforeDeadline ?? -1) - (a.daysBeforeDeadline ?? -1) || b.season - a.season,
  );
  const today = now?.daysLeft ?? null;
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
          <li className="inline-flex items-center gap-1.5">
            <i className="size-2.5 rounded-full border-2 border-[var(--no-team)] bg-surface" />
            결렬
          </li>
          {today != null && now && (
            <li className="inline-flex items-center gap-1.5">
              <i className="h-3 w-0.5 bg-foreground" />
              {now.nameKo} 지금(D-{today})
            </li>
          )}
        </ul>
        <div className="relative mt-3" aria-hidden>
          <div className="grid grid-cols-[4.75rem_1fr] gap-2">
            <div />
            <div className="relative h-4 text-[0.6875rem] text-muted tabular-nums">
              {[30, 20, 10, 0].map((d) => (
                <span
                  key={d}
                  className="absolute"
                  style={{ left: x(d), transform: d === 0 ? "translateX(-100%)" : d === 30 ? "none" : "translateX(-50%)" }}
                >
                  {d === 0 ? "마감" : `D-${d}`}
                </span>
              ))}
            </div>
          </div>
          {rows.map((r) => {
            const d = r.daysBeforeDeadline;
            const pos = d ?? 0;
            const right = pos <= 12;
            const style: CSSProperties = { left: x(pos) };
            return (
              <div key={`${r.nameKo}-${r.season}`} className="grid grid-cols-[4.75rem_1fr] items-center gap-2 border-t border-line py-1.5">
                <p className="text-[0.8125rem] font-bold leading-tight">
                  {r.nameKo}
                  <span className="block text-[0.6875rem] font-normal text-muted tabular-nums">
                    {r.season}
                    {r.deal?.mlbTeamKo ? ` · ${r.deal.mlbTeamKo}` : ""}
                  </span>
                </p>
                <div className="relative h-8">
                  <i className="absolute inset-x-0 top-2.5 h-px bg-line" />
                  <i
                    className={`absolute top-1 z-[3] size-3 -translate-x-1/2 rounded-full shadow-[0_0_0_2px_var(--surface)] ${
                      d == null ? "border-2 border-[var(--no-team)] bg-surface" : "bg-accent"
                    }`}
                    style={style}
                  />
                  <span
                    className={`absolute top-[1.125rem] z-[2] whitespace-nowrap bg-surface px-0.5 text-[0.6875rem] tabular-nums ${
                      right ? "-translate-x-full" : "translate-x-[-0.375rem]"
                    }`}
                    style={style}
                  >
                    {d == null ? "결렬" : `${d === 0 ? "마감 당일" : `D-${d}`} · ${dealText(r)}`}
                  </span>
                </div>
              </div>
            );
          })}
          {today != null && (
            <i
              className="absolute bottom-0 top-4 z-[1] w-0.5 bg-foreground/85"
              style={{ left: `calc(4.75rem + 0.5rem + (100% - 5.25rem) * ${(WINDOW_DAYS - Math.min(WINDOW_DAYS, today)) / WINDOW_DAYS})` }}
            />
          )}
        </div>
        <table className="sr-only">
          <caption>지난 포스팅: 마감 며칠 전 계약했나</caption>
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
              <tr key={`${r.nameKo}-${r.season}`}>
                <td>{r.nameKo}</td>
                <td>{r.season}</td>
                <td>{r.deal?.mlbTeamKo ?? "결렬"}</td>
                <td>{r.daysBeforeDeadline == null ? "결렬" : `${r.daysBeforeDeadline}일`}</td>
                <td>{dealText(r)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs leading-relaxed text-muted">
          금액은 보장액(옵션·인센티브 제외). 출처: MLB Trade Rumors 등 계약 보도
        </p>
      </div>
    </Section>
  );
}
