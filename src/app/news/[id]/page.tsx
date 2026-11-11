import type { Metadata } from "next";
import { Suspense } from "react";
import { getNews, type NewsPage } from "@/lib/api";
import { formatDate, formatTime } from "@/lib/format";
import { readableLead } from "@/lib/news";
import ApiErrorNotice from "@/components/ApiErrorNotice";
import ExternalLinkIcon from "@/components/ExternalLinkIcon";
import LoadingBlock from "@/components/LoadingBlock";
import NotFoundNotice from "@/components/NotFoundNotice";
import Section from "@/components/Section";
import NewsPhoto from "@/components/news/NewsPhoto";
import NewsTitleList from "@/components/news/NewsTitleList";

type Props = PageProps<"/news/[id]">;

/** 기사 페이지에 보이는 앞부분 글자 수(요약이 아직 없을 때). 피드가 주는 앞부분(200자 안팎)을 거의 다 보인다 */
const PAGE_LEAD_CHARS = 300;

/** 주소의 id가 1 이상 15자리 이하 정수가 아니면 null */
function parseId(id: string): number | null {
  return /^[1-9]\d{0,14}$/.test(id) ? Number(id) : null;
}

/** AI 요약을 문장(줄)마다 나눈다. 빈 줄은 뺀다 */
function summaryLines(summary: string | null): string[] {
  return (summary ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

// <title>: "노시환, 뉴욕 메츠 새 타격코치와의 인연 · KOR Leaguer" (뒷부분은 layout의 template이 붙인다)
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = parseId((await params).id);
  const result = id == null ? null : await getNews(id);
  if (!result?.ok) {
    const missing = result == null || result.failure === "notFound";
    return missing
      ? { title: "기사를 찾을 수 없습니다", robots: { index: false, follow: false } }
      : { title: "관련 기사" };
  }

  const news = result.data;
  return {
    title: news.titleKo ?? news.title,
    description: summaryLines(news.summary)[0] ?? undefined,
    // 언론사 기사를 요약한 페이지라 검색에는 원문이 나오게 우리 페이지는 넣지 않는다
    robots: { index: false, follow: true },
  };
}

export default function NewsArticlePage({ params }: Props) {
  return (
    <Suspense fallback={<LoadingBlock rows={6} />}>
      <NewsContent params={params} />
    </Suspense>
  );
}

// 없는 기사는 notFound() 대신 안내를 직접 그린다(선수 페이지와 같은 이유: Suspense 안의 notFound는 서버 HTML에 안 나온다).
async function NewsContent({ params }: Pick<Props, "params">) {
  const id = parseId((await params).id);
  if (id == null) return <NotFoundNotice />;

  const result = await getNews(id);
  if (!result.ok) {
    if (result.failure === "notFound") return <NotFoundNotice />;
    return <ApiErrorNotice failure={result.failure} />;
  }

  const news = result.data;
  return (
    // 휴대폰·태블릿은 한 줄(기사 → 다른 기사), 넓은 화면은 왼쪽 기사 | 오른쪽 다른 기사(선수 페이지와 같은 오른쪽 칸 폭)
    <div className="mx-auto max-w-2xl space-y-7 lg:grid lg:max-w-none lg:grid-cols-[minmax(0,1fr)_21.25rem] lg:items-start lg:gap-x-4 lg:space-y-0">
      <Article news={news} />
      {news.more.length > 0 && (
        <Section title={`${news.player} 다른 기사`} id="more-news">
          <div className="card px-4">
            <NewsTitleList items={news.more} />
          </div>
        </Section>
      )}
    </div>
  );
}

/** 기사 한 건: 큰 사진 → 출처 줄 → 제목(영어 기사는 원제도) → AI 요약 → 원문 보기 */
function Article({ news }: { news: NewsPage }) {
  const lines = summaryLines(news.summary);
  const lead = lines.length === 0 && news.lead ? readableLead(news.lead, news.title, PAGE_LEAD_CHARS) : null;
  return (
    <article className="card min-w-0 overflow-hidden">
      <NewsPhoto url={news.imageUrl} fallback={news.playerPhotoUrl} credit={news.publisher} />
      <div className="px-4 pb-4 pt-3.5 sm:px-5 sm:pb-5">
        <p className="text-xs text-muted tabular-nums">
          {news.player} 관련 기사 · {news.publisher} · {formatDate(news.publishedAt)} {formatTime(news.publishedAt)}
        </p>
        <h1 className="mt-1 text-[1.25rem] font-extrabold leading-[1.4] tracking-[-0.02em] sm:text-2xl sm:leading-[1.35]">
          {news.titleKo ?? news.title}
        </h1>
        {news.titleKo && (
          <p className="mt-1.5 text-[0.8125rem] text-muted">
            <span className="font-semibold">원제</span> {news.title}
          </p>
        )}

        {lines.length > 0 ? (
          <section aria-labelledby="news-summary" className="mt-4 rounded-xl bg-background px-4 py-3.5">
            <h2 id="news-summary" className="text-xs font-bold text-muted">
              AI 요약
            </h2>
            <div className="mt-1.5 space-y-2 text-[0.9375rem] leading-relaxed">
              {lines.map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
            <p className="mt-3 text-[0.6875rem] text-muted">
              AI가 기사를 읽고 쓴 요약이에요. 정확한 내용은 원문에서 확인해 주세요.
            </p>
          </section>
        ) : lead ? (
          <section aria-labelledby="news-lead" className="mt-4 rounded-xl bg-background px-4 py-3.5">
            <h2 id="news-lead" className="text-xs font-bold text-muted">
              기사 앞부분
            </h2>
            <p className="mt-1.5 text-[0.9375rem] leading-relaxed">{lead}</p>
          </section>
        ) : (
          <p className="mt-4 text-sm text-muted">아직 요약을 만들지 못했어요. 원문에서 읽어 주세요.</p>
        )}

        <a
          href={news.url}
          target="_blank"
          rel="noopener noreferrer"
          className="press-soft mt-4 flex min-h-12 w-full items-center justify-center gap-1.5 rounded-xl bg-surface-2 px-4 text-[0.9375rem] font-semibold transition hover:bg-line"
        >
          {news.publisher}에서 원문 보기
          <ExternalLinkIcon />
          <span className="sr-only">(새 탭)</span>
        </a>
      </div>
    </article>
  );
}
