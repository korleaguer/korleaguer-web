"use client"; // 입력하는 대로 주소를 바꾸고, 검색창을 누르면 바로가기 알약을 보여야 해서 클라이언트 컴포넌트다.

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import type { NewsTopic } from "@/lib/api";
import { haptic } from "@/lib/app";
import { NEWS_QUERY_MAX, newsHref } from "@/lib/news";

/** 입력을 멈추고 이만큼 지나면 찾는다(글자마다 서버에 묻지 않게) */
const TYPING_PAUSE_MS = 350;

/**
 * 뉴스 탭 검색창(이슈 #214). 제목·내용에 그 말이 있는 기사만 보인다(주소 ?q=, 고른 선수 안에서).
 * - 입력하다 잠깐 멈추면 바로 찾고, 검색 키(엔터)를 누르면 곧바로 찾으면서 키보드를 내린다. 기록은 쌓지 않는다(replace).
 * - 검색창을 눌렀는데 비어 있으면 '자주 나온 말' 알약을 보인다(FotMob 검색의 추천 알약 참고). 누르면 그 말로 찾는다.
 *   알약은 api가 지금 범위의 최근 기사에서 센 것이라 누르면 대개 그 수만큼 나온다.
 * - 지우기(×)는 검색어만 지운다(선수 거르기는 그대로).
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
  /** 지금 범위의 자주 나온 말(검색어가 있을 때는 서버가 주지 않는다) */
  topics: NewsTopic[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [value, setValue] = useState(query ?? "");
  const [focused, setFocused] = useState(false);
  const [pending, startTransition] = useTransition();

  // 주소의 검색어가 밖에서 바뀌면(뒤로 가기, 선수 바꾸기) 입력칸도 맞춘다. 입력하는 중에는 건드리지 않는다
  const [shownQuery, setShownQuery] = useState(query);
  if (query !== shownQuery) {
    setShownQuery(query);
    if (!focused) setValue(query ?? "");
  }
  // 자주 나온 말은 검색어가 없을 때만 온다. 입력을 지우는 사이에도 보이게 마지막으로 받은 것을 기억한다(선수가 바뀌면 새로)
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

  function go(next: string) {
    if (timer.current) clearTimeout(timer.current);
    const q = next.trim() || null;
    if (q === requested.current) return;
    requested.current = q;
    startTransition(() => router.replace(newsHref(player, q), { scroll: false }));
  }

  function onChange(next: string) {
    setValue(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => go(next), TYPING_PAUSE_MS);
  }

  function pick(word: string) {
    haptic("select");
    setValue(word);
    go(word);
    inputRef.current?.blur();
  }

  const showTopics = focused && value.trim() === "" && shownTopics.length > 0;

  return (
    <div>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          go(value);
          inputRef.current?.blur();
        }}
        className="flex h-11 items-center gap-2 rounded-xl bg-surface px-3 shadow-[0_0_0_1px_var(--line)] focus-within:shadow-[0_0_0_2px_var(--accent)]"
      >
        <svg aria-hidden viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="size-4 shrink-0 text-muted">
          <circle cx="7" cy="7" r="4.75" />
          <path d="m10.5 10.5 3.25 3.25" />
        </svg>
        <input
          ref={inputRef}
          type="search"
          enterKeyHint="search"
          aria-label={player ? `${player} 기사 검색` : "기사 검색"}
          placeholder={player ? `${player} 기사에서 찾기` : "기사 제목·내용으로 찾기"}
          maxLength={NEWS_QUERY_MAX}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="min-w-0 flex-1 bg-transparent text-body outline-none placeholder:text-muted [&::-webkit-search-cancel-button]:hidden"
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
            className="press -mr-1.5 grid size-8 shrink-0 cursor-pointer place-items-center rounded-full text-muted hover:bg-surface-2"
          >
            <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="currentColor">
              <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13Zm2.53 3.97a.75.75 0 0 1 0 1.06L9.06 8l1.47 1.47a.75.75 0 1 1-1.06 1.06L8 9.06l-1.47 1.47a.75.75 0 0 1-1.06-1.06L6.94 8 5.47 6.53a.75.75 0 0 1 1.06-1.06L8 6.94l1.47-1.47a.75.75 0 0 1 1.06 0Z" />
            </svg>
          </button>
        )}
      </form>
      {showTopics && (
        <div className="mt-2.5 px-1">
          <p className="text-caption text-muted">{player ? `${player} 기사에 자주 나온 말` : "요즘 기사에 자주 나온 말"}</p>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
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
    </div>
  );
}
