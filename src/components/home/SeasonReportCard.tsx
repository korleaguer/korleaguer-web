import type { CSSProperties } from "react";
import Link from "next/link";
import type { CardStatus, LevelTotals, MyPlayer, SeasonReport, SeasonTier } from "@/lib/api";
import { formatEra, formatRate } from "@/lib/format";
import { teamColor } from "@/lib/teams";
import PlayerAvatar from "@/components/PlayerAvatar";
import ShowMore from "@/components/ShowMore";
import NewsTitleList from "@/components/news/NewsTitleList";
import BandPhoto from "@/components/my/BandPhoto";
import { StatusBadge } from "@/components/my/FormSummary";
import MyPlayerToggle from "@/components/my/MyPlayerToggle";
import { type BadgeTone, metaLine, otherTotalsLine, statusBadge } from "@/components/my/formLabels";

/**
 * 판정마다 색(사용자 11-12 결정 '혹평 막기'): 잘한 시즌만 색을 쓴다(좋은·짧았지만 좋았던 = 초록, 제 몫 = 파랑).
 * 아쉬운 시즌은 빨강 대신 회색이다. 숫자 칸 바탕도 같은 색이고, 판정 딱지·한 줄 제목·이유는 흰 카드 위 본문 글자다.
 */
const TIER_STYLE: Record<SeasonTier, { box: string; chip: string }> = {
  GOOD: { box: "bg-success-bg", chip: "bg-success-bg text-success-fg" },
  SHORT_GOOD: { box: "bg-success-bg", chip: "bg-success-bg text-success-fg" },
  SOLID: { box: "bg-accent-soft", chip: "bg-accent-soft text-accent-ink" },
  MINORS: { box: "bg-surface-2", chip: "bg-neutral-pill text-neutral-pill-fg" },
  SHORT: { box: "bg-surface-2", chip: "bg-neutral-pill text-neutral-pill-fg" },
  POOR: { box: "bg-surface-2", chip: "bg-neutral-pill text-neutral-pill-fg" },
};

/** 이름 옆 상태 알약(무대가 없는 카드). 무대 위 배지(StatusBadge)와 같은 글·색 */
const PILL_TONE: Record<BadgeTone, string> = {
  danger: "bg-danger-bg text-danger-fg",
  success: "bg-success-bg text-success-fg",
  accent: "bg-accent-soft text-accent-ink",
  fa: "bg-fa-bg text-fa-fg",
  neutral: "bg-neutral-pill text-neutral-pill-fg",
};

/**
 * 비시즌 홈 '시즌 성적표'의 선수 한 명(사용자 11-12 확정안). 판정 딱지 → 한 줄 제목 → 이유 한 줄 → 숫자 넷 →
 * 자랑 알약(서버가 잘한 시즌·트리플A 시즌에만 준다) → 이번 겨울 이동. '좋은 시즌'만 팀 색 무대와 큰 사진으로 키운다.
 * 카드 어디를 눌러도 선수 페이지로 간다(이슈 #155, 이름 링크를 카드 전체로 넓힘). 별 버튼은 링크 위에서 제 동작만 한다.
 */
