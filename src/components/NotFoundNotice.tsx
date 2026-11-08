import Link from "next/link";

/** 없는 주소·없는 선수 안내 */
export default function NotFoundNotice() {
  return (
    <div className="card px-5 py-10 text-center">
      <p className="text-base font-bold">찾는 페이지나 선수가 없습니다</p>
      <Link href="/" className="mt-3 inline-block text-sm font-semibold text-accent-ink hover:underline">
        홈으로 가기
      </Link>
    </div>
  );
}
