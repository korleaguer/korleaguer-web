"use client"; // 막대를 누르면 아래 한 줄을 그 경기로 바꿔야 해서 클라이언트 컴포넌트다.

import { useRef, useState, type CSSProperties, type PointerEvent } from "react";
import type { GameLine, Role } from "@/lib/api";
import { haptic } from "@/lib/app";
import { formatDate, formatLineup, formatShortDate, formatSummary, formatWeekday } from "@/lib/format";
import ResultPill from "@/components/ResultPill";
import Highlights from "@/components/Highlights";
import ScoreText from "@/components/ScoreText";
import type { BarSlot } from "./columns";
import Words from "@/components/Words";

interface Props {
  slots: BarSlot[];
  role: Role;
  /** 기간 일수(7·14·30). 막대 아래 날짜를 얼마나 촘촘히 쓸지 정한다 */
  days: number;
  /** 마이너 기록이면 true. 마이너는 팀 일정을 몰라 결장 막대가 없으므로 범례에서 뺀다 */
  minors?: boolean;
  /**
   * 선수 이름. 화면 낭독기에만 제목·막대 묶음 이름 앞에 붙인다('이정후 경기별 안타').
   * 내 선수 카드마다 같은 '경기별 안타'가 여럿이라 제목·묶음 목록에서 어느 선수 것인지 갈리지 않았다
   */
  name?: string;
}

/** 막대 높이에 쓰는 값: 타자는 안타 수, 투수는 잡은 아웃 수. 모르면 null */
function barValue(game: GameLine, role: Role): number | null {
  return role === "PITCHER" ? (game.pitching?.outs ?? null) : (game.batting?.hits ?? null);
}

/** 화면 낭독기용 막대 설명: "9월 27일(일) 콜로라도전 2안타 1홈런" */
function barLabel(game: GameLine, role: Role): string {
  const lineup = formatLineup(game);
  const head = `${formatDate(game.startTimeKst)} ${game.opponentKo}전${lineup ? ` ${lineup}` : ""}`;
  if (!game.played) return `${head} ${game.summary}`;
  if (role === "PITCHER") {
    const innings = game.pitching?.inningsText;
    return innings ? `${head} ${innings}이닝` : `${head} 등판`;
  }
  const b = game.batting;
  if (!b) return `${head} 출전`;
  return `${head} ${b.hits}안타${b.homeRuns > 0 ? ` ${b.homeRuns}홈런` : ""}`;
}

/**
 * 투수 막대 꼭대기(아웃 수). 기간 등판 중 절반 이상이 선발이면 18아웃(6이닝), 아니면 6아웃(2이닝)으로 고정한다.
 * 기간 최댓값에 맞추면 3이닝 등판 한 번에 나머지 막대가 2/3로 줄고, 같은 1이닝이 카드마다 17%~50%로 달랐다(11-17 점검).
 * 넘는 경기는 꽉 찬 막대로 둔다. 선발인지는 박스스코어 표시(lineup)로 보고, 그 표시가 없는 경기(마이너 경기는 늘 없다)는
 * 3이닝(9아웃) 이상 던졌으면 선발로 센다. 표시만 보면 마이너 선발 투수의 막대가 모두 꽉 차 버린다
 */
function pitcherTop(slots: BarSlot[]): number {
  const outings = slots.flatMap((slot) => (slot.game?.played ? [slot.game] : []));
  const starts = outings.filter(
    (game) => game.lineup === "STARTER" || (game.lineup == null && (game.pitching?.outs ?? 0) >= 9),
  ).length;
  return outings.length > 0 && starts * 2 >= outings.length ? 18 : 6;
}

/** 처음 고를 막대: 끝났거나 뛴 경기 중 가장 최근. 없으면 가장 최근 경기 */
function defaultIndex(slots: BarSlot[]): number {
  let latest = -1;
  let latestDone = -1;
  slots.forEach((slot, i) => {
    if (!slot.game) return;
    latest = i;
    if (slot.game.played || slot.game.gameStatus === "final") latestDone = i;
  });
  return latestDone >= 0 ? latestDone : latest;
}

/** 막대 아래 날짜 글씨를 쓸지. 30일이면 5칸마다와 마지막 칸만, 더블헤더 두 번째 칸은 비운다 */
function showsDay(slot: BarSlot, index: number, count: number, days: number): boolean {
  if (slot.part > 0) return false;
  return days < 30 || index % 5 === 0 || index === count - 1;
}

/**
 * 경기별 막대 + 고른 경기 한 줄. 왼쪽이 오래된 날이다.
 * 결장은 점선 막대, 경기가 없는 날은 빈칸, 홈런 친 경기는 막대 위에 주황 점(좋은 활약 색).
 */
