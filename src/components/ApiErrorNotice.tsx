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

/**
 * api 호출이 실패했을 때 에러 화면 대신 보여 주는 안내. 없는 것이면 홈으로, 연결 문제면 다시 불러오기.
 * level: 이 안내가 화면을 통째로 대신해 다른 h1이 없으면(선수·기사 화면, 내 선수) 1, 제목이 있는 화면 안이면 2(기본)
 */
export default function ApiErrorNotice({ failure, level }: { failure: ApiFailure; level?: 1 | 2 }) {
  const { emoji, title, detail } = MESSAGES[failure];
  return (
    <StateNotice
      alert
      level={level}
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
