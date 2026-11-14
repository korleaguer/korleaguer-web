import type { Metadata } from "next";
import { getNews, type NewsPage } from "@/lib/api";
import { formatDate, formatTime } from "@/lib/format";
import { readableLead, splitSentences } from "@/lib/news";
import { newsShareImage, shareMeta } from "@/lib/share";
import ApiErrorNotice from "@/components/ApiErrorNotice";
import ExternalLinkIcon from "@/components/ExternalLinkIcon";
import LoadingBlock from "@/components/LoadingBlock";
import NotFoundNotice from "@/components/NotFoundNotice";
import Section from "@/components/Section";
import NewsPhoto from "@/components/news/NewsPhoto";
import NewsTitleList from "@/components/news/NewsTitleList";
import PageSuspense from "@/components/PageSuspense";

type Props = PageProps<"/news/[id]">;

/** 주소의 id가 1 이상 15자리 이하 정수가 아니면 null */
function parseId(id: string): number | null {
  return /^[1-9]\d{0,14}$/.test(id) ? Number(id) : null;
}

/**
 * 요약이 없을 때 보일 기사 앞부분(문장마다 한 단락). 피드가 문장 가운데서 끊어 준 앞부분(…것과 달리, 어메)은
 * 덜 끝난 마지막 문장을 빼고, 문장이 하나뿐이면 끝에 '…'을 붙여 잘린 글로 보이게 한다.
 */
