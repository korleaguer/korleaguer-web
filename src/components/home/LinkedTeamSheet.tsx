"use client"; // 창을 열고 닫고(모달), 아래로 끌어 닫아야 해서 클라이언트 컴포넌트다.

import Link from "next/link";
import { useEffect, useRef, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { LinkedArticle, LinkedTeam } from "@/lib/api";
import { formatDate, kstDayKey } from "@/lib/format";
import { titleLang } from "@/lib/news";
import TeamMark from "@/components/TeamMark";
import NewsThumb from "@/components/news/NewsThumb";
import Words from "@/components/Words";
import { teamColor, teamLogoUrl } from "@/lib/teams";

/** 아래로 이만큼 끌면 닫는다(px, 경기 상세 창과 같다) */
const SWIPE_CLOSE = 96;
/** 날짜 막대는 기사가 이만큼 이상일 때만(1~2건은 막대가 정보를 더하지 않는다) */
const CHART_MIN = 3;

/**
 * 거론 구단을 누르면 뜨는 창(사용자 11-16 시안 D). 휴대폰은 아래에서 올라오는 창(아래로 끌면 닫힘), 640px 이상은 가운데 창.
 * 경기 상세 창(GameDetailSheet)과 같은 틀이다. 닫기·바깥 누르기·Esc로 닫는다. 뒤로 가기로 닫기와 닫은 뒤 연 버튼으로
 * 포커스 돌려주기는 여는 쪽(LinkedTeams)이 한다(이 부품은 닫힐 때 통째로 지워진다).
 * 안쪽: 기사가 CHART_MIN건 이상이면 최근 며칠 날짜 막대(언제 몰렸나), 그 아래 기사 줄. 줄은 운영 기사 목록과 같은 모양이고
 * 제목 자리에 '왜 거론됐나' 한 줄(AI 요약에서 그 구단 이름이 나온 문장, 없으면 제목)을 두 줄까지 보인다.
 * 글만 있으면 눈이 피로해서(사용자 11-16 "텍스트밖에 없어서 눈 아파") 줄마다 기사 사진을 붙인다.
 */
export default function LinkedTeamSheet({
  team,
  days,
  playerPhotoUrl,
  onClose,
}: {
  team: LinkedTeam;
  days: number;
  /** 기사 사진이 없거나 안 뜨면 썸네일 자리에 */
  playerPhotoUrl: string | null;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const articles = team.articles ?? [];

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
    if (d.dy > SWIPE_CLOSE) onClose();
    else panel.style.transform = "";
  };

  const titleId = `linked-team-${team.abbreviation}`;
  return createPortal(
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
      className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none border-0 bg-black/45 p-0 text-foreground open:flex open:items-end open:justify-center sm:open:items-center"
    >
      <div
        ref={panelRef}
        className="game-sheet flex max-h-[84dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-surface shadow-[var(--shadow-card-hover)] sm:max-h-[80dvh] sm:max-w-lg sm:rounded-2xl"
      >
        <div
          className="shrink-0 touch-none"
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
        >
          <div aria-hidden className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-line sm:hidden" />
          <div className="flex items-center gap-2.5 pb-1 pl-4 pr-2 pt-3 sm:pt-4">
            <TeamMark logoUrl={teamLogoUrl(team.abbreviation)} color={teamColor(team.abbreviation)} size="md" />
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="truncate text-heading">
                {team.nameKo}
              </h2>
              <p className="text-caption text-muted tabular-nums">
                최근 {days}일 행선지로 거론한 기사 {articles.length}건
              </p>
            </div>
            <button
              type="button"
              aria-label="닫기"
              onClick={onClose}
              className="press grid size-[44px] shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2"
            >
              <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] in-ios-app:pb-[calc(env(safe-area-inset-bottom)+84px+0.5rem)]">
          {articles.length >= CHART_MIN && <DayBars articles={articles} days={days} />}
          <ul>
            {withoutRepeatedPhotos(articles).map((a, i) => (
              <li key={a.id} className={i === 0 ? undefined : "border-t border-line"}>
                <ArticleRow article={a} playerPhotoUrl={playerPhotoUrl} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </dialog>,
    document.body,
  );
}

/** 최근 days일(한국 날짜, 오늘 포함) 날마다 몇 건. 오늘 기사가 있으면 오늘 막대는 강조색 */
function DayBars({ articles, days }: { articles: LinkedArticle[]; days: number }) {
  const today = new Date();
  const keys = Array.from({ length: days }, (_, i) => kstDayKey(new Date(today.getTime() - (days - 1 - i) * 86_400_000))!);
  const counts = keys.map((k) => articles.filter((a) => kstDayKey(a.publishedAt) === k).length);
  const max = Math.max(1, ...counts);
  const summary = keys
    .map((k, i) => (counts[i] > 0 ? `${Number(k.slice(8))}일 ${counts[i]}건` : null))
    .filter(Boolean)
    .join(", ");
  return (
    <figure className="mt-1 border-b border-line pb-2">
      <figcaption className="sr-only">날짜별 기사 수: {summary}</figcaption>
      {/* 막대 위 'n건'·아래 '11일'은 칸 폭이 허락하는 만큼만 키운다(globals.css .day-bars, 이슈 #264) */}
      <div
        aria-hidden
        className="day-bars grid items-end"
        style={{ gridTemplateColumns: `repeat(${days}, minmax(0, 1fr))`, "--days": String(days) } as CSSProperties}
      >
        {keys.map((k, i) => {
          const isToday = i === days - 1;
          const n = counts[i];
          return (
            <div key={k} className="flex flex-col items-center">
              <span className="day-bars-label mb-1 font-bold tabular-nums">
                {n > 0 ? `${n}건` : ""}
              </span>
              {/* 기사가 있는 날은 역대 계약 막대와 같은 잉크 그라데이션(오늘만 강조색), 없는 날은 바닥선만.
                  막대 폭(1.75rem)은 글자 배율을 따라 커지므로 칸보다 넓어지면 칸 폭 - 4px로 줄인다(2배 375px에서 막대끼리 겹쳤다) */}
              <span
                className={`w-7 max-w-[calc(100%-4px)] rounded-t-md ${n === 0 ? "bg-line" : isToday ? "bg-accent" : ""}`}
                style={
                  {
                    height: n > 0 ? `${12 + (n / max) * 40}px` : "3px",
                    background:
                      n > 0 && !isToday
                        ? "linear-gradient(0deg, color-mix(in oklab, var(--foreground), transparent 80%), var(--foreground))"
                        : undefined,
                  } as CSSProperties
                }
              />
              <span
                className={`day-bars-label mt-1.5 tabular-nums ${isToday ? `font-bold ${n > 0 ? "text-accent-ink" : "text-foreground"}` : "text-muted"}`}
              >
                {isToday ? "오늘" : `${Number(k.slice(8))}일`}
              </span>
            </div>
          );
        })}
      </div>
    </figure>
  );
}

/** 운영 기사 목록 줄(NewsTitleList)과 같은 모양: 출처 줄 위, 글 두 줄, 오른쪽 사진 */
function ArticleRow({ article: a, playerPhotoUrl }: { article: LinkedArticle; playerPhotoUrl: string | null }) {
  const text = a.reason ?? a.titleKo ?? a.title;
  return (
    <Link href={`/news/${a.id}`} className="press-soft group flex items-center gap-3 py-3">
      {/* 화면 낭독기는 글부터 읽고, 눈에는 출처 줄이 위에 보인다. 출처 줄이 11rem보다 좁으면(큰 글씨) 보통 글처럼 흘린다(NewsTitleList와 같다) */}
      <span className="@container flex min-w-0 flex-1 flex-col-reverse">
        {/* 근거 한 줄·번역이 없는 영어 기사는 원제가 나와 화면 낭독기가 영어로 읽게 한다(NewsTitleList와 같다) */}
        <span
          lang={titleLang(text)}
          className="mt-0.5 line-clamp-2 text-summary group-hover:underline @max-[11rem]:line-clamp-4"
        >
          <Highlighted text={text} word={a.reasonName} />
        </span>
        <span className="flex min-w-0 whitespace-nowrap text-caption text-muted tabular-nums @max-[11rem]:block @max-[11rem]:whitespace-normal">
          <span className="min-w-0 truncate @max-[11rem]:whitespace-normal">{a.publisher}</span>
          {/* 조각 사이 간격은 NewsTitleList와 같다(한 줄이면 왼쪽 여백, 흘리면 보통 공백이 간격·줄바꿈 자리) */}
          {a.alsoBy.length > 0 && (
            <>
              {" "}
              <span
                className="shrink-0 whitespace-nowrap pl-[0.25em] @max-[11rem]:pl-0"
                title={`같은 기사: ${a.alsoBy.join(", ")}`}
              >
                {`외 ${a.alsoBy.length}곳`}
              </span>
            </>
          )}{" "}
          <span className="shrink-0 pl-[0.25em] @max-[11rem]:pl-0">
            <Words text={`·\u00a0${formatDate(a.publishedAt)}`} />
          </span>
        </span>
      </span>
      <NewsThumb newsId={a.id} url={a.imageUrl} fallback={playerPhotoUrl} />
    </Link>
  );
}

/** 구단 이름을 검색어 강조와 같은 모양으로 */
function Highlighted({ text, word }: { text: string; word: string | null }) {
  if (!word || !text.includes(word)) return text;
  const parts: ReactNode[] = [];
  text.split(word).forEach((part, i) => {
    if (i > 0) {
      parts.push(
        <mark key={i} className="bg-transparent font-bold text-accent-ink">
          {word}
        </mark>,
      );
    }
    if (part) parts.push(part);
  });
  return parts;
}

/** 앞 줄에서 쓴 기사 사진이면 비운다(선수 사진으로 대신한다, 운영 기사 목록과 같은 규칙) */
function withoutRepeatedPhotos(items: LinkedArticle[]): LinkedArticle[] {
  const seen = new Set<string>();
  return items.map((a) => {
    if (!a.imageUrl) return a;
    if (seen.has(a.imageUrl)) return { ...a, imageUrl: null };
    seen.add(a.imageUrl);
    return a;
  });
}
