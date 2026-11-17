import type { SeasonMonth } from "@/lib/api";
import { formatEra } from "@/lib/format";

/** 막대 칸 높이(px). 리그 평균의 두 배(wRC+·ERA+ 200)에서 꽉 차고, 점선(100)은 칸 가운데다 */
const BAR_MAX = 44;
const PLUS_MAX = 200;
/** 막대가 아주 낮아도(wRC+ 0 이하) 그 달 막대가 있다는 게 보이는 높이 */
const BAR_MIN = 4;

/** 마이너 막대 색: 회색(muted)을 옅게. 메이저 파랑(accent)보다 뒤로 물러난다 */
const MINOR_BAR = "color-mix(in srgb, var(--muted) 45%, transparent)";
const INJURED_BAR = "color-mix(in srgb, var(--danger-fg) 70%, transparent)";
const AVERAGE_LINE = "color-mix(in srgb, var(--muted) 60%, transparent)";

/** 그 달 리그 평균 대비 값(100 = 평균, 높을수록 잘함). 타자 wRC+, 투수 ERA+ */
function plus(m: SeasonMonth, pitcher: boolean): number | null {
  return (pitcher ? m.eraPlus : m.wrcPlus) ?? null;
}

function played(m: SeasonMonth, pitcher: boolean): boolean {
  return (m.kind === "MLB" || m.kind === "MINORS") && plus(m, pitcher) != null;
}

/** 기록이 없는 달 글자 */
const REST: Record<SeasonMonth["kind"], string> = {
  MLB: "–",
  MINORS: "–",
  INJURED: "부상",
  FREE_AGENT: "FA",
  NONE: "–",
};

/** wRC+ 글자(음수는 긴 빼기표) */
function plusText(v: number): string {
  return v < 0 ? `−${Math.abs(v)}` : String(v);
}

/**
 * 성적표 카드의 달별 막대(사용자 11-16 'B 보완' 시안, 이슈 #239 → 11-17 wRC+로, 이슈 #242).
 * 자랑 알약(하루·한 구간)으로는 시즌을 설명하지 못해 4~9월을 막대 여섯 개로 보인다. 막대 높이는 타율이 아니라
 * 그 리그 평균 대비(타자 wRC+, 투수 ERA+, 100 = 평균)다(사용자 11-17: "타율로 시즌을 그리는 건 원시적").
 * 타율은 볼넷·장타·리그 환경을 못 담아 배지환 6월(.240인데 wRC+ 110)처럼 시즌을 틀리게 말했다.
 * - 칸 가운데 점선 = 그 리그 평균(100). 막대가 점선을 넘으면 평균보다 잘한 달. 마이너는 그 단계 리그 평균과 비교한다(서버).
 * - 숫자: 막대와 같은 값(타자 wRC+, 투수 ERA+). 투수 숫자가 평균자책점이면 낮을수록 좋은 숫자가 높을수록 좋은 막대 위에 붙어
 *   0.00인 달이 꽉 찬 막대로 거꾸로 읽혔다(전수조사 P1, 사용자 11-17 '추천대로', 이슈 #261). 팬에게 익숙한 평균자책점은
 *   투수만 달 이름 아래 작은 숫자로 둔다.
 * - 막대 색 = 어디서. 메이저 파랑, 마이너 회색(단계 이름은 머리 줄 범례에). 부상 달은 바닥에 빨간 줄과 본문 글자 '부상'
 *   (빨간 글자는 아주 잘한 달의 주황 숫자와 거의 같은 색이라 빨강은 줄에만 둔다, 사용자 11-17 '추천대로'), FA 달은 'FA'.
 * - 경기가 적은 달(서버 few: 타자 10경기·투수 5등판 미만)은 막대·숫자를 옅게 해 4경기 wRC+ 249가 시즌 최고 달처럼 보이지 않게 한다.
 * - 아주 잘한 달(서버 hot: wRC+ 130·ERA+ 143 이상)만 숫자를 주황으로(The Hot Is Earned Rule).
 * 화면 읽기 프로그램에는 달마다 '4월 메이저 31경기 wRC+ 118' 한 줄씩 읽힌다(막대·숫자 칸은 숨긴다).
 */
