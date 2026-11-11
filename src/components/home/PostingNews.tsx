import type { NewsHeadline } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { readableLead } from "@/lib/news";
import ExternalLinkIcon from "@/components/ExternalLinkIcon";
import ShowMore from "@/components/ShowMore";
import NewsThumb from "@/components/home/NewsThumb";

/** 처음에 펼쳐 두는 기사 수(PC는 한 줄에 셋) */
const VISIBLE = 3;

export interface PostingNewsItem extends NewsHeadline {
  /** 여러 선수의 기사를 모았을 때 누구 기사인지. 한 명이면 null */
  who: string | null;
}

/**
 * MLB 도전 카드의 관련 기사. 링크 목록 대신 카드 안에서 읽히게 제목 아래에 읽을 거리를 펼쳐 둔다
 * (사용자 11-11: "링크 바로가기는 별로", 누르지 않아도 보이게).
 * 언론사가 허락한 만큼만 보인다: MLB Trade Rumors는 Claude가 쓴 한국어 제목·요약과 대표 사진(영어 원제는 출처로),
 * 마이데일리는 기사 앞부분(피드가 준 글자)만. 원문은 맨 아래 작은 링크다.
 * 기사 순서는 부르는 쪽이 정한다(AI 요약 기사 하나를 맨 앞에: pinSummary). 처음 VISIBLE건 뒤는 '더 보기'로 펼친다.
 */
export default function PostingNews({ items }: { items: PostingNewsItem[] }) {
  if (items.length === 0) return null;
  const first = items.slice(0, VISIBLE);
  const rest = items.slice(VISIBLE);
  return (
    <div className="mt-4 border-t border-line pt-3 lg:col-span-2 lg:mt-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[0.8125rem] font-bold">관련 기사</h3>
        {items.some((n) => n.summary) && (
          <span className="text-[0.6875rem] text-muted">영어 기사는 AI가 한국어로 요약했어요</span>
        )}
      </div>
      <ul className="mt-1 lg:grid lg:grid-cols-3 lg:gap-x-6">
        {first.map((n, i) => (
          <NewsItem key={n.url} item={n} topLine={i > 0} />
        ))}
      </ul>
      {rest.length > 0 && (
        <ShowMore moreLabel={`기사 ${rest.length}건 더 보기`} buttonClassName="border-t border-line py-2.5">
          <ul className="lg:grid lg:grid-cols-3 lg:gap-x-6">
            {rest.map((n) => (
              <NewsItem key={n.url} item={n} topLine />
            ))}
          </ul>
        </ShowMore>
      )}
    </div>
  );
}

/** 기사 한 건. topLine이면 위에 구분선(PC는 칸으로 나뉘어 선을 두지 않는다) */
function NewsItem({ item: n, topLine }: { item: PostingNewsItem; topLine: boolean }) {
  const title = n.titleKo ?? n.title;
  // AI 요약은 한 줄에 한 문장으로 오지만, 좁은 카드에서는 이어 붙여 읽는 편이 짧다
  const body = n.summary ? n.summary.split("\n").join(" ") : n.lead ? readableLead(n.lead, n.title) : null;
  const label = n.summary ? "AI 요약" : n.lead ? "기사 앞부분" : null;
  return (
    <li className={`py-3 ${topLine ? "border-t border-line lg:border-t-0" : ""}`}>
      <article className="flex h-full flex-col">
        <div className="flex gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted tabular-nums">
              {n.who ? `${n.who} · ` : ""}
              {n.publisher} · {formatDate(n.publishedAt)}
            </p>
            <h4 className="mt-0.5 text-[0.9375rem] font-semibold leading-snug tracking-[-0.01em]">{title}</h4>
          </div>
          {n.imageUrl && <NewsThumb url={n.imageUrl} />}
        </div>
        {body && (
          <div className="mt-2 rounded-xl bg-background px-3 py-2.5">
            <p className="text-[0.6875rem] font-bold text-accent-ink">{label}</p>
            {/* 요약(130자 안팎)은 끝까지 읽혀야 해서 6줄, 앞부분(120자 안에서 문장 끝)은 5줄까지. 넘으면 … */}
            <p className={`mt-0.5 text-[0.8125rem] leading-relaxed ${n.summary ? "line-clamp-6" : "line-clamp-5"}`}>
              {body}
            </p>
          </div>
        )}
        <a
          href={n.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${n.title} 원문 보기(${n.publisher}, 새 탭)`}
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
