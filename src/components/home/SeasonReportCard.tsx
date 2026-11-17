import type { CSSProperties } from "react";
import Link from "next/link";
import type { CardStatus, LevelTotals, MyPlayer, SeasonReport, SeasonTier } from "@/lib/api";
import { formatEra, formatRate } from "@/lib/format";
import { teamColor } from "@/lib/teams";
import PlayerAvatar from "@/components/PlayerAvatar";
import AllNewsLink from "@/components/news/AllNewsLink";
import NewsTitleList from "@/components/news/NewsTitleList";
import BandPhoto from "@/components/my/BandPhoto";
import { StatusBadge } from "@/components/my/FormSummary";
import MyPlayerToggle from "@/components/my/MyPlayerToggle";
import LinkedTeams from "@/components/home/LinkedTeams";
import MonthBars from "@/components/home/MonthBars";
import { type BadgeTone, levelKo, metaLine, otherTotalsLine, statusBadge } from "@/components/my/formLabels";

/**
 * 판정 딱지(사용자 11-13 결정 'B4 채움 사다리', 이슈 #192): 알약은 칭찬에만 쓴다.
 * 좋은·짧았지만 좋았던 시즌 = 옅은 주황 알약(좋은 활약 색, 달별 막대의 주황 숫자와 한 식구), 제 몫 한 시즌 = 회색 알약,
 * 트리플A·마이너·출전 적음·아쉬운 시즌 = 알약 없이 흐린 글자. 아쉬운 시즌에 도장을 찍지 않아 11-12 '혹평 막기'를 지킨다.
 * 예전 초록(좋은 시즌)·파랑(제 몫)은 다른 화면의 '복귀·계약'·'나빠짐'과 뜻이 부딪혀 뺐다(Signal Color Rule).
 * 숫자 칸은 판정과 상관없이 회색이다.
 */
