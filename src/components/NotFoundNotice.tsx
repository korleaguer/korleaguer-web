import Link from "next/link";
import StateNotice, { stateActionClass } from "./StateNotice";

/**
 * 없는 주소·없는 선수·없는 기사 안내.
 * '홈으로 가기'는 앱 안에서도 그대로 된다: 앱이 홈 주소 링크를 가로채 홈 탭으로 바꾼다(korleaguer-app WebScreen).
 */
export default function NotFoundNotice({ message = "찾는 페이지나 선수가 없어요" }: { message?: string }) {
  return (
    <StateNotice
      emoji="🔍"
      title={message}
      detail="주소가 바뀌었거나 없어진 화면이에요."
      action={
        <Link href="/" className={stateActionClass}>
          홈으로 가기
        </Link>
      }
    />
  );
}
