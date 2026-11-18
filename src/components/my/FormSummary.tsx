// '내 선수' 카드의 최근 폼 요약 조각(이슈 #13): 상태 배지, 출전 줄·상태 줄, 한 줄 소식, 시즌 합계.
// 판정('좋음'·'주춤')은 없고 사실만 보인다. 색은 DESIGN.md 신호색(위기 빨간 점·복귀 초록·이적 보라·활약 주황).
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

/**
 * 배지 글자색. 위기(부상자 명단·출장 정지·지명 할당)는 본문 글자이고 빨강은 앞 점(DOT_TONE)에만 쓴다.
 * 빨간 글자는 '좋은 활약' 주황(한 줄 소식·성적표 '좋은 시즌')과 거의 같은 색이라(색차 9.1) 색만으로 헷갈렸다
 * (전수조사, 사용자 11-17 '추천대로'). 복귀 초록·콜업 파랑·FA 보라는 주황과 멀어 글자도 그 색이다.
 */
const BADGE_TONE: Record<BadgeTone, string> = {
  danger: "text-foreground",
  success: "text-success-fg",
  accent: "text-accent-ink",
  fa: "text-fa-fg",
  neutral: "text-foreground",
};

/** 배지 앞 점: 위기는 빨강, 회색 상태(마이너·시즌 끝·국내 복귀)는 흐린 회색, 나머지는 글자와 같은 색 */
const DOT_TONE: Record<BadgeTone, string> = {
  danger: "bg-danger-fg",
  success: "bg-current",
  accent: "bg-current",
  fa: "bg-current",
  neutral: "bg-muted",
};

/**
 * 무대 왼쪽 위 상태 배지: 흰 알약 + 신호색 점(위기는 점만 빨강). 메이저에서 평소대로면 그리지 않는다.
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
      <span aria-hidden className={`size-[7px] shrink-0 rounded-full ${DOT_TONE[badge.tone]}`} />
      <span className="truncate">{badge.text}</span>
    </span>
  );
}

/**
 * 무대가 없는 카드의 이름 옆 상태 알약(홈 시즌 성적표). 무대 위 배지(StatusBadge)와 같은 글·점이고, 흰 카드 위라 바탕을 칠한다.
 * 위기는 빨간 바탕 대신 회색 바탕 + 빨간 점 + 본문 글자다(회색 바탕은 '좋은 시즌' 주황 바탕과 색차 9.7, 빨간 바탕은 5.6)
 */
const PILL_TONE: Record<BadgeTone, string> = {
  danger: "bg-neutral-pill text-foreground",
  success: "bg-success-bg text-success-fg",
  accent: "bg-accent-soft text-accent-ink",
  fa: "bg-fa-bg text-fa-fg",
  neutral: "bg-neutral-pill text-neutral-pill-fg",
};

export function StatusPill({ status }: { status: CardStatus }) {
  const badge = statusBadge(status);
  if (!badge) return null;
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-badge ${PILL_TONE[badge.tone]}`}
    >
      <span aria-hidden className={`size-[7px] shrink-0 rounded-full ${DOT_TONE[badge.tone]}`} />
      {badge.text}
    </span>
  );
}

/*
 * 출전 줄 칸. 흐림(투명도) 없이 단색이라 카드 대비 3:1을 넘는다(경기별 막대와 같은 이유, 이슈 #273).
 * 선발·교체를 모르는 출전은 strip-played: 밝은 모드는 경기별 막대의 안 고른 색(옅은 파랑), 다크 모드는 그 색이 선발 파랑과
 * 같아져서 밝은 파랑이다(값은 globals.css 한곳에서 정한다)
 */
const STRIP: Record<PlayCode, string> = {
  STARTER: "bg-accent",
  PLAYED: "bg-strip-played",
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
        // 칸은 눈으로만 보고, 화면 낭독기는 옆 글자("팀 최근 10경기 선발 9 · 교체 1 · 결장 0")를 읽는다.
        // 칸 아래 '← 오래된 · 최근 →': 어느 쪽이 최근 경기인지 알려 주는 것이 없었다(11-17 전수조사). 큰 글씨면 칸 묶음이 글자만큼 넓어진다
        <p className="mt-2 flex items-center gap-2">
          <span aria-hidden className="inline-flex shrink-0 flex-col gap-0.5">
            <span className="inline-flex gap-[3px]">
              {play.recent.map((code, i) => (
                <span
                  key={i}
                  // 고대비 모드에서 바탕색이 지워지는 칸(선발·출전)만 시스템 색으로 다시 칠한다(globals.css)
                  data-bar={code === "STARTER" ? "" : code === "PLAYED" ? "dim" : undefined}
                  className={`size-[9px] rounded-[2.5px] ${STRIP[code]}`}
                />
              ))}
            </span>
            <span className="flex justify-between gap-2 whitespace-nowrap text-micro text-muted">
              <span>← 오래된</span>
              <span>최근 →</span>
            </span>
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="text-caption text-muted">{hitter.label}</span>
            <span className="text-label tabular-nums">{hitter.counts}</span>
          </span>
        </p>
      )}
      {pitcher && <p className="mt-2 text-meta text-muted tabular-nums">{pitcher}</p>}
      {status && <p className="mt-1 text-meta text-muted">{status}</p>}
      {/* 시즌 합계 카드(비시즌·FA)에는 한 줄 소식을 두지 않는다: 운영 6명 모두 '시즌 최장 N경기 연속 안타' 같은 주황 소식이라
          부진한 시즌도 '좋은 일' 색이었고, 모두 같은 말이면 아무것도 가르지 못한다(11-17 점검, 홈 자랑 알약을 뺀 것과 같은 판단) */}
      {entry.fact && entry.basis !== "SEASON" && <FactPill fact={entry.fact} />}
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
    // 16.1rem)에서도 운영처럼 옆에 둔다(11-18 측정, 작은 숫자 17px: '평균자책점 + 이닝 50⅔' 14.43rem, 가장 긴 이름표
    // '트리플A 최근 30일 평균자책점 + 50⅔' 15.78rem. 20px일 때는 14.82rem·16.17rem이라 마지막 경우가 아래 줄로 내려갔다).
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
        {/* 세 칸을 똑같이 나누지 않고 내용 너비대로 고르게 벌린다. 좁은 카드에서 "50⅔"이 "50"/"⅔"로 갈리지 않게.
            작은 숫자는 이름(20px)보다 한 단계 작은 17px(heading)이다: 이름과 같은 20px·800이면 위계가 없었다(11-17 점검).
            큰 숫자 44px · 이름 20px · 작은 숫자 17px의 세 단계 */}
        <dl className="grid flex-1 grid-cols-[repeat(3,auto)] justify-evenly gap-y-1.5 rounded-xl bg-surface-2 py-2 text-center @max-[7rem]:grid-cols-[repeat(2,auto)]">
          {small.map(([k, v]) => (
            <div key={k} className="whitespace-nowrap">
              <dt className="text-caption text-muted">{k}</dt>
              <dd className="text-heading tabular-nums">
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
