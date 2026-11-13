import type { NewsHeadline } from "@/lib/api";
import Section from "@/components/Section";
import ShowMore from "@/components/ShowMore";
import NewsTitleList from "@/components/news/NewsTitleList";

/** 처음에 보이는 기사 수. 나머지는 '더 보기' */
const SHOWN = 3;

/**
 * 선수 화면 '기사': 이 선수 기사(늦은 순, 서버가 최대 10건, korleaguer-server#133). 홈 MLB 도전 카드의 관련 기사와 같은 줄 모양이고,
 * 누르면 우리 기사 페이지(/news/{id})에서 큰 사진과 AI 요약을 본다. 휴대폰은 경기 기록 위, PC는 오른쪽 칸(부르는 쪽이 정한다).
 * id는 같은 화면에 두 번(휴대폰용·PC용) 놓일 때 제목 id가 겹치지 않게 다르게 준다.
 */
export default function PlayerNews({ news, photoUrl, id }: { news: NewsHeadline[]; photoUrl: string | null; id: string }) {
  if (news.length === 0) return null;
  const items = news.map((n) => ({ ...n, who: null, playerPhotoUrl: photoUrl }));
  const first = items.slice(0, SHOWN);
  const rest = items.slice(SHOWN);
  return (
    <Section id={id} title="기사" aside={`${news.length}건`}>
      <div className="card px-4 py-1">
        <NewsTitleList items={first} />
        {rest.length > 0 && (
          <ShowMore moreLabel={`기사 ${rest.length}건 더 보기`} buttonClassName="border-t border-line py-2.5">
            <div className="border-t border-line">
              <NewsTitleList items={rest} />
            </div>
          </ShowMore>
        )}
      </div>
    </Section>
  );
}
