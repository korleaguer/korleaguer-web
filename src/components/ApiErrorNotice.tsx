import type { ApiFailure } from "@/lib/api";

const MESSAGES: Record<ApiFailure, { title: string; detail: string }> = {
  unreachable: {
    title: "데이터 서버에 연결할 수 없습니다",
    detail: "잠시 후 새로고침해 주세요. 직접 실행 중이라면 api 서버가 켜져 있는지 확인하세요.",
  },
  badResponse: {
    title: "데이터 서버의 응답이 올바르지 않습니다",
    detail: "잠시 후 새로고침해 주세요.",
  },
  notFound: {
    title: "데이터를 찾을 수 없습니다",
    detail: "주소가 맞는지 확인해 주세요.",
  },
};

/** api 호출이 실패했을 때 에러 화면 대신 보여 주는 안내 */
export default function ApiErrorNotice({ failure }: { failure: ApiFailure }) {
  const { title, detail } = MESSAGES[failure];
  return (
    <div role="alert" className="rounded-[10px] bg-surface px-5 py-10 text-center">
      <p className="text-base font-bold">{title}</p>
      <p className="mt-2 text-sm text-muted">{detail}</p>
    </div>
  );
}
