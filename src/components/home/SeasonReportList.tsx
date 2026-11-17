import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import type { CardStatus, CardStatusKind, MyPlayer, NewsHeadline, SeasonReport, SeasonTier } from "@/lib/api";
import { formatEra, formatRate, kstDayKey } from "@/lib/format";
import { newsHref } from "@/lib/news";
import ExternalLinkIcon from "@/components/ExternalLinkIcon";
import PlayerAvatar from "@/components/PlayerAvatar";
import MyPlayerToggle from "@/components/my/MyPlayerToggle";
import StarIcon from "@/components/my/StarIcon";
import { type BadgeTone, levelKo, statusBadge } from "@/components/my/formLabels";
import LinkedTeams from "@/components/home/LinkedTeams";
import MonthBars, { MonthSpark } from "@/components/home/MonthBars";
import SeasonReportRows, { type ReportRow } from "@/components/home/SeasonReportRows";
import LeaguePositionCompact from "@/components/player/LeaguePositionCompact";

/** 잘한 시즌 판정. 판정 글자를 주황으로(좋은 활약 색, The Hot Is Earned Rule) */
const HOT_TIERS: ReadonlySet<SeasonTier> = new Set(["GOOD", "SHORT_GOOD"]);

/** 상태 점 색: 위기 빨강 · 복귀 초록 · 콜업 파랑 · 이적 보라 · 그 밖 회색(DESIGN.md 신호색) */
const STATUS_DOT: Record<BadgeTone, string> = {
  danger: "bg-danger-fg",
  success: "bg-success-fg",
  accent: "bg-accent",
  fa: "bg-fa-fg",
  neutral: "bg-muted",
};

/** 상태가 이미 말하는 겨울 이동(같은 말 두 번 금지): 'FA 20일째' 옆 'FA 선언' 등 */
const SAID_BY_STATUS: Partial<Record<CardStatusKind, readonly string[]>> = {
  FA: ["FA 선언"],
  DFA: ["지명 할당(DFA)"],
  IL: ["부상자 명단 등재", "부상자 명단 이동"],
  SUSPENDED: ["출장 정지"],
};

/** 거론 구단 둘째 줄에 이름을 쓰는 구단 수(나머지는 '외 n곳'). 휴대폰 한 줄에 들어가는 만큼 */
const LINKED_IN_LINE = 2;

/** 목록 줄 숫자 하나: '143경기'(games), 'wRC+ 102'(plus), '타율 .276'(rate). 숫자만 굵게 쓰려고 이름표와 값을 나눠 둔다 */
interface Stat {
  kind: "games" | "plus" | "rate";
  /** '경기'·'등판'(값 뒤), 'wRC+'·'ERA+'·'타율'·'평균자책점'(값 앞) */
  label: string;
  value: string;
  /** 마이너 합계일 때 맨 앞 칸에 한 번 붙이는 단계 이름('트리플A'). 없으면 null */
  level: string | null;
}

/**
 * 홈 '2026 시즌 성적표'(사용자 11-17 '목록 + 누르면 펼치기', 이슈 #276). 카드 6장(휴대폰 3,705px)을 흰 카드 한 장 안 한 줄 목록으로
 * 바꿔 선수끼리 판정·같은 숫자·한 해 모양(작은 달별 막대)을 한눈에 견주고, 줄을 누르면 그 자리에서 줄에 없는 것만 펼친다
 * (한 줄 흐름·달별 막대·MLB 안 위치·거론 구단·별·기사 모두 보기·선수 페이지).
 * entries는 보일 순서(내 선수 먼저 → 시즌 판정 순)이고, 성적표가 없는 선수도 이름·상태·숫자로 한 줄을 둔다.
 */
export default function SeasonReportList({
  entries,
  reports,
  myIds,
}: {
  entries: MyPlayer[];
  reports: SeasonReport[];
  myIds: number[];
}) {
  const byId = new Map(reports.map((r) => [r.playerId, r]));
  const rows = entries.map((entry) =>
    buildRow(entry, byId.get(entry.player.id) ?? null, myIds.includes(entry.player.id)),
  );
  return (
    <div className="card px-4 pb-1">
      <p className="pb-0.5 pt-2.5 text-caption text-muted">{guide(entries, byId)}</p>
      <SeasonReportRows rows={rows} />
    </div>
  );
}

/**
 * 목록 맨 위 흐린 안내: '막대 = 4~9월 달마다 wRC+(투수는 ERA+) · 줄을 누르면 펼쳐져요'.
 * 막대 이름은 목록에 있는 선수만큼만(타자만 있으면 wRC+, 투수만 있으면 ERA+). 달별 기록이 없으면(옛 api) 펼치기 안내만
 */
