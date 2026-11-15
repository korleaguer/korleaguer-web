"use client"; // 창을 열고 닫고, 고른 경기 상세를 브라우저에서 받아 와야 해서 클라이언트 컴포넌트다.

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import type { GameDetail, GameLine, GamePlay, Role } from "@/lib/api";
import { lineOf, type CalendarDay, type LogGame } from "@/lib/gameLog";
import { formatDate, formatLineup, formatSummary, formatTime } from "@/lib/format";
import { haptic } from "@/lib/app";
import { toast } from "@/lib/toast";
import { loadClip, loadGameDetail } from "@/app/players/[id]/actions";
import Highlights from "@/components/Highlights";
import LoadingDots from "@/components/LoadingDots";
import ResultPill from "@/components/ResultPill";
import ScoreText from "@/components/ScoreText";
import TeamName from "@/components/TeamName";
import type { Clip } from "./ClipPlayer";

// 영상 플레이어(Video.js 10, hls.js 포함 약 270KB)는 창이 열릴 때 받아 온다. 선수 페이지 첫 로딩에는 넣지 않는다
const ClipPlayer = dynamic(() => import("./ClipPlayer"), {
  ssr: false,
  loading: () => <div className="aspect-video w-full rounded-xl bg-surface-2" />,
});

/** 받은 상세를 이 탭이 열려 있는 동안 기억한다(앞뒤 경기를 오갈 때 다시 받지 않게) */
const detailCache = new Map<string, GameDetail>();

type Load = { state: "loading" } | { state: "ok"; detail: GameDetail } | { state: "error" };

/** 아래로 이만큼 끌면 닫는다(px) */
const SWIPE_CLOSE = 96;

/** 그 경기의 MLB 번호 */
export function gamePkOf(entry: LogGame): number {
  return entry.kind === "mlb" ? entry.game.gameId : entry.game.gamePk;
}

/**
 * 경기 달력에서 날짜를 누르면 뜨는 상세 창(사용자 11-15 시안 B).
 * 휴대폰은 아래에서 올라오는 창(아래로 끌면 닫힘), 640px 이상은 가운데 창. 닫기·바깥 누르기·Esc·뒤로 가기로 닫는다.
 * 위쪽 ‹ › 로 앞뒤 경기, 같은 날 여러 경기면(더블헤더, 메이저 결장 + 마이너 재활) 탭으로 고른다.
 * 안쪽: 그 선수 MLB 하이라이트 영상(첫 영상) → 타석별 기록(투수는 상대 타자별), 타석 ▶를 누르면 그 공 영상으로 바뀐다.
 */
export default function GameDetailSheet({
  playerId,
  role,
  day,
  onClose,
  onPrev,
  onNext,
}: {
  playerId: number;
  role: Role;
  day: CalendarDay;
  onClose: () => void;
  onPrev: (() => void) | null;
  onNext: (() => void) | null;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // 열린 동안 뒤 페이지가 스크롤되지 않게 하고, 모달로 연다(포커스가 창 안에 머문다)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    const root = document.documentElement;
    const before = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = before;
      if (dialog.open) dialog.close();
    };
  }, []);

  // 아래로 끌어 닫기(휴대폰 손잡이·머리 줄)
  const drag = useRef<{ y: number; dy: number } | null>(null);
  const onDragStart = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" || (e.target as HTMLElement).closest("button")) return;
    drag.current = { y: e.clientY, dy: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onDragMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const panel = panelRef.current;
    if (!d || !panel) return;
    d.dy = Math.max(0, e.clientY - d.y);
    panel.style.transform = `translateY(${d.dy}px)`;
  };
  const onDragEnd = () => {
    const d = drag.current;
    const panel = panelRef.current;
    drag.current = null;
    if (!d || !panel) return;
    if (d.dy > SWIPE_CLOSE) {
      onClose();
    } else {
      panel.style.transform = "";
    }
  };

  const titleId = `game-sheet-title-${day.key}`;
  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      // Esc: 브라우저가 닫기 전에 부모가 닫게 한다(주소의 ?game도 같이 정리)
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      // 창 바깥(어두운 곳)을 누르면 닫는다
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
      className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none border-0 bg-black/45 p-0 text-foreground open:flex open:items-end open:justify-center sm:open:items-center"
    >
      <div
        ref={panelRef}
        className="game-sheet flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-surface shadow-[var(--shadow-card-hover)] sm:max-h-[88dvh] sm:max-w-xl sm:rounded-2xl"
      >
        {/* 머리: 손잡이(휴대폰) + 앞뒤 경기 + 날짜 + 닫기 */}
        <div
          className="shrink-0 touch-none border-b border-line"
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
        >
          <div aria-hidden className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-line sm:hidden" />
          <div className="flex items-center gap-1 px-2 py-2 sm:py-3">
            <NavButton label="이전 경기" onClick={onPrev} dir="prev" />
            <h2 id={titleId} className="min-w-0 flex-1 text-center text-heading tabular-nums">
              {formatDate(day.key)}
            </h2>
            <NavButton label="다음 경기" onClick={onNext} dir="next" />
            <button
              type="button"
              aria-label="닫기"
              onClick={onClose}
              className="press grid size-10 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2"
            >
              <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
            </button>
          </div>
        </div>
        {/* 날짜를 바꾸면 안쪽(고른 경기·영상·스크롤)을 처음부터 */}
        <SheetBody key={day.key} playerId={playerId} role={role} day={day} />
      </div>
    </dialog>
  );
}

