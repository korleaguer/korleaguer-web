import { Fragment, type ReactNode } from "react";
import type { SeasonMonth } from "@/lib/api";
import { formatEra } from "@/lib/format";

/** 막대 칸 높이(px). 리그 평균의 두 배(wRC+·ERA+ 200)에서 꽉 차고, 점선(100)은 칸 가운데다 */
const BAR_MAX = 44;
const PLUS_MAX = 200;
/** 막대가 아주 낮아도(wRC+ 0 이하) 그 달 막대가 있다는 게 보이는 높이 */
const BAR_MIN = 4;

/**
 * 마이너 막대: 회색(muted)을 옅게 깐 위에 45° 빗금. 메이저 파랑(accent)보다 뒤로 물러나고, 색을 못 가려도 무늬로 갈린다
 * (전수조사 L295, 사용자 11-17 '결정 유지, 마이너 막대에 빗금'). period는 빗금 사이 간격(px)이다(작은 막대는 촘촘하게).
 * 막대는 투명도 대신 카드 색과 섞어 늘 불투명하게 칠한다(경기 적은 달의 옅은 막대도): 비치면 뒤의 진한 평균 점선이
 * 막대를 뚫고 보였다
 */
function minorFill(period: number, faint: boolean): string {
  const base = `color-mix(in srgb, var(--muted) ${faint ? 23 : 38}%, var(--surface))`;
  const stripe = `color-mix(in srgb, var(--muted) ${faint ? 51 : 85}%, var(--surface))`;
  return `repeating-linear-gradient(45deg, ${stripe} 0 1px, transparent 1px ${period}px), ${base}`;
}
/** 경기 적은 달의 메이저 막대: 파랑 35%(예전 투명도 35%와 같은 색) */
const FAINT_MAJOR = "color-mix(in srgb, var(--accent) 35%, var(--surface))";
const INJURED_BAR = "color-mix(in srgb, var(--danger-fg) 70%, transparent)";
/**
 * 평균(100) 점선: 흐린 글자색 그대로(라이트 대비 2.60:1 → 6.1:1, 전수조사 L295). 막대 뒤에 둔다: 막대 위로 올리면
 * 파란 막대 위 대비가 1.19:1이라 오히려 안 보인다
 */
const AVERAGE_LINE = "var(--muted)";

/** 그 달 리그 평균 대비 값(100 = 평균, 높을수록 잘함). 타자 wRC+, 투수 ERA+ */
function plus(m: SeasonMonth, pitcher: boolean): number | null {
  return (pitcher ? m.eraPlus : m.wrcPlus) ?? null;
}

function played(m: SeasonMonth, pitcher: boolean): boolean {
  return (m.kind === "MLB" || m.kind === "MINORS") && plus(m, pitcher) != null;
}

/** 기록 있는 달이 200을 넘어 막대 끝이 잘렸나(막대는 200에서 꽉 찬다) */
function capped(m: SeasonMonth, pitcher: boolean): boolean {
  return played(m, pitcher) && (plus(m, pitcher) ?? 0) > PLUS_MAX;
}

