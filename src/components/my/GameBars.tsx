"use client"; // 막대를 누르면 아래 한 줄을 그 경기로 바꿔야 해서 클라이언트 컴포넌트다.

import { useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import type { GameLine, Role } from "@/lib/api";
import { haptic } from "@/lib/app";
import { formatDate, formatLineup, formatShortDate, formatSummary, formatWeekday } from "@/lib/format";
import { radioKeyIndex } from "@/lib/radioKeys";
import ResultPill from "@/components/ResultPill";
import Highlights from "@/components/Highlights";
import ScoreText from "@/components/ScoreText";
import StepButton from "@/components/StepButton";
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
 * 날짜 글씨마다 오른쪽 이웃 날짜까지 비워 둘 자리(칸 수). 칸 간격 × 자리가 날짜 폭보다 좁으면 그 글씨를 접는다(globals.css .bar-day).
 * 앱 큰 글씨에서는 글자와 칸 사이(rem)가 함께 커져 칸이 좁아지고 날짜가 '8910111213'처럼 붙었다(2배 360px 14일 칸 10px, 이슈 #303).
 * 자리가 없으면(undefined) 늘 보인다: 고른 경기 날짜(진한 파랑), 가장 오른쪽(최근) 날짜, 30일의 5칸마다 날짜.
 * 7·14일(날마다 쓴다)은 오른쪽부터 센 순번 j를 나누는 가장 큰 2의 거듭제곱(1·2·4·8)이라, 칸이 좁아지면 같은 자리끼리 함께 접혀
 * 하루 걸러 → 나흘마다 → 여드레마다로 고르게 남는다. 더블헤더 둘째 칸은 날짜가 없어 순번을 날짜끼리 센다(그 칸만큼 실제 간격은 더 넓다).
 * 30일은 5칸마다라 넉넉하고(앱 2배·320px에서도 틈 4px 이상), 마지막 날짜 바로 앞 날짜만 마지막 날짜와 5칸보다 가까우면 그 칸 수다.
 * 고른 경기 날짜는 접지 않는다: 접히는 자리의 경기를 고르면 진한 파랑 날짜가 사라져 어느 경기인지 날짜로 볼 수 없었다(PR #305 리뷰).
 * 대신 다른 날짜는 고른 날짜까지의 거리(7·14일은 날짜 수, 30일은 칸 수)도 자리로 쳐서, 고른 날짜와 붙을 이웃만 함께 접는다
 */
function dayRooms(slots: BarSlot[], days: number, selected: number): (number | undefined)[] {
  const labeled = slots.flatMap((slot, i) => (showsDay(slot, i, slots.length, days) ? [i] : []));
  const sel = labeled.indexOf(selected);
  const rooms: (number | undefined)[] = slots.map(() => undefined);
  labeled.forEach((i, k) => {
    if (k === sel) return;
    const j = labeled.length - 1 - k;
    let room: number | undefined;
    let near: number | undefined;
    if (days < 30) {
      room = j === 0 ? undefined : Math.min(8, j & -j);
      if (sel >= 0) near = Math.abs(k - sel);
    } else {
      if (j === 1 && labeled[k + 1] - i < 5) room = labeled[k + 1] - i;
      if (sel >= 0 && Math.abs(i - selected) < 5) near = Math.abs(i - selected);
    }
    rooms[i] = near == null ? room : Math.min(room ?? near, near);
  });
  return rooms;
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
  // 칸 수와 칸 사이는 날짜 글씨를 접을지 재는 데도 쓴다(globals.css .bar-day)
  const grid = {
    gridTemplateColumns: `repeat(${slots.length}, minmax(0, 1fr))`,
    gap: `${gapRem}rem`,
    "--bar-n": slots.length,
    "--bar-gap": `${gapRem}rem`,
  } as CSSProperties;
  const rooms = dayRooms(slots, days, selected);
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
  /**
   * 손가락으로 누른 자리와 그때 고른 칸(id는 그 손가락의 pointerId). 손가락은 누르는 순간 고르지 않는다: 막대 위에 엄지를 대고
   * 세로로 밀어 화면을 내리면 그 사이 선택이 바뀌고 진동이 울렸다(11-17 점검). 가로로 8px 넘게(세로보다 많이) 움직이면 그때부터 훑고,
   * 브라우저가 스크롤·확대로 가져가지 않은 채(가져가면 pointercancel이 온다) 떼면 누른 칸을 고른다. 마우스·펜은 예전처럼 누르는 순간 고른다.
   * 첫 손가락만 본다: 둘째 손가락이 첫 손가락 상태를 덮으면, 확대로 취소될 때 처음 경기가 아니라 훑던 중간 칸으로 되돌렸다(11-18 리뷰)
   */
  const touch = useRef<{ id: number; x: number; y: number; from: number } | null>(null);
  function pick(i: number) {
    if (i === picked.current || !slots[i]?.game) return;
    picked.current = i;
    // 다른 경기를 고르면 앱 안이면 고르기 틱
    haptic("select");
    setSelected(i);
  }
  /** 화면 x 좌표 자리의 칸을 고른다 */
  function pickAt(clientX: number) {
    const el = groupRef.current;
    if (!el) return;
    const { left, width } = el.getBoundingClientRect();
    pick(Math.min(slots.length - 1, Math.max(0, Math.floor(((clientX - left) / width) * slots.length))));
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const t = touch.current;
    // 둘째 손가락은 보지 않는다
    if (t && e.pointerId !== t.id) return;
    if (t && !scrubbing.current) {
      const dx = Math.abs(e.clientX - t.x);
      const dy = Math.abs(e.clientY - t.y);
      // 아직 가로 훑기가 아니다(세로로 밀면 곧 브라우저가 스크롤로 가져가 pointercancel이 온다)
      if (dx <= 8 || dx <= dy) return;
      scrubbing.current = true;
    }
    if (scrubbing.current) pickAt(e.clientX);
  }
  function endPointer(e: PointerEvent<HTMLDivElement>, cancelled: boolean) {
    const t = touch.current;
    // 둘째 손가락을 떼거나 취소된 것은 넘긴다(확대면 첫 손가락도 곧 취소된다)
    if (t && e.pointerId !== t.id) return;
    if (t && !scrubbing.current && !cancelled) {
      // 손가락을 대고 뗐고 브라우저가 스크롤로 가져가지 않았다(톡): 누른 칸을 고른다. 세로로 조금 미끄러진 톡도 고른다:
      // 8px 넘게 움직이면 무시했더니, 브라우저 스크롤 문턱(iOS 약 10pt)보다 덜 미끄러진 톡은 스크롤도 고르기도 안 됐다(11-18 리뷰)
      pickAt(t.x);
    } else if (t && cancelled && picked.current !== t.from) {
      // 브라우저가 스크롤·확대로 가져갔다: 훑다 바뀐 선택을 처음 경기로 되돌린다(진동 없이)
      picked.current = t.from;
      setSelected(t.from);
    }
    scrubbing.current = false;
    touch.current = null;
  }
  // 키보드: ←↑ 앞 경기, →↓ 다음 경기(끝에서는 반대쪽 끝으로), Home·End 처음·끝. 경기 없는 칸은 건너뛰고, 옮기면 바로 고른다
  function onBarKey(e: KeyboardEvent<HTMLDivElement>) {
    const order = slots.flatMap((slot, i) => (slot.game ? [i] : []));
    // 키를 꾹 눌러 다시 그리기 전에 또 오면 state(selected)는 한 칸 늦어서, 마지막으로 고른 칸(picked)에서 센다
    const to = radioKeyIndex(e.key, order.indexOf(picked.current), order.length);
    if (to == null) return;
    const next = order[to];
    e.preventDefault();
    pick(next);
    groupRef.current?.querySelector<HTMLElement>(`[data-slot="${next}"]`)?.focus();
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
        // 하나만 고르는 막대라 라디오 묶음이다. Tab 한 번으로 고른 막대에 들어와 화살표로 바로 고른다(WAI-ARIA APG Radio Group).
        // 막대마다 Tab이 서면 30일 카드 하나에 Tab이 수십 번 걸렸다(11-17 전수조사)
        role="radiogroup"
        aria-label={name ? `${name} ${title}` : title}
        onKeyDown={onBarKey}
        // 세로로 밀면 화면이 스크롤되고, 두 손가락으로 벌리면 화면이 커진다(확대를 막지 않는다). 가로 훑기만 이 묶음이 맡는다.
        // bar-days: 이 묶음 폭으로 날짜 글씨를 접을지 잰다(컨테이너)
        className="bar-days mt-2 grid touch-pan-y touch-pinch-zoom select-none"
        style={grid}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          // 둘째 손가락(두 손가락 확대 등)은 첫 손가락(isPrimary)이 아니다. 첫 손가락은 다른 손가락이 없을 때만 오니 남은 상태를 새로 쓴다
          if (e.pointerType === "touch" && !e.isPrimary) return;
          // 마우스도 묶음 밖으로 잠깐 나갔다 와도 계속 훑게 손을 뗄 때까지 붙잡는다
          e.currentTarget.setPointerCapture(e.pointerId);
          if (e.pointerType === "touch") {
            scrubbing.current = false;
            touch.current = { id: e.pointerId, x: e.clientX, y: e.clientY, from: picked.current };
            return;
          }
          scrubbing.current = true;
          pickAt(e.clientX);
        }}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => endPointer(e, false)}
        onPointerCancel={(e) => endPointer(e, true)}
      >
        {slots.map((slot, i) => {
          const day = showsDay(slot, i, slots.length, days);
          const dayText = (
            // 글씨 크기는 bar-day-num(날짜)·bar-day-week(요일)이 정한다: 보통은 Caption·Micro 그대로이고, 칸이 좁아 이웃 날짜와 붙으면
            // 0으로 접는다(자리 --day-room은 dayRooms). 줄 높이는 그대로라 막대 자리가 흔들리지 않는다
            <span
              aria-hidden
              className="bar-day block h-8 text-center"
              style={rooms[i] != null ? ({ "--day-room": rooms[i] } as CSSProperties) : undefined}
            >
              {day && (
                <>
                  {/* 30일이면 칸이 좁아 두 자리 날짜가 넘친다. 줄을 바꾸지 않고 칸 가운데에 걸쳐 쓴다 */}
                  <span
                    className={`bar-day-num flex justify-center whitespace-nowrap font-bold ${i === selected ? "text-accent-ink" : slot.game ? "text-foreground" : "text-muted"}`}
                  >
                    {slot.day}
                  </span>
                  {days === 7 && <span className="bar-day-week block text-muted">{formatWeekday(slot.date)}</span>}
                </>
              )}
            </span>
          );

          // 달이 바뀐 첫 칸: 왼쪽(칸 사이 가운데)에 옅은 세로선. 아래 '10월'과 함께 달 경계를 보인다(타격 흐름 달 눈금과 같은 모양).
          // 바탕색 대신 1px 왼쪽 테두리로 그린다: 고대비 모드에서 바탕은 지워지고 테두리는 바닥선처럼 남는다. data-bar로 다시 칠하면
          // 막대 버튼(role="radio") 안이라 그 경기를 고를 때(aria-checked) 선까지 강조색이 된다(globals.css)
          const monthLine = slot.monthStart && (
            <span
              aria-hidden
              className="absolute inset-y-0 border-l border-line"
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
              role="radio"
              aria-checked={on}
              tabIndex={on ? 0 : -1}
              data-slot={i}
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
                    // 고대비 모드에서 시스템 색으로 다시 칠할 막대(globals.css). 고른 막대는 강조색
                    data-bar=""
                  />
                ) : (
                  // 뛰었지만 안타 0(또는 아웃 0·숫자 모름): 바닥에 얇은 막대. 흐린 글자색 그대로 둬서 바닥선(경기 없는 날)과 갈린다
                  <span
                    className={`block h-1 w-[72%] max-w-7 rounded-sm ${on ? `bg-foreground ${ring}` : "bg-muted"}`}
                    // 고대비 모드에서는 흐린 막대(GrayText)로, 고르면 강조색으로 다시 칠한다(globals.css). 범례 견본도 같은 값
                    data-bar="dim"
                  />
                )}
                {homeRun && height && (
                  <span
                    aria-hidden
                    className="absolute left-1/2 size-2 -translate-x-1/2 rounded-full bg-hot"
                    style={{ bottom: `calc(${height} + 4px)` }}
                    // 고대비 모드에서도 막대와 같은 색(고르면 강조색) 점으로 남긴다. 범례 '홈런' 견본도 같은 값
                    data-bar=""
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

      {/* 견본은 위 막대·점과 같은 data-bar 값이라 고대비 모드에서도 같은 색으로 보인다(점선 견본은 테두리라 그대로 보인다) */}
      <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-micro text-muted">
        {!pitcher && (
          <span className="inline-flex items-center gap-1">
            <span aria-hidden data-bar="" className="size-2 rounded-full bg-hot" />
            홈런
          </span>
        )}
        {/* 바닥의 얇은 막대는 뛰었지만 0이라는 뜻(빈칸·결장과 헷갈렸다) */}
        <span className="inline-flex items-center gap-1">
          <span aria-hidden data-bar="dim" className="h-1 w-2.5 rounded-sm bg-muted" />
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
        {current && (
          <>
            {/* 보이는 머리 줄. 화면 낭독기는 아래 바뀌는 글(aria-live) 안의 같은 줄을 읽어서 여기서는 감춘다.
                버튼보다 앞에 둬서 칸 폭을 다 쓴다(점수·결과가 한 줄에 남고 결과 알약이 칸 오른쪽 끝에 붙는다) */}
            <p aria-hidden className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-meta text-muted">
              <GameHead line={current} />
            </p>
            {/* 이전·다음 경기 버튼(44px). 막대 한 칸이 14일 약 18px·30일 약 8px라 손가락이 2~5칸을 덮어서, 한 경기씩 정확히 옮기는 길을 둔다.
                바뀌는 글(aria-live) 밖에 두고, 기록 한 줄 오른쪽에 띄운다(float). 머리 줄 오른쪽에 띄우면 flex인 머리 줄 전체가 버튼 폭(약 80px)만큼
                좁아져, 운영 30일 97경기 중 375px에서 63경기·PC 세 칸에서 74경기의 머리 줄이 두 줄로 내려가고 결과 알약이 칸 끝에서 떨어졌다(11-18 검토).
                기록 한 줄은 첫 줄만 좁아진다(같은 97경기 중 그 때문에 두 줄이 되는 것은 375px 1경기·PC 3경기). 보통 크기에서는 머리 줄이 늘 한 줄이라
                버튼 자리가 경기마다 흔들리지 않는다. 위 음수 여백(0.8rem - 22px)은 버튼 가운데를 기록 한 줄 가운데(머리 줄 아래 0.125rem + 한 줄
                1.36rem의 절반)에 맞추고, 아래 음수 여백(0.68rem - 22px)은 버튼이 그 한 줄 높이만큼만 차지하게 한다(큰 글씨에서도) */}
            {gameCount > 1 && (
              // 경기 상세 창의 앞뒤 버튼과 같은 버튼(StepButton). 끝이면 꺼진다. 회색 칸 위라 마우스를 올리면 한 단계 다른 회색(line) 원
              <span className="float-right -mr-3 mb-[calc(0.68rem_-_22px)] ml-1 mt-[calc(0.8rem_-_22px)] flex">
                <StepButton
                  dir="prev"
                  label={`${name ? `${name} ` : ""}이전 경기`}
                  onClick={prevGame >= 0 ? () => pick(prevGame) : null}
                  hoverClass="cursor-pointer hover:bg-line hover:text-foreground"
                />
                <StepButton
                  dir="next"
                  label={`${name ? `${name} ` : ""}다음 경기`}
                  onClick={nextGame >= 0 ? () => pick(nextGame) : null}
                  hoverClass="cursor-pointer hover:bg-line hover:text-foreground"
                />
              </span>
            )}
          </>
        )}
        {/* 고른 경기. 막대나 버튼으로 바꾸면 화면 낭독기가 새 줄을 읽는다(머리 줄은 위 보이는 줄과 같은 내용을 낭독기에만) */}
        <div aria-live="polite">
          {current ? (
            <>
              <p className="sr-only flex">
                <GameHead line={current} />
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
 * 고른 경기 머리 줄 조각: '9.21(월) vs 샌프란시스코 · 선발 4 - 2 승'. 보이는 줄과 화면 낭독기용 줄이 같이 쓴다(flex 줄 안에 둔다).
 * 카드가 좁고 상대 팀 이름이 길면(시카고 화이트삭스, 마이너 팀 영어 이름) 점수·결과를 다음 줄로 넘긴다
 */
function GameHead({ line }: { line: GameLine }) {
  const lineup = formatLineup(line);
  return (
    <>
      <span className="whitespace-nowrap tabular-nums">{`${formatShortDate(line.startTimeKst)}(${formatWeekday(line.startTimeKst)})`}</span>
      <span>{`vs ${line.opponentKo}`}</span>
      {lineup && <span>{`· ${lineup}`}</span>}
      {/* 점수와 승패는 한 묶음으로 넘어가고, 남은 너비를 채워 승패를 오른쪽 끝에 둔다 */}
      <span className="flex grow items-center gap-1.5">
        <ScoreText line={line} className="text-summary font-bold text-foreground" />
        <ResultPill result={line.result} className="ml-auto" />
      </span>
    </>
  );
}
