"use client"; // 구단을 누르면 창을 열고, '외 n개 구단'에 마우스를 올리면 목록을 띄워야 해서 클라이언트 컴포넌트다.

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent as ReactFocusEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import type { LinkedTeams as LinkedTeamCounts } from "@/lib/api";
import { haptic } from "@/lib/app";
import { withTopicParticle } from "@/lib/format";
import Chevron from "@/components/Chevron";
import TeamMark from "@/components/TeamMark";
import LinkedTeamSheet from "@/components/home/LinkedTeamSheet";
import { teamColor, teamLogoUrl } from "@/lib/teams";

/** 거론 구단 알약을 몇 개까지 보이나(나머지는 '외 n개 구단') */
const LINKED_SHOWN = 3;
/** 반대 전망 한 줄: 한 구단의 반대 전망이 이보다 많고 거론의 절반 이상일 때만 */
const DOUBT_MIN = 3;
/** 기사 창을 열며 쌓은 주소 기록 표시(history.state의 키). 값은 '<sheetKey>:<구단 약어>' */
const SHEET_STATE = "korleaguerTeamSheet";

type Team = LinkedTeamCounts["teams"][number];

/** 기사 목록이 있으면(새 api) 눌러서 창을 연다. 옛 api면 지금처럼 누를 수 없는 알약 */
const canOpen = (t: Team) => (t.articles?.length ?? 0) > 0;

/** 주소 기록 표시가 이 칸(sheetKey)의 것이면 그 구단 약어 */
function teamInHistory(state: unknown, sheetKey: string): string | null {
  const mark = (state as Record<string, unknown> | null)?.[SHEET_STATE];
  const prefix = `${sheetKey}:`;
  return typeof mark === "string" && mark.startsWith(prefix) ? mark.slice(prefix.length) : null;
}

/** 지금 화면에 그려진 요소인가(휴대폰 알약·PC 막대 중 숨긴 쪽 버튼은 아니다) */
function isShown(el: Element | null | undefined): el is HTMLElement {
  return el instanceof HTMLElement && el.isConnected && el.getClientRects().length > 0;
}

/**
 * '행선지로 거론된 구단'(사용자 11-12 결정). 서버가 기사마다 AI로 고른 최근 며칠 거론을 센다.
 * 기획 판단(11-12): 알약의 숫자는 '이 선수의 행선지로 거론한 기사'만 센다. 반대 전망을 같은 칸에 숫자로 섞으면
 * "그래서 어디 간다는 거지?"가 된다. 다만 숫자를 꾸미지 않도록, 한 구단의 반대 전망이 DOUBT_MIN건 넘고 거론의 절반
 * 이상이면 아래 한 줄로만 알린다. 반대 기사도 아래 '관련 기사'에는 그대로 나온다. 거론된 구단이 없으면 칸을 그리지 않는다.
 * MLB 도전 카드(포스팅 선수)와 시즌 성적표의 FA 선수(이슈 #191)가 함께 쓴다.
 * pcBars면 PC(lg)에서는 알약 대신 한 구단 한 줄 막대로 보인다(MLB 도전 카드, 사용자 11-16: PC 왼쪽 칸이 비어 보인다).
 * 알약·막대 줄을 누르면 그 구단을 거론한 기사 창(LinkedTeamSheet, 사용자 11-16 시안 D)이 뜬다. '외 n개 구단'은 PC에서
 * 마우스를 올리면, 휴대폰·키보드는 누르면 나머지 구단 목록이 뜨고 거기서 구단을 누르면 같은 창이 뜬다(이슈 #238).
 * 창은 경기 상세 창처럼 열 때 주소 기록을 하나 쌓아 뒤로 가기(안드로이드 뒤로 버튼 포함)로 닫히고, 닫으면 연 버튼으로
 * 포커스를 돌려준다(이슈 #248). 알약은 보이는 높이 32px, 누르는 영역 44px(.tap-target)이고 줄 사이를 12px 띄워 겹치지 않는다.
 */
