"use client"; // 입력하는 대로 주소를 바꾸고, 돋보기로 입력칸을 열고 닫아야 해서 클라이언트 컴포넌트다.

import Link, { useLinkStatus } from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { flushSync } from "react-dom";
import type { NewsTopic } from "@/lib/api";
import { haptic } from "@/lib/app";
import { NEWS_QUERY_MAX, newsHref } from "@/lib/news";
import LoadingDots from "@/components/LoadingDots";

/** 입력을 멈추고 이만큼 지나면 찾는다(글자마다 서버에 묻지 않게) */
const TYPING_PAUSE_MS = 350;

/**
 * 뉴스 탭의 '자주 나온 말' 줄과 검색(이슈 #214·#219). 제목(영어 기사는 한국어 제목)에 그 말이 있는 기사만 보인다(주소 ?q=,
 * 고른 선수 안에서). 요약은 찾지 않는다: 목록에 제목만 보여 요약에만 있는 기사는 왜 나왔는지 알 수 없었다(이슈 #217).
 * - 휴대폰: 검색창 대신 자주 나온 말 알약 줄(가로로 밀어 본다). 이 탭은 새 소식을 훑으러 오고 글자를 쳐서 찾는 일은 드물어,
 *   키보드 없이 눌러 보게 했다(사용자 11-15 시안 C). 누르면 그 말로 거르고 파랗게 켜지며, 켜진 알약을 다시 누르면 끈다.
 *   줄 맨 앞 돋보기를 누르면 입력칸이 열린다. 취소는 열기 전 상태로 돌린다. 직접 친 말(알약에 없는 말)은 줄 맨 앞에 켜진 알약으로
 *   남아 무엇으로 걸렀는지 늘 보인다. 보일 알약이 없으면(말이 적은 선수) 입력칸만 보인다.
 * - PC: 입력칸은 늘 보이고 그 밑에 알약을 늘 보인다(자리가 넉넉하다).
 * - 입력하다 잠깐 멈추면 바로 찾고, 검색 키(엔터)를 누르면 곧바로 찾으면서 키보드를 내린다. 기록은 쌓지 않는다(replace).
 * - 알약의 말은 api가 지금 범위의 최근 기사에서 고르고, 숫자는 누르면 나오는 줄 수다(기사 전체, korleaguer-server#167).
 */