function guide(entries: MyPlayer[], byId: Map<number, SeasonReport>): string {
  const withMonths = entries.filter((e) => (byId.get(e.player.id)?.months?.length ?? 0) > 0);
  if (withMonths.length === 0) return "줄을 누르면 펼쳐져요";
  const months = withMonths.flatMap((e) => byId.get(e.player.id)?.months?.map((m) => m.month) ?? []);
  const pitchers = withMonths.filter((e) => e.player.role === "PITCHER").length;
  const stat = pitchers === 0 ? "wRC+" : pitchers === withMonths.length ? "ERA+" : "wRC+(투수는 ERA+)";
  return `막대 = ${Math.min(...months)}~${Math.max(...months)}월 달마다 ${stat} · 줄을 누르면 펼쳐져요`;
}

function buildRow(entry: MyPlayer, report: SeasonReport | null, isMine: boolean): ReportRow {
  const { player } = entry;
  const pitcher = player.role === "PITCHER";
  // 성적표는 모두 끝난 시즌이라 '시즌 끝'은 쓰지 않는다(사용자 11-13 시안 C). FA·국내 복귀 등은 그대로
  const status = entry.status?.kind === "SEASON_OVER" ? null : entry.status;
  const stats = statsOf(entry, report, pitcher);
  const months = report?.months ?? [];
  const linked = report?.linkedTeams?.teams.some((t) => t.linked > 0) ? report.linkedTeams : null;
  const news = latest(report?.news ?? []);
  const flow = flowOf(report, stats);
  const moves = (report?.winterMoves ?? []).filter((m) => !(status && SAID_BY_STATUS[status.kind]?.includes(m.label)));
  const position =
    report?.saber === undefined ? null : (
      <LeaguePositionCompact saber={report.saber} pitcher={pitcher} minorNumbers={report.level === "MINORS"} />
    );

  const head = (
    <>
      {/* 이름·판정·상태는 한 줄에, 모자라면 덩어리째 다음 줄로 */}
      <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="whitespace-nowrap text-heading">
          {player.nameKo}
          {isMine && (
            <>
              <StarIcon filled className="ml-1 inline-block size-3.5 align-[-1px] text-accent-ink" />
              <span className="sr-only">(내 선수)</span>
            </>
          )}
        </span>
        {/* 판정은 알약 대신 글자+색(누를 수 없는 이름표, 사용자 11-17 '텍스트가 나아'). 잘한 시즌만 주황, 나머지는 진회색 */}
        {report && (
          <span className={`text-label ${HOT_TIERS.has(report.tier) ? "text-hot-ink" : "text-neutral-pill-fg"}`}>
            {report.label}
          </span>
        )}
        {status && <StatusText status={status} />}
      </span>
      {stats.length > 0 && (
        <span className="mt-0.5 block text-meta text-muted tabular-nums">
          {stats.map((s, i) => (
            <Fragment key={s.kind}>
              {/* '·'는 앞 숫자에 붙여 줄이 바뀌어도 줄 머리에 '·'가 오지 않게 */}
              {i > 0 && "\u00a0· "}
              <span className="whitespace-nowrap">
                {s.level && `${s.level} `}
                {s.kind !== "games" && `${s.label} `}
                <span className="font-semibold text-foreground">{s.value}</span>
                {s.kind === "games" && s.label}
              </span>
            </Fragment>
          ))}
        </span>
      )}
    </>
  );

  const linkedTeams = linked ? linked.teams.filter((t) => t.linked > 0) : [];
  const second = linked ? (
    // 줄 폭이 16rem보다 좁으면(큰 글씨) 자르지 않고 세 줄까지 흘린다
    <p className="truncate py-1 text-caption tabular-nums @max-[16rem]:line-clamp-3 @max-[16rem]:whitespace-normal">
      <span className="font-semibold text-muted">거론 구단</span>{" "}
      {linkedTeams.slice(0, LINKED_IN_LINE).map((t, i) => (
        <Fragment key={t.abbreviation}>
          {i > 0 && " · "}
          {t.nameKo} <span className="font-semibold">{t.linked}건</span>
        </Fragment>
      ))}
      {linkedTeams.length > LINKED_IN_LINE && ` · 외 ${linkedTeams.length - LINKED_IN_LINE}곳`}
    </p>
  ) : news ? (
    <NewsLine news={news} />
  ) : null;

  const panel = (
    <>
      {flow && <p className="text-heading">{flow}</p>}
      {/* 달별 막대와 MLB 안 위치: 휴대폰은 위아래, 넓은 화면은 두 칸 */}
      {(months.length > 0 || position) && (
        <div className={months.length > 0 && position ? "md:grid md:grid-cols-2 md:gap-x-8" : undefined}>
          {months.length > 0 && <MonthBars months={months} pitcher={pitcher} />}
          {position}
        </div>
      )}
      {/* FA 선수: 노시환 MLB 도전 카드와 같은 '행선지로 거론된 구단'(누르면 기사 창, 이슈 #191) */}
      {linked && (
        <LinkedTeams counts={linked} sheetKey={`player-${player.id}`} className="mt-4" playerPhotoUrl={player.photoUrl} />
      )}
      {/* 상태가 말하지 않는 겨울 이동(트레이드·계약 등). 'FA 선언'은 'FA n일째'가 이미 말한다 */}
      {moves.length > 0 && (
        <p className="mt-3 text-meta text-muted tabular-nums">
          이번 겨울 이동{" "}
          {moves.map((m, i) => (
            <Fragment key={`${m.date}-${m.label}`}>
              {i > 0 && " · "}
              <span className="whitespace-nowrap">
                {monthDay(m.date)} <span className="font-semibold text-foreground">{m.label}</span>
              </span>
            </Fragment>
          ))}
        </p>
      )}
      {/* 맨 아래: 내 선수 별 · 이 선수 기사(뉴스 탭) · 선수 페이지(예전 카드는 어디를 눌러도 선수 페이지로 갔다) */}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 border-t border-line pt-1">
        <MyPlayerToggle playerId={player.id} nameKo={player.nameKo} initialOn={isMine} variant="icon" className="-ml-2" />
        <span className="ml-auto flex flex-wrap items-center justify-end gap-x-4">
          {(report?.news?.length ?? 0) > 0 && (
            <TextLink href={newsHref(player.nameKo)}>{`${player.nameKo} 기사 모두 보기`}</TextLink>
          )}
          <TextLink href={`/players/${player.id}`}>
            <span className="sr-only">{`${player.nameKo} `}</span>
            선수 페이지
          </TextLink>
        </span>
      </div>
    </>
  );

  return {
    id: player.id,
    photo: <PlayerAvatar size={44} nameKo={player.nameKo} photoUrl={player.photoUrl} teamAbbr={player.teamAbbr} />,
    head,
    spark: months.length > 0 ? <MonthSpark months={months} pitcher={pitcher} /> : null,
    second,
    secondInPanel: linked != null,
    panel,
    sheetKey: linked ? `player-${player.id}` : null,
  };
}

