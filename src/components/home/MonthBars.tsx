import type { SeasonMonth } from "@/lib/api";
import { formatEra, formatRate } from "@/lib/format";

/** 막대 칸 높이(px). 가장 잘한 달(타율 .400, 평균자책점 0.00)이 꽉 찬다 */
const BAR_MAX = 40;
/** 막대가 아주 낮아도(타율 .032, 평균자책점 9.00) 그 달 막대가 있다는 게 보이는 높이 */
const BAR_MIN = 4;

/** 마이너 막대 색: 회색(muted)을 옅게. 메이저 파랑(accent)보다 뒤로 물러난다 */
const MINOR_BAR = "color-mix(in srgb, var(--muted) 45%, transparent)";
const INJURED_BAR = "color-mix(in srgb, var(--danger-fg) 70%, transparent)";

/** 막대 높이 비율(0~1): 높을수록 잘한 달. 타자는 타율(.400 = 꽉), 투수는 평균자책점이 낮을수록(0.00 = 꽉, 9.00 이상 = 바닥) */
function score(m: SeasonMonth, pitcher: boolean): number {
  if (pitcher) return m.era == null ? 0 : Math.max(0, 1 - m.era / 9);
  return m.avg == null ? 0 : Math.min(1, m.avg / 0.4);
}

function played(m: SeasonMonth): boolean {
  return (m.kind === "MLB" || m.kind === "MINORS") && (m.avg != null || m.era != null);
}

/** 기록이 없는 달 글자 */
const REST: Record<SeasonMonth["kind"], string> = {
  MLB: "–",
  MINORS: "–",
  INJURED: "부상",
  FREE_AGENT: "FA",
  NONE: "–",
};

/**
 * 성적표 카드의 달별 막대(사용자 11-16 'B 보완' 시안, 이슈 #239). 자랑 알약(하루·한 구간)으로는 시즌을 설명하지 못해서
 * 4~9월을 막대 여섯 개로 보인다. 숫자를 읽기 전에 막대 길이로 오르내림이 보인다.
 * - 막대 높이 = 잘한 정도. 타자는 타율, 투수는 평균자책점이 낮을수록 높다(투수 카드는 그 뜻을 한 줄로 적는다).
 * - 막대 색 = 어디서. 메이저 파랑, 마이너 회색(단계 이름은 머리 줄 범례에). 부상 달은 빨간 '부상', FA 달은 'FA'.
 * - 경기가 적은 달(서버 few: 타자 10경기·투수 5등판 미만)은 막대·숫자를 옅게 해 4경기 .500이 시즌 최고 달처럼 보이지 않게 한다.
 * - 아주 잘한 달(서버 hot)만 숫자를 주황으로(The Hot Is Earned Rule).
 * 화면 읽기 프로그램에는 달마다 '4월 메이저 29경기 타율 .301' 한 줄씩 읽힌다(막대·숫자 칸은 숨긴다).
 */
export default function MonthBars({ months, pitcher }: { months: SeasonMonth[]; pitcher: boolean }) {
  if (months.length === 0) return null;
  const stat = pitcher ? "평균자책점" : "타율";
  const hasMajors = months.some((m) => m.kind === "MLB" && played(m));
  const minorLevels = [...new Set(months.filter((m) => m.kind === "MINORS" && played(m)).map((m) => m.levelKo ?? "마이너"))];
  const anyFew = months.some((m) => played(m) && m.few);
  const note = pitcher
    ? `막대가 높을수록 잘 막은 달${anyFew ? " · 옅으면 등판이 적었던 달" : ""}`
    : anyFew
      ? "옅은 막대는 경기가 적었던 달"
      : null;

  return (
    <div className="mt-3">
      <div className="mb-1.5 flex items-center gap-2.5 text-caption text-muted">
        <span className="mr-auto">{`달마다 ${stat}`}</span>
        {hasMajors && <LegendKey color="var(--accent)" label="메이저" />}
        {minorLevels.length > 0 && <LegendKey color={MINOR_BAR} label={minorLevels.join("·")} />}
      </div>
      <ol className="grid grid-cols-6 items-end" aria-label={`달마다 ${stat}`}>
        {months.map((m) => (
          <MonthColumn key={m.month} m={m} pitcher={pitcher} stat={stat} />
        ))}
      </ol>
      {note && <p className="mt-1 text-caption text-muted">{note}</p>}
    </div>
  );
}

function MonthColumn({ m, pitcher, stat }: { m: SeasonMonth; pitcher: boolean; stat: string }) {
  const has = played(m);
  const value = has ? (pitcher ? formatEra(m.era) : formatRate(m.avg)) : REST[m.kind];
  const where = m.kind === "MLB" ? "메이저" : (m.levelKo ?? "마이너");
  const spoken = has
    ? `${m.month}월 ${where} ${m.games}${pitcher ? "등판" : "경기"} ${stat} ${value}`
    : `${m.month}월 ${m.kind === "NONE" ? "기록 없음" : value}`;
  const tone = m.hot
    ? "text-hot-ink"
    : m.kind === "INJURED"
      ? "text-danger-fg"
      : !has || m.few
        ? "text-muted"
        : "";
  const height = has ? Math.max(BAR_MIN, Math.round(score(m, pitcher) * BAR_MAX)) : 3;
  const color = has ? (m.kind === "MLB" ? "var(--accent)" : MINOR_BAR) : m.kind === "INJURED" ? INJURED_BAR : "var(--line)";
  return (
    <li className="flex min-w-0 flex-col items-center">
      <span className="sr-only">{spoken}</span>
      <span aria-hidden className={`mb-0.5 text-label font-bold tracking-tight tabular-nums ${tone}`}>
        {value}
      </span>
      <span aria-hidden className="flex h-10 w-full items-end px-[9px]">
        <span
          // 경기 적은 달은 옅게. 마이너 회색은 이미 옅어서(45%) 덜 빼야 막대가 남는다
          className={`w-full ${has ? "rounded-t-[5px] rounded-b-[2px]" : "rounded-full"} ${has && m.few ? (m.kind === "MLB" ? "opacity-35" : "opacity-60") : ""}`}
          style={{ height, background: color }}
        />
      </span>
      <span aria-hidden className="mt-1 text-micro text-muted">{`${m.month}월`}</span>
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