function NavButton({ label, onClick, dir }: { label: string; onClick: (() => void) | null; dir: "prev" | "next" }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={!onClick}
      onClick={() => {
        haptic("select");
        onClick?.();
      }}
      className="press grid size-10 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2 disabled:opacity-30"
    >
      <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d={dir === "prev" ? "M10 3 5 8l5 5" : "m6 3 5 5-5 5"} />
      </svg>
    </button>
  );
}

/** 같은 날 여러 경기 탭 이름: 같은 단계끼리면 1차전·2차전, 다르면 단계('트리플A', '메이저') */
function entryLabels(entries: LogGame[]): string[] {
  const levels = entries.map((e) => (e.kind === "minor" ? e.game.levelKo : "메이저"));
  if (new Set(levels).size === 1) return entries.map((_, i) => `${i + 1}차전`);
  return levels;
}

function SheetBody({ playerId, role, day }: { playerId: number; role: Role; day: CalendarDay }) {
  const [index, setIndex] = useState(0);
  const entry = day.entries[Math.min(index, day.entries.length - 1)];
  const line = lineOf(entry);
  const labels = day.entries.length > 1 ? entryLabels(day.entries) : null;
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[max(1rem,env(safe-area-inset-bottom))]">
      {labels && (
        <div role="group" aria-label="이날 경기" className="flex gap-1 px-4 pt-3">
          {labels.map((label, i) => (
            <button
              key={`${gamePkOf(day.entries[i])}`}
              type="button"
              aria-pressed={i === index}
              onClick={() => setIndex(i)}
              className={`rounded-full px-3 py-1.5 text-label ${i === index ? "bg-accent-soft text-accent-ink" : "text-muted hover:bg-surface-2"}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      <EntrySummary entry={entry} />
      <EntryDetail key={gamePkOf(entry)} playerId={playerId} role={role} entry={entry} line={line} scrollRef={scrollRef} />
    </div>
  );
}

/** 그 경기 한 줄: 상대·홈원정·선발·점수·결과, 한 줄 기록, 활약 배지(경기 기록 줄과 같은 부품) */
function EntrySummary({ entry }: { entry: LogGame }) {
  const g = lineOf(entry);
  const lineup = formatLineup(g);
  const hideVenue = entry.kind === "minor" && entry.game.home == null;
  return (
    <div className="px-4 pt-3">
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-meta text-muted">
        {entry.kind === "minor" && (
          <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-badge text-foreground/70">{entry.game.levelKo}</span>
        )}
        <span>vs</span>
        <TeamName teamKo={g.opponentKo} teamAbbr={g.opponentAbbr} teamId={entry.kind === "minor" ? entry.game.opponentId : undefined} />
        {!hideVenue && <span>{`· ${g.home ? "홈" : "원정"}`}</span>}
        {lineup && <span>{`· ${lineup}`}</span>}
        <ScoreText line={g} className="text-summary font-bold text-foreground" />
        <ResultPill result={g.result} className="ml-auto" />
      </div>
      <p className={`mt-1 text-summary text-pretty ${g.played ? "" : "font-medium text-muted"}`}>{formatSummary(g.summary)}</p>
      <Highlights line={g} className="mt-1.5" />
    </div>
  );
}

function EntryDetail({
  playerId,
  role,
  entry,
  line,
  scrollRef,
}: {
  playerId: number;
  role: Role;
  entry: LogGame;
  line: GameLine;
  scrollRef: RefObject<HTMLDivElement | null>;
}) {
  const pitcher = role === "PITCHER";
  const gamePk = gamePkOf(entry);
  // 결장(투수는 등판 없음)·경기 전이면 받지 않는다
  const notPlayedYet = !line.played && line.gameStatus !== "in_progress";
  const cacheKey = `${playerId}:${gamePk}`;
  const [load, setLoad] = useState<Load>(() => {
    const cached = detailCache.get(cacheKey);
    return cached ? { state: "ok", detail: cached } : { state: "loading" };
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (notPlayedYet || (load.state === "ok" && attempt === 0)) return;
    let alive = true;
    loadGameDetail(playerId, gamePk)
      .then((result) => {
        if (!alive) return;
        if (result.ok && result.detail.available) {
          detailCache.set(cacheKey, result.detail);
          setLoad({ state: "ok", detail: result.detail });
        } else {
          setLoad({ state: "error" });
        }
      })
      .catch(() => alive && setLoad({ state: "error" }));
    return () => {
      alive = false;
    };
    // load는 일부러 빼고, 처음과 '다시 시도'(attempt)에만 받는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId, gamePk, attempt, notPlayedYet, cacheKey]);

  if (notPlayedYet) {
    const message =
      line.gameStatus === "final"
        ? pitcher
          ? "이 경기에는 등판하지 않았어요."
          : "이 경기에는 나오지 않았어요."
        : line.gameStatus === "postponed" || line.gameStatus === "suspended"
          ? "경기가 연기됐어요."
          : `아직 경기 전이에요 · ${formatTime(line.startTimeKst)} 시작`;
    return <p className="px-4 pt-5 pb-2 text-body text-muted">{message}</p>;
  }
  if (load.state === "loading") return <DetailSkeleton />;
  if (load.state === "error") {
    return (
      <div className="px-4 pt-5 pb-2">
        <p className="text-body text-muted">기록을 불러오지 못했어요. 잠시 뒤에 다시 해 주세요.</p>
        <button
          type="button"
          onClick={() => {
            setLoad({ state: "loading" });
            setAttempt((n) => n + 1);
          }}
          className="press mt-3 rounded-full bg-surface-2 px-4 py-2 text-label"
        >
          다시 시도
        </button>
      </div>
    );
  }
  return <DetailContent playerId={playerId} gamePk={gamePk} detail={load.detail} scrollRef={scrollRef} />;
}

function DetailSkeleton() {
  return (
    <div aria-busy className="space-y-3 px-4 pt-4">
      <span className="sr-only">기록을 불러오는 중</span>
      <div className="aspect-video w-full animate-pulse rounded-xl bg-surface-2 motion-reduce:animate-none" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-12 animate-pulse rounded-lg bg-surface-2 motion-reduce:animate-none" />
      ))}
    </div>
  );
}

/** 공 영상 한 줄 설명: "2회 홈런" */
function playTitle(play: GamePlay): string {
  return `${play.inning}회 ${play.resultKo}`;
}

function DetailContent({
  playerId,
  gamePk,
  detail,
  scrollRef,
}: {
  playerId: number;
  gamePk: number;
  detail: GameDetail;
  scrollRef: RefObject<HTMLDivElement | null>;
}) {
  const pitcher = detail.role === "PITCHER";
  const first = detail.highlights[0] ?? null;
  const [clip, setClip] = useState<(Clip & { label: string; sub: string | null }) | null>(() =>
    first
      ? {
          key: `h-0`,
          hlsUrl: first.hlsUrl,
          mp4Url: first.mp4Url,
          posterUrl: first.imageUrl,
          autoPlay: false,
          label: first.title,
          sub: highlightSub(first.durationSec),
        }
      : null,
  );
  const [loadingPlay, setLoadingPlay] = useState<string | null>(null);

  const showHighlight = (i: number) => {
    const h = detail.highlights[i];
    haptic("select");
    setClip({ key: `h-${i}`, hlsUrl: h.hlsUrl, mp4Url: h.mp4Url, posterUrl: h.imageUrl, autoPlay: true, label: h.title, sub: highlightSub(h.durationSec) });
  };

  const showPlay = useCallback(
    async (play: GamePlay) => {
      if (!play.playId || loadingPlay) return;
      haptic("select");
      setLoadingPlay(play.playId);
      const result = await loadClip(playerId, gamePk, play.playId).catch(() => ({ ok: false as const }));
      setLoadingPlay(null);
      if (!result.ok) {
        toast("이 장면 영상은 아직 없어요.");
        return;
      }
      setClip({ key: `p-${play.playId}`, hlsUrl: null, mp4Url: result.mp4Url, posterUrl: null, autoPlay: true, label: playTitle(play), sub: "그 타석 마지막 공" });
      // 영상이 창 맨 위에 있어 그리로 올린다
      scrollRef.current?.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    },
    [gamePk, loadingPlay, playerId, scrollRef],
  );

  return (
    <div className="px-4 pt-4">
      {clip ? (
        <figure>
          <ClipPlayer clip={clip} />
          <figcaption className="mt-2">
            <span className="block text-summary">{clip.label}</span>
            <span className="block text-caption text-muted">{clip.sub ? `${clip.sub} · MLB 영상` : "MLB 영상"}</span>
          </figcaption>
        </figure>
      ) : detail.clips && detail.plays.some((p) => p.playId) ? (
        <p className="rounded-xl bg-surface-2 px-3 py-2.5 text-meta text-muted">
          이 경기엔 하이라이트 영상이 없어요. 타석 오른쪽 ▶를 누르면 그 공 영상을 볼 수 있어요.
        </p>
      ) : !detail.clips ? (
        <p className="text-meta text-muted">마이너리그 경기는 MLB 영상이 없어요.</p>
      ) : null}

      {/* 하이라이트가 여럿이면 고르기 */}
      {detail.highlights.length > 1 && (
        <ul className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {detail.highlights.map((h, i) => {
            const on = clip?.key === `h-${i}`;
            return (
              <li key={`${h.title}-${i}`} className="w-36 shrink-0">
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => showHighlight(i)}
                  className={`press-soft block w-full rounded-lg text-left ${on ? "ring-2 ring-foreground ring-offset-1 ring-offset-surface" : ""}`}
                >
                  {h.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- MLB 서버 사진을 브라우저가 바로 받는다(우리 서버를 거치지 않음)
                    <img src={h.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" className="aspect-video w-full rounded-lg bg-surface-2 object-cover" />
                  ) : (
                    <span className="block aspect-video w-full rounded-lg bg-surface-2" />
                  )}
                  <span className="mt-1 line-clamp-2 block text-caption">{h.title}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <h3 className="mt-5 text-label text-muted">
        {pitcher ? `상대 타자 ${detail.plays.length}명` : `타석별 (${detail.plays.length}타석)`}
      </h3>
      {detail.plays.length === 0 ? (
        <p className="mt-2 text-body text-muted">
          {pitcher ? "상대한 타자 기록이 없어요." : "타석 기록이 없어요(대주자·대수비로만 나왔을 때)."}
        </p>
      ) : (
        <ol className="mt-1 divide-y divide-line">
          {detail.plays.map((play, i) => (
            <PlayRow
              key={`${play.playId ?? i}-${i}`}
              play={play}
              pitcher={pitcher}
              canClip={detail.clips && play.playId != null}
              playing={clip?.key === `p-${play.playId}`}
              loading={loadingPlay === play.playId}
              onPlay={() => showPlay(play)}
            />
          ))}
        </ol>
      )}
      <p className="mt-4 text-micro text-muted">기록·영상 출처: MLB, Baseball Savant</p>
    </div>
  );
}

function highlightSub(sec: number | null): string | null {
  if (sec == null) return null;
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

const HITS = new Set(["single", "double", "triple"]);
const WALKS = new Set(["walk", "intent_walk"]);
const STRIKEOUTS = new Set(["strikeout", "strikeout_double_play", "strikeout_triple_play"]);

/**
 * 마지막 공을 던지기 전 볼카운트("3-2"). api 값은 타석이 끝난 뒤 카운트라, 볼넷은 볼 하나, 삼진은 스트라이크 하나를 뺀다
 * (그대로 쓰면 '4-1에서 5구째', '3-3에서 6구째'가 된다). 인플레이·몸에 맞는 공은 마지막 공이 카운트를 바꾸지 않는다
 */
function countBefore(play: GamePlay): string | null {
  if (play.balls == null || play.strikes == null) return null;
  let balls = play.balls;
  let strikes = play.strikes;
  if (WALKS.has(play.eventType) && balls >= 4) balls = 3;
  if (STRIKEOUTS.has(play.eventType) && strikes >= 3) strikes = 2;
  return `${balls}-${strikes}`;
}
/**
 * 타석 한 줄. 타자면 홈런은 채운 주황 알약(가장 큰 활약), 안타는 굵게.
 * 투수면 결과는 상대 타자 쪽 말이라, 맞은 홈런·안타는 주황 없이 '피홈런'·보통 글자로, 잡은 삼진만 굵게, 점수는 'N실점'으로 쓴다
 * (주황은 좋은 활약에만: DESIGN.md The Hot Is Earned Rule).
 */
function PlayRow({
  play,
  pitcher,
  canClip,
  playing,
  loading,
  onPlay,
}: {
  play: GamePlay;
  pitcher: boolean;
  canClip: boolean;
  playing: boolean;
  loading: boolean;
  onPlay: () => void;
}) {
  const homeRun = !pitcher && play.eventType === "home_run";
  const strong = pitcher ? STRIKEOUTS.has(play.eventType) : HITS.has(play.eventType);
  const result = pitcher && play.eventType === "home_run" ? "피홈런" : play.resultKo;
  const count = countBefore(play);
  const pitch = [
    count && play.pitches > 0 ? `${count}에서` : null,
    play.pitches > 0 ? `${play.pitches}구째` : null,
    play.pitchKo,
    play.pitchKmh != null ? `${play.pitchKmh}km/h` : null,
  ]
    .filter(Boolean)
    .join(" ");
  const meta = [play.opponentName ? `vs ${play.opponentName}` : null, pitch || null].filter(Boolean).join(" · ");
  const batted =
    play.exitKmh != null
      ? [`타구 ${play.exitKmh}km/h`, play.launchAngle != null ? `발사각 ${play.launchAngle}°` : null, play.distanceM ? `${play.distanceM}m` : null]
          .filter(Boolean)
          .join(" · ")
      : null;

  return (
    <li className={`-mx-2 flex items-start gap-3 rounded-lg px-2 py-3 ${playing ? "bg-accent-soft/60" : ""}`}>
      <span className="w-8 shrink-0 pt-0.5 text-label text-muted tabular-nums">{`${play.inning}회`}</span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
          {homeRun ? (
            <span className="inline-flex items-center rounded-full bg-hot-strong px-2 py-0.5 text-badge text-hot-on">홈런</span>
          ) : (
            <span className={`text-summary ${strong ? "font-bold" : ""}`}>{result}</span>
          )}
          {play.rbi > 0 && <span className="text-meta text-muted">{pitcher ? `${play.rbi}실점` : `${play.rbi}타점`}</span>}
        </p>
        {meta && <p className="mt-0.5 text-meta text-muted tabular-nums">{meta}</p>}
        {batted && <p className={`text-meta tabular-nums ${homeRun ? "font-bold text-hot-ink" : "text-muted"}`}>{batted}</p>}
      </div>
      {canClip && (
        <button
          type="button"
          aria-label={`${playTitle(play)} 영상 보기`}
          onClick={onPlay}
          className={`press grid size-9 shrink-0 place-items-center rounded-full ${playing ? "bg-accent text-accent-fg" : "bg-surface-2 text-foreground"}`}
        >
          <LoadingDots loading={loading}>
            <svg aria-hidden viewBox="0 0 16 16" className="size-3.5" fill="currentColor">
              <path d="M5 3.5v9l7.5-4.5z" />
            </svg>
          </LoadingDots>
        </button>
      )}
    </li>
  );
}
