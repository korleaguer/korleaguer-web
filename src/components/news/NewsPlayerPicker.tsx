"use client"; // 누른 칸에 '받는 중' 점을 보이고, 고른 칸이 가로 목록 밖이면 보이는 곳으로 옮겨야 해서 클라이언트 컴포넌트다.

import Link, { useLinkStatus } from "next/link";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { NewsListPlayer } from "@/lib/api";
import { haptic, useInApp } from "@/lib/app";
import { newsHref } from "@/lib/news";
import { revealInRow } from "@/lib/scroll";
import LoadingDots from "@/components/LoadingDots";
import PlayerAvatar from "@/components/PlayerAvatar";
import KboAvatar from "@/components/KboAvatar";
import StarIcon from "@/components/StarIcon";

/**
 * 뉴스 탭의 선수 고르기: '전체'와 기사가 있는 선수(사진 + 이름). 휴대폰은 위에 가로로 한 줄(넘치면 옆으로 밀어 본다),
 * PC(lg)는 왼쪽 칸에 세로 목록으로 둔다. 고른 칸은 연파랑(위 메뉴의 현재 칸과 같은 색).
 * 거르기는 주소(?player=)로 한다. 브라우저에서는 고를 때마다 기록을 쌓아 '뒤로'가 앞에 고른 선수로 돌아간다(쌓지 않으면 뉴스 탭
 * 밖으로 나갔다). 앱 안에서는 쌓지 않는다(replace): 앱의 뒤로 버튼·안드로이드 뒤로 키가 알약을 한 칸씩 되돌리지 않고 앞 화면으로 간다.
 * 순서는 부르는 쪽이 정한다(★내 선수 → 새 기사 있는 선수 → 나머지, 이슈 #210). 단 이 화면에 머무는 동안은 처음 순서를 지킨다. 내 선수는 ★, 지난번에 본 뒤 새 기사가
 * 있는 선수는 사진 오른쪽 위에 파란 점(고른 칸은 지금 보고 있으니 점을 두지 않는다).
 */
export default function NewsPlayerPicker({
  players,
  teams = {},
  selected,
  mine = [],
  fresh = [],
  query = null,
}: {
  players: NewsListPlayer[];
  /** 명단 선수 번호 → 팀 약어(사진 원 바탕 팀 색). 없으면 회색 원 */
  teams?: Record<number, string | null>;
  selected: string | null;
  /** 지금 검색어. 선수를 바꿔도 그대로 찾는다 */
  query?: string | null;
  /** 내 선수(★)로 고른 선수 이름 */
  mine?: readonly string[];
  /** 지난번에 본 뒤 새 기사가 있는 선수 이름 */
  fresh?: readonly string[];
}) {
  const listRef = useRef<HTMLUListElement>(null);
  const inApp = useInApp();
  // 뉴스 탭에 머무는 동안은 처음 순서를 지킨다. 새 기사가 있는 선수를 보면 그 선수는 '새 기사' 묶음에서 빠지는데,
  // 그때마다 다시 세우면 알약이 한 칸씩 당겨져 누르려던 자리에 다른 선수가 온다. 점·별은 바로 바뀐다
  const [firstOrder] = useState(() => players.map((p) => p.nameKo));
  const rank = (name: string) => {
    const i = firstOrder.indexOf(name);
    return i < 0 ? firstOrder.length : i;
  };
  const ordered = [...players].sort((a, b) => rank(a.nameKo) - rank(b.nameKo));

  // 휴대폰 가로 목록: 고른 선수가 화면 밖(오른쪽 끝)이면 가운데쯤으로 옮긴다. 세로 쪽(페이지)은 건드리지 않는다
  useLayoutEffect(() => {
    const list = listRef.current;
    const chip = list?.querySelector<HTMLElement>('[aria-current="page"]');
    if (list && chip) revealInRow(list, chip, "center");
  }, [selected]);

  return (
    <nav aria-label="선수 고르기" className="min-w-0">
      <ul
        ref={listRef}
        // 휴대폰: 화면 양끝까지 밀어 볼 수 있게 main의 좌우 여백만큼 넓힌다. 스크롤 막대는 숨긴다
        className="no-scrollbar -mx-3 flex gap-2 overflow-x-auto overflow-y-hidden px-3 py-[max(0.25rem,calc(22px-1.25rem))] sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0 lg:py-0"
      >
        <li className="shrink-0">
          <Chip href={newsHref(null, query)} current={selected === null} replace={inApp}>
            <span className={`bold-reserve px-1.5 lg:px-0 ${selected === null ? "font-extrabold" : ""}`} data-text="전체">
              전체
            </span>
          </Chip>
        </li>
        {ordered.map((p) => {
          const current = selected === p.nameKo;
          const dot = !current && fresh.includes(p.nameKo);
          const star = mine.includes(p.nameKo);
          return (
            <li key={p.nameKo} className="shrink-0">
              <Chip href={newsHref(p.nameKo, query)} current={current} replace={inApp}>
                <span className="relative inline-flex shrink-0">
                  {p.posting ? (
                    <KboAvatar nameKo={p.nameKo} photoUrl={p.photoUrl} size={24} />
                  ) : (
                    <PlayerAvatar nameKo={p.nameKo} photoUrl={p.photoUrl} teamAbbr={p.playerId === null ? null : (teams[p.playerId] ?? null)} size={24} />
                  )}
                  {dot && (
                    <span
                      aria-hidden
                      className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-accent ring-2 ring-surface"
                    />
                  )}
                </span>
                {/* 고른 선수는 이름도 굵게(색만으로 구분하지 않게, 이슈 #260) */}
                <span className={`bold-reserve ${current ? "font-extrabold" : ""}`} data-text={p.nameKo}>
                  {p.nameKo}
                </span>
                {/* 내 선수 별: 선수 화면 '내 선수에 넣기'와 같은 별(채운 모양, 진한 파랑). 사진과 이름은 붙여 두고
                    별은 이름 끝에 둔다(사용자 11-15 시안 A: 사이에 끼면 사진과 이름이 떨어져 보였다) */}
                {star && <StarIcon filled className="-ml-0.5 size-3.5 shrink-0 text-accent-ink" />}
                {/* 점·별은 그림이라 화면 낭독기에는 글로 */}
                {(star || dot) && <span className="sr-only">{[star && "내 선수", dot && "새 기사 있음"].filter(Boolean).join(", ")}</span>}
              </Chip>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function Chip({
  href,
  current,
  replace,
  children,
}: {
  href: string;
  current: boolean;
  /** 기록을 쌓지 않고 바꿔치기(앱 안) */
  replace: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      replace={replace}
      aria-current={current ? "page" : undefined}
      onClick={() => {
        if (!current) haptic("select");
      }}
      className={`press tap-target flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-full py-1.5 pl-1.5 pr-3 text-button lg:w-full lg:rounded-xl lg:px-3 lg:py-2 ${
        current
          ? "bg-accent-soft text-accent-ink"
          : "bg-surface text-foreground shadow-[0_0_0_1px_var(--line)] hover:bg-surface-2 lg:bg-transparent lg:shadow-none"
      }`}
    >
      <Pending>{children}</Pending>
    </Link>
  );
}

/** 이 칸의 화면을 받는 동안 점 3개(Link 안에서만 쓸 수 있다) */
function Pending({ children }: { children: ReactNode }) {
  const { pending } = useLinkStatus();
  return (
    <>
      <LoadingDots loading={pending}>
        <span className="flex items-center gap-1.5">{children}</span>
      </LoadingDots>
      {pending && <span className="sr-only"> 불러오는 중</span>}
    </>
  );
}
