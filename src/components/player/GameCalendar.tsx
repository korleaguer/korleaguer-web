"use client"; // 달·날짜를 누르면 달력과 아래 경기 줄을 바꿔야 해서 클라이언트 컴포넌트다.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GameLine, MinorGameLine, Role, RosterMove } from "@/lib/api";
import { buildGameCalendar, lineOf, monthCells, monthSummary, type CalendarDay, type DayTone } from "@/lib/gameLog";
import { haptic } from "@/lib/app";
import { moveTone } from "@/lib/moves";
import { teamColor, teamColorById, teamLogoUrl, teamLogoUrlById } from "@/lib/teams";
import TeamMark from "@/components/TeamMark";
import GameRow from "./GameRow";
import GameDetailSheet, { gamePkOf } from "./GameDetailSheet";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/**
 * 칸 색. 경기별 막대와 같은 뜻이다: 파랑 = 안타(투수는 무실점), 채운 주황 = 가장 큰 활약(홈런, 투수는 2이닝 이상 무실점), 점선 = 결장.
 * 채운 칸 글자는 흰색(4.5:1 이상), 연파랑·회색 칸은 진한 글자.
 */
const TONE: Record<Exclude<DayTone, "rest">, string> = {
  hr: "bg-hot-strong text-hot-on",
  multi: "bg-accent text-accent-fg",
  hit: "bg-accent-soft text-accent-ink",
  zero: "bg-surface-2 text-muted",
  off: "border-[1.5px] border-dashed border-muted/50 text-muted",
  pending: "border border-line text-muted",
};

/** 채운 칸(흰 글자). 넓은 칸의 팀 로고는 흰 바탕에 올린다 */
function filled(tone: DayTone): boolean {
  return tone === "hr" || tone === "multi";
}

/**
 * 칸의 마이너 단계 짧은 표기. 휴대폰 칸이 약 43px라 두 자리 날짜 옆에 'AAA'가 들어가지 않는다(점검 11-15: '20 A…'로 잘림).
 * 넓은 칸도 같은 표기다: 'AAA'와 아래 경기 줄의 '트리플A'가 한 페이지에서 세 가지 이름이 되지 않게(11-17 전수조사),
 * '트리플A'는 PC 두 칸 배치의 칸 안쪽(약 64px)에 날짜·로고와 함께 들어가지 않는다
 */
const SHORT_LEVEL: Record<string, string> = { AAA: "3A", AA: "2A", ROK: "R" };

/**
 * 그달 이동을 날짜순으로. 재활 경기 배정은 며칠 사이 단계를 옮겨 다시 배정되는 일이 많아(더블A → 트리플A)
 * 열흘 안의 재활 배정은 첫 것 하나만 둔다(예전 경기 기록 띠와 같은 규칙)
 */
function dedupeRehab(moves: RosterMove[]): RosterMove[] {
  let lastRehab = "";
  return [...moves]
    .sort((a, b) => a.date.localeCompare(b.date))
    .filter((m) => {
      if (!/재활 경기/.test(m.labelKo)) return true;
      const keep = !lastRehab || (Date.parse(m.date) - Date.parse(lastRehab)) / 86_400_000 > 10;
      lastRehab = m.date;
      return keep;
    });
}

/** 상세 창을 열며 쌓은 주소 기록 표시(history.state의 키) */
const SHEET_STATE = "korleaguerGameSheet";

/** 이동 기록 날짜(미국 날짜) "2026-09-21" → "9.21" */
function moveDay(date: string): string {
  return `${Number(date.slice(5, 7))}.${Number(date.slice(8, 10))}`;
}

/**
 * 선수 페이지 경기 기록: 달 칸 + 월 달력 + 고른 날 경기 줄(사용자 11-15 시안 D).
 * 칸마다 그날 결과(홈런·N안타·무안타·결장, 투수는 무실점·N실점)를 쓰고, 날짜를 누르면 아래에 그날 경기 줄이 나온다.
 * 휴대폰은 칸이 좁아 짧은 말 하나, 넓은 화면(640px 이상)은 상대 로고·타수와 안타(투수는 이닝과 실점)·팀 결과까지 쓴다.
 * 처음에는 마지막 경기가 있는 달과 그달 마지막으로 뛴 날을 고른다. 그달 이동(콜업·강등·부상자 명단)은 달력 아래 한 줄로 둔다.
 * 날짜를 누르면 그날 상세 창(GameDetailSheet: 하이라이트 영상·타석별 기록)도 뜬다(사용자 11-15 시안 B).
 * 창이 열리면 주소에 ?game=경기번호를 붙인다: 뒤로 가기(앱의 안드로이드 뒤로 버튼 포함)로 닫히고, 그 주소로 들어오면 그 경기 창이 바로 열린다.
 */