function leadParagraphs(lead: string, title: string): string[] {
  const paragraphs = splitSentences(readableLead(lead, title));
  const last = paragraphs.at(-1);
  if (last === undefined || /[.!?…”"’')\]]$/.test(last)) return paragraphs;
  return paragraphs.length > 1 ? paragraphs.slice(0, -1) : [`${last}…`];
}

/**
 * 기사 페이지는 검색에 넣지 않는다. 언론사 기사를 요약한 페이지라 검색에는 원문이 나오게 한다.
 * API가 잠깐 멈춰 오류 안내가 보일 때도 같다(오류 화면이 색인되지 않게).
 */
const NO_INDEX = { index: false, follow: true } as const;

// <title>: "노시환, 뉴욕 메츠 새 타격코치와의 인연 · KOR Leaguer" (뒷부분은 layout의 template이 붙인다)
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = parseId((await params).id);
  const result = id == null ? null : await getNews(id);
  if (!result?.ok) {
    const missing = result == null || result.failure === "notFound";
    return missing
      ? { title: "기사를 찾을 수 없어요", robots: { index: false, follow: false } }
      : { title: "관련 기사", robots: NO_INDEX };
  }

  const news = result.data;
  const title = news.titleKo ?? news.title;
  const description = splitSentences(news.summary)[0] ?? undefined;
  // 공유 카드 그림은 og/[v]/route.tsx(언론사·제목). 주소에 배포 커밋이 들어가 카톡이 옛 그림을 쓰지 않는다
  return { title, description, robots: NO_INDEX, ...shareMeta(title, description, newsShareImage(news.id)) };
}

export default function NewsArticlePage({ params }: Props) {
  return (
    <PageSuspense fallback={<LoadingBlock rows={6} />}>
      <NewsContent params={params} />
    </PageSuspense>
  );
}

// 없는 기사는 notFound() 대신 안내를 직접 그린다(선수 페이지와 같은 이유: Suspense 안의 notFound는 서버 HTML에 안 나온다).
async function NewsContent({ params }: Pick<Props, "params">) {
  const id = parseId((await params).id);
  if (id == null) return <NotFoundNotice message="찾는 기사가 없어요" />;

  const result = await getNews(id);
  if (!result.ok) {
    if (result.failure === "notFound") return <NotFoundNotice message="찾는 기사가 없어요" />;
    return <ApiErrorNotice failure={result.failure} />;
  }

  const news = result.data;
  if (news.more.length === 0) {
    // 같은 선수의 관련 기사가 없으면 PC에서도 오른쪽 칸을 두지 않고 기사만 가운데에 둔다
    return (
      <div className="mx-auto max-w-2xl">
        <Article news={news} />
      </div>
    );
  }
  return (
    // 휴대폰·태블릿은 한 줄(기사 → 관련 기사), 넓은 화면은 왼쪽 기사 | 오른쪽 관련 기사(선수 페이지와 같은 오른쪽 칸 폭)
    <div className="mx-auto max-w-2xl space-y-7 lg:grid lg:max-w-none lg:grid-cols-[minmax(0,1fr)_21.25rem] lg:items-start lg:gap-x-4 lg:space-y-0">
      <Article news={news} />
      {/* 같은 선수의 다른 기사다. 기사 제목마다 선수 이름이 있어 머리말에는 이름을 붙이지 않고, 홈 카드와 같은 말로 부른다(사용자 11-13) */}
      <Section title="관련 기사" id="more-news">
        <div className="card px-4">
          {/* 관련 기사도 같은 선수라 썸네일이 안 뜨면 이 선수 사진으로 바꾼다 */}
          <NewsTitleList items={news.more.map((n) => ({ ...n, playerPhotoUrl: news.playerPhotoUrl }))} />
        </div>
      </Section>
    </div>
  );
}

/**
 * 기사 한 건: 제목(영어 기사는 원제도) → 출처 줄 → 사진 → 요약 본문 → 원문 보기(사용자가 고른 시안, 이슈 #122).
 * 요약은 이 페이지의 본문이라 회색 칸에 넣지 않고 흰 카드 위 큰 글자로, 문장마다 한 단락으로 둔다.
 * 휴대폰 첫 화면에 요약과 원문 버튼이 들어오게 촘촘하게 둔다: 글자는 iOS 기본 본문 크기(17)를 지키고 줄·단락 간격과
 * 사진 비율만 줄였다(사용자가 고른 '촘촘하게' 시안, 이슈 #149).
 * 회색 칸 안 작은 글씨는 툴팁처럼 보여 눈이 사진·제목으로 쏠렸다(사용자 의견 11-12).
 * 'AI 요약'은 출처 줄에 한 번만 적는다. 요약이 아직 없으면 기사 앞부분을 같은 자리·같은 글자로 둔다.
 */
function Article({ news }: { news: NewsPage }) {
  const summary = splitSentences(news.summary);
  const body = summary.length > 0 ? summary : news.lead ? leadParagraphs(news.lead, news.title) : [];
  const kind = summary.length > 0 ? "AI 요약" : body.length > 0 ? "기사 앞부분" : null;
  return (
    <article className="card min-w-0 p-4 sm:p-6">
      <h1 className="text-article-title">
        {news.titleKo ?? news.title}
      </h1>
      {news.titleKo && (
        <p className="mt-1.5 text-meta text-muted">
          <span className="font-semibold">원제</span> {news.title}
        </p>
      )}
      <p className="mt-2 text-meta text-muted tabular-nums">
        {news.publisher} · {formatDate(news.publishedAt)} {formatTime(news.publishedAt)}
        {kind && ` · ${kind}`}
      </p>

      <NewsPhoto newsId={news.id} url={news.imageUrl} fallback={news.playerPhotoUrl} />

      {body.length > 0 ? (
        <div className="mt-3.5 space-y-2 text-reading">
          {body.map((sentence, i) => (
            <p key={i}>{sentence}</p>
          ))}
        </div>
      ) : (
        <p className="mt-3.5 text-body text-muted">아직 요약을 만들지 못했어요. 원문에서 읽어 주세요.</p>
      )}

      <a
        href={news.url}
        target="_blank"
        rel="noopener noreferrer"
        className="press-soft mt-4 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-surface-2 px-4 text-button transition hover:bg-line"
      >
        {news.publisher}에서 원문 보기
        <ExternalLinkIcon />
        <span className="sr-only">(새 탭에서 열림)</span>
      </a>
    </article>
  );
}