export default function NewsSearch({
  player,
  query,
  topics,
}: {
  /** 거른 선수(전체면 null). 그 선수 기사 안에서 찾는다 */
  player: string | null;
  /** 지금 주소의 검색어 */
  query: string | null;
  /** 지금 범위의 자주 나온 말(첫 쪽이면 검색어가 있어도 온다, korleaguer-server#165) */
  topics: NewsTopic[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [value, setValue] = useState(query ?? "");
  const [focused, setFocused] = useState(false);
  const [pending, startTransition] = useTransition();
  // 휴대폰에서 돋보기로 입력칸을 연 상태(PC는 입력칸이 늘 보여 쓰지 않는다)와, 열 때의 검색어(취소하면 여기로 돌린다)
  const [open, setOpen] = useState(false);
  const openedWith = useRef<string | null>(null);

  // 주소의 검색어가 밖에서 바뀌면(알약, 뒤로 가기, 선수 바꾸기) 입력칸도 맞춘다. 입력하는 중에는 건드리지 않는다
  const [shownQuery, setShownQuery] = useState(query);
  if (query !== shownQuery) {
    setShownQuery(query);
    if (!focused) setValue(query ?? "");
  }
  // 옛 api는 검색어가 있으면 자주 나온 말을 주지 않았다. 알약을 눌러도 줄이 남게 마지막으로 받은 것을 기억한다(선수가 바뀌면 새로)
  const [saved, setSaved] = useState({ player, topics });
  if (saved.player !== player || (topics.length > 0 && saved.topics !== topics)) setSaved({ player, topics });
  const shownTopics = saved.player === player ? saved.topics : topics;

  // 마지막으로 찾으라고 한 검색어. 주소(query)는 결과가 와야 바뀌어서, 그 사이에 지우거나 고친 것을 견줄 때 이 값을 본다
  // (주소만 보면 'a'를 치고 결과 전에 지울 때 '이미 빈 칸'으로 보고 찾지 않아, 입력칸은 비었는데 목록은 'a'로 남았다)
  const requested = useRef(query);
  useEffect(() => {
    requested.current = query;
  }, [query]);

  // 선수를 바꾸면(또는 화면을 떠나면) 기다리던 검색을 버린다. 옛 선수로 찾아 방금 고른 선수를 덮지 않게
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [player],
  );

  function go(next: string | null) {
    if (timer.current) clearTimeout(timer.current);
    const q = next?.trim() || null;
    if (q === requested.current) return;
    requested.current = q;
    startTransition(() => router.replace(newsHref(player, q), { scroll: false }));
  }

  function onChange(next: string) {
    setValue(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => go(next), TYPING_PAUSE_MS);
  }

  /** 돋보기: 입력칸을 열고 바로 입력(키보드). iOS는 누른 순간에 포커스해야 키보드가 올라와서 먼저 화면에 그린 뒤 포커스한다 */
  function openInput() {
    haptic("select");
    openedWith.current = query;
    flushSync(() => setOpen(true));
    inputRef.current?.focus();
  }

  /** 취소: 입력칸을 닫고 열기 전 검색어로 돌린다(그 사이 친 말은 버린다) */
  function cancel() {
    const back = openedWith.current;
    setOpen(false);
    setValue(back ?? "");
    go(back);
    inputRef.current?.blur();
  }

  function pick(word: string) {
    haptic("select");
    setValue(word);
    go(word);
    setOpen(false);
    inputRef.current?.blur();
  }

  // 지금 검색어가 알약의 말이면 그 알약을 켠다(대소문자 상관없이). 아니면 직접 친 말이라 줄 맨 앞에 켜진 알약으로 보인다
  const selected = query === null ? null : (shownTopics.find((t) => t.word.toLowerCase() === query.toLowerCase())?.word ?? null);
  const typed = query !== null && selected === null ? query : null;
  const hasRow = shownTopics.length > 0 || query !== null;
  // 휴대폰에서 입력칸을 보일 때: 돋보기로 열었거나, 줄에 보일 것이 없을 때
  const inputOnPhone = open || !hasRow;
  // 휴대폰에서 연 입력칸이 비어 있으면 그 밑에 자주 나온 말(누르면 그 말로 찾고 줄로 돌아간다). PC는 줄이 늘 보인다
  const showTopicsUnderInput = open && focused && value.trim() === "" && shownTopics.length > 0;
  const placeholder = player ? `${player} 기사에서 찾기` : "기사 제목으로 찾기";

  return (
    <div>
      <div className={inputOnPhone ? "flex items-center gap-1" : "hidden lg:flex"}>
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            go(value);
            setOpen(false);
            inputRef.current?.blur();
          }}
          className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-xl bg-surface px-3 shadow-[0_0_0_1px_var(--line)] focus-within:shadow-[0_0_0_2px_var(--accent)]"
        >
          <SearchIcon className="size-4 shrink-0 text-muted" />
          <input
            ref={inputRef}
            type="search"
            enterKeyHint="search"
            aria-label={player ? `${player} 기사 검색` : "기사 검색"}
            placeholder={placeholder}
            maxLength={NEWS_QUERY_MAX}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              setFocused(false);
              // 돋보기로 연 입력칸에서 다른 곳을 누르면, 친 말이 이미 찾은 말과 같을 때(새로 찾을 것이 없을 때) 도로 줄로.
              // 지운 경우(빈 칸)도 닫혀 빈 입력칸이 남지 않고, 찾은 말은 줄 맨 앞 알약으로 보인다
              if (open && value.trim() === (requested.current ?? "")) setOpen(false);
            }}
            // 손가락 기기에서는 글자를 16px 아래로 두지 않는다: 아이폰은 16px보다 작은 입력칸을 누르면 화면을 저절로 키운다
            // (사파리는 원래 그랬고, 앱도 손가락 확대를 풀어 같아졌다, 이슈 #264)
            className="min-w-0 flex-1 self-stretch bg-transparent text-body outline-none placeholder:text-muted pointer-coarse:text-[length:max(16px,0.9375rem)] [&::-webkit-search-cancel-button]:hidden"
          />
          {/* 찾는 동안 점 3개(결과가 오면 사라진다) */}
          {pending && (
            <span aria-hidden className="loading-dots shrink-0 text-muted">
              <span />
              <span />
              <span />
            </span>
          )}
          {value !== "" && (
            <button
              type="button"
              aria-label="검색어 지우기"
              // 누르는 동안 입력칸이 포커스를 잃지 않게(지운 뒤 바로 다시 입력하거나 알약을 고를 수 있게)
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => {
                setValue("");
                go("");
                inputRef.current?.focus();
              }}
              className="press tap-target -mr-1.5 grid size-8 shrink-0 cursor-pointer place-items-center rounded-full text-muted hover:bg-surface-2"
            >
              <ClearIcon className="size-4" />
            </button>
          )}
        </form>
        {open && (
          <button
            type="button"
            // 누르는 순간 입력칸이 포커스를 잃어 버튼이 사라지기 전에 누르게 한다(닫기는 cancel이 한다)
            onPointerDown={(e) => e.preventDefault()}
            onClick={cancel}
            className="press tap-target shrink-0 cursor-pointer px-2 text-button text-accent-ink lg:hidden"
          >
            취소
          </button>
        )}
      </div>
      {showTopicsUnderInput && (
        <div className="mt-2.5 px-1 lg:hidden">
          <p className="text-caption text-muted">{player ? `${player} 기사에 자주 나온 말` : "요즘 기사에 자주 나온 말"}</p>
          {/* 여러 줄로 감기면 넓힌 누름 영역(44px)이 줄 사이에서 겹치지 않게 줄 사이를 max(12px 상당, 44px − 알약 높이)로 */}
          <ul className="mt-1.5 flex flex-wrap gap-x-1.5 gap-y-[max(0.75rem,calc(44px-2rem))]">
            {shownTopics.map((t) => (
              <li key={t.word}>
                <button
                  type="button"
                  // 누르는 순간 입력칸이 포커스를 잃어 알약이 사라지기 전에 고르게 한다
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => pick(t.word)}
                  className="press tap-target inline-flex cursor-pointer items-center gap-1 rounded-full bg-surface px-3 py-1.5 text-button text-foreground shadow-[0_0_0_1px_var(--line)] hover:bg-surface-2"
                >
                  {t.word}
                  <span className="text-caption text-muted tabular-nums">{t.count}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {hasRow && (
        <ul
          aria-label={player ? `${player} 기사에 자주 나온 말` : "요즘 기사에 자주 나온 말"}
          // 휴대폰: 화면 양끝까지 밀어 볼 수 있게 main의 좌우 여백만큼 넓힌다(선수 알약 줄과 같다). PC: 입력칸 밑에 여러 줄로
          className={`${inputOnPhone ? "hidden" : "flex"} no-scrollbar -mx-3 items-center gap-1.5 overflow-x-auto overflow-y-hidden px-3 py-[max(0.25rem,calc(22px-1.125rem))] sm:-mx-6 sm:px-6 lg:mx-0 lg:mt-2.5 lg:flex lg:flex-wrap lg:overflow-visible lg:px-0 lg:py-0`}
        >
          <li className="shrink-0 lg:hidden">
            <button
              type="button"
              aria-label={player ? `${player} 기사 직접 찾기` : "기사 직접 찾기"}
              onClick={openInput}
              className="press tap-target grid size-9 cursor-pointer place-items-center rounded-full bg-surface text-muted shadow-[0_0_0_1px_var(--line)] hover:bg-surface-2"
            >
              <SearchIcon className="size-4" />
            </button>
          </li>
          <li className="hidden shrink-0 pr-1 text-caption text-muted lg:block">자주 나온 말</li>
          {typed && (
            // 직접 친 말. PC는 입력칸에 이미 보여 알약은 휴대폰에만
            <li className="shrink-0 lg:hidden">
              <TopicChip word={typed} count={null} href={newsHref(player, null)} on />
            </li>
          )}
          {shownTopics.map((t) => {
            const on = t.word === selected;
            return (
              <li key={t.word} className="shrink-0">
                <TopicChip word={t.word} count={t.count} href={newsHref(player, on ? null : t.word)} on={on} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** 자주 나온 말 알약 하나. 누르면 그 말로 거르고(켜짐), 켜진 것을 누르면 끈다. 주소만 바꾸고 기록은 쌓지 않는다 */
function TopicChip({ word, count, href, on }: { word: string; count: number | null; href: string; on: boolean }) {
  return (
    <Link
      href={href}
      replace
      scroll={false}
      aria-current={on ? "true" : undefined}
      aria-label={on ? `‘${word}’ 검색 끄기` : `‘${word}’ 기사만 보기${count === null ? "" : `, ${count}건`}`}
      onClick={() => haptic("select")}
      className={`press tap-target flex h-9 items-center whitespace-nowrap rounded-full px-3 text-label ${
        on
          ? "bg-accent-soft text-accent-ink"
          : "bg-surface text-foreground shadow-[0_0_0_1px_var(--line)] hover:bg-surface-2"
      }`}
    >
      <TopicPending>
        <span className="flex items-center gap-1">
          {word}
          {count !== null && <span className={`text-caption tabular-nums ${on ? "text-accent-ink" : "text-muted"}`}>{count}</span>}
          {on && <ClearIcon className="-mr-0.5 size-3.5" />}
        </span>
      </TopicPending>
    </Link>
  );
}

/** 알약을 누르고 결과를 받는 동안 점 3개(Link 안에서만 쓸 수 있다) */
function TopicPending({ children }: { children: ReactNode }) {
  const { pending } = useLinkStatus();
  return <LoadingDots loading={pending}>{children}</LoadingDots>;
}

function SearchIcon({ className }: { className: string }) {
  return (
    <svg aria-hidden viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className={className}>
      <circle cx="7" cy="7" r="4.75" />
      <path d="m10.5 10.5 3.25 3.25" />
    </svg>
  );
}

function ClearIcon({ className }: { className: string }) {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className={className} fill="currentColor">
      <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13Zm2.53 3.97a.75.75 0 0 1 0 1.06L9.06 8l1.47 1.47a.75.75 0 1 1-1.06 1.06L8 9.06l-1.47 1.47a.75.75 0 0 1-1.06-1.06L6.94 8 5.47 6.53a.75.75 0 0 1 1.06-1.06L8 6.94l1.47-1.47a.75.75 0 0 1 1.06 0Z" />
    </svg>
  );
}
