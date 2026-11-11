import type { NewsHeadline } from "@/lib/api";
import NewsTitleList from "@/components/news/NewsTitleList";

export interface PostingNewsItem extends NewsHeadline {
  /** 여러 선수의 기사를 모았을 때 누구 기사인지. 한 명이면 null */
  who: string | null;
}

/**
 * MLB 도전 카드의 관련 기사. 제목만 줄지어 두고, 누르면 우리 기사 페이지(/news/{id})에서 대표 사진과 AI 요약을
 * 함께 본다(사용자 11-11: "기사 제목만 가져오고 클릭하면 새로운 페이지로 들어가서 썸네일과 우리의 요약 내용이 같이").
 * 기사 순서와 수는 부르는 쪽이 정한다. 제목 줄이 짧아 '더 보기' 없이 모두 보인다(PC는 두 칸).
 */
export default function PostingNews({ items }: { items: PostingNewsItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-4 border-t border-line pt-3 lg:col-span-2 lg:mt-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[0.8125rem] font-bold">관련 기사</h3>
        {items.some((n) => n.id != null) && (
          <span className="text-[0.6875rem] text-muted">누르면 사진과 AI 요약을 볼 수 있어요</span>
        )}
      </div>
      <NewsTitleList items={items} twoColumns />
    </div>
  );
}
