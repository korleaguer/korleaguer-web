// '내 선수' 카드의 최근 폼 요약 조각(이슈 #13): 상태 배지, 출전 줄·상태 줄, 한 줄 소식, 시즌 합계.
// 판정('좋음'·'주춤')은 없고 사실만 보인다. 색은 DESIGN.md 신호색(위기 빨강·복귀 초록·이적 보라·활약 주황).
import type { ReactNode } from "react";
import type { CardStatus, FormFact, MyPlayer, PlayCode, SeasonTotals } from "@/lib/api";
import { formatEra, formatRate } from "@/lib/format";
import {
  type BadgeTone,
  levelKo,
  otherTotalsLine,
  pitcherPlayText,
  playText,
  statusBadge,
  statusLine,
} from "./formLabels";

const BADGE_TONE: Record<BadgeTone, string> = {
  danger: "text-danger-fg",
  success: "text-success-fg",
  accent: "text-accent-ink",
  fa: "text-fa-fg",
  neutral: "text-foreground",
};

/** 무대 왼쪽 위 상태 배지: 흰 알약 + 신호색 점·글자. 메이저에서 평소대로면 그리지 않는다 */
export function StatusBadge({ status }: { status: CardStatus }) {
  const badge = statusBadge(status);
  if (!badge) return null;
  return (
    <span
      className={`absolute left-3.5 top-3 z-10 inline-flex max-w-[calc(100%-8.5rem)] items-center gap-1.5 rounded-full bg-surface px-2.5 py-0.5 text-xs font-bold leading-5 shadow-[var(--shadow-card)] ${BADGE_TONE[badge.tone]}`}
    >
      <span aria-hidden className={`size-[7px] shrink-0 rounded-full ${badge.tone === "neutral" ? "bg-muted" : "bg-current"}`} />
      <span className="truncate">{badge.text}</span>
    </span>
  );
}

const STRIP: Record<PlayCode, string> = {
  STARTER: "bg-accent",
  PLAYED: "bg-accent/60",
  SUB: "border-2 border-accent",
  ABSENT: "border-[1.5px] border-dashed border-muted/70",
};

/**
 * 이름 아래 줄들: 출전 줄(메이저 타자는 칸 10개 + 선발·교체·결장 수, 투수는 최근 14일 등판) 또는
 * 상태 줄(마이너 소속 팀, FA 마지막 경기), 그 아래 한 줄 소식.
 */
export function SummaryLines({ entry }: { entry: MyPlayer }) {
  const play = entry.play;
  const hitter = play ? playText(play) : null;
  const pitcher = play && !hitter ? pitcherPlayText(play) : null;
  const status = !play ? statusLine(entry) : null;
  return (
    <>
      {hitter && play?.recent && (
        // 칸은 눈으로만 보고, 화면 낭독기는 옆 글자("팀 최근 10경기 선발 9 · 교체 1 · 결장 0")를 읽는다
        <p className="mt-2 flex items-center gap-2">
          <span aria-hidden className="inline-flex shrink-0 gap-[3px]">
            {play.recent.map((code, i) => (
              <span key={i} className={`size-[9px] rounded-[2.5px] ${STRIP[code]}`} />
            ))}
          </span>
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="text-[0.6875rem] text-muted">{hitter.label}</span>
            <span className="text-[0.8125rem] font-semibold tabular-nums">{hitter.counts}</span>
          </span>
        </p>
      )}
      {pitcher && <p className="mt-2 text-[0.8125rem] text-muted tabular-nums">{pitcher}</p>}
      {status && <p className="mt-1 text-[0.8125rem] text-muted">{status}</p>}
      {entry.fact && <FactPill fact={entry.fact} />}
    </>
  );
}

/** 한 줄 소식: 좋은 일은 옅은 주황, 안 좋은 일은 회색 바탕 + 진한 파랑 글자 */
function FactPill({ fact }: { fact: FormFact }) {
  const hot = fact.tone === "HOT";
  return (
    <p
      className={`mt-2 inline-flex items-center gap-1.5 self-start rounded-full px-2.5 py-0.5 text-[0.8125rem] font-bold leading-5 ${hot ? "bg-hot-soft text-hot-ink" : "bg-surface-2 text-accent-ink"}`}
    >
      <span aria-hidden className={`size-1.5 shrink-0 rounded-full ${hot ? "bg-hot" : "bg-accent-ink"}`} />
      {fact.text}
    </p>
  );
}

/**
 * 비시즌·FA 카드의 시즌 합계: 큰 쪽(primary) 단계를 큰 숫자로, 다른 단계를 한 줄로.
 * 예: "2026 메이저 타율 .276" + 경기·안타·홈런, 아래 "마이너 85경기 · 타율 .262 · 3홈런"
 */
export function SeasonNumbers({ totals, pitcher }: { totals: SeasonTotals; pitcher: boolean }) {
  const main = totals.primary === "MINORS" ? totals.minors : totals.mlb;
  const other = totals.primary === "MINORS" ? totals.mlb : totals.minors;
  if (!main) {
    return <Notice>이번 시즌 기록이 없습니다.</Notice>;
  }
  const label = `${totals.season} ${levelKo(main.level)} ${pitcher ? "평균자책점" : "타율"}`;
  const small: [string, string | number][] = pitcher
    ? [
        ["등판", main.games],
        ["이닝", main.inningsText ?? "0"],
        ["탈삼진", main.strikeouts],
      ]
    : [
        ["경기", main.games],
        ["안타", main.hits],
        ["홈런", main.homeRuns],
      ];
  return (
    <>
      <Numbers label={label} value={pitcher ? formatEra(main.era) : formatRate(main.avg)} small={small} />
      {other && <p className="mt-2.5 text-[0.8125rem] text-muted tabular-nums">{otherTotalsLine(other, pitcher)}</p>}
    </>
  );
}

/** 숫자·막대 자리의 회색 칸 안내 한 줄(기록이 없거나 못 받았을 때) */
export function Notice({ children }: { children: ReactNode }) {
  return <p className="mt-3 rounded-xl bg-surface-2 px-3 py-2.5 text-sm text-muted">{children}</p>;
}

/** 큰 숫자 하나(왼쪽) + 회색 칸 작은 숫자 셋(오른쪽). 기간 카드와 시즌 합계가 같이 쓴다 */
export function Numbers({
  label,
  value,
  note,
  small,
}: {
  label: string;
  value: string;
  note?: ReactNode;
  small: [string, string | number][];
}) {
  return (
    <div className="mt-3.5 grid grid-cols-[auto_minmax(0,1fr)] items-end gap-4">
      <dl>
        <dt className="text-xs text-muted">{label}</dt>
        <dd className="mt-1 text-[2.75rem] font-extrabold leading-none tracking-[-0.03em] tabular-nums">{value}</dd>
        {note != null && <dd className="mt-1.5 text-xs font-semibold text-muted">{note}</dd>}
      </dl>
      {/* 세 칸을 똑같이 나누지 않고 내용 너비대로 고르게 벌린다. 좁은 카드에서 "50⅔"이 "50"/"⅔"로 갈리지 않게 */}
      <dl className="grid grid-cols-[repeat(3,auto)] justify-evenly rounded-xl bg-surface-2 py-2 text-center">
        {small.map(([k, v]) => (
          <div key={k} className="whitespace-nowrap">
            <dt className="text-xs text-muted">{k}</dt>
            <dd className="text-xl font-extrabold leading-tight tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
