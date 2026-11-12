import Link from "next/link";
import type { NewsHeadline } from "@/lib/api";
import { formatDate } from "@/lib/format";
import ExternalLinkIcon from "@/components/ExternalLinkIcon";
import NewsThumb from "@/components/news/NewsThumb";

export interface NewsTitleItem extends NewsHeadline {
  /** 여러 선수의 기사를 모았을 때 누구 기사인지. 한 명이면 null */
  who?: string | null;
  /** 그 기사 선수의 사진(우리가 호스팅). 기사 사진이 없거나 안 뜨면 썸네일 자리에 대신 보인다 */
  playerPhotoUrl?: string | null;
}

/**
 * 기사 제목 목록. 줄마다 누구 기사 · 언론사(외 N곳) · 날짜와 제목, 오른쪽에 기사 썸네일을 둔다
 * (사용자 11-11: "기사 제목만 가져오고 클릭하면 새로운 페이지에서 썸네일과 요약", 11-12: "썸네일 다시 넣어").
 * 요약은 목록에 두지 않고, 누르면 우리 기사 페이지(/news/{id})에서 큰 사진과 함께 본다. 기사 번호가 없는 옛 API면 원문을 새 탭으로 연다.
 * twoColumns면 PC(lg)에서 두 칸으로 나눈다(줄은 왼쪽에서 오른쪽으로 찬다).
 */
export default function NewsTitleList({ items, twoColumns = false }: { items: NewsTitleItem[]; twoColumns?: boolean }) {
  return (
    <ul className={twoColumns ? "lg:grid lg:grid-cols-2 lg:gap-x-8" : undefined}>
      {items.map((n, i) => (
        // 줄 사이에만 선을 긋는다. 두 칸이면 첫 줄 두 칸 모두 위 선이 없다
        <li
          key={n.id ?? n.url}
          className={i === 0 ? undefined : `border-t border-line ${twoColumns && i === 1 ? "lg:border-t-0" : ""}`}
        >
          <NewsTitleRow item={n} />
        </li>
      ))}
    </ul>
  );
}

function NewsTitleRow({ item: n }: { item: NewsTitleItem }) {
  const content = (
    // 화면 낭독기는 제목부터 읽고(글 순서), 눈에는 출처 줄이 위에 보인다(flex-col-reverse)
    <span className="flex min-w-0 flex-1 flex-col-reverse">
      <span className="mt-0.5 line-clamp-2 text-[0.9375rem] font-semibold leading-snug tracking-[-0.01em] group-hover:underline">
        {n.titleKo ?? n.title}
      </span>
      {/* 출처 줄은 한 줄로 둔다. 좁으면 누구·언론사만 '…'으로 줄이고 '외 N곳'과 날짜는 남긴다 */}
      <span className="flex min-w-0 whitespace-nowrap text-xs text-muted tabular-nums">
        <span className="min-w-0 truncate">
          {n.who ? `${n.who} · ` : ""}
          {n.publisher}
        </span>
        {/* 언론사만 다른 같은 기사는 서버가 한 줄로 묶었다. 같은 글을 실은 다른 언론사 수만 보인다
            (이름은 PC에서 마우스를 올리면 보이고, 마우스를 못 쓰는 화면 낭독기에는 읽어 준다) */}
        {n.alsoBy.length > 0 && (
          <span className="shrink-0" title={`같은 기사: ${n.alsoBy.join(", ")}`}>
            {`\u00a0외 ${n.alsoBy.length}곳`}
            <span className="sr-only">{`(같은 기사: ${n.alsoBy.join(", ")})`}</span>
          </span>
        )}
        <span className="shrink-0">{`\u00a0· ${formatDate(n.publishedAt)}`}</span>
      </span>
    </span>
  );
  const rowClass = "press-soft group flex items-center gap-3 py-3";
  // 썸네일이 줄 오른쪽 끝을 맡는다(예전 › 자리). 기사 사진이 없거나 안 뜨면 선수 사진, 둘 다 없으면 자리를 두지 않는다
  const thumb = <NewsThumb url={n.imageUrl} fallback={n.playerPhotoUrl ?? null} />;

  if (n.id == null) {
    return (
      <a href={n.url} target="_blank" rel="noopener noreferrer" className={rowClass}>
        {content}
        {thumb}
        <span className="text-muted">
          <ExternalLinkIcon />
          <span className="sr-only">(원문, 새 탭)</span>
        </span>
      </a>
    );
  }
  return (
    <Link href={`/news/${n.id}`} className={rowClass}>
      {content}
      {thumb}
    </Link>
  );
}