export default function LinkedTeams({
  counts,
  sheetKey,
  className,
  pcBars = false,
  playerPhotoUrl = null,
}: {
  counts: LinkedTeamCounts;
  /**
   * 이 칸의 이름(한 페이지에서 겹치지 않게, 예: 선수 번호). 기사 창을 열 때 주소 기록에 남긴다:
   * 뒤로 가기로 창이 닫히고, 창에서 기사로 갔다가 돌아오면 그 창이 다시 열린다
   */
  sheetKey: string;
  className?: string;
  /** PC(lg)에서 알약 대신 막대(휴대폰은 알약 그대로) */
  pcBars?: boolean;
  /** 창의 기사 사진이 없거나 안 뜨면 대신 보일 선수 사진 */
  playerPhotoUrl?: string | null;
}) {
  const [openTeam, setOpenTeam] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  /** 창을 닫으면 포커스를 돌려줄 버튼: 연 버튼('외 n개 구단' 목록에서 열었으면 '외 n개 구단') */
  const returnRef = useRef<HTMLElement | null>(null);
  /** 열려 있던 구단(창이 닫힌 뒤 포커스를 돌려줄 때 쓴다) */
  const shownRef = useRef<string | null>(null);
  /**
   * 지금 주소 기록이 창을 열며 쌓은 것인가. history.state의 표시만 보면 안 된다: 앱이 화면으로 돌아올 때 부르는
   * router.refresh()가 Next 16에서 우리 표시를 지워서(이슈 #256), 그 뒤 닫으면 쌓은 기록이 빈 채로 남았다
   */
  const ownsEntryRef = useRef(false);

  // 뒤로·앞으로 가기: 주소 기록의 표시에 맞춰 창을 열고 닫는다(경기 상세 창과 같은 방식).
  // 창에서 기사로 갔다가 돌아오면 그 기록 위라서 창이 다시 열린다
  useEffect(() => {
    const sync = () => {
      const team = teamInHistory(window.history.state, sheetKey);
      ownsEntryRef.current = team !== null;
      setOpenTeam(team);
    };
    sync();
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener("popstate", sync);
      // 다른 화면으로 가며 이 칸이 지워지거나 숨겨지면(Next는 떠난 화면을 숨겨 두었다가 되살린다) 창을 닫아 둔다.
      // 뒤로 가기로 돌아오면 위 sync가 기록대로 다시 연다. 이때 닫히는 창은 포커스를 돌려주지 않는다
      // ('홈' 메뉴로 돌아왔는데 창이 깜빡이거나 페이지가 알약 쪽으로 스크롤되지 않게, 이슈 #256)
      shownRef.current = null;
      returnRef.current = null;
      setOpenTeam(null);
    };
  }, [sheetKey]);

  // 앱이 화면으로 돌아올 때 부르는 router.refresh()는 지금 기록에서 우리 표시를 지운다. 창이 열린 채 우리가 쌓은 기록이면
  // 표시를 다시 붙인다(기사로 갔다가 뒤로 와도 창이 다시 열리게, 이슈 #256). refresh 뒤에는 새 counts로 다시 그려져 이 효과가 돈다
  useEffect(() => {
    if (!openTeam || !ownsEntryRef.current) return;
    const state = window.history.state;
    if (teamInHistory(state, sheetKey) === openTeam) return;
    window.history.replaceState({ ...state, [SHEET_STATE]: `${sheetKey}:${openTeam}` }, "");
  });

  // 창이 닫히면 연 버튼으로 포커스를 돌려준다(WAI-ARIA APG Dialog). 창은 부품째 지워지며 닫혀서 브라우저가 돌려주지 못한다.
  // 연 버튼이 없으면(돌아와서 다시 열린 창) 그 구단 알약, 그것도 없으면(목록 안 구단) '외 n개 구단'으로
  useEffect(() => {
    if (openTeam) {
      shownRef.current = openTeam;
      return;
    }
    const team = shownRef.current;
    if (!team) return;
    shownRef.current = null;
    const back = returnRef.current;
    returnRef.current = null;
    // 창이 지워지며 포커스를 잃었을 때만(body). 다른 화면에서 '홈' 메뉴로 돌아와 숨겨 둔 홈이 되살아나며 닫힌 경우처럼
    // 포커스가 이미 다른 곳(메뉴 링크)에 있으면 빼앗지 않는다(빼앗으면 페이지가 알약 쪽으로 스크롤된다)
    const focused = document.activeElement;
    if (focused && focused !== document.body) return;
    const all = (selector: string) => [...(rootRef.current?.querySelectorAll<HTMLElement>(selector) ?? [])];
    [back, ...all(`[data-team="${CSS.escape(team)}"]`), ...all("[data-more-teams]")].find(isShown)?.focus();
  }, [openTeam]);

  const linked = counts.teams.filter((t) => t.linked > 0);
  if (linked.length === 0) return null;
  const shown = linked.slice(0, LINKED_SHOWN);
  const rest = linked.slice(LINKED_SHOWN);
  const doubt = [...counts.teams]
    .filter((t) => t.doubted > DOUBT_MIN && t.doubted * 2 >= t.linked)
    .sort((a, b) => b.doubted - a.doubted)[0];
  // 막대 길이 기준: 보이는 구단 중 가장 많은 기사 수(서버가 많은 순으로 준다)
  const top = Math.max(...shown.map((t) => t.linked));
  const open = (t: Team, from: HTMLElement | null) => {
    haptic("select");
    returnRef.current = from;
    const mark = `${sheetKey}:${t.abbreviation}`;
    // 창 하나에 주소 기록 하나(이미 창 기록 위면 바꿔 쓴다). 주소는 그대로이고, Next가 우리 상태에 자기 상태를 덧붙인다
    const state = window.history.state;
    if (state?.[SHEET_STATE]) window.history.replaceState({ ...state, [SHEET_STATE]: mark }, "");
    else window.history.pushState({ [SHEET_STATE]: mark }, "");
    ownsEntryRef.current = true;
    setOpenTeam(t.abbreviation);
  };
  // 닫기·바깥 누르기·Esc·끌어 내리기: 쌓은 기록이면 뒤로 가기로 지우고(popstate가 창을 닫는다), 아니면 바로 닫는다
  const close = () => {
    if (ownsEntryRef.current) window.history.back();
    else setOpenTeam(null);
  };
  const sheetTeam = linked.find((t) => t.abbreviation === openTeam && canOpen(t));
  return (
    <div ref={rootRef} className={className}>
      {/* 큰 글씨에서 둘이 한 줄에 못 들어가면 '최근 n일 기사 수'를 다음 줄로(제목이 세 줄로 찌그러지지 않게, 이슈 #264).
          '행선지로 거론된 구단'은 카드 안 작은 제목이라 h4다(선수 이름 h3 아래, '관련 기사'와 같다, 이슈 #277).
          h4는 글꼴을 물려받기만 해서 글자는 바깥 text-label 그대로다 */}
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-2 text-label">
        <h4>행선지로 거론된 구단</h4>
        <span className="shrink-0 text-caption text-muted tabular-nums">최근 {counts.days}일 기사 수</span>
      </div>
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
                    data-team={t.abbreviation}
                    onClick={(e) => open(t, e.currentTarget)}
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
      {/* 알약 32px(2rem)에 누르는 영역 44px: 줄 사이를 알약 높이와 합쳐 44px 이상으로 띄워 넓힌 영역끼리 겹치지 않는다.
          앱에서 글자를 작게 하면 알약이 줄어드니 줄 사이를 max(12px 상당, 44px − 알약 높이)로 */}
      <ul className={`flex flex-wrap items-center gap-x-1.5 gap-y-[max(0.75rem,calc(44px-2rem))] ${pcBars ? "lg:hidden" : ""}`}>
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
                  data-team={t.abbreviation}
                  onClick={(e) => open(t, e.currentTarget)}
                  className="press tap-target inline-flex cursor-pointer items-center gap-1 rounded-full bg-surface-2 py-1.5 pl-1 pr-2 text-label"
                >
                  {body}
                  {/* 누를 수 있다는 표시. 작게 붙여 알약 폭이 거의 늘지 않게(늘면 휴대폰에서 알약 줄이 하나 더 생긴다) */}
                  <Chevron small />
                </button>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 py-1.5 pl-1.5 pr-3 text-label">
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
        <LinkedTeamSheet team={sheetTeam} days={counts.days} playerPhotoUrl={playerPhotoUrl} onClose={close} />
      )}
    </div>
  );
}

