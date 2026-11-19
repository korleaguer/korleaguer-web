"use client"; // 창을 열고 닫고, 고른 경기 상세를 브라우저에서 받아 와야 해서 클라이언트 컴포넌트다.

import dynamic from "next/dynamic";
import { useCallback, useEffect, useId, useRef, useState, type RefObject } from "react";
import type { GameDetail, GameHighlight, GameLine, GamePlay, Role } from "@/lib/api";
import { lineOf, type CalendarDay, type LogGame } from "@/lib/gameLog";
import { formatDate, formatLineup, formatSummary, formatTime } from "@/lib/format";
import { haptic } from "@/lib/app";
import { useModalDialog } from "@/lib/useModalDialog";
import { useSheetDrag } from "@/lib/useSheetDrag";
import Highlights from "@/components/Highlights";
import LoadingDots from "@/components/LoadingDots";
import ResultPill from "@/components/ResultPill";
import ScoreText from "@/components/ScoreText";
import StepButton from "@/components/StepButton";
import TeamName from "@/components/TeamName";
import type { Clip } from "./ClipPlayer";
import { PostseasonLine } from "./GameRow";
import Words from "@/components/Words";

// 영상 플레이어(Video.js 10, hls.js 포함 약 270KB)는 창이 열릴 때 받아 온다. 선수 페이지 첫 로딩에는 넣지 않는다
const ClipPlayer = dynamic(() => import("./ClipPlayer"), {
  ssr: false,
  loading: () => <div className="aspect-video w-full rounded-xl bg-surface-2" />,
});

/**
 * 받은 상세를 이 탭이 열려 있는 동안 기억한다(앞뒤 경기를 오갈 때 다시 받지 않게).
 * 끝난 경기만 기억하고(진행 중이면 다시 열 때 새 타석을 받는다), 최근 DETAIL_CACHE_MAX개까지만 둔다
 */
const detailCache = new Map<string, GameDetail>();
const DETAIL_CACHE_MAX = 60;

function remember(key: string, detail: GameDetail) {
  detailCache.delete(key);
  detailCache.set(key, detail);
  if (detailCache.size > DETAIL_CACHE_MAX) {
    const oldest = detailCache.keys().next().value;
    if (oldest !== undefined) detailCache.delete(oldest);
  }
}

type Load = { state: "loading" } | { state: "ok"; detail: GameDetail } | { state: "error" };

/**
 * 경기 상세를 GET 주소(src/app/players/[id]/games/[gamePk]/route.ts)로 받는다. 예전 서버 함수(Server Action)는 차례로 하나씩
 * 보내져서 ‹ ›로 빠르게 넘기면 줄을 섰다(11-17 전수조사). GET은 넘길 때 앞 요청을 취소하고(signal), 끝난 경기(final)는
 * 브라우저가 10분 둔다. 못 받으면 null
 */
async function fetchDetail(playerId: number, gamePk: number, final: boolean, signal: AbortSignal): Promise<GameDetail | null> {
  const res = await fetch(`/players/${playerId}/games/${gamePk}${final ? "?final=1" : ""}`, { signal });
  return res.ok ? ((await res.json()) as GameDetail) : null;
}

/**
 * 공 영상 주소를 받은 결과. 실패는 둘로 나눈다(11-17 전수조사 L405: 예전에는 연결이 끊겨도 '영상이 아직 없어요'라고 했다).
 * none: 그 장면 영상이 없거나 찾지 못함(라우트 404). error: 연결이 끊겼거나 서버가 이상한 응답을 줌(다시 누르면 다시 받는다)
 */
type ClipResult = { mp4Url: string } | { failure: "none" | "error" };

/** 타석 ▶: 그 공 영상 주소(GET, 바뀌지 않아 브라우저가 하루 둔다). 실패는 저장하지 않는다(no-store) */
async function fetchClip(playerId: number, gamePk: number, playId: string): Promise<ClipResult> {
  let res: Response;
  try {
    res = await fetch(`/players/${playerId}/games/${gamePk}/clips/${playId}`);
  } catch {
    return { failure: "error" };
  }
  if (res.status === 404) return { failure: "none" };
  if (!res.ok) return { failure: "error" };
  try {
    const data = (await res.json()) as { mp4Url?: unknown } | null;
    return typeof data?.mp4Url === "string" && data.mp4Url ? { mp4Url: data.mp4Url } : { failure: "error" };
  } catch {
    return { failure: "error" };
  }
}