const TIER_CHIP: Record<SeasonTier, string> = {
  GOOD: "rounded-full bg-hot-soft px-2 text-hot-ink",
  SHORT_GOOD: "rounded-full bg-hot-soft px-2 text-hot-ink",
  SOLID: "rounded-full bg-neutral-pill px-2 text-neutral-pill-fg",
  MINORS: "text-muted",
  SHORT: "text-muted",
  POOR: "text-muted",
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
 * 달별 막대(4~9월, 사용자 11-16 'B 보완') → 이번 겨울 이동. '좋은 시즌'만 팀 색 무대와 큰 사진으로 키운다.
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
  const good = report.tier === "GOOD";
  // 성적표는 모두 끝난 시즌이라 카드마다 '시즌 끝'을 붙이지 않는다(사용자 11-13 시안 C). FA·국내 복귀 등은 그대로
  const status = entry.status?.kind === "SEASON_OVER" ? null : entry.status;
  const meta = metaLine(entry);
  // 기사 사진이 없거나 안 뜨면 이 선수 사진으로
  const news = (report.news ?? []).map((n) => ({ ...n, playerPhotoUrl: player.photoUrl }));
  const linked = report.linkedTeams?.teams.some((t) => t.linked > 0) ? report.linkedTeams : null;
  return (
    <li className="card card-link relative flex flex-col self-start overflow-hidden has-[h3_a:focus-visible]:outline-2 has-[h3_a:focus-visible]:outline-offset-2 has-[h3_a:focus-visible]:outline-accent">
      {good && (
        // 잘한 시즌은 팀 색 무대에 사진을 크게(내 선수 카드와 같은 무대). isolate: 배지의 z-10이 무대 안에서만 통하게
        <div className="player-stage isolate h-[6.5rem]" style={{ "--team": teamColor(player.teamAbbr) } as CSSProperties}>
          {status && <StatusBadge status={status} />}
          <BandPhoto nameKo={player.nameKo} photoUrl={player.photoUrl} teamAbbr={player.teamAbbr} />
        </div>
      )}
      <div className={`@container flex flex-1 flex-col px-4 pb-4 ${good ? "pt-3" : "pt-3.5"}`}>
        {/* 카드 안쪽이 12rem보다 좁으면(큰 글씨) 이름·소속을 사진 아래 줄로 내려 폭을 다 쓴다. 사진(56px)과 별 사이에 두면
            360px 휴대폰 2배에서 이름이 칸 밖으로 나가고 소속이 네 줄로 갈렸다(이슈 #264). 사진 없는 '좋은 시즌' 카드는 그대로 */}
        <div className={`flex items-start gap-3 ${good ? "" : "@max-[12rem]:flex-wrap"}`}>
          {!good && (
            <PlayerAvatar size={56} nameKo={player.nameKo} photoUrl={player.photoUrl} teamAbbr={player.teamAbbr} />
          )}
          <div className={`min-w-0 flex-1 self-center ${good ? "" : "@max-[12rem]:order-last @max-[12rem]:basis-full"}`}>
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
              <h3 className="text-title">
                <Link
                  href={`/players/${player.id}`}
                  className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none"
                >
                  {player.nameKo}
                </Link>
              </h3>
              {!good && status && <StatusPill status={status} />}
            </div>
            {meta && <p className="text-meta text-muted">{meta}</p>}
          </div>
          <MyPlayerToggle
            playerId={player.id}
            nameKo={player.nameKo}
            initialOn={isMine}
            variant="icon"
            className="relative z-10 -mr-2 -mt-1 ml-auto"
          />
        </div>

        {/* 판정 한 줄이 카드의 주 내용이라 흰 바탕 본문 글자로 둔다(회색·색 칸에는 숫자만, 규칙: 주 내용은 상자에 넣지 않기) */}
        <div className="mt-3">
          {/* 알약이 없는 판정은 글자가 제목과 왼쪽 줄이 맞도록 둥근 바탕·옆 여백을 판정별로 준다 */}
          <span className={`inline-flex py-0.5 text-badge ${TIER_CHIP[report.tier]}`}>{report.label}</span>
          <p className="mt-1.5 text-heading">
            {report.headline}
          </p>
          {report.reason && <p className="mt-0.5 text-body text-muted">{report.reason}</p>}
        </div>

        <Numbers entry={entry} report={report} />

        {/* 시즌 흐름: 달마다 막대(자랑 알약은 하루·한 구간이라 시즌을 설명하지 못해 바꿨다, 이슈 #239). 옛 api면 없다 */}
        {report.months && <MonthBars months={report.months} pitcher={entry.player.role === "PITCHER"} />}

        {(report.winterMoves.length > 0 || news.length > 0 || linked) && (
          // 링크 위(relative z-10)에 올려 기사 줄·전체 기사 보기가 제 동작을 한다(카드 링크는 선수 페이지)
          <div className="relative z-10 mt-3 border-t border-line pt-3">
            <p className="text-label text-muted">이번 겨울</p>
            {report.winterMoves.length > 0 && (
              <ul>
                {report.winterMoves.map((m) => (
                  <li key={`${m.date}-${m.label}`} className="mt-1 text-body">
                    <span className="text-muted tabular-nums">{monthDay(m.date)}</span>{" "}
                    <span className="font-bold">{m.label}</span>
                  </li>
                ))}
              </ul>
            )}
            {/* FA 선수: 노시환 MLB 도전 카드와 같은 '행선지로 거론된 구단' 칩(이슈 #191, 서버가 FA에게만 준다).
                FA 선언(이동) 다음, 기사 앞에 둔다 */}
            {linked && (
              <LinkedTeams
                counts={linked}
                sheetKey={`player-${player.id}`}
                className="mb-2 mt-3"
                playerPhotoUrl={player.photoUrl}
              />
            )}
            {news.length > 0 && (
              <>
                <NewsTitleList items={news.slice(0, WINTER_NEWS_SHOWN)} />
                {/* 더 있으면 그 자리에서 펼치지 않고 뉴스 탭으로(펼치면 아래 선수 카드가 모두 밀려 내려갔다, 이슈 #206) */}
                {news.length > WINTER_NEWS_SHOWN && (
                  <AllNewsLink player={player.nameKo} className="border-t border-line py-2.5" />
                )}
              </>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

/** '이번 겨울' 기사 중 카드에 보이는 수(확정안: 사진+제목 2건). 더 있으면 '전체 기사 보기'(뉴스 탭) */
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
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-badge ${PILL_TONE[badge.tone]}`}
    >
      <span aria-hidden className={`size-[7px] shrink-0 rounded-full ${badge.tone === "neutral" ? "bg-muted" : "bg-current"}`} />
      {badge.text}
    </span>
  );
}

/**
 * 숫자 넷: 서버가 정한 단계(report.level)의 시즌 합계. 타자는 타율·경기·안타·홈런, 좋은·제 몫 시즌은 경기 대신 WAR.
 * 투수는 평균자책점·등판·이닝·탈삼진. 다른 단계 기록이 있으면 한 줄로 덧붙인다(트리플A 85경기 · 타율 .262 · 3홈런).
 */
function Numbers({ entry, report }: { entry: MyPlayer; report: SeasonReport }) {
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
    <div className="@container mt-2.5 rounded-xl bg-surface-2 px-3 pb-2.5 pt-2">
      {/* 큰 숫자가 마이너 기록이면 어느 단계인지 먼저 적는다. 이름표가 그냥 '타율'이면 메이저 기록으로 읽힌다(점검 11-13) */}
      {main !== totals.mlb && <p className="mb-1 text-label text-muted">{`${levelKo(main.level)} 기록`}</p>}
      {/* 칸이 16rem보다 좁으면(큰 글씨) 넷을 두 줄 두 칸으로. 한 줄 네 칸이면 '.276'이 세 줄로 갈렸다(앱 2배, 이슈 #264).
          그보다 더 좁으면(2배) 두 칸에도 '평균자책점'이 '평균자책/점'으로 갈려서, 한 줄에 이름표·숫자를 양 끝으로 둔 목록으로.
          모든 카드가 같은 폭이라 함께 바뀐다(카드 통일) */}
      <dl className="grid grid-cols-4 gap-1 @max-[16rem]:grid-cols-2 @max-[16rem]:gap-y-1.5 @max-[7.75rem]:grid-cols-1 @max-[7.75rem]:gap-y-0.5 @max-[7.75rem]:*:flex @max-[7.75rem]:*:items-baseline @max-[7.75rem]:*:justify-between @max-[7.75rem]:*:gap-3">
        {items.map(([k, v]) => (
          <div key={k}>
            <dt className="text-caption text-muted">{k}</dt>
            <dd className="text-stat tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
      {other && other.games > 0 && <p className="mt-1.5 text-caption text-muted">{otherTotalsLine(other, pitcher)}</p>}
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