/**
 * 목록 줄 숫자: 선수마다 같은 세 칸, 경기 수 먼저(카드 통일). 타자 '143경기 · wRC+ 102 · 타율 .276',
 * 투수 '36등판 · ERA+ 105 · 평균자책점 3.91'. 타율 하나로 시즌을 판단하지 않게 리그 대비(wRC+·ERA+)를 함께 둔다(사용자 11-13·11-17).
 * 숫자는 서버가 정한 단계(report.level)의 시즌 합계이고, wRC+·ERA+도 같은 단계다(korleaguer-server#179). 값이 없으면 그 칸만 뺀다.
 * 마이너 합계면 어느 단계 기록인지 붙인다(이름표가 그냥 '타율'이면 메이저 기록으로 읽힌다). 다만 판정이 이미 단계를 말하면
 * ('트리플A에서 보낸 시즌') 붙이지 않는다(같은 말 두 번 금지). 붙일 때는 첫 칸에 한 번만: '트리플A 85경기 · wRC+ 75 · 타율 .262'
 */
function statsOf(entry: MyPlayer, report: SeasonReport | null, pitcher: boolean): Stat[] {
  const totals = entry.seasonTotals;
  const main = totals ? ((report?.level === "MINORS" ? totals.minors : totals.mlb) ?? totals.mlb ?? totals.minors) : null;
  const plus = pitcher ? report?.eraPlus : report?.wrcPlus;
  const rate = main ? (pitcher ? main.era : main.avg) : null;
  const stats: Stat[] = [];
  if (main) stats.push({ kind: "games", label: pitcher ? "등판" : "경기", value: String(main.games), level: null });
  if (plus != null) stats.push({ kind: "plus", label: pitcher ? "ERA+" : "wRC+", value: String(plus), level: null });
  if (rate != null) {
    stats.push({ kind: "rate", label: pitcher ? "평균자책점" : "타율", value: pitcher ? formatEra(rate) : formatRate(rate), level: null });
  }
  // 숫자가 마이너 합계일 때 단계 이름: 서버 값(옛 api면 합계의 단계 약어로)
  const minorLevel = main && totals && main !== totals.mlb ? (report?.statLevelKo ?? levelKo(main.level)) : null;
  const verdictSaysLevel = report != null && (report.tier === "MINORS" || (minorLevel != null && report.label.includes(minorLevel)));
  if (minorLevel && !verdictSaysLevel && stats.length > 0) stats[0] = { ...stats[0], level: minorLevel };
  return stats;
}