/** 공 영상을 못 받았을 때 누른 타석 줄 안에 보일 문구. 오류는 다시 눌러 보라고 한다 */
const CLIP_FAILURE: Record<"none" | "error", string> = {
  none: "이 장면 영상은 아직 없어요.",
  error: "영상을 불러오지 못했어요. 잠시 뒤 다시 눌러 주세요.",
};

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


  // 모달로 열고(포커스가 창 안에 머문다) 열린 동안 뒤 페이지 스크롤을 잠근다. 앱 안이면 창이 떠 있는 동안 앱이 아이폰 왼쪽 끝
  // 밀어 닫기와 아래 탭 누름을 막는다(창 대신 선수 화면이 닫히지 않게, 거론 구단 창과 같은 훅)
  useModalDialog(dialogRef);

  // 아래로 끌어 닫기(휴대폰 손잡이·머리 줄). 놓으면 미끄러져 닫히거나 제자리로 돌아온다(거론 구단 창과 같은 훅).
  // 다른 닫기도 훅의 close로 부른다: 미끄러지는 중에 닫으면 훅이 타이머를 치워 뒤로 가기가 한 번만 일어난다
  const { onDragStart, onDragMove, onDragEnd, close } = useSheetDrag(panelRef, onClose);

  const titleId = `game-sheet-title-${day.key}`;
  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      // Esc: 브라우저가 닫기 전에 부모가 닫게 한다(주소의 ?game도 같이 정리)
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      // 창 바깥(어두운 곳)을 누르면 닫는다
      onClick={(e) => {
        if (e.target === dialogRef.current) close();
      }}
      className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none border-0 bg-black/45 p-0 text-foreground open:flex open:items-end open:justify-center sm:open:items-center"
    >
      <div
        ref={panelRef}
        className="game-sheet flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-surface shadow-[var(--shadow-card-hover)] sm:max-h-[88dvh] sm:max-w-xl sm:rounded-2xl"
      >
        {/* 머리: 손잡이(휴대폰) + 앞뒤 경기 + 날짜 + 닫기. 끌어 닫는 자리라 글자가 잡히지 않게 select-none */}
        <div
          className="shrink-0 touch-none select-none border-b border-line"
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
        >
          <div aria-hidden className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-line sm:hidden" />
          {/* 아이콘 버튼 셋은 글자 배율과 상관없이 44px(누름 영역 기준). 2.75rem으로 두면 큰 글씨(2배)에서 셋이 88px씩 차지해
              날짜가 한 글자씩 네 줄로 갈렸다(이슈 #264). 아이콘 그림(1rem)은 글자와 함께 커진다 */}
          <div className="flex items-center gap-1 px-2 py-2 sm:py-3">
            <NavButton label="이전 경기" onClick={onPrev} dir="prev" />
            <h2 id={titleId} className="min-w-0 flex-1 text-center text-heading tabular-nums">
              {formatDate(day.key)}
            </h2>
            <NavButton label="다음 경기" onClick={onNext} dir="next" />
            <button
              type="button"
              aria-label="닫기"
              onClick={close}
              className="press grid size-[44px] shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2"
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

/**
 * 앞뒤 경기 버튼: 내 선수 카드와 같은 화살표 버튼(StepButton, 첫·끝 경기면 꺼진다) + 누르면 앱 안이면 고르기 틱.
 * 흰 창 위라 마우스를 올리면 surface-2 원
 */