/** 막대 칠: 메이저 파랑, 마이너 빗금(경기 적은 달은 둘 다 옅게), 부상 달 바닥 빨간 줄, 기록 없는 달 바닥 회색 줄 */
function barFill(m: SeasonMonth, has: boolean, period: number): string {
  if (has) return m.kind === "MLB" ? (m.few ? FAINT_MAJOR : "var(--accent)") : minorFill(period, m.few === true);
  return m.kind === "INJURED" ? INJURED_BAR : "var(--line)";
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
 *   메이저·마이너(또는 여러 단계) 달이 섞이면 달마다 평균이 달라 '각 리그 평균(100)'이라고 쓴다(전수조사 L296·L424).
 * - 숫자: 막대와 같은 값(타자 wRC+, 투수 ERA+). 투수 숫자가 평균자책점이면 낮을수록 좋은 숫자가 높을수록 좋은 막대 위에 붙어
 *   0.00인 달이 꽉 찬 막대로 거꾸로 읽혔다(전수조사 P1, 사용자 11-17 '추천대로', 이슈 #261). 팬에게 익숙한 평균자책점은
 *   투수만 달 이름 아래 작은 숫자로 둔다.
 * - 막대 색 = 어디서. 메이저 파랑, 마이너 회색 + 빗금(단계 이름은 머리 줄 범례에). 부상 달은 바닥에 빨간 줄과 본문 글자 '부상'
 *   (빨간 글자는 아주 잘한 달의 주황 숫자와 거의 같은 색이라 빨강은 줄에만 둔다, 사용자 11-17 '추천대로'), FA 달은 'FA'.
 * - 경기가 적은 달(서버 few: 타자 10경기·투수 5등판 미만)은 막대·숫자를 옅게 해 4경기 wRC+ 249가 시즌 최고 달처럼 보이지 않게 한다.
 * - 아주 잘한 달(서버 hot: wRC+ 130·ERA+ 143 이상)만 숫자를 주황으로(The Hot Is Earned Rule). 그런 달이 있으면 안내 줄에
 *   주황 글자 '주황 = 아주 잘한 달'을 두고 낭독에도 ', 아주 잘한 달'을 붙인다(전수조사 L295, 범례에 없으면 주황의 뜻을 알 수 없었다).
 * - 200을 넘는 달은 막대가 꽉 차서 200과 같아 보인다. 그 막대 위 끝을 카드 색 사선 틈(위아래 흐린 글자색 선)으로 끊고(꺾임 표시),
 *   안내 줄에 '꺾인 막대는 200 넘음'(전수조사 L302). 점선 기준으로 위아래로 뻗는 막대는 바닥에서 키우는 막대(11-16 'B 보완')와 부딪혀 쓰지 않는다.
 * 화면 읽기 프로그램에는 달마다 '4월 메이저 31경기 wRC+ 118' 한 줄씩 읽힌다(막대·숫자 칸은 숨긴다).
 */
export default function MonthBars({ months, pitcher }: { months: SeasonMonth[]; pitcher: boolean }) {
  if (months.length === 0) return null;
  const stat = pitcher ? "ERA+" : "wRC+";
  const playedMonths = months.filter((m) => played(m, pitcher));
  const hasMajors = playedMonths.some((m) => m.kind === "MLB");
  const minorLevels = [...new Set(playedMonths.filter((m) => m.kind === "MINORS").map((m) => m.levelKo ?? "마이너"))];
  // 비교한 리그가 둘 이상이면(메이저 + 트리플A, 트리플A + 더블A) 달마다 평균이 다르다
  const average = (hasMajors ? 1 : 0) + minorLevels.length > 1 ? "각 리그 평균" : "리그 평균";
  const anyFew = playedMonths.some((m) => m.few);
  const anyCapped = months.some((m) => capped(m, pitcher));
  // 안내 줄. 기록 있는 달이 하나도 없으면(시즌 내내 부상·FA) 둘째 줄이 모두 빈칸이라 '아래 작은 숫자' 안내를 붙이지 않는다
  // 점선 뜻은 점선 오른쪽 끝 '평균' 이름표가, 주황은 주황 숫자·막대가 스스로 말한다(이슈 #329). 낭독 이름의 '100이 ${average}'는 그대로
  const notes: ReactNode[] = [];
  if (pitcher && playedMonths.length > 0) notes.push("아래 작은 숫자는 평균자책점");
  if (anyFew) notes.push(pitcher ? "옅으면 등판 적은 달" : "옅으면 경기 적은 달");
  if (anyCapped) notes.push("꺾인 막대는 200\u00a0넘음");

  return (
    <div className="mt-3">
      {/* 큰 글씨에서 범례가 한 줄에 못 들어가면 다음 줄로(제목이 '달마다/wRC+'로 갈리지 않게, 이슈 #264) */}
      <div className="mb-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-caption text-muted">
        <span className="mr-auto">{`달마다 ${stat}`}</span>
        {hasMajors && <LegendKey fill="var(--accent)" bar="" label="메이저" />}
        {minorLevels.length > 0 && <LegendKey fill={minorFill(4, false)} bar="dim" label={minorLevels.join("·")} />}
      </div>
      {/* month-bars: 여섯 칸 글자는 칸 폭만큼만 키운다(globals.css, 이슈 #264) */}
      <ol className="month-bars grid grid-cols-6 items-end" aria-label={`달마다 ${stat}, 100이 ${average}`}>
        {months.map((m) => (
          <MonthColumn key={m.month} m={m} pitcher={pitcher} last={m === months[months.length - 1]} />
        ))}
      </ol>
      {/* 안내 하나는 한 덩어리로 줄을 바꾼다(inline-block, 한 줄보다 길 때만 안에서 바꾼다): '꺾인 / 막대는'처럼 말 중간에서
          갈리지 않게. '·'는 앞 안내에 붙여 줄 머리에 오지 않게 한다 */}
      {notes.length > 0 && (
        <p className="mt-1 text-caption text-muted">
          {notes.map((note, i) => (
            <Fragment key={i}>
              <span className="inline-block">
                {note}
                {i < notes.length - 1 && "\u00a0·"}
              </span>
              {i < notes.length - 1 && " "}
            </Fragment>
          ))}
        </p>
      )}
    </div>
  );
}

function MonthColumn({ m, pitcher, last }: { m: SeasonMonth; pitcher: boolean; last: boolean }) {
  const has = played(m, pitcher);
  const v = plus(m, pitcher) ?? 0;
  const value = has ? plusText(v) : REST[m.kind];
  const where = m.kind === "MLB" ? "메이저" : (m.levelKo ?? "마이너");
  const hot = has && m.hot ? ", 아주 잘한 달" : "";
  const spoken = has
    ? pitcher
      ? `${m.month}월 ${where} ${m.games}등판 ERA+ ${v}, 평균자책점 ${formatEra(m.era)}${hot}`
      : `${m.month}월 ${where} ${m.games}경기 wRC+ ${v}${hot}`
    : `${m.month}월 ${m.kind === "NONE" ? "기록 없음" : value}`;
  // 주황은 기록 있는 달만: 안내 '주황 = 아주 잘한 달'(anyHot)과 낭독(hot)도 같은 조건이다
  const tone = has && m.hot
    ? "text-hot-ink"
    : m.kind === "INJURED"
      ? "text-foreground"
      : !has || m.few
        ? "text-muted"
        : "";
  const height = has ? Math.max(BAR_MIN, Math.round((Math.min(PLUS_MAX, Math.max(0, v)) / PLUS_MAX) * BAR_MAX)) : 3;
  return (
    <li className="flex min-w-0 flex-col items-center">
      <span className="sr-only">{spoken}</span>
      <span aria-hidden className={`month-bars-num mb-0.5 font-bold tracking-tight tabular-nums ${tone}`}>
        {value}
      </span>
      {/* 칸 사이 틈이 없어 칸마다 그은 점선이 한 줄로 이어진다. 2px 선의 가운데가 100 높이(칸 가운데)에 온다 */}
      <span aria-hidden className="relative flex h-11 w-full items-end px-[9px]">
        <span className="absolute inset-x-0 bottom-[calc(50%-1px)] border-t-2 border-dashed" style={{ borderColor: AVERAGE_LINE }} />
        {/* 점선 이름표 '평균': 점선 오른쪽 끝 바로 위(범례 글 '점선 = 리그 평균(100)' 대신, 이슈 #329). 타격 흐름 그래프와 같은 말 */}
        {last && <span className="absolute bottom-[calc(50%+1px)] right-0 z-10 rounded-sm bg-surface/80 px-0.5 text-micro text-muted">평균</span>}
        <span
          // 경기 적은 달은 옅은 색(barFill). overflow-hidden: 꺾임 표시를 막대 모양(둥근 위 끝) 안으로 자른다
          className={`relative w-full overflow-hidden ${has ? "rounded-t-[5px] rounded-b-[2px]" : "rounded-full"}`}
          style={{ height, background: barFill(m, has, 5) }}
          // 고대비 모드(Windows)에서는 바탕색이 지워져 막대가 사라진다. 시스템 색으로 다시 칠할 표시(globals.css).
          // 메이저는 글자색, 마이너·기록 없는 달의 바닥 줄은 흐린 색
          data-bar={has && m.kind === "MLB" ? "" : "dim"}
        >
          {/* 200을 넘어 잘린 막대: 위 끝을 카드 색 사선 틈(4px)으로 끊고 틈 위아래에 흐린 글자색 1px 선을 긋는다(꺾임 표시,
              전수조사 L302). 카드 색만으로 끊으면 옅은 막대(경기 적은 달·마이너)와 대비가 1.4~2.1:1이라 안 보였다(PR #299 리뷰).
              선은 그런 막대와, 틈은 꽉 찬 파란 막대와 3:1 이상이라(라이트·다크) 어느 막대에서나 둘 중 하나는 보인다.
              마이너 빗금(45°)과 헷갈리지 않게 기울기는 낮게 둔다. 고대비 모드에서는 틈·선 모두 바탕색(Canvas)으로(globals.css) */}
          {capped(m, pitcher) && (
            <span
              data-bar-break
              className="absolute inset-x-[-1px] top-[5px] h-[6px] -skew-y-[12deg] border-y"
              style={{ background: "var(--surface)", borderColor: "var(--muted)" }}
            />
          )}
        </span>
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

/** 작은 막대 칸 높이(px). 큰 막대(BAR_MAX)와 같은 비율로 줄인다 */
const SPARK_MAX = 30;

/**
 * 성적표 목록 한 줄 오른쪽의 작은 달별 막대(이슈 #276). 펼치지 않아도 선수마다 한 해 모양(언제 잘했고 언제 빠졌나)을
 * 나란히 견주게 한다. 큰 막대(MonthBars)와 같은 높이·색 규칙이고 숫자·달 글자·꺾임 표시만 없다(점선 = 리그 평균,
 * 메이저 파랑·마이너 회색 빗금, 부상 빨강, 경기 적은 달은 옅게). 펼치기 버튼 안에 놓여 span만 쓰고, 버튼 이름에 섞이지 않게
 * 화면 읽기 프로그램에는 숨긴다(같은 값은 펼친 곳의 큰 막대가 달마다 읽어 준다). 크기는 px로 고정해 큰 글씨에서도 찌그러지지 않는다.
 */
export function MonthSpark({ months, pitcher }: { months: SeasonMonth[]; pitcher: boolean }) {
  if (months.length === 0) return null;
  return (
    <span aria-hidden className="relative grid h-[30px] w-[84px] grid-cols-6 items-end">
      <span className="absolute inset-x-0 bottom-1/2 border-t border-dashed" style={{ borderColor: AVERAGE_LINE }} />
      {months.map((m) => {
        const has = played(m, pitcher);
        const v = plus(m, pitcher) ?? 0;
        const height = has ? Math.max(3, Math.round((Math.min(PLUS_MAX, Math.max(0, v)) / PLUS_MAX) * SPARK_MAX)) : 2;
        return (
          <span key={m.month} className="relative flex h-full items-end px-[2px]">
            <span
              className={`w-full ${has ? "rounded-t-[3px] rounded-b-[1px]" : "rounded-full"}`}
              style={{ height, background: barFill(m, has, 4) }}
              // 고대비 모드에서 다시 칠할 표시(큰 막대와 같은 값, 전수조사 L276)
              data-bar={has && m.kind === "MLB" ? "" : "dim"}
            />
          </span>
        );
      })}
    </span>
  );
}

/** 범례 견본: 막대와 같은 칠(마이너는 빗금)과 같은 고대비 표시(data-bar). 빗금이 보이게 10px */
function LegendKey({ fill, bar, label }: { fill: string; bar: "" | "dim"; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      <span aria-hidden data-bar={bar} className="size-2.5 rounded-[2px]" style={{ background: fill }} />
      {label}
    </span>
  );
}