/** 마우스를 떼고 이만큼 지나면 닫는다(글자에서 목록으로 옮겨 가는 사이에 닫히지 않게) */
const HOVER_CLOSE_MS = 150;
/**
 * 목록 폭: 보통 크기 256px(16rem). 큰 글씨면 글자를 따라 넓히되 화면 폭 - 32px까지.
 * px로 고정해 두면 앱 2배에서 구단 이름이 'LA …'·'세인…'으로 잘렸다(이슈 #264)
 */
function listWidth(): number {
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  return Math.min(16 * rem, window.innerWidth - 32);
}
/** 목록 한 줄 높이(min-h: max(2.75rem, 44px))와 위아래 여백·테두리(p-1.5 + border). 앱 글자 배율을 따라 rem이 바뀐다 */
function listHeight(rows: number): number {
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  return rows * Math.max(2.75 * rem, 44) + 0.75 * rem + 2;
}
/** iOS 앱 아래 탭 막대(웹 위에 떠 있다, 84px)와 홈 표시줄 */
const IOS_TAB_BAR = 84 + 34;

/** 브라우저가 popover(맨 위 층)를 아는가. 모르는 옛 브라우저(iOS 16 이하 등)는 예전처럼 body 끝에 띄운다 */
function supportsPopover(): boolean {
  return typeof HTMLElement !== "undefined" && "showPopover" in HTMLElement.prototype;
}