export default function GameBars({ slots, role, days, minors = false, name }: Props) {
  const [selected, setSelected] = useState(() => defaultIndex(slots));
  const pitcher = role === "PITCHER";
  const title = pitcher ? "경기별 이닝" : "경기별 안타";
  const values = slots.map((slot) => (slot.game?.played ? barValue(slot.game, role) : null));
  // 막대 꼭대기 기준: 타자 4안타(더 많이 친 경기가 있으면 그 값), 투수는 역할별 고정(pitcherTop)
  const top = pitcher ? pitcherTop(slots) : Math.max(4, ...values.map((v) => v ?? 0));
  // 칸 사이(rem): 7일 6px · 14일 4px · 30일 2px. 달 바뀜 세로선과 '10월' 자리도 이 값으로 잰다
  const gapRem = days >= 30 ? 0.125 : days >= 14 ? 0.25 : 0.375;
  const grid = { gridTemplateColumns: `repeat(${slots.length}, minmax(0, 1fr))`, gap: `${gapRem}rem` } as CSSProperties;
  const gameCount = slots.filter((slot) => slot.game).length;
  const current = slots[selected]?.game ?? null;
  // 고른 경기 앞뒤 경기 칸(경기 없는 날은 건너뛴다). 없으면 -1
  const prevGame = slots.findLastIndex((slot, i) => i < selected && slot.game != null);
  const nextGame = slots.findIndex((slot, i) => i > selected && slot.game != null);
  // 기간 안에서 달이 바뀐 첫 칸(9월 말 ~ 10월 초 등). 한 달 안이면 없다
  const monthMarks = slots.flatMap((slot, i) => (slot.monthStart ? [{ i, month: slot.month }] : []));

  // 손가락(마우스)으로 막대 위를 가로로 훑으면 지나는 경기마다 고른다(토스 그래프처럼). 세로로 밀면 화면이 스크롤된다(touch-pan-y)
  const groupRef = useRef<HTMLDivElement>(null);
  const scrubbing = useRef(false);
  // 마지막으로 고른 칸. 손가락이 빨리 움직이면 다시 그리기 전에 같은 칸이 또 와서, state 대신 이것으로 틱이 한 번만 나게 한다
  const picked = useRef(selected);
  function pick(i: number) {
    if (i === picked.current || !slots[i]?.game) return;
    picked.current = i;
    // 다른 경기를 고르면 앱 안이면 고르기 틱
    haptic("select");
    setSelected(i);
  }
  function scrub(e: PointerEvent<HTMLDivElement>) {
    const el = groupRef.current;
    if (!scrubbing.current || !el) return;
    const { left, width } = el.getBoundingClientRect();
    pick(Math.min(slots.length - 1, Math.max(0, Math.floor(((e.clientX - left) / width) * slots.length))));
  }

  return (
    <div className="mt-4">
      <div className="flex items-baseline justify-between gap-2 text-muted">
        <h3 className="text-label">
          {name && <span className="sr-only">{`${name} `}</span>}
          {title}
        </h3>
        {gameCount > 1 && <span className="text-caption">막대를 누르면 그 경기를 보여 줘요</span>}
      </div>

      <div
        ref={groupRef}
        role="group"
        aria-label={name ? `${name} ${title}` : title}
        className="mt-2 grid touch-pan-y select-none"
        style={grid}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          // 마우스도 묶음 밖으로 잠깐 나갔다 와도 계속 훑게 손을 뗄 때까지 붙잡는다
          e.currentTarget.setPointerCapture(e.pointerId);
          scrubbing.current = true;
          scrub(e);
        }}
        onPointerMove={scrub}
        onPointerUp={() => (scrubbing.current = false)}
        onPointerCancel={() => (scrubbing.current = false)}
      >
        {slots.map((slot, i) => {
          const day = showsDay(slot, i, slots.length, days);
          const dayText = (
            <span aria-hidden className="block h-8 text-center">
              {day && (
                <>
                  {/* 30일이면 칸이 좁아 두 자리 날짜가 넘친다. 줄을 바꾸지 않고 칸 가운데에 걸쳐 쓴다 */}
                  <span
                    className={`flex justify-center whitespace-nowrap text-caption font-bold ${i === selected ? "text-accent-ink" : slot.game ? "text-foreground" : "text-muted"}`}
                  >
                    {slot.day}
                  </span>
                  {days === 7 && <span className="block text-micro text-muted">{formatWeekday(slot.date)}</span>}
                </>
              )}
            </span>
          );

          // 달이 바뀐 첫 칸: 왼쪽(칸 사이 가운데)에 옅은 세로선. 아래 '10월'과 함께 달 경계를 보인다(타격 흐름 달 눈금과 같은 모양)
          const monthLine = slot.monthStart && (
            <span
              aria-hidden
              className="absolute inset-y-0 w-px bg-line"
              style={{ left: `calc(${-gapRem / 2}rem - 0.5px)` }}
            />
          );

          if (!slot.game) {
            return (
              <span key={`${slot.date}-${slot.part}`} className="flex min-w-0 flex-col gap-1">
                <span aria-hidden className="relative block h-[4.5rem] border-b border-line">
                  {monthLine}
                </span>
                {dayText}
              </span>
            );
          }

          const game = slot.game;
          const value = values[i];
          const on = i === selected;
          const homeRun = !pitcher && (game.batting?.homeRuns ?? 0) > 0;
          // 투수 꼭대기는 고정이라 그보다 긴 등판은 꽉 찬 막대로 자른다
          const height = value != null && value > 0 ? `${(Math.min(value, top) / top) * 100}%` : null;
          // 고른 막대는 색만으로 가르지 않고 본문색 2px 테두리 + 카드색 1px 틈을 두른다(경기 달력의 고른 칸과 같은 모양)
          const ring = on ? "ring-2 ring-foreground ring-offset-1 ring-offset-surface" : "";
          return (
            <button
              key={`${slot.date}-${slot.part}`}
              type="button"
              aria-pressed={on}
              aria-label={barLabel(game, role)}
              // 키보드(Enter·Space)로 누를 때만(detail 0). 손가락·마우스는 위 훑기가 고르고,
              // 눌렀다 옆 칸으로 밀고 뗐을 때 처음 칸의 click이 선택을 되돌리지 않게 한다
              onClick={(e) => {
                if (e.detail === 0) pick(i);
              }}
              className="group flex min-w-0 cursor-pointer flex-col gap-1 rounded-md"
            >
              <span className="relative flex h-[4.5rem] w-full items-end justify-center border-b border-line">
                {monthLine}
                {!game.played ? (
                  // 결장(투수는 등판 없음)·경기 전: 점선 막대. 흐린 글자색 그대로(60%로 흐리면 흰 카드 대비 2.6:1이었다)
                  <span className={`block h-3.5 w-[72%] max-w-7 rounded-t-md border-[1.5px] border-dashed ${on ? "border-foreground" : "border-muted"}`} />
                ) : height ? (
                  // 흐리게(투명도) 두지 않고 단색: 안 고른 막대도 카드 대비 3:1을 넘는다. 마우스를 올리면 고른 색 쪽으로 반쯤
                  <span
                    className={`bar-rise block w-[72%] max-w-7 rounded-t-md rounded-b-sm transition-colors duration-150 ${on ? `bg-game-bar-on ${ring}` : "bg-game-bar group-hover:bg-[color-mix(in_oklab,var(--game-bar),var(--game-bar-on))]"}`}
                    style={{ height, "--i": i } as CSSProperties}
                  />
                ) : (
                  // 뛰었지만 안타 0(또는 아웃 0·숫자 모름): 바닥에 얇은 막대. 흐린 글자색 그대로 둬서 바닥선(경기 없는 날)과 갈린다
                  <span className={`block h-1 w-[72%] max-w-7 rounded-sm ${on ? `bg-foreground ${ring}` : "bg-muted"}`} />
                )}
                {homeRun && height && (
                  <span
                    aria-hidden
                    className="absolute left-1/2 size-2 -translate-x-1/2 rounded-full bg-hot"
                    style={{ bottom: `calc(${height} + 4px)` }}
                  />
                )}
              </span>
              {dayText}
            </button>
          );
        })}
      </div>

      {monthMarks.length > 0 && (
        // 달이 바뀐 첫 칸 아래에 '10월'. 30일이면 칸(약 8px)보다 글자가 넓어 날짜 줄과 따로 한 줄을 둔다.
        // 그 칸 가운데에 두되, 양 끝 글자는 카드 밖으로 나가지 않게 글자 폭(em, 숫자 0.65 + '월' 1)만큼 조인다(타격 흐름 달 눈금과 같은 방식)
        <div aria-hidden className="relative h-4 text-micro text-muted">
          {monthMarks.map(({ i, month }) => {
            const w = `${String(month).length * 0.65 + 1}em`;
            const center = `(100% - ${(slots.length - 1) * gapRem}rem) * ${(i + 0.5) / slots.length} + ${i * gapRem}rem`;
            return (
              <span
                key={i}
                className="absolute top-0 whitespace-nowrap tabular-nums"
                style={{ left: `clamp(0px, calc(${center} - ${w} / 2), calc(100% - ${w}))` }}
              >
                {month}월
              </span>
            );
          })}
        </div>
      )}

      <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-micro text-muted">
        {!pitcher && (
          <span className="inline-flex items-center gap-1">
            <span aria-hidden className="size-2 rounded-full bg-hot" />
            홈런
          </span>
        )}
        {/* 바닥의 얇은 막대는 뛰었지만 0이라는 뜻(빈칸·결장과 헷갈렸다) */}
        <span className="inline-flex items-center gap-1">
          <span aria-hidden className="h-1 w-2.5 rounded-sm bg-muted" />
          {pitcher ? "0이닝" : "무안타"}
        </span>
        {!minors && (
          <span className="inline-flex items-center gap-1">
            <span aria-hidden className="h-2 w-2.5 rounded-[2px] border-[1.5px] border-dashed border-muted" />
            {pitcher ? "등판 없음" : "결장"}
          </span>
        )}
        {/* 마이너 기록에는 본인이 뛴 경기만 있어, 빈칸에는 팀만 경기한 날도 섞인다 */}
        <span>{minors ? "빈칸은 뛰지 않은 날" : "빈칸은 경기 없는 날"}</span>
      </p>

      <div className="mt-3 flow-root rounded-xl bg-surface-2 px-3 py-2.5">
        {/* 이전·다음 경기 버튼(44px). 막대 한 칸이 14일 약 18px·30일 약 8px라 손가락이 2~5칸을 덮어서, 한 경기씩 정확히 옮기는 길을 둔다.
            바뀌는 글(aria-live) 밖에 두고, 오른쪽에 띄워(float) 머리 줄만 좁힌다(기록 한 줄은 칸 폭을 다 쓴다).
            위아래 음수 여백(0.68rem - 22px)으로 버튼 가운데를 머리 줄 가운데에 맞추고 머리 줄 높이만큼만 차지한다(큰 글씨에서도) */}
        {current && gameCount > 1 && (
          <span className="float-right -mr-3 my-[calc(0.68rem_-_22px)] ml-1 flex">
            <StepButton dir="prev" label={`${name ? `${name} ` : ""}이전 경기`} target={prevGame} onStep={pick} />
            <StepButton dir="next" label={`${name ? `${name} ` : ""}다음 경기`} target={nextGame} onStep={pick} />
          </span>
        )}
        {/* 고른 경기 한 줄. 막대나 버튼으로 바꾸면 화면 낭독기가 새 줄을 읽는다 */}
        <div aria-live="polite">
          {current ? (
            <>
              {/* 카드가 좁고 상대 팀 이름이 길면(시카고 화이트삭스, 마이너 팀 영어 이름) 점수·결과를 다음 줄로 넘긴다 */}
              <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-meta text-muted">
                <span className="whitespace-nowrap tabular-nums">{`${formatShortDate(current.startTimeKst)}(${formatWeekday(current.startTimeKst)})`}</span>
                <span>{`vs ${current.opponentKo}`}</span>
                {formatLineup(current) && <span>{`· ${formatLineup(current)}`}</span>}
                {/* 점수와 승패는 한 묶음으로 넘어가고, 남은 너비를 채워 승패를 오른쪽 끝에 둔다 */}
                <span className="flex grow items-center gap-1.5">
                  <ScoreText line={current} className="text-summary font-bold text-foreground" />
                  <ResultPill result={current.result} className="ml-auto" />
                </span>
              </p>
              <p
                className={`mt-0.5 text-summary text-pretty ${current.played ? "" : "font-medium text-muted"}`}
              >
                <Words text={formatSummary(current.summary)} />
              </p>
              <Highlights line={current} className="mt-1.5" />
            </>
          ) : (
            <p className="text-body text-muted">이 기간에는 경기가 없어요.</p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * 고른 경기 앞뒤로 옮기는 버튼(경기 상세 창의 앞뒤 버튼과 같은 모양). 크기는 글자 배율과 상관없이 44px(px)다.
 * 끝(target -1)이면 끄되 disabled 대신 aria-disabled로 둔다: 누른 버튼이 disabled가 되면 포커스가 사라진다(내 선수 순서 버튼과 같다).
 * 꺼진 버튼은 아이콘만 흐리게 해서 포커스 테두리는 또렷하게 남긴다
 */
function StepButton({
  dir,
  label,
  target,
  onStep,
}: {
  dir: "prev" | "next";
  label: string;
  target: number;
  onStep: (index: number) => void;
}) {
  const off = target < 0;
  return (
    <button
      type="button"
      aria-label={label}
      aria-disabled={off || undefined}
      onClick={() => {
        if (!off) onStep(target);
      }}
      // 회색 칸 위라 마우스를 올리면 한 단계 다른 회색(line) 원
      className={`grid size-[44px] shrink-0 place-items-center rounded-full text-muted ${
        off ? "cursor-default [&>svg]:opacity-30" : "press cursor-pointer hover:bg-line hover:text-foreground"
      }`}
    >
      <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d={dir === "prev" ? "M10 3 5 8l5 5" : "m6 3 5 5-5 5"} />
      </svg>
    </button>
  );
}
