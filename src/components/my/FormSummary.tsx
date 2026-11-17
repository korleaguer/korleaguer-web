// '내 선수' 카드의 최근 폼 요약 조각(이슈 #13): 상태 배지, 출전 줄·상태 줄, 한 줄 소식, 시즌 합계.
// 판정('좋음'·'주춤')은 없고 사실만 보인다. 색은 DESIGN.md 신호색(위기 빨강·복귀 초록·이적 보라·활약 주황).
import type { ReactNode } from "react";
import type { CardStatus, FormFact, MyPlayer, PlayCode, SeasonTotals } from "@/lib/api";
import { formatEra, formatRate } from "@/lib/format";
import RollingNumber from "@/components/RollingNumber";
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

/**
 * 무대 왼쪽 위 상태 배지: 흰 알약 + 신호색 점·글자. 메이저에서 평소대로면 그리지 않는다.
 * 보통은 오른쪽 사진(112px + 여백) 자리를 비워 둔다. 무대가 18rem보다 좁으면(큰 글씨) 사진 왼쪽 끝에 조금 걸치더라도
 * 글을 다 보인다(2배에서 'LG 트윈스 복…'처럼 잘렸다, 이슈 #264)
 */
export function StatusBadge({ status }: { status: CardStatus }) {
  const badge = statusBadge(status);
  if (!badge) return null;
  return (
    <span
      // 화면 낭독기는 이 배지를 건너뛰고 이름 제목 안에서 읽는다(StatusSrText). 무대가 이름보다 앞이라 이름보다 먼저 읽혔고,
      // 제목으로 건너뛰면 부상·콜업을 놓쳤다(이슈 #273)
      aria-hidden
      className={`absolute left-[14px] top-[12px] z-10 inline-flex max-w-[calc(100%-136px)] items-center @max-[18rem]:max-w-[calc(100%-28px)] gap-1.5 rounded-full bg-surface px-2.5 py-0.5 text-badge shadow-[var(--shadow-card)] ${BADGE_TONE[badge.tone]}`}
    >
      <span aria-hidden className={`size-[7px] shrink-0 rounded-full ${badge.tone === "neutral" ? "bg-muted" : "bg-current"}`} />
      <span className="truncate">{badge.text}</span>
    </span>
  );
}

/*
 * 출전 줄 칸. 흐림(투명도) 없이 단색이라 카드 대비 3:1을 넘는다(경기별 막대와 같은 이유, 이슈 #273).
 * 선발·교체를 모르는 출전은 경기별 막대의 안 고른 색(옅은 파랑)인데, 다크 모드에서는 그 색이 선발 파랑과 같아져서 밝은 파랑으로 가른다
 */
const STRIP: Record<PlayCode, string> = {
  STARTER: "bg-accent",
  PLAYED: "bg-game-bar dark:bg-game-bar-on",
  SUB: "border-2 border-accent",
  ABSENT: "border-[1.5px] border-dashed border-muted",
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
          <span className="flex min-w-0 flex-col">
            <span className="text-caption text-muted">{hitter.label}</span>
            <span className="text-label tabular-nums">{hitter.counts}</span>
          </span>
        </p>
      )}
      {pitcher && <p className="mt-2 text-meta text-muted tabular-nums">{pitcher}</p>}
      {status && <p className="mt-1 text-meta text-muted">{status}</p>}
      {entry.fact && <FactPill fact={entry.fact} />}
    </>
  );
}

/**
 * 한 줄 소식: 좋은 일은 옅은 주황, 안 좋은 일은 회색 바탕 + 본문 글자·흐린 점.
 * 안 좋은 일을 파랑으로 칠하지 않는다: 다른 화면의 파랑은 1위·좋음·고른 칸이다(11-17 사용자 결정 '추천대로')
 */
function FactPill({ fact }: { fact: FormFact }) {
  const hot = fact.tone === "HOT";
  return (
    <p
      className={`mt-2 inline-flex items-center gap-1.5 self-start rounded-full px-2.5 py-0.5 text-badge ${hot ? "bg-hot-soft text-hot-ink" : "bg-surface-2 text-foreground"}`}
    >
      <span aria-hidden className={`size-1.5 shrink-0 rounded-full ${hot ? "bg-hot" : "bg-muted"}`} />
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
    return <Notice>이번 시즌 기록이 없어요.</Notice>;
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
      {other && <p className="mt-2.5 text-meta text-muted tabular-nums">{otherTotalsLine(other, pitcher)}</p>}
    </>
  );
}

/** 숫자·막대 자리의 회색 칸 안내 한 줄(기록이 없거나 못 받았을 때) */
export function Notice({ children }: { children: ReactNode }) {
  return <p className="mt-3 rounded-xl bg-surface-2 px-3 py-2.5 text-body text-muted">{children}</p>;
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
    // 작은 숫자 셋이 큰 숫자 옆에 다 들어가지 않으면(큰 글씨) 아래 줄로 내린다(flex-wrap). 옆에 두면 1.5배부터 '탈삼진'·
    // '홈런' 칸이 카드 밖으로 나갔다(이슈 #264). 문턱 없이 글자 폭으로 정해서, 보통 크기는 가장 좁은 카드(640px 창 두 칸,
    // 16.1rem)에서도 운영처럼 옆에 둔다(11-17 측정: 가장 넓은 카드 '평균자책점 + 이닝 50⅔' 14.75rem).
    // 작은 숫자 상자는 내용 폭보다 좁아지지 않고(min-width: auto) 남는 폭을 다 쓴다. 셋이 한 줄에 못 들어가면(아주 좁은 휴대폰 + 2배) 두 칸씩
    <div className="@container mt-3.5">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-2.5">
        <dl>
          <dt className="text-caption text-muted">{label}</dt>
          <dd className="mt-1 text-stat-form tabular-nums">
            {/* 처음엔 최종 값으로 서 있고, 기간(7·14·30일)을 바꾸면 앞 값에서 굴러가며 바뀐다 */}
            <RollingNumber value={value} />
          </dd>
          {note != null && <dd className="mt-1.5 text-caption text-muted">{note}</dd>}
        </dl>
        {/* 세 칸을 똑같이 나누지 않고 내용 너비대로 고르게 벌린다. 좁은 카드에서 "50⅔"이 "50"/"⅔"로 갈리지 않게 */}
        <dl className="grid flex-1 grid-cols-[repeat(3,auto)] justify-evenly gap-y-1.5 rounded-xl bg-surface-2 py-2 text-center @max-[7rem]:grid-cols-[repeat(2,auto)]">
          {small.map(([k, v]) => (
            <div key={k} className="whitespace-nowrap">
              <dt className="text-caption text-muted">{k}</dt>
              <dd className="text-stat tabular-nums">
                {v}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

/**
 * 무대 위 상태 배지(StatusBadge, 화면 낭독기에서는 감춤)의 글을 이름 제목 안, 이름 뒤에서 읽게 한다: '이정후, 부상자 명단 12일째'.
 * 제목으로 건너뛰어도 상태를 같이 듣는다. 보이는 화면은 그대로다
 */
export function StatusSrText({ status }: { status: CardStatus }) {
  const badge = statusBadge(status);
  return badge ? <span className="sr-only">{`, ${badge.text}`}</span> : null;
}