function NavButton({ label, onClick, dir }: { label: string; onClick: (() => void) | null; dir: "prev" | "next" }) {
  return (
    <StepButton
      dir={dir}
      label={label}
      onClick={
        onClick &&
        (() => {
          haptic("select");
          onClick();
        })
      }
      hoverClass="hover:bg-surface-2"
    />
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
    // 아이폰 앱은 아래 탭 막대가 창 위에 떠 있어 그 높이(--app-tab-bar, 홈 표시줄 포함)만큼 더 띄운다(globals.css)
    <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[calc(env(safe-area-inset-bottom)+1rem)] in-ios-app:pb-[calc(var(--app-tab-bar)+1rem)]">
      {labels && (
        <div role="group" aria-label="이날 경기" className="flex gap-1 px-4 pt-3">
          {labels.map((label, i) => (
            <button
              key={`${gamePkOf(day.entries[i])}`}
              type="button"
              // 하나만 고르는 탭이라 aria-pressed(켬·끔) 대신 '지금 보는 경기'로 알린다(11-17 전수조사)
              aria-current={i === index ? "true" : undefined}
              onClick={() => setIndex(i)}
              className={`tap-target rounded-full px-3 py-1.5 text-label ${i === index ? "bg-accent-soft text-accent-ink" : "text-muted hover:bg-surface-2"}`}
            >
              <span className={`bold-reserve ${i === index ? "font-extrabold" : ""}`} data-text={label}>
                {label}
              </span>
            </button>
          ))}
        </div>
      )}
      <EntrySummary entry={entry} />
      <EntryDetail key={gamePkOf(entry)} playerId={playerId} role={role} entry={entry} line={line} scrollRef={scrollRef} />
    </div>
  );
}

/**
 * 그 경기 한 줄: (포스트시즌 한 줄)·상대·홈원정·선발·점수·결과, 한 줄 기록, 활약 배지(경기 기록 줄과 같은 부품).
 * '포스트시즌'은 날짜 머리가 아니라 여기 경기 정보 줄 위에 둔다(GameRow의 PostseasonLine): 머리는 날짜 단위라 그날 경기마다
 * 다를 수 있는 종류를 가를 수 없고, 경기 기록 줄과 같은 자리여야 같은 것이 같은 곳에 보인다
 */
