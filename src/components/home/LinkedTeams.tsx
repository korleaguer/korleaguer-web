"use client"; // 구단을 누르면 창을 열고, '외 n개 구단'에 마우스를 올리면 목록을 띄워야 해서 클라이언트 컴포넌트다.

import { useEffect, useId, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import type { LinkedTeams as LinkedTeamCounts } from "@/lib/api";
import { haptic } from "@/lib/app";
import { withTopicParticle } from "@/lib/format";
import TeamMark from "@/components/TeamMark";
import LinkedTeamSheet from "@/components/home/LinkedTeamSheet";
import { teamColor, teamLogoUrl } from "@/lib/teams";

/** 거론 구단 알약을 몇 개까지 보이나(나머지는 '외 n개 구단') */
const LINKED_SHOWN = 3;
/** 반대 전망 한 줄: 한 구단의 반대 전망이 이보다 많고 거론의 절반 이상일 때만 */
const DOUBT_MIN = 3;

type Team = LinkedTeamCounts["teams"][number];

/** 기사 목록이 있으면(새 api) 눌러서 창을 연다. 옛 api면 지금처럼 누를 수 없는 알약 */
const canOpen = (t: Team) => (t.articles?.length ?? 0) > 0;

/**
 * '행선지로 거론된 구단'(사용자 11-12 결정). 서버가 기사마다 AI로 고른 최근 며칠 거론을 센다.
 * 기획 판단(11-12): 알약의 숫자는 '이 선수의 행선지로 거론한 기사'만 센다. 반대 전망을 같은 칸에 숫자로 섞으면
 * "그래서 어디 간다는 거지?"가 된다. 다만 숫자를 꾸미지 않도록, 한 구단의 반대 전망이 DOUBT_MIN건 넘고 거론의 절반
 * 이상이면 아래 한 줄로만 알린다. 반대 기사도 아래 '관련 기사'에는 그대로 나온다. 거론된 구단이 없으면 칸을 그리지 않는다.
 * MLB 도전 카드(포스팅 선수)와 시즌 성적표의 FA 선수(이슈 #191)가 함께 쓴다.
 * pcBars면 PC(lg)에서는 알약 대신 한 구단 한 줄 막대로 보인다(MLB 도전 카드, 사용자 11-16: PC 왼쪽 칸이 비어 보인다).
 * 알약·막대 줄을 누르면 그 구단을 거론한 기사 창(LinkedTeamSheet, 사용자 11-16 시안 D)이 뜬다. '외 n개 구단'은 PC에서
 * 마우스를 올리면, 휴대폰·키보드는 누르면 나머지 구단 목록이 뜨고 거기서 구단을 누르면 같은 창이 뜬다(이슈 #238).
 */
export default function LinkedTeams({
  counts,
  className,
  pcBars = false,
  playerPhotoUrl = null,
}: {
  counts: LinkedTeamCounts;
  className?: string;
  /** PC(lg)에서 알약 대신 막대(휴대폰은 알약 그대로) */
  pcBars?: boolean;
  /** 창의 기사 사진이 없거나 안 뜨면 대신 보일 선수 사진 */
  playerPhotoUrl?: string | null;
}) {
  const [openTeam, setOpenTeam] = useState<string | null>(null);
  const linked = counts.teams.filter((t) => t.linked > 0);
  if (linked.length === 0) return null;
  const shown = linked.slice(0, LINKED_SHOWN);
  const rest = linked.slice(LINKED_SHOWN);
  const doubt = [...counts.teams]
    .filter((t) => t.doubted > DOUBT_MIN && t.doubted * 2 >= t.linked)
    .sort((a, b) => b.doubted - a.doubted)[0];
  // 막대 길이 기준: 보이는 구단 중 가장 많은 기사 수(서버가 많은 순으로 준다)
  const top = Math.max(...shown.map((t) => t.linked));
  const open = (t: Team) => {
    haptic("select");
    setOpenTeam(t.abbreviation);
  };
  const sheetTeam = linked.find((t) => t.abbreviation === openTeam && canOpen(t));
  return (
    <div className={className}>
      <p className="mb-2 flex items-baseline justify-between gap-2 text-label">
        <span>행선지로 거론된 구단</span>
        <span className="shrink-0 text-caption text-muted tabular-nums">최근 {counts.days}일 기사 수</span>
      </p>
      {pcBars && (
        <ul className="hidden space-y-1 lg:block">
          {shown.map((t) => {
            const row = (
              <>
                <TeamMark logoUrl={teamLogoUrl(t.abbreviation)} color={teamColor(t.abbreviation)} size="sm" />
                <span className="w-24 shrink-0 truncate">{t.nameKo}</span>
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  {/* 역대 계약 순위와 같은 잉크 막대(팀 색·파랑을 쓰지 않는다). 막대 뒤 글자 자리 140px를 남긴다 */}
                  <i
                    aria-hidden
                    className="ink-bar"
                    style={{ "--share": Math.max(0.04, t.linked / top).toFixed(4) } as CSSProperties}
                  />
                  <span className="shrink-0 font-bold tabular-nums">{t.linked}건</span>
                  {t.today && <span className="shrink-0 text-caption font-bold text-accent-ink">오늘 새 기사</span>}
                </span>
              </>
            );
            return (
              <li key={t.abbreviation}>
                {canOpen(t) ? (
                  <button
                    type="button"
                    aria-haspopup="dialog"
                    onClick={() => open(t)}
                    className="-mx-2 flex w-[calc(100%+1rem)] cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1 text-left text-label hover:bg-surface-2"
                  >
                    {row}
                    <Chevron />
                  </button>
                ) : (
                  <span className="flex items-center gap-2.5 py-1 text-label">{row}</span>
                )}
              </li>
            );
          })}
          {rest.length > 0 && (
            <li className="pl-7 pt-0.5">
              <MoreTeams teams={rest} onPick={open} />
            </li>
          )}
        </ul>
      )}
      <ul className={`flex flex-wrap items-center gap-1.5 ${pcBars ? "lg:hidden" : ""}`}>
        {shown.map((t) => {
          const body = (
            <>
              <TeamMark logoUrl={teamLogoUrl(t.abbreviation)} color={teamColor(t.abbreviation)} size="sm" />
              {t.nameKo}
              <span className="font-bold tabular-nums">{t.linked}건</span>
              {t.today && <span className="text-caption font-bold text-accent-ink">오늘 새 기사</span>}
            </>
          );
          return (
            <li key={t.abbreviation}>
              {canOpen(t) ? (
                <button
                  type="button"
                  aria-haspopup="dialog"
                  onClick={() => open(t)}
                  className="press inline-flex cursor-pointer items-center gap-1 rounded-full bg-surface-2 py-1 pl-1 pr-2 text-label"
                >
                  {body}
                  {/* 누를 수 있다는 표시. 작게 붙여 알약 폭이 거의 늘지 않게(늘면 휴대폰에서 알약 줄이 하나 더 생긴다) */}
                  <Chevron small />
                </button>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 py-1 pl-1.5 pr-3 text-label">
                  {body}
                </span>
              )}
            </li>
          );
        })}
        {rest.length > 0 && (
          <li className="px-1">
            <MoreTeams teams={rest} onPick={open} />
          </li>
        )}
      </ul>
      {doubt && (
        <p className="mt-2 text-caption text-muted tabular-nums">
          {withTopicParticle(doubt.nameKo)} &apos;필요 없다&apos;는 전망도 {doubt.doubted}건 있었어요
        </p>
      )}
      {sheetTeam && (
        <LinkedTeamSheet
          team={sheetTeam}
          days={counts.days}
          playerPhotoUrl={playerPhotoUrl}
          onClose={() => setOpenTeam(null)}
        />
      )}
    </div>
  );
}

function Chevron({ small = false }: { small?: boolean }) {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className={`shrink-0 text-muted ${small ? "size-2.5" : "size-3"}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3.5 10.5 8 6 12.5" />
    </svg>
  );
}

/** 마우스를 떼고 이만큼 지나면 닫는다(글자에서 목록으로 옮겨 가는 사이에 닫히지 않게) */
const HOVER_CLOSE_MS = 150;
/** 목록 폭(px, w-64) */
const LIST_WIDTH = 256;

/**
 * '외 n개 구단'. PC는 마우스를 올리면, 휴대폰·키보드는 누르면 나머지 구단 목록이 뜬다(사용자 11-16).
 * 마우스 올리기만으로 열면 터치 노트북·키보드로는 볼 수 없어서 누르기로도 연다. 바깥을 누르거나 Esc·스크롤로 닫는다.
 * 목록은 body에 고정 위치로 띄운다(성적표 카드는 overflow-hidden이라 카드 안에 두면 아래가 잘린다).
 */
function MoreTeams({ teams, onPick }: { teams: Team[]; onPick: (t: Team) => void }) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const open = pos != null;
  const boxRef = useRef<HTMLSpanElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<number | null>(null);
  /** 마우스를 올려서 열렸나(그 상태에서 누르면 닫지 않고 그대로 둔다) */
  const byHover = useRef(false);
  const listId = useId();

  const cancelClose = () => {
    if (closeTimer.current != null) window.clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };
  const show = (hover: boolean) => {
    cancelClose();
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    byHover.current = hover;
    // 화면 오른쪽을 넘으면 글자 오른쪽 끝에 맞춘다(휴대폰에서 알약 줄 끝에 있을 때)
    const left = rect.left + LIST_WIDTH > window.innerWidth - 16 ? Math.max(16, rect.right - LIST_WIDTH) : rect.left;
    setPos({ top: rect.bottom + 4, left });
  };
  const hide = () => {
    cancelClose();
    setPos(null);
  };
  const hideSoon = (e: ReactPointerEvent) => {
    if (e.pointerType !== "mouse" || !byHover.current) return;
    cancelClose();
    closeTimer.current = window.setTimeout(() => setPos(null), HOVER_CLOSE_MS);
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!boxRef.current?.contains(target) && !listRef.current?.contains(target)) setPos(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPos(null);
        buttonRef.current?.focus();
      }
    };
    const onScroll = () => setPos(null);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  useEffect(() => cancelClose, []);

  return (
    <span
      ref={boxRef}
      className="inline-block"
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse" && (!open || byHover.current)) show(true);
      }}
      onPointerLeave={hideSoon}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => {
          // 마우스를 올려 열린 목록을 누르면 닫지 않고 고정한다(누른 사람은 보려는 것이다)
          if (open && byHover.current) byHover.current = false;
          else if (open) hide();
          else show(false);
        }}
        className="cursor-pointer py-1 text-caption text-muted underline decoration-dotted underline-offset-2 tabular-nums hover:text-foreground"
      >
        외 {teams.length}개 구단
      </button>
      {pos &&
        createPortal(
          <div
            ref={listRef}
            id={listId}
            onPointerEnter={cancelClose}
            onPointerLeave={hideSoon}
            style={{ top: pos.top, left: pos.left, width: LIST_WIDTH }}
            className="fixed z-40 rounded-xl border border-line bg-surface p-1.5 text-foreground shadow-[var(--shadow-card-hover)]"
          >
            <ul>
              {teams.map((t) => {
                const row = (
                  <>
                    <TeamMark logoUrl={teamLogoUrl(t.abbreviation)} color={teamColor(t.abbreviation)} size="sm" />
                    <span className="min-w-0 flex-1 truncate">{t.nameKo}</span>
                    <span className="font-bold tabular-nums">{t.linked}건</span>
                    {t.today && <span className="text-caption font-bold text-accent-ink">오늘</span>}
                  </>
                );
                return (
                  <li key={t.abbreviation}>
                    {canOpen(t) ? (
                      <button
                        type="button"
                        aria-haspopup="dialog"
                        onClick={() => {
                          hide();
                          onPick(t);
                        }}
                        className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left text-label hover:bg-surface-2"
                      >
                        {row}
                        <Chevron />
                      </button>
                    ) : (
                      <span className="flex items-center gap-2 px-2 py-1.5 text-label">{row}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>,
          document.body,
        )}
    </span>
  );
}
