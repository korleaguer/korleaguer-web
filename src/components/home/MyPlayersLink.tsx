import Link from "next/link";

/**
 * 홈에서 '내 선수'(/my: 선수 고르기·화면 순서·7/14/30일 흐름)로 가는 입구.
 * 아래 탭의 '내 선수'가 '기록'으로 바뀐 뒤 /my로 가는 길이 5초짜리 알림의 '보기' 하나뿐이라(전수조사 P1, 사용자 11-17
 * '추천대로', 이슈 #262), 내 선수가 먼저 놓이는 홈 선수 칸(비시즌 성적표·시즌 중 층) 머리에 글자 링크로 둔다.
 * 알약이 아니라 글자다(알약은 아껴 쓴다). 고른 선수가 있으면 몇 명인지, 없으면 고르러 가자고 쓴다.
 */
export default function MyPlayersLink({ count }: { count: number }) {
  return (
    <Link
      href="/my"
      className="press tap-target inline-flex items-center gap-0.5 whitespace-nowrap text-label text-accent-ink hover:underline"
    >
      {count > 0 ? `내 선수 ${count}명` : "내 선수 고르기"}
      <svg aria-hidden viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="m6 3 5 5-5 5" />
      </svg>
    </Link>
  );
}
