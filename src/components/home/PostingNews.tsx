import type { NewsHeadline } from "@/lib/api";
import AllNewsLink from "@/components/AllNewsLink";
import NewsTitleList from "@/components/NewsTitleList";

export interface PostingNewsItem extends NewsHeadline {
  /** 여러 선수의 기사를 모았을 때 누구 기사인지. 한 명이면 null */
  who: string | null;
  /** 그 기사 선수의 사진(우리가 호스팅). 기사 사진이 없거나 안 뜨면 썸네일 자리에 대신 보인다 */
  playerPhotoUrl: string | null;
}

/**
 * MLB 도전 카드의 관련 기사. 줄마다 출처·날짜와 제목, 오른쪽에 썸네일을 두고, 누르면 우리 기사 페이지(/news/{id})에서
 * 큰 사진과 AI 요약을 본다(사용자 11-11·11-12: "썸네일 다시 넣어").
 * shown건만 보인다(휴대폰 2건은 사용자 11-12, PC도 2건은 11-16 결정). 더 있으면 그 자리에서 펼치지 않고
 * '전체 기사 보기'로 뉴스 탭에 보낸다(펼치면 아래 성적표가 모두 밀려 내려갔다, 이슈 #206). 기사 순서와 수는 부르는 쪽이 정한다.
 *
 * @param player '전체 기사 보기'가 거를 선수(여러 명이면 null: 전체)
 * @param flush 위 선·여백 없이 그린다(PC 카드 오른쪽 칸 맨 위)
 * @param heading '관련 기사' 제목 태그. 한 명이면 그 선수 이름(h3) 아래라 h4, 여러 명이면 모든 선수의 기사를 모은 목록이라
 *                선수 이름들과 같은 h3이다(h4면 마지막 선수의 하위 제목으로 읽힌다)
 */
export default function PostingNews({
  items,
  shown,
  player,
  flush = false,
  heading: Heading = "h4",
}: {
  items: PostingNewsItem[];
  shown: number;
  player: string | null;
  flush?: boolean;
  heading?: "h3" | "h4";
}) {
  if (items.length === 0) return null;
  const first = items.slice(0, shown);
  return (
    <div className={flush ? undefined : "mt-4 border-t border-line pt-3"}>
      {/* 카드 안 작은 제목은 h4다(섹션 제목 h2 → 선수 이름 h3 아래, '행선지로 거론된 구단'과 같다, 이슈 #277).
          여러 명이면 h3(heading) */}
      <Heading className="text-label">관련 기사</Heading>
      <NewsTitleList items={first} />
      {items.length > shown && <AllNewsLink player={player} className="border-t border-line py-2.5" />}
    </div>
  );
}
