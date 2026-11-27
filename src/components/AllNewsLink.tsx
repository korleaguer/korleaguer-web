import Link from "next/link";
import { newsHref } from "@/lib/news";
import LinkArrow from "@/components/LinkArrow";

/**
 * '전체 기사 보기 ›': 기사 목록을 그 자리에서 펼치지 않고 뉴스 탭(/news)으로 보낸다. 선수를 주면 그 선수로 거른 화면이 열린다.
 * 예전 '기사 n건 더 보기'는 펼치면 아래 카드가 모두 밀려 내려가 읽던 자리를 잃었다(이슈 #206).
 * 모양은 '더 보기' 버튼 자리 그대로(가운데 파란 글씨)이고, 화살표만 아래(펼침) 대신 오른쪽(다른 화면)이다.
 * 한 화면에 여러 개가 놓이므로(홈 성적표 카드마다) 화면 낭독기에는 누구 기사인지 함께 읽어 준다.
 */
export default function AllNewsLink({ player, className = "" }: { player?: string | null; className?: string }) {
  return (
    <Link
      href={newsHref(player)}
      className={`press-soft flex min-h-11 w-full items-center justify-center gap-0.5 text-label text-accent-ink ${className}`}
    >
      {player && <span className="sr-only">{`${player} `}</span>}
      전체 기사 보기
      <LinkArrow />
    </Link>
  );
}