export default function GameCalendar({
  playerId,
  games,
  minorGames,
  moves,
  role,
}: {
  playerId: number;
  games: GameLine[];
  minorGames: MinorGameLine[];
  moves: RosterMove[];
  role: Role;
}) {
  const calendar = useMemo(() => buildGameCalendar(games, minorGames, role), [games, minorGames, role]);
  const [monthKey, setMonthKey] = useState(calendar.defaultMonth);
  const month = calendar.months.find((m) => m.key === monthKey) ?? calendar.months.at(-1) ?? null;
  const [dayKey, setDayKey] = useState(month?.defaultDay ?? null);

  // ---- 상세 창 ----
  const [sheetKey, setSheetKey] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  /** 창을 연 버튼(날짜 칸이나 '경기 상세 · 영상 보기'). 닫으면 여기로 포커스를 돌려준다 */
  const openerRef = useRef<HTMLElement | null>(null);
  /** 창이 처음 연 날짜와 마지막으로 보인 날짜(앞뒤 경기로 바뀌었나) */
  const spanRef = useRef<{ first: string; last: string } | null>(null);
  /**
   * 지금 주소 기록이 창을 열며 쌓은 것인가. history.state의 표시만 보면 앱이 화면으로 돌아올 때 부르는 router.refresh()가
   * 표시를 지운 뒤 닫을 때 쌓은 기록이 빈 채로 남는다(이슈 #256). 쌓는 곳은 클릭 처리기(pickDay·'경기 상세' 버튼)다
   */
  const ownsEntryRef = useRef(false);
  /** 창에서 앞뒤로 넘길 날짜들(누를 수 있는 날, 오래된 날부터) */
  const order = useMemo(
    () => [...calendar.days.values()].filter((d) => d.selectable).map((d) => d.key).sort(),
    [calendar],
  );
  /** 경기 번호로 그날 찾기(주소의 ?game=) */
  const dayOfGame = useCallback(
    (gamePk: number) => [...calendar.days.values()].find((d) => d.selectable && d.entries.some((e) => gamePkOf(e) === gamePk)),
    [calendar],
  );

  const showDay = useCallback((key: string) => {
    setMonthKey(key.slice(0, 7));
    setDayKey(key);
    setSheetKey(key);
  }, []);

  const gameUrl = (key: string | null) => {
    const url = new URL(window.location.href);
    const day = key ? calendar.days.get(key) : null;
    if (day) url.searchParams.set("game", String(gamePkOf(day.main)));
    else url.searchParams.delete("game");
    return url.pathname + url.search + url.hash;
  };

  // 창을 열 때 쌓는 주소 기록에 표시를 남긴다(SHEET_STATE). 닫을 때 그 기록이면 뒤로 가기로 지우고,
  // 처음부터 ?game=으로 들어온 주소(표시 없음)면 주소에서 ?game=만 뺀다. Next는 우리 상태에 자기 상태를 덧붙인다
  const openSheet = (key: string) => {
    if (sheetKey === null) {
      window.history.pushState({ [SHEET_STATE]: true }, "", gameUrl(key));
    } else {
      // Next 내부 상태(__NA)가 든 history.state를 그대로 넘기면 Next가 바뀐 주소를 모른 채 남아서, 앱이 화면으로 돌아올 때
      // 부르는 router.refresh()가 주소를 처음 연 ?game=으로 되돌렸다. 우리 표시만 담은 새 객체를 넘기면 Next가 자기 상태를
      // 덧붙이고 주소도 맞춘다(이슈 #256)
      window.history.replaceState({ [SHEET_STATE]: window.history.state?.[SHEET_STATE] }, "", gameUrl(key));
    }
    showDay(key);
  };

  const closeSheet = () => {
    if (ownsEntryRef.current) {
      // 쌓은 기록을 지우면 popstate가 창을 닫는다
      window.history.back();
    } else {
      window.history.replaceState({}, "", gameUrl(null));
      setSheetKey(null);
    }
  };

  // 뒤로·앞으로 가기: 주소의 ?game=에 맞춰 창을 열고 닫는다. 처음 들어온 주소에 ?game=이 있으면 그 경기 창을 연다.
  // '쌓은 기록인가'는 뒤로·앞으로 가기로 이 기록에 왔을 때만 표시대로 다시 정한다. 이 효과는 앱 refresh로 경기 데이터가
  // 새로 와도(dayOfGame이 바뀜) 다시 도는데, 그때 refresh가 지운 표시를 보고 내리면 닫을 때 빈 기록이 남는다.
  // 대신 지워진 표시를 다시 붙인다(기사 등에 갔다가 돌아와도 맞게, 이슈 #256)
  useEffect(() => {
    const sync = (fromPop: boolean) => {
      const raw = new URLSearchParams(window.location.search).get("game");
      const gamePk = raw && /^\d{1,10}$/.test(raw) ? Number(raw) : null;
      const day = gamePk ? dayOfGame(gamePk) : undefined;
      const marked = Boolean(window.history.state?.[SHEET_STATE]);
      if (fromPop || marked) ownsEntryRef.current = marked;
      else if (ownsEntryRef.current && day) window.history.replaceState({ ...window.history.state, [SHEET_STATE]: true }, "");
      if (day) showDay(day.key);
      else setSheetKey(null);
    };
    sync(false);
    const onPop = () => sync(true);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [dayOfGame, showDay]);

  // 창이 닫히면 연 버튼으로 포커스를 돌려준다(WAI-ARIA APG Dialog, 이슈 #249). 창은 부품째 지워지며 닫혀서 브라우저가
  // 돌려주지 못한다. 앞뒤 경기로 날짜가 바뀌었으면 마지막으로 본 날짜 칸으로. 주소(?game=)로 바로 열린 창은 연 버튼이 없어 두지 않는다
  useEffect(() => {
    if (sheetKey) {
      spanRef.current = spanRef.current ? { ...spanRef.current, last: sheetKey } : { first: sheetKey, last: sheetKey };
      return;
    }
    const span = spanRef.current;
    const opener = openerRef.current;
    spanRef.current = null;
    openerRef.current = null;
    if (!span || !opener) return;
    // 달력 밖 다른 곳에 이미 포커스가 있으면(창을 닫고 바로 다른 것을 누른 경우) 빼앗지 않는다. 포커스가 body이거나
    // 달력 안(브라우저가 창을 닫으며 처음 연 칸으로 먼저 돌려준 경우)이면 우리가 정한 칸·버튼으로 옮긴다
    const focused = document.activeElement;
    if (focused && focused !== document.body && !rootRef.current?.contains(focused)) return;
    const cell = rootRef.current?.querySelector<HTMLElement>(`[data-day="${span.last}"]`);
    (span.first === span.last && opener.isConnected ? opener : cell)?.focus();
  }, [sheetKey]);

  if (!month) return null;

  const pitcher = role === "PITCHER";
  // 고른 날짜가 보이는 달에 없으면(다른 데이터로 다시 그려져 달이 바뀐 경우) 그달 기본 날짜를 쓴다
  const shownDay = dayKey?.startsWith(month.key) ? dayKey : month.defaultDay;
  const selected = shownDay ? (calendar.days.get(shownDay) ?? null) : null;
  const cells = monthCells(month.year, month.month);
  const monthMoves = dedupeRehab(moves.filter((m) => m.date.startsWith(month.key)));

  const pickMonth = (key: string) => {
    if (key === month.key) return;
    haptic("select");
    setMonthKey(key);
    setDayKey(calendar.months.find((m) => m.key === key)?.defaultDay ?? null);
  };
  const pickDay = (key: string, from: HTMLElement) => {
    haptic("select");
    setDayKey(key);
    if (sheetKey === null) {
      openerRef.current = from;
      ownsEntryRef.current = true;
    }
    openSheet(key);
  };
  const sheetDay = sheetKey ? (calendar.days.get(sheetKey) ?? null) : null;
  const sheetIndex = sheetKey ? order.indexOf(sheetKey) : -1;
  const goTo = (key: string | undefined) => (key ? () => openSheet(key) : null);

  return (
    <div ref={rootRef} className="card overflow-hidden">
      {/* 달 칸: 기간 알약과 같은 모양(고른 달은 연파랑). 경기 없는 달은 흐리게 두고 누를 수 없다 */}
      <div
        role="group"
        aria-label="달 고르기"
        className="flex gap-1 overflow-x-auto border-b border-line p-2.5 [scrollbar-width:none] sm:p-3"
      >
        {calendar.months.map((m) => {
          const on = m.key === month.key;
          const empty = m.entries.length === 0;
          return (
            <button
              key={m.key}
              type="button"
              aria-pressed={on}
              disabled={empty}
              aria-label={empty ? `${m.month}월 경기 없음` : `${m.month}월`}
              onClick={() => pickMonth(m.key)}
              className={`tap-target min-w-10 flex-1 shrink-0 rounded-full px-1.5 py-1.5 text-label tabular-nums transition-colors ${
                on
                  ? "bg-accent-soft text-accent-ink"
                  : empty
                    ? "text-muted/40"
                    : "text-muted hover:bg-surface-2 hover:text-foreground"
              }`}
            >
              {/* 고른 달은 글자도 굵게(이슈 #260) */}
              <span className={`bold-reserve ${on ? "font-extrabold" : ""}`} data-text={`${m.month}월`}>
                {m.month}월
              </span>
            </button>
          );
        })}
      </div>

      {/* 달 성적이 길면(메이저·루키·트리플A가 섞인 달) 자르지 않고 다음 줄로 내린다 */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 px-3.5 pt-3.5 pb-2 sm:px-4">
        <h3 className="shrink-0 text-heading tabular-nums">{`${month.year}년 ${month.month}월`}</h3>
        <p className="text-caption text-muted tabular-nums">{monthSummary(month.entries, role)}</p>
      </div>

      <div aria-hidden className="grid grid-cols-7 gap-[4px] px-[10px] pb-1 sm:gap-[6px] sm:px-[12px]">
        {WEEKDAYS.map((w) => (
          <span key={w} className="text-center text-micro text-muted">
            {w}
          </span>
        ))}
      </div>
      <div
        role="group"
        aria-label={`${month.year}년 ${month.month}월 경기 달력`}
        className="cal-grid grid grid-cols-7 gap-[4px] px-[10px] pb-3 sm:gap-[6px] sm:px-[12px]"
      >
        {cells.map((d, i) => {
          if (d == null) return <span key={`blank-${i}`} aria-hidden />;
          const key = `${month.key}-${String(d).padStart(2, "0")}`;
          const day = calendar.days.get(key);
          if (!day || !day.selectable) {
            // 경기 없는 날(투수는 등판 없는 날도): 날짜만
            return (
              <span key={key} aria-hidden className="cal-top p-[4px] text-muted tabular-nums sm:p-[8px]">
                {d}
              </span>
            );
          }
          return <DayCell key={key} day={day} on={key === shownDay} onPick={pickDay} />;
        })}
      </div>

      {/* 그달 이동(콜업·강등·부상자 명단 등). 알약 색은 이동 기록 칸과 같다 */}
      {monthMoves.length > 0 && (
        <ul aria-label={`${month.month}월 이동`} className="flex flex-wrap gap-x-3 gap-y-1.5 px-3.5 pb-3.5 sm:px-4">
          {monthMoves.map((m, i) => (
            <li key={`${m.date}-${m.typeCode}-${i}`} className="inline-flex items-center gap-1.5">
              <span className="text-caption text-muted tabular-nums">{moveDay(m.date)}</span>
              <span className={`rounded-full px-2 py-0.5 text-badge ${moveTone(m)}`}>{m.labelKo}</span>
            </li>
          ))}
        </ul>
      )}

      {/* 고른 날 경기 줄(경기 기록 줄 부품 그대로). 날짜를 바꾸면 화면 낭독기가 새 줄을 읽는다 */}
      <div aria-live="polite" className="border-t border-line">
        {selected ? (
          <ul className="divide-y divide-line">
            {selected.entries.map((e) =>
              e.kind === "mlb" ? (
                <GameRow key={`mlb-${e.game.gameId}`} game={e.game} />
              ) : (
                <GameRow
                  key={`minor-${e.game.gamePk}`}
                  game={e.line}
                  levelKo={e.game.levelKo}
                  opponentId={e.game.opponentId}
                  hideVenue={e.game.home == null}
                />
              ),
            )}
          </ul>
        ) : (
          <p className="px-4 py-4 text-body text-muted">{pitcher ? "이 달에는 등판이 없어요." : "이 달에는 뛴 경기가 없어요."}</p>
        )}
      </div>
      {/* 창을 닫은 뒤 다시 열기(날짜를 다시 눌러도 열린다) */}
      {selected && (
        <button
          type="button"
          onClick={(e) => {
            haptic("select");
            if (sheetKey === null) {
              openerRef.current = e.currentTarget;
              ownsEntryRef.current = true;
            }
            openSheet(selected.key);
          }}
          className="press-soft flex min-h-[max(2.75rem,44px)] w-full items-center justify-center gap-1 border-t border-line py-2.5 text-label text-accent-ink"
        >
          경기 상세 · 영상 보기
          <svg aria-hidden viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 3 5 5-5 5" />
          </svg>
        </button>
      )}

      {sheetDay && (
        <GameDetailSheet
          playerId={playerId}
          role={role}
          day={sheetDay}
          onClose={closeSheet}
          onPrev={goTo(sheetIndex > 0 ? order[sheetIndex - 1] : undefined)}
          onNext={goTo(sheetIndex >= 0 && sheetIndex < order.length - 1 ? order[sheetIndex + 1] : undefined)}
        />
      )}
    </div>
  );
}

/** 날짜 칸 하나. 휴대폰은 날짜와 짧은 말, 넓은 화면은 상대 로고·한 줄·팀 결과까지 */
function DayCell({ day, on, onPick }: { day: CalendarDay; on: boolean; onPick: (key: string, from: HTMLElement) => void }) {
  const tone = day.tone as Exclude<DayTone, "rest">;
  const main = day.main;
  const line = lineOf(main);
  const level = main.kind === "minor" ? main.game.level : null;
  const logoUrl = main.kind === "mlb" ? teamLogoUrl(line.opponentAbbr) : teamLogoUrlById(main.game.opponentId);
  const color = main.kind === "mlb" ? teamColor(line.opponentAbbr) : teamColorById(main.game.opponentId);
  // 날짜·단계·결과는 덜 강조한다. 채운 칸은 흰 글자 그대로(80%로 흐리면 대비가 3.9:1로 기준 4.5:1에 못 미친다, 이슈 #249).
  // 강조는 굵기로 나눈다(날짜 400, 가운데 말 700)
  const dim = filled(tone) ? "" : "text-muted";

  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={day.speech}
      data-day={day.key}
      onClick={(e) => onPick(day.key, e.currentTarget)}
      className={`flex min-w-0 cursor-pointer flex-col justify-between rounded-lg p-[4px] text-left sm:p-[8px] ${TONE[tone]} ${
        on ? "ring-2 ring-foreground ring-offset-1 ring-offset-surface" : ""
      }`}
    >
      {/* 위 줄: 날짜 | (휴대폰) 더블헤더 ×2 또는 마이너 단계, (넓은 화면) 단계와 상대 로고 */}
      <span aria-hidden className="cal-top flex items-center justify-between gap-[2px] leading-none tabular-nums">
        <span className={dim}>{day.day}</span>
        <span className={`font-bold whitespace-nowrap sm:hidden ${dim}`}>
          {day.count > 1 ? `×${day.count}` : level && (SHORT_LEVEL[level] ?? level)}
        </span>
        <span className="hidden items-center gap-1 sm:flex">
          {level && <span className={`font-bold ${dim}`}>{SHORT_LEVEL[level] ?? level}</span>}
          <span className={filled(tone) ? "rounded-md bg-white" : ""}>
            <TeamMark logoUrl={logoUrl} color={color} size="sm" />
          </span>
        </span>
      </span>
      {/* 휴대폰: 짧은 말 하나 */}
      <span aria-hidden className="cal-label self-center whitespace-nowrap font-bold tracking-tight sm:hidden">
        {day.label}
      </span>
      {/* 넓은 화면: 한 줄 + 팀 결과 */}
      <span aria-hidden className="hidden min-w-0 sm:block">
        <span className="cal-label block truncate font-bold tracking-tight">{day.detail}</span>
        <span className={`cal-top block truncate tabular-nums ${dim}`}>{day.result || " "}</span>
      </span>
    </button>
  );
}