/** 목록을 띄울 수 있는 세로 자리: 앱의 위에 붙은 사이트 머리글 아래부터 iOS 앱 아래 탭 막대 위까지 */
function openBand(): { top: number; bottom: number } {
  const header = document.querySelector<HTMLElement>("[data-site-header]");
  const sticky = header && getComputedStyle(header).position === "sticky";
  const top = sticky ? Math.max(0, header.getBoundingClientRect().bottom) : 0;
  const bottom = window.innerHeight - (document.querySelector('[data-app="ios"]') ? IOS_TAB_BAR : 0);
  return { top, bottom };
}

/**
 * 목록 자리. 버튼 바로 아래에 열고, 아래 자리가 모자라고 위가 더 넉넉하면 위로 연다(Material 3 Menus, 이슈 #256).
 * 화면 오른쪽을 넘으면 버튼 오른쪽 끝에 맞춘다(휴대폰에서 알약 줄 끝에 있을 때).
 * shown: 버튼이 머리글 밑이나 화면 밖으로 나가 안 보이면 false(그때는 목록을 닫는다)
 */
function placeList(
  button: HTMLElement | null,
  rows: number,
): { top: number; left: number; width: number; shown: boolean } | null {
  const rect = button?.getBoundingClientRect();
  if (!rect) return null;
  const width = listWidth();
  const left = rect.left + width > window.innerWidth - 16 ? Math.max(16, rect.right - width) : rect.left;
  const band = openBand();
  const height = listHeight(rows);
  const below = band.bottom - 8 - (rect.bottom + 4);
  const above = rect.top - 4 - (band.top + 8);
  const top = below < height && above > below ? Math.max(band.top + 8, rect.top - 4 - height) : rect.bottom + 4;
  return { top, left, width, shown: rect.bottom > band.top && rect.top < band.bottom };
}

/**
 * '외 n개 구단'. PC는 마우스를 올리면, 휴대폰·키보드는 누르면 나머지 구단 목록이 뜬다(사용자 11-16).
 * 마우스 올리기만으로 열면 터치 노트북·키보드로는 볼 수 없어서 누르기로도 연다. 눌러서 열면 첫 구단으로 포커스를 옮긴다.
 * 바깥을 누르거나 Esc를 누르거나 포커스가 버튼·목록 밖으로 나가면 닫는다. 스크롤하면 닫지 않고 버튼을 따라간다
 * (포커스를 옮기다 화면이 조금 움직여도 열린 채로).
 * 목록은 DOM에서 버튼 바로 뒤에 두고 popover로 맨 위 층에 띄운다(이슈 #248): Tab·화면 낭독기 순서가 버튼 다음이 되고
 * (WAI-ARIA APG Disclosure), 성적표 카드(overflow-hidden)에 잘리거나 다음 카드에 가리지 않는다.
 */
