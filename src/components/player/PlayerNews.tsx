import type { NewsHeadline } from "@/lib/api";
import Section from "@/components/Section";
import AllNewsLink from "@/components/news/AllNewsLink";
import NewsTitleList from "@/components/news/NewsTitleList";

/** 이 화면에 보이는 기사 수. 더 있으면 '전체 기사 보기'로 뉴스 탭에서 본다 */
const SHOWN = 3;

/**
 * 선수 화면 '기사': 이 선수 기사(늦은 순, 서버가 최대 10건, korleaguer-server#133) 가운데 SHOWN건. 홈 MLB 도전 카드의
 * 관련 기사와 같은 줄 모양이고, 누르면 우리 기사 페이지(/news/{id})에서 큰 사진과 AI 요약을 본다. 더 있으면 그 자리에서
 * 펼치지 않고 '전체 기사 보기'로 뉴스 탭(이 선수로 거른 화면)에 보낸다(펼치면 아래 경기 기록이 밀려 내려갔다, 이슈 #206).
 * 휴대폰은 경기 기록 위, PC는 오른쪽 칸(부르는 쪽이 정한다).
 * id는 같은 화면에 두 번(휴대폰용·PC용) 놓일 때 제목 id가 겹치지 않게 다르게 준다.
 */
export default function PlayerNews({
  news,
  photoUrl,
  id,
  player,
  as = "section",
}: {
  news: NewsHeadline[];
  photoUrl: string | null;
  id: string;
  /** 이 선수의 한글 이름(뉴스 탭에서 거를 이름) */
  player: string;
  /** PC 오른쪽 칸처럼 본문 옆 보조 칸이면 "aside"(보조 영역). 휴대폰처럼 본문 흐름 안이면 기본 section */
  as?: "section" | "aside";
}) {
  if (news.length === 0) return null;
  const items = news.slice(0, SHOWN).map((n) => ({ ...n, who: null, playerPhotoUrl: photoUrl }));
  return (
    <Section id={id} title="기사" as={as}>
      <div className="card px-4 py-1">
        <NewsTitleList items={items} />
        {news.length > SHOWN && <AllNewsLink player={player} className="border-t border-line py-2.5" />}
      </div>
    </Section>
  );
}