function EntrySummary({ entry }: { entry: LogGame }) {
  const g = lineOf(entry);
  const lineup = formatLineup(g);
  const hideVenue = entry.kind === "minor" && entry.game.home == null;
  return (
    <div className="px-4 pt-3">
      <PostseasonLine game={g} />
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
      <p className={`mt-1 text-summary text-pretty ${g.played ? "" : "font-medium text-muted"}`}>
        <Words text={formatSummary(g.summary)} />
      </p>
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
    // 다른 날짜·경기로 넘기면(이 부품이 지워지며) 받던 요청을 취소한다. 빠르게 넘겨도 마지막 경기만 기다린다
    const controller = new AbortController();
    const final = line.gameStatus === "final";
    fetchDetail(playerId, gamePk, final, controller.signal)
      .then((detail) => {
        if (controller.signal.aborted) return;
        if (detail?.available) {
          if (final) remember(cacheKey, detail);
          setLoad({ state: "ok", detail });
        } else {
          setLoad({ state: "error" });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoad({ state: "error" });
      });
    return () => controller.abort();
    // load는 일부러 빼고, 처음과 '다시 시도'(attempt)에만 받는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId, gamePk, attempt, notPlayedYet, cacheKey, line.gameStatus]);

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
        {/* 화면 낭독기가 바로 읽게 alert(버튼은 밖에 둔다). '다시 시도'가 또 실패하면 받는 동안 뼈대로 바뀌었다가 이 문구가
            새로 그려져 다시 읽힌다(11-17 전수조사) */}
        <p role="alert" className="text-body text-muted">
          기록을 불러오지 못했어요. 잠시 뒤에 다시 해 주세요.
        </p>
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
  const [clip, setClip] = useState<(Clip & { label: string; original: string | null; sub: string | null }) | null>(() =>
    first
      ? {
          key: `h-0`,
          hlsUrl: first.hlsUrl,
          mp4Url: first.mp4Url,
          posterUrl: first.imageUrl,
          autoPlay: false,
          label: highlightTitle(first).main,
          original: highlightTitle(first).original,
          sub: highlightSub(first.durationSec),
        }
      : null,
  );
  const [loadingPlay, setLoadingPlay] = useState<string | null>(null);
  /**
   * 타석 ▶로 영상을 바꾸면 창은 맨 위 영상으로 올라가는데 포커스는 화면 밖 ▶에 남아, 키보드·낭독기 사용자는 영상을 찾아 거슬러
   * 올라가야 했다(11-17 전수조사). 그래서 ▶로 바꾼 영상이 그려지면 영상 묶음(figure)으로 포커스를 옮긴다. 하이라이트 고르기는
   * 포커스가 바로 아래 목록에 있어 옮기지 않는다
   */
  const figureRef = useRef<HTMLElement>(null);
  const focusClipRef = useRef(false);
  /** 창 안 낭독 한 줄: 받는 동안 '영상을 불러오는 중', 못 받으면 그 까닭(없음·오류). 모달이 열린 동안 창 밖은 낭독기가 읽지 못할 수 있다 */
  const [clipStatus, setClipStatus] = useState("");
  /**
   * 영상을 못 받은 타석(공 번호)과 까닭. 그 줄 안에 문구를 보인다(없음·오류 모두). 알림 띠는 모달 창(최상위 층) 뒤라 창이 높으면
   * (하이라이트가 있는 경기 등, 휴대폰에서 위 77px까지) 창 뒤에 가려져 아무 반응이 없어 보였다.
   * 다른 영상으로 바꾸면(▶·하이라이트) 지운다
   */
  const [clipNotice, setClipNotice] = useState<{ playId: string; failure: "none" | "error" } | null>(null);

  useEffect(() => {
    if (!focusClipRef.current) return;
    focusClipRef.current = false;
    figureRef.current?.focus({ preventScroll: true });
  }, [clip]);

  const showHighlight = (i: number) => {
    const h = detail.highlights[i];
    // 영상 재생에는 진동을 쓰지 않는다(사용자 11-19 '추천대로', 이슈 #313)
    // 앞서 못 받은 타석 안내·낭독 줄은 지난 일이라 지운다(▶를 새로 누를 때와 같다)
    setClipNotice(null);
    setClipStatus("");
    setClip({ key: `h-${i}`, hlsUrl: h.hlsUrl, mp4Url: h.mp4Url, posterUrl: h.imageUrl, autoPlay: true, label: highlightTitle(h).main, original: highlightTitle(h).original, sub: highlightSub(h.durationSec) });
  };

  const showPlay = useCallback(
    async (play: GamePlay) => {
      if (!play.playId || loadingPlay) return;
      setLoadingPlay(play.playId);
      setClipNotice(null);
      setClipStatus("영상을 불러오는 중");
      const result = await fetchClip(playerId, gamePk, play.playId);
      setLoadingPlay(null);
      if ("failure" in result) {
        // 누른 줄 안에 알린다(오류면 다시 누르면 다시 받는다)
        setClipStatus(CLIP_FAILURE[result.failure]);
        setClipNotice({ playId: play.playId, failure: result.failure });
        return;
      }
      const { mp4Url } = result;
      // 영상 이름은 포커스를 받은 영상 묶음이 읽는다(같은 말을 두 번 읽지 않게 낭독 줄은 비운다)
      setClipStatus("");
      focusClipRef.current = true;
      setClip({ key: `p-${play.playId}`, hlsUrl: null, mp4Url, posterUrl: null, autoPlay: true, label: playTitle(play), original: null, sub: "그 타석 마지막 공" });
      // 영상이 창 맨 위에 있어 그리로 올린다
      scrollRef.current?.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    },
    [gamePk, loadingPlay, playerId, scrollRef],
  );

  return (
    <div className="px-4 pt-4">
      {clip ? (
        // 포커스만 받고 Tab 순서에는 넣지 않는다(-1). 키보드로 왔을 때만 포커스 테두리가 보인다
        <figure ref={figureRef} tabIndex={-1} aria-label={`${clip.label} 영상`} className="rounded-xl">
          <ClipPlayer clip={clip} />
          <figcaption className="mt-2">
            <span className="block text-summary">{clip.label}</span>
            {clip.original && <span className="block text-caption text-muted">{clip.original}</span>}
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

      {/* 하이라이트가 여럿이면 고르기. 휴대폰은 가로로 밀어 보고, 640px 이상 가운데 창은 3개씩 줄을 바꾼다
          (가로로 밀면 4번째부터 창 밖으로 잘렸고, PC 마우스로는 옆으로 밀 수단이 없었다, 11-17 전수조사) */}
      {detail.highlights.length > 1 && (
        <ul className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
          {detail.highlights.map((h, i) => {
            const on = clip?.key === `h-${i}`;
            return (
              <li key={`${h.title}-${i}`} className="w-36 shrink-0">
                <button
                  type="button"
                  // 하나만 고르는 영상이라 aria-pressed(켬·끔) 대신 '지금 보는 영상'으로 알린다(11-17 전수조사)
                  aria-current={on ? "true" : undefined}
                  onClick={() => showHighlight(i)}
                  className={`press-soft block w-full rounded-lg text-left ${on ? "ring-2 ring-foreground ring-offset-1 ring-offset-surface" : ""}`}
                >
                  {h.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- MLB 서버 사진을 브라우저가 바로 받는다(우리 서버를 거치지 않음)
                    <img src={h.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" className="aspect-video w-full rounded-lg bg-surface-2 object-cover" />
                  ) : (
                    <span className="block aspect-video w-full rounded-lg bg-surface-2" />
                  )}
                  <span className="mt-1 line-clamp-2 block text-caption">{highlightTitle(h).main}</span>
                  {/* 한국어 제목이 있으면 영어 원제는 흐린 둘째 줄, 목록 칸에서는 한 줄만 */}
                  {h.titleKo && <span className="block truncate text-caption text-muted">{h.title}</span>}
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
              notice={play.playId != null && clipNotice?.playId === play.playId ? CLIP_FAILURE[clipNotice.failure] : null}
              onPlay={() => showPlay(play)}
            />
          ))}
        </ol>
      )}
      <p className="mt-4 text-micro text-muted">기록·영상 출처: MLB, Baseball Savant</p>
      <p aria-live="polite" className="sr-only">
        {clipStatus}
      </p>
    </div>
  );
}

/** 하이라이트 제목: 한국어가 있으면 한국어가 주 글자고 영어 원제는 둘째 줄(original), 없으면 영어 한 줄 */
function highlightTitle(h: GameHighlight): { main: string; original: string | null } {
  return h.titleKo ? { main: h.titleKo, original: h.title } : { main: h.title, original: null };
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
 * 투수면 결과는 상대 타자 쪽 말이라, 맞은 홈런·안타는 주황 없이 '피홈런'·보통 글자로, 잡은 삼진만 굵게 쓴다
 * (주황은 좋은 활약에만: DESIGN.md The Hot Is Earned Rule). 점수는 그 타석 타자의 타점이라 투수도 'N타점 허용'이다.
 * 예전에는 'N실점'이라 썼는데, 승계 주자·실책·폭투 점수는 투수 책임 실점과 타점이 달라 숫자가 틀렸다(11-17 전수조사).
 */
function PlayRow({
  play,
  pitcher,
  canClip,
  playing,
  loading,
  notice,
  onPlay,
}: {
  play: GamePlay;
  pitcher: boolean;
  canClip: boolean;
  playing: boolean;
  loading: boolean;
  /** 이 타석 영상을 못 받았을 때(없음·오류) 줄 안에 보일 한 줄. 없으면 null */
  notice: string | null;
  onPlay: () => void;
}) {
  const noticeId = useId();
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
          {play.rbi > 0 && <span className="text-meta text-muted">{pitcher ? `${play.rbi}타점 허용` : `${play.rbi}타점`}</span>}
        </p>
        {meta && <p className="mt-0.5 text-meta text-muted tabular-nums">{meta}</p>}
        {batted && <p className={`text-meta tabular-nums ${homeRun ? "font-bold text-hot-ink" : "text-muted"}`}>{batted}</p>}
        {/* 영상을 못 받았을 때(없음·오류): 누른 ▶ 바로 옆에서 알린다. 흐린 기록 줄과 구분되게 본문색(빨간 글자는 쓰지 않는다, DESIGN.md) */}
        {notice && (
          <p id={noticeId} className="mt-1 text-meta text-pretty text-foreground">
            {notice}
          </p>
        )}
      </div>
      {canClip && (
        <button
          type="button"
          // 재생 중인 타석은 채운 파랑(눈)만으로 알렸다. 화면 낭독기에도 '지금 보는 영상'과 이름으로 알린다(11-17 전수조사)
          aria-current={playing ? "true" : undefined}
          aria-busy={loading || undefined}
          aria-label={playing ? `${playTitle(play)} 영상 보는 중` : `${playTitle(play)} 영상 보기`}
          aria-describedby={notice ? noticeId : undefined}
          onClick={onPlay}
          className={`press tap-target grid size-9 shrink-0 place-items-center rounded-full ${playing ? "bg-accent text-accent-fg" : "bg-surface-2 text-foreground"}`}
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
