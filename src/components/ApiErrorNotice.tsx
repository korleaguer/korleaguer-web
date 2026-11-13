import Link from "next/link";
import type { ApiFailure } from "@/lib/api";
import ReloadButton from "./ReloadButton";
import StateNotice, { stateActionClass } from "./StateNotice";

const MESSAGES: Record<ApiFailure, { emoji: string; title: string; detail: string }> = {
  unreachable: {
    emoji: "📡",
    title: "정보를 불러오지 못했어요",
    detail: "잠시 뒤 다시 불러와 주세요.",
  },
  badResponse: {
    emoji: "📡",
    title: "정보를 제대로 받지 못했어요",
    detail: "잠시 뒤 다시 불러와 주세요.",
  },
  notFound: {
    emoji: "🔍",
    title: "찾는 정보가 없어요",
    detail: "주소가 맞는지 확인해 주세요.",
  },
};

/** api 호출이 실패했을 때 에러 화면 대신 보여 주는 안내. 없는 것이면 홈으로, 연결 문제면 다시 불러오기 */
export default function ApiErrorNotice({ failure }: { failure: ApiFailure }) {
  const { emoji, title, detail } = MESSAGES[failure];
  return (
    <StateNotice
      alert
      emoji={emoji}
      title={title}
      detail={detail}
      action={
        failure === "notFound" ? (
          <Link href="/" className={stateActionClass}>
            홈으로 가기
          </Link>
        ) : (
          <ReloadButton />
        )
      }
    />
  );
}