export default function MonthBars({ months, pitcher }: { months: SeasonMonth[]; pitcher: boolean }) {
  if (months.length === 0) return null;
  const stat = pitcher ? "ERA+" : "wRC+";
  const hasMajors = months.some((m) => m.kind === "MLB" && played(m, pitcher));
  const minorLevels = [
    ...new Set(months.filter((m) => m.kind === "MINORS" && played(m, pitcher)).map((m) => m.levelKo ?? "마이너")),
  ];
  const anyFew = months.some((m) => played(m, pitcher) && m.few);
  // 기록 있는 달이 하나도 없으면(시즌 내내 부상·FA) 둘째 줄이 모두 빈칸이라 '아래 작은 숫자' 안내를 붙이지 않는다
  const anyPlayed = months.some((m) => played(m, pitcher));
  const note = `점선 = 리그 평균${pitcher && anyPlayed ? " · 아래 작은 숫자는 평균자책점" : ""}${anyFew ? (pitcher ? " · 옅으면 등판 적은 달" : " · 옅으면 경기 적은 달") : ""}`;

  return (
    <div className="mt-3">
      {/* 큰 글씨에서 범례가 한 줄에 못 들어가면 다음 줄로(제목이 '달마다/wRC+'로 갈리지 않게, 이슈 #264) */}
      <div className="mb-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-caption text-muted">
        <span className="mr-auto">{`달마다 ${stat}`}</span>
        {hasMajors && <LegendKey color="var(--accent)" label="메이저" />}
        {minorLevels.length > 0 && <LegendKey color={MINOR_BAR} label={minorLevels.join("·")} />}
      </div>
      {/* month-bars: 여섯 칸 글자는 칸 폭만큼만 키운다(globals.css, 이슈 #264) */}
      <ol className="month-bars grid grid-cols-6 items-end" aria-label={`달마다 ${stat}, 100이 리그 평균`}>
        {months.map((m) => (
          <MonthColumn key={m.month} m={m} pitcher={pitcher} />
        ))}
      </ol>
      <p className="mt-1 text-caption text-muted">{note}</p>
    </div>
  );
}

function MonthColumn({ m, pitcher }: { m: SeasonMonth; pitcher: boolean }) {
  const has = played(m, pitcher);
  const v = plus(m, pitcher) ?? 0;
  const value = has ? plusText(v) : REST[m.kind];
  const where = m.kind === "MLB" ? "메이저" : (m.levelKo ?? "마이너");
  const spoken = has
    ? pitcher
      ? `${m.month}월 ${where} ${m.games}등판 ERA+ ${v}, 평균자책점 ${formatEra(m.era)}`
      : `${m.month}월 ${where} ${m.games}경기 wRC+ ${v}`
    : `${m.month}월 ${m.kind === "NONE" ? "기록 없음" : value}`;
  const tone = m.hot
    ? "text-hot-ink"
    : m.kind === "INJURED"
      ? "text-foreground"
      : !has || m.few
        ? "text-muted"
        : "";
  const height = has ? Math.max(BAR_MIN, Math.round((Math.min(PLUS_MAX, Math.max(0, v)) / PLUS_MAX) * BAR_MAX)) : 3;
  const color = has ? (m.kind === "MLB" ? "var(--accent)" : MINOR_BAR) : m.kind === "INJURED" ? INJURED_BAR : "var(--line)";
  return (
    <li className="flex min-w-0 flex-col items-center">
      <span className="sr-only">{spoken}</span>
      <span aria-hidden className={`month-bars-num mb-0.5 font-bold tracking-tight tabular-nums ${tone}`}>
        {value}
      </span>
      {/* 칸 사이 틈이 없어 칸마다 그은 점선이 한 줄로 이어진다 */}
      <span aria-hidden className="relative flex h-11 w-full items-end px-[9px]">
        <span className="absolute inset-x-0 bottom-1/2 border-t-[1.5px] border-dashed" style={{ borderColor: AVERAGE_LINE }} />
        <span
          // 경기 적은 달은 옅게. 마이너 회색은 이미 옅어서(45%) 덜 빼야 막대가 남는다
          className={`relative w-full ${has ? "rounded-t-[5px] rounded-b-[2px]" : "rounded-full"} ${has && m.few ? (m.kind === "MLB" ? "opacity-35" : "opacity-60") : ""}`}
          style={{ height, background: color }}
          // 고대비 모드(Windows)에서는 바탕색이 지워져 막대가 사라진다. 시스템 색으로 다시 칠할 표시(globals.css).
          // 메이저는 글자색, 마이너·기록 없는 달의 바닥 줄은 흐린 색
          data-bar={has && m.kind === "MLB" ? "" : "dim"}
        />
      </span>
      <span aria-hidden className="month-bars-small mt-1 text-muted">{`${m.month}월`}</span>
      {/* 투수만: 팬에게 익숙한 평균자책점을 작게(기록 없는 달은 자리만 맞춘다) */}
      {pitcher && (
        <span aria-hidden className="month-bars-small text-muted tabular-nums">
          {has ? formatEra(m.era) : "\u00a0"}
        </span>
      )}
    </li>
  );
}

function LegendKey({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      <span aria-hidden className="size-2 rounded-[2px]" style={{ background: color }} />
      {label}
    </span>
  );
}
