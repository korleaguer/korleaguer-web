"use client"; // 기사 더 보기(펼치기)와 기사 사진이 안 뜰 때 숨기기 때문에 클라이언트 컴포넌트다.

import { useState } from "react";
import type { NewsHeadline } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { useImageFailed } from "@/lib/useImageFailed";
import ExternalLinkIcon from "@/components/ExternalLinkIcon";

/** 처음에 펼쳐 두는 기사 수(PC는 한 줄에 셋) */
const VISIBLE = 3;
/** 기사 앞부분을 이 글자 수 안에서 문장이 끝나는 곳까지만 보인다(휴대폰 카드에서 4~5줄) */
const LEAD_CHARS = 120;

/**
 * 기사 앞부분을 카드에 맞게 다듬는다.
 * - 제목과 앞부분이 둘 다 인용구로 시작하면(마이데일리처럼 제목의 인용구로 기사를 여는 경우) 그 인용구 문장은 뺀다.
 * - LEAD_CHARS 안에서 문장이 끝나는 곳까지만 남긴다. 그런 곳이 없으면 그대로 두고 줄 수 제한(…)에 맡긴다.
 */
export function readableLead(lead: string, title: string): string {
  let text = lead.trim();
  const quote = /^[“"][^”"]{2,120}[”"]\s*/.exec(text);
  if (quote && /^[“"]/.test(title.trim()) && text.length > quote[0].length) {
    text = text.slice(quote[0].length).trim();
  }
  if (text.length <= LEAD_CHARS) return text;
  const head = text.slice(0, LEAD_CHARS + 1);
  const end = Math.max(head.lastIndexOf(". "), head.lastIndexOf(".” "), head.lastIndexOf('." '));
  return end >= LEAD_CHARS / 2 ? head.slice(0, head.indexOf(" ", end + 1)).trim() : text;
}

export interface PostingNewsItem extends NewsHeadline {
  /** 여러 선수의 기사를 모았을 때 누구 기사인지. 한 명이면 null */
  who: string | null;
}

/**
 * MLB 도전 카드의 관련 기사. 링크 목록 대신 카드 안에서 읽히게 제목 아래에 읽을 거리를 펼쳐 둔다
 * (사용자 11-11: "링크 바로가기는 별로", 누르지 않아도 보이게).
 * 언론사가 허락한 만큼만 보인다: MLB Trade Rumors는 Claude가 쓴 한국어 제목·요약과 대표 사진(영어 원제는 출처로),
 * 마이데일리는 기사 앞부분(피드가 준 글자)만. 원문은 맨 아래 작은 링크다.
 */
export default function PostingNews({ items }: { items: PostingNewsItem[] }) {
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;
  const shown = open ? items : items.slice(0, VISIBLE);
  const rest = items.length - shown.length;
  const anyAi = items.some((n) => n.summary);
  return (
    <div className="mt-4 border-t border-line pt-3 lg:col-span-2 lg:mt-5">
      <p className="flex items-baseline justify-between gap-3 text-[0.8125rem] font-bold">
        관련 기사
        {anyAi && <span className="text-[0.6875rem] font-normal text-muted">영어 기사는 AI가 한국어로 요약했어요</span>}
      </p>
      <ul className="mt-1 lg:grid lg:grid-cols-3 lg:gap-x-6">
        {shown.map((n) => (
          <NewsItem key={n.url} item={n} />
        ))}
      </ul>
      {rest > 0 && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-1 w-full rounded-xl bg-background py-2.5 text-[0.8125rem] font-semibold text-muted transition-colors hover:text-foreground"
        >
          기사 {rest}건 더 보기
        </button>
      )}
    </div>
  );
}

function NewsItem({ item: n }: { item: PostingNewsItem }) {
  const title = n.titleKo ?? n.title;
  // AI 요약은 한 줄에 한 문장으로 오지만, 좁은 카드에서는 이어 붙여 읽는 편이 짧다
  const body = n.summary ? n.summary.split("\n").join(" ") : n.lead ? readableLead(n.lead, n.title) : null;
  const label = n.summary ? "AI 요약" : n.lead ? "기사 앞부분" : null;
  return (
    <li className="border-t border-line py-3 first:border-t-0 lg:border-t-0">
      <article className="flex h-full flex-col">
        <div className="flex gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted tabular-nums">
              {n.who ? `${n.who} · ` : ""}
              {n.publisher} · {formatDate(n.publishedAt)}
            </p>
            <h3 className="mt-0.5 text-[0.9375rem] font-semibold leading-snug tracking-[-0.01em]">{title}</h3>
          </div>
          {n.imageUrl && <Thumb url={n.imageUrl} />}
        </div>
        {body && (
          <div className="mt-2 rounded-xl bg-background px-3 py-2.5">
            <p className="text-[0.6875rem] font-bold text-accent-ink">{label}</p>
            {/* 요약(130자 안팎)은 끝까지 읽혀야 해서 6줄, 앞부분(120자 안에서 문장 끝)은 5줄까지. 넘으면 … */}
            <p
              className={`mt-0.5 text-[0.8125rem] leading-relaxed ${n.summary ? "line-clamp-6" : "line-clamp-5"}`}
            >
              {body}
            </p>
          </div>
        )}
        <a
          href={n.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 flex min-w-0 items-center gap-1 text-xs text-muted hover:text-foreground hover:underline"
        >
          {n.titleKo ? (
            <>
              <span className="shrink-0">원문</span>
              <span className="min-w-0 truncate">{n.title}</span>
            </>
          ) : (
            <span>원문 보기</span>
          )}
          <ExternalLinkIcon />
        </a>
      </article>
    </li>
  );
}

/** 기사 대표 사진(언론사 서버에서 브라우저가 직접 받는다). 안 뜨면 자리를 비우지 않고 없앤다 */
function Thumb({ url }: { url: string }) {
  const { failed, ref, onError } = useImageFailed(url);
  if (failed) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 언론사 사진 원본 주소, 우리 서버를 거치지 않는다
    <img
      ref={ref}
      src={url}
      alt=""
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={onError}
      className="h-[60px] w-[90px] shrink-0 rounded-lg bg-background object-cover"
    />
  );
}
