import type { NewsHeadline } from "@/lib/api";
import ShowMore from "@/components/ShowMore";
import NewsTitleList from "@/components/news/NewsTitleList";

export interface PostingNewsItem extends NewsHeadline {
  /** 여러 선수의 기사를 모았을 때 누구 기사인지. 한 명이면 null */
  who: string | null;
  /** 그 기사 선수의 사진(우리가 호스팅). 기사 사진이 없거나 안 뜨면 썸네일 자리에 대신 보인다 */
  playerPhotoUrl: string | null;
}

/**
 * MLB 도전 카드의 관련 기사. 줄마다 출처·날짜와 제목, 오른쪽에 썸네일을 두고, 누르면 우리 기사 페이지(/news/{id})에서
 * 큰 사진과 AI 요약을 본다(사용자 11-11·11-12: "썸네일 다시 넣어").
 * 처음에는 shown건만 보이고 나머지는 '기사 n건 더 보기'로 접는다(사용자 11-12 결정: 휴대폰은 2건, PC는 오른쪽 칸 전체가 기사라 3건).
 * 기사 순서와 수는 부르는 쪽이 정한다.
 *
 * @param flush 위 선·여백 없이 그린다(PC 카드 오른쪽 칸 맨 위)
 */
export default function PostingNews({
  items,
  shown,
  flush = false,
}: {
  items: PostingNewsItem[];
  shown: number;
  flush?: boolean;
}) {
  if (items.length === 0) return null;
  const first = items.slice(0, shown);
  const rest = items.slice(shown);
  return (
    <div className={flush ? undefined : "mt-4 border-t border-line pt-3"}>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-label">관련 기사</h3>
        {items.some((n) => n.id != null) && (
          <span className="text-caption text-muted">누르면 사진과 AI 요약을 볼 수 있어요</span>
        )}
      </div>
      <NewsTitleList items={first} />
      {rest.length > 0 && (
        <ShowMore moreLabel={`기사 ${rest.length}건 더 보기`} buttonClassName="border-t border-line py-2.5">
          <div className="border-t border-line">
            <NewsTitleList items={rest} />
          </div>
        </ShowMore>
      )}
    </div>
  );
}