function MoreTeams({ teams, onPick }: { teams: Team[]; onPick: (t: Team, from: HTMLElement | null) => void }) {
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const open = pos != null;
  const boxRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<number | null>(null);
  /** 마우스를 올려서 열렸나(그 상태에서 누르면 닫지 않고 그대로 둔다) */
  const byHover = useRef(false);
  /** 눌러서 열었나(목록이 뜨면 첫 구단으로 포커스를 옮긴다) */
  const focusFirst = useRef(false);
  const listId = useId();

  const cancelClose = () => {
    if (closeTimer.current != null) window.clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };
  const show = (hover: boolean) => {
    cancelClose();
    const next = placeList(buttonRef.current, teams.length);
    if (!next) return;
    byHover.current = hover;
    focusFirst.current = !hover;
    setPos({ top: next.top, left: next.left, width: next.width });
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
  // 포커스가 버튼·목록 밖으로 나가면 닫는다(Tab으로 목록을 지나가면 닫힘). 브라우저 창 밖으로 나간 것(relatedTarget 없음)은 그대로
  const onBlur = (e: ReactFocusEvent) => {
    const next = e.relatedTarget;
    if (!open || !(next instanceof Node)) return;
    if (boxRef.current?.contains(next) || listRef.current?.contains(next)) return;
    hide();
  };

  // 목록이 그려지면 맨 위 층에 올리고, 눌러서 열었으면 첫 구단으로 포커스를 옮긴다
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!open || !list) return;
    if (supportsPopover() && !list.matches(":popover-open")) list.showPopover();
    if (focusFirst.current) {
      focusFirst.current = false;
      list.querySelector<HTMLElement>("button")?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!boxRef.current?.contains(target) && !listRef.current?.contains(target)) setPos(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // 목록·버튼에 있던 포커스는 버튼으로 돌려준다(마우스로 열어 둔 목록을 다른 곳에서 Esc로 닫으면 닫기만)
      const focused = document.activeElement;
      const inside = boxRef.current?.contains(focused) || listRef.current?.contains(focused);
      setPos(null);
      if (inside) buttonRef.current?.focus();
    };
    // 스크롤·창 크기 바꾸기: 닫지 않고 버튼을 따라간다(한 프레임에 한 번). 가로로 밀리는 칸 안 스크롤도 잡게 capture.
    // 버튼이 머리글 밑이나 화면 밖으로 나가면 닫는다(맨 위 층 목록이 앱 머리글을 덮지 않게, 이슈 #256)
    let frame = 0;
    const follow = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const next = placeList(buttonRef.current, teams.length);
        if (!next) return;
        if (!next.shown) {
          const focused = document.activeElement;
          const inside = boxRef.current?.contains(focused) || listRef.current?.contains(focused);
          setPos(null);
          // 스크롤하던 페이지가 버튼 쪽으로 되돌아가지 않게
          if (inside) buttonRef.current?.focus({ preventScroll: true });
          return;
        }
        // 버튼이 움직였거나 폭이 바뀌었을 때만 다시 그린다
        setPos((prev) =>
          prev && prev.top === next.top && prev.left === next.left && prev.width === next.width
            ? prev
            : { top: next.top, left: next.left, width: next.width },
        );
      });
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", follow, { capture: true, passive: true });
    window.addEventListener("resize", follow);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", follow, { capture: true });
      window.removeEventListener("resize", follow);
      cancelAnimationFrame(frame);
      // 다른 화면으로 가며 숨겨지거나 지워지면 목록을 닫아 둔다(숨겨 둔 홈이 되살아날 때 옛 자리에 다시 뜨지 않게)
      setPos(null);
    };
  }, [open, teams.length]);

  useEffect(() => cancelClose, []);

  const list = pos && (
    <div
      ref={listRef}
      id={listId}
      popover={supportsPopover() ? "manual" : undefined}
      onPointerEnter={cancelClose}
      onPointerLeave={hideSoon}
      // 목록 빈 곳을 눌러도 뒤 카드(card-link)가 눌린 듯 줄지 않게
      data-no-press
      style={{ top: pos.top, left: pos.left, width: pos.width }}
      // popover 기본 모양(가운데 놓기·여백·테두리)을 지우고 버튼 아래 고정 자리에 둔다. z-40은 popover를 모르는 옛 브라우저용
      // (맨 위 층은 z-index와 상관없이 맨 위다)
      className="fixed inset-auto z-40 m-0 rounded-xl border border-line bg-surface p-1.5 text-foreground shadow-[var(--shadow-card-hover)]"
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
                    // 목록은 닫히니 창을 닫으면 '외 n개 구단'으로 돌아온다
                    onPick(t, buttonRef.current);
                  }}
                  className="flex min-h-[max(2.75rem,44px)] w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left text-label hover:bg-surface-2"
                >
                  {row}
                  <Chevron />
                </button>
              ) : (
                <span className="flex min-h-[max(2.75rem,44px)] items-center gap-2 px-2 py-1.5 text-label">{row}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );

  return (
    <div
      ref={boxRef}
      className="inline-block"
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse" && (!open || byHover.current)) show(true);
      }}
      onPointerLeave={hideSoon}
      onBlur={onBlur}
    >
      <button
        ref={buttonRef}
        type="button"
        data-more-teams
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => {
          // 마우스를 올려 열린 목록을 누르면 닫지 않고 고정한다(누른 사람은 보려는 것이다)
          if (open && byHover.current) byHover.current = false;
          else if (open) hide();
          else show(false);
        }}
        className="tap-target inline-flex min-h-8 cursor-pointer items-center text-caption text-muted underline decoration-dotted underline-offset-2 tabular-nums hover:text-foreground"
      >
        외 {teams.length}개 구단
      </button>
      {list && (supportsPopover() ? list : createPortal(list, document.body))}
    </div>
  );
}
