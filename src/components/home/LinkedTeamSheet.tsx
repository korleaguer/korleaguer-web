"use client"; // 창을 열고 닫고(모달), 아래로 끌어 닫아야 해서 클라이언트 컴포넌트다.

import Link from "next/link";
import { useRef, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { LinkedArticle, LinkedTeam } from "@/lib/api";
import { formatDate, kstDayKey } from "@/lib/format";
import { titleLang } from "@/lib/news";
import TeamMark from "@/components/TeamMark";
import NewsThumb from "@/components/news/NewsThumb";
import Words, { WordGroup } from "@/components/Words";
import { teamColor, teamLogoUrl } from "@/lib/teams";
import { useModalDialog } from "@/lib/useModalDialog";
import { useSheetDrag } from "@/lib/useSheetDrag";

/** 날짜 막대는 기사가 이만큼 이상일 때만(1~2건은 막대가 정보를 더하지 않는다) */
const CHART_MIN = 3;

/**
 * 거론 구단을 누르면 뜨는 창(사용자 11-16 시안 D). 휴대폰은 아래에서 올라오는 창(아래로 끌면 닫힘), 640px 이상은 가운데 창.
 * 경기 상세 창(GameDetailSheet)과 같은 틀이다. 닫기·바깥 누르기·Esc로 닫는다. 뒤로 가기로 닫기와 닫은 뒤 연 버튼으로
 * 포커스 돌려주기는 여는 쪽(LinkedTeams)이 한다(이 부품은 닫힐 때 통째로 지워진다).
 * 안쪽: 기사가 CHART_MIN건 이상이면 최근 며칠 날짜 막대(언제 몰렸나), 그 아래 기사 줄. 줄은 운영 기사 목록과 같은 모양이고
 * 제목 자리에 '왜 거론됐나' 한 줄(AI 요약에서 그 구단 이름이 나온 문장, 없으면 제목)을 네 줄까지 보인다. 두 줄이면 375px에서
 * 문장 대부분이 끝을 못 보이고 잘렸고, 끝까지 볼 곳도 없었다(사용자 결정 11-17 '추천대로', 이슈 #277).
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

  // 모달로 열고(포커스가 창 안에 머문다) 열린 동안 뒤 페이지 스크롤을 잠근다. 앱 안이면 창이 떠 있는 동안 앱이 아이폰 왼쪽 끝
  // 밀어 닫기와 아래 탭 누름을 막는다(경기 상세 창과 같은 훅)
  useModalDialog(dialogRef);

  // 아래로 끌어 닫기(휴대폰 손잡이·머리 줄). 놓으면 미끄러져 닫히거나 제자리로 돌아온다(경기 상세 창과 같은 훅).
  // 다른 닫기도 훅의 close로 부른다: 미끄러지는 중에 닫으면 훅이 타이머를 치워 뒤로 가기가 한 번만 일어난다
  const { onDragStart, onDragMove, onDragEnd, close } = useSheetDrag(panelRef, onClose);

  const titleId = `linked-team-${team.abbreviation}`;
  return createPortal(
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === dialogRef.current) close();
      }}
      className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none border-0 bg-black/45 p-0 text-foreground open:flex open:items-end open:justify-center sm:open:items-center"
    >
      <div
        ref={panelRef}
        className="game-sheet flex max-h-[84dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-surface shadow-[var(--shadow-card-hover)] sm:max-h-[80dvh] sm:max-w-lg sm:rounded-2xl"
      >
        {/* 끌어 닫는 머리: 앱 안에서도 길게 눌러 글자가 잡히지 않게 select-none */}
        <div
          className="shrink-0 touch-none select-none"
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
                최근 {days}일 기사 {articles.length}건
                {/* 줄마다 보이는 문장은 AI 요약에서 뽑은 것이라, 언론사 이름 밑에 있어도 그 언론사가 쓴 문장처럼 읽히지 않게 알린다
                    (인공지능기본법 제31조 생성형 AI 결과 고지). 줄마다 달지 않고 이 줄 끝에 한 번만 둔다(기사 페이지 출처 줄의 'AI 요약'처럼,
                    이슈 #277). 좁으면 '· AI 요약'을 한 덩어리로 다음 줄에 내린다(WordGroup). 요약 문장이 없는 기사는 제목을 보이는데
                    (11-17 운영 90줄 중 1줄), 모든 줄이 제목이면 붙이지 않는다 */}
                {articles.some((a) => a.reason) && (
                  <>
                    {" "}
                    <WordGroup text={"·\u00a0AI\u00a0요약"} />
                  </>
                )}
              </p>
            </div>
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
        {/* 아이폰 앱은 아래 탭 막대가 창 위에 떠 있어 그 높이(--app-tab-bar, 홈 표시줄 포함)만큼 더 띄운다(globals.css) */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] in-ios-app:pb-[calc(var(--app-tab-bar)+0.5rem)]">
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
                  막대 폭(1.75rem)은 글자 배율을 따라 커지므로 칸보다 넓어지면 칸 폭 - 4px로 줄인다(2배 375px에서 막대끼리 겹쳤다).
                  높이는 0부터 건수에 비례한다(가장 많은 날 52px). 예전에는 12px에서 시작해 1건과 3건이 실제(3배)보다 비슷해 보였다
                  (이슈 #277). 1건 막대는 작아질 수 있지만 위 'n건' 글자가 남는다 */}
              <span
                // 고대비 모드에서 시스템 색으로 다시 칠할 막대(globals.css). 기사 없는 날의 바닥 줄은 흐린 색
                data-bar={n > 0 ? "" : "dim"}
                className={`w-7 max-w-[calc(100%-4px)] rounded-t-md ${n === 0 ? "bg-line" : isToday ? "bg-accent" : ""}`}
                style={
                  {
                    height: n > 0 ? `${(n / max) * 52}px` : "3px",
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

/** 운영 기사 목록 줄(NewsTitleList)과 같은 모양: 출처 줄 위, 글(네 줄까지), 오른쪽 사진 */
function ArticleRow({ article: a, playerPhotoUrl }: { article: LinkedArticle; playerPhotoUrl: string | null }) {
  const text = a.reason ?? a.titleKo ?? a.title;
  return (
    <Link href={`/news/${a.id}`} className="press-soft group flex items-center gap-3 py-3">
      {/* 화면 낭독기는 글부터 읽고, 눈에는 출처 줄이 위에 보인다. 출처 줄이 11rem보다 좁으면(큰 글씨) 보통 글처럼 흘린다(NewsTitleList와 같다).
          글은 크기와 상관없이 네 줄까지(위 설명). 예전에는 큰 글씨에서만 네 줄이었다 */}
      <span className="@container flex min-w-0 flex-1 flex-col-reverse">
        {/* 근거 한 줄·번역이 없는 영어 기사는 원제가 나와 화면 낭독기가 영어로 읽게 한다(NewsTitleList와 같다) */}
        <span lang={titleLang(text)} className="mt-0.5 line-clamp-4 text-summary group-hover:underline">
          <Highlighted text={text} word={a.reasonName} />
        </span>
        <span className="flex min-w-0 whitespace-nowrap text-caption text-muted tabular-nums @max-[11rem]:block @max-[11rem]:whitespace-normal">
          <span className="min-w-0 truncate @max-[11rem]:whitespace-normal">{a.publisher}</span>
          {/* 조각 사이 간격은 NewsTitleList와 같다(한 줄이면 왼쪽 여백, 흘리면 보통 공백이 간격·줄바꿈 자리) */}
          {/* 같은 글을 실은 다른 언론사 이름은 PC에서 마우스를 올리면 보이고(title), 화면 낭독기에는 읽어 준다(NewsTitleList와
              같다, 이슈 #277). relative: sr-only 글자(position: absolute)를 이 칸에 가둔다. 가두지 않으면 창(fixed)에 붙어
              스크롤 칸 밖에 놓여 창의 스크롤 범위를 늘릴 수 있다(기록 표 TableScroll과 같은 이유) */}
          {a.alsoBy.length > 0 && (
            <>
              {" "}
              <span
                className="relative shrink-0 whitespace-nowrap pl-[0.25em] @max-[11rem]:pl-0"
                title={`같은 기사: ${a.alsoBy.join(", ")}`}
              >
                {`외 ${a.alsoBy.length}곳`}
                <span className="sr-only">{`(같은 기사: ${a.alsoBy.join(", ")})`}</span>
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