export default function SeasonReportCard({
  entry,
  report,
  isMine,
}: {
  entry: MyPlayer;
  report: SeasonReport;
  isMine: boolean;
}) {
  const { player } = entry;
  const style = TIER_STYLE[report.tier];
  const good = report.tier === "GOOD";
  const meta = metaLine(entry);
  // 기사 사진이 없거나 안 뜨면 이 선수 사진으로
  const news = (report.news ?? []).map((n) => ({ ...n, playerPhotoUrl: player.photoUrl }));
  return (
    <li className="card card-link relative flex flex-col overflow-hidden has-[h3_a:focus-visible]:outline-2 has-[h3_a:focus-visible]:outline-offset-2 has-[h3_a:focus-visible]:outline-accent">
      {good && (
        // 잘한 시즌은 팀 색 무대에 사진을 크게(내 선수 카드와 같은 무대). isolate: 배지의 z-10이 무대 안에서만 통하게
        <div className="player-stage isolate h-[6.5rem]" style={{ "--team": teamColor(player.teamAbbr) } as CSSProperties}>
          {entry.status && <StatusBadge status={entry.status} />}
          <BandPhoto nameKo={player.nameKo} photoUrl={player.photoUrl} teamAbbr={player.teamAbbr} />
        </div>
      )}
      <div className={`flex flex-1 flex-col px-4 pb-4 ${good ? "pt-3" : "pt-3.5"}`}>
        <div className="flex items-start gap-3">
          {!good && (
            <PlayerAvatar size={56} nameKo={player.nameKo} photoUrl={player.photoUrl} teamAbbr={player.teamAbbr} />
          )}
          <div className="min-w-0 flex-1 self-center">
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
              <h3 className="text-lg font-extrabold leading-snug tracking-[-0.02em]">
                <Link
                  href={`/players/${player.id}`}
                  className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none"
                >
                  {player.nameKo}
                </Link>
              </h3>
              {!good && entry.status && <StatusPill status={entry.status} />}
            </div>
            {meta && <p className="text-[0.8125rem] text-muted">{meta}</p>}
          </div>
          <MyPlayerToggle
            playerId={player.id}
            nameKo={player.nameKo}
            initialOn={isMine}
            variant="icon"
            className="relative z-10 -mr-2 -mt-1"
          />
        </div>

        {/* 판정 한 줄이 카드의 주 내용이라 흰 바탕 본문 글자로 둔다(회색·색 칸에는 숫자만, 규칙: 주 내용은 상자에 넣지 않기) */}
        <div className="mt-3">
          <span className={`inline-flex rounded-full px-2 py-px text-xs font-bold leading-5 ${style.chip}`}>{report.label}</span>
          <p className={`mt-1.5 font-extrabold leading-snug tracking-[-0.01em] ${good ? "text-[1.125rem]" : "text-[1.0625rem]"}`}>
            {report.headline}
          </p>
          {report.reason && <p className="mt-0.5 text-[0.875rem] text-muted">{report.reason}</p>}
        </div>

        <Numbers entry={entry} report={report} box={style.box} />

        {report.stories.length > 0 && (
          <ul className="mt-2.5 flex flex-wrap gap-1.5">
            {report.stories.map((s) => (
              <li key={s}>
                <StoryPill text={s} />
              </li>
            ))}
          </ul>
        )}

        {(report.winterMoves.length > 0 || news.length > 0) && (
          // 링크 위(relative z-10)에 올려 기사 줄·더 보기가 제 동작을 한다(카드 링크는 선수 페이지)
          <div className="relative z-10 mt-3 border-t border-line pt-3">
            <p className="text-xs font-bold text-muted">이번 겨울</p>
            {report.winterMoves.length > 0 && (
              <ul>
                {report.winterMoves.map((m) => (
                  <li key={`${m.date}-${m.label}`} className="mt-1 text-[0.875rem]">
                    <span className="text-muted tabular-nums">{monthDay(m.date)}</span>{" "}
                    <span className="font-bold">{m.label}</span>
                  </li>
                ))}
              </ul>
            )}
            {news.length > 0 && (
              <>
                <NewsTitleList items={news.slice(0, WINTER_NEWS_SHOWN)} />
                {news.length > WINTER_NEWS_SHOWN && (
                  <ShowMore
                    moreLabel={`기사 ${news.length - WINTER_NEWS_SHOWN}건 더 보기`}
                    buttonClassName="border-t border-line py-2.5"
                  >
                    <div className="border-t border-line">
                      <NewsTitleList items={news.slice(WINTER_NEWS_SHOWN)} />
                    </div>
                  </ShowMore>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

/** '이번 겨울' 기사 중 처음부터 보이는 수(확정안: 사진+제목 2건, 나머지는 '기사 n건 더 보기') */
const WINTER_NEWS_SHOWN = 2;

/** "2026-11-03" → "11월 3일" */
function monthDay(date: string): string {
  const [, m, d] = date.split("-");
  return `${Number(m)}월 ${Number(d)}일`;
}

function StatusPill({ status }: { status: CardStatus }) {
  const badge = statusBadge(status);
  if (!badge) return null;
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-px text-xs font-bold leading-5 ${PILL_TONE[badge.tone]}`}
    >
      <span aria-hidden className={`size-[7px] shrink-0 rounded-full ${badge.tone === "neutral" ? "bg-muted" : "bg-current"}`} />
      {badge.text}
    </span>
  );
}

/** 자랑 알약(연속 기록·최고 경기). 주황 = 기록이 만든 순간(The Hot Is Earned Rule) */
function StoryPill({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-hot-soft px-2 py-px text-xs font-bold leading-[1.125rem] text-hot-ink">
      <svg aria-hidden viewBox="0 0 12 12" className="size-3 fill-current">
        <path d="M6.6 1c.3 1.7-.6 2.6-1.4 3.5C4.3 5.4 3.5 6.3 3.5 7.7 3.5 9.6 4.9 11 6.7 11c1.9 0 3.3-1.4 3.3-3.4 0-1.3-.6-2.2-1.2-2.8 0 .9-.4 1.5-1 1.8C8.1 4.6 7.9 2.4 6.6 1Z" />
      </svg>
      {text}
    </span>
  );
}

/**
 * 숫자 넷: 서버가 정한 단계(report.level)의 시즌 합계. 타자는 타율·경기·안타·홈런, 좋은·제 몫 시즌은 경기 대신 WAR.
 * 투수는 평균자책점·등판·이닝·탈삼진. 다른 단계 기록이 있으면 한 줄로 덧붙인다(트리플A 85경기 · 타율 .262 · 3홈런).
 */
function Numbers({ entry, report, box }: { entry: MyPlayer; report: SeasonReport; box: string }) {
  const totals = entry.seasonTotals;
  if (!totals) return null;
  const minorsFirst = report.level === "MINORS";
  const main = (minorsFirst ? totals.minors : totals.mlb) ?? totals.mlb ?? totals.minors;
  if (!main) return null;
  const other = main === totals.mlb ? totals.minors : totals.mlb;
  const pitcher = entry.player.role === "PITCHER";
  const showWar = (report.tier === "GOOD" || report.tier === "SOLID") && report.war != null && main === totals.mlb;
  const items = pitcher ? pitcherItems(main) : hitterItems(main, showWar ? report.war : null);
  return (
    <div className={`mt-2.5 rounded-xl px-3 pb-2.5 pt-2 ${box}`}>
      <dl className="grid grid-cols-4 gap-1">
        {items.map(([k, v]) => (
          <div key={k}>
            <dt className="text-[0.6875rem] text-muted">{k}</dt>
            <dd className="text-lg font-extrabold leading-tight tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
      {other && other.games > 0 && <p className="mt-1.5 text-xs text-muted">{otherTotalsLine(other, pitcher)}</p>}
    </div>
  );
}

function hitterItems(t: LevelTotals, war: number | null): [string, string][] {
  const items: [string, string][] = [["타율", formatRate(t.avg)]];
  if (war == null) items.push(["경기", String(t.games)]);
  items.push(["안타", String(t.hits)], ["홈런", String(t.homeRuns)]);
  if (war != null) items.push(["WAR", war.toFixed(1)]);
  return items;
}

function pitcherItems(t: LevelTotals): [string, string][] {
  return [
    ["평균자책점", formatEra(t.era)],
    ["등판", String(t.games)],
    ["이닝", t.inningsText ?? "-"],
    ["탈삼진", String(t.strikeouts)],
  ];
}