/**
 * 펼친 곳 맨 위 한 줄 흐름: 이유(서버가 전·후반 흐름을 wRC+로 쓴다, '6월까지 wRC+ 123 → 7월부터 76'), 없으면 한 줄 제목.
 * 예전 카드는 제목과 이유를 둘 다 써서 같은 말을 되풀이했다. 제목이 줄에 이미 있는 숫자를 되풀이하면 쓰지 않는다.
 * 견주는 글: '143경기'·'36등판', 'wRC+ 102'·'ERA+ 105', '.276'·'3.91'(이름표를 붙이거나 소수점이 있어 '7월'의 7 같은 다른 숫자와 헷갈리지 않는다)
 */
function flowOf(report: SeasonReport | null, stats: Stat[]): string | null {
  if (!report) return null;
  if (report.reason) return report.reason;
  const said = stats.map((s) => (s.kind === "games" ? `${s.value}${s.label}` : s.kind === "plus" ? `${s.label} ${s.value}` : s.value));
  return said.some((text) => report.headline.includes(text)) ? null : report.headline;
}

/** 가장 최근 기사(서버는 늦은 순이되 같은 언론사가 연달아 오지 않게 조금 섞어 보낸다) */
function latest(news: NewsHeadline[]): NewsHeadline | null {
  return news.reduce<NewsHeadline | null>((a, b) => (!a || b.publishedAt > a.publishedAt ? b : a), null);
}

/** 둘째 줄 '이번 겨울 11월 17일 기사 제목'. 줄 전체가 우리 기사 페이지 링크다(번호가 없는 옛 api면 원문을 새 탭으로) */
function NewsLine({ news }: { news: NewsHeadline }) {
  const day = kstDayKey(news.publishedAt);
  const body = (
    <>
      <span className="font-semibold text-muted">이번 겨울</span>{" "}
      {day && <span className="text-muted tabular-nums">{monthDay(day)}</span>}{" "}
      <span className="group-hover:underline">{news.titleKo ?? news.title}</span>
    </>
  );
  const className =
    "group block truncate py-1 text-caption text-foreground @max-[16rem]:line-clamp-3 @max-[16rem]:whitespace-normal";
  if (news.id == null) {
    return (
      <a href={news.url} target="_blank" rel="noopener noreferrer" className={className}>
        {body}
        <span className="ml-1 text-muted">
          <ExternalLinkIcon />
          <span className="sr-only">(원문, 새 탭에서 열림)</span>
        </span>
      </a>
    );
  }
  return (
    <Link href={`/news/${news.id}`} className={className}>
      {body}
    </Link>
  );
}

/** 이름 옆 상태: 점 + 글자(누를 수 없는 이름표라 알약 대신). FA는 보라 글자, 나머지는 본문 글자에 점만 신호색 */
function StatusText({ status }: { status: CardStatus }) {
  const badge = statusBadge(status);
  if (!badge) return null;
  return (
    <span className={`whitespace-nowrap text-label ${badge.tone === "fa" ? "text-fa-fg" : "text-foreground"}`}>
      <span aria-hidden className={`mr-1 inline-block size-[7px] rounded-full align-middle ${STATUS_DOT[badge.tone]}`} />
      {badge.text}
    </span>
  );
}

/** 펼친 곳 맨 아래 글자 링크('전체 기사 보기'와 같은 진한 파랑 글자 + ›) */
function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="press inline-flex min-h-11 items-center gap-0.5 whitespace-nowrap text-label text-accent-ink hover:underline"
    >
      {children}
      <svg aria-hidden viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="size-3.5">
        <path d="m6 4 4 4-4 4" />
      </svg>
    </Link>
  );
}

/** "2026-11-03" → "11월 3일" */
function monthDay(date: string): string {
  const [, m, d] = date.split("-");
  return `${Number(m)}월 ${Number(d)}일`;
}
