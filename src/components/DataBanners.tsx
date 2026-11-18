import type { ReactNode } from "react";
import type { DataMode } from "@/lib/api";
import ReloadButton from "./ReloadButton";

interface Props {
  dataMode: DataMode;
  statsAvailable: boolean;
}

/** 화면 맨 위 띠. 샘플 데이터이거나 선수 기록을 못 받는 상태를 알린다. */
export default function DataBanners({ dataMode, statsAvailable }: Props) {
  if (dataMode !== "sample" && statsAvailable) return null;

  return (
    <div className="space-y-2">
      {dataMode === "sample" && (
        <Banner mark="샘플" title="샘플 데이터 — 실제 기록이 아니에요">
          테스트용으로 실행 중이라 지어낸 숫자를 보여 주고 있어요.
        </Banner>
      )}
      {!statsAvailable && (
        <Banner mark="안내" title="선수 기록을 아직 받지 못했어요">
          MLB에서 기록을 받는 중이거나 잠시 받지 못했어요. 경기 일정과 결과는 그대로 볼 수 있어요.
        </Banner>
      )}
    </div>
  );
}

/**
 * 띠 안 버튼: 호박색 위에서도 눌리는 것으로 보이게 '선수 고르기'와 같은 흰 알약(DESIGN.md picker-button).
 * 띠의 갈색 글자를 물려받지 않게 본문 글자색을 쓰고, 알약은 32px이지만 누르는 영역은 44px(tap-target)
 */
const bannerActionClass =
  "press tap-target inline-flex items-center rounded-full bg-surface px-3.5 py-1.5 text-label text-foreground shadow-[var(--shadow-card)] transition duration-150 hover:shadow-[var(--shadow-card-hover)]";

/**
 * 시즌 기록(홈 api)을 받지 못했을 때 맨 위 띠. 선수 목록은 오류 화면 대신 이 띠와 함께 카드를 먼저 그린다(11-17 전수조사).
 * 카드의 기록 칸은 비워 두므로 왜 비었는지 여기서 한 번만 말한다.
 * 예전 오류 화면처럼 '다시 불러오기'를 둔다. 앱(웹뷰)에는 주소창·새로고침 버튼이 없어서(아이폰만 당겨서 새로고침) 글로만
 * '다시 불러와 주세요'라고 하면 할 방법이 없었다(리뷰 지적). 버튼이 그 말을 하므로 설명 줄에서는 뺀다(같은 말 두 번 금지)
 */
export function StatsFailedBanner() {
  return (
    <Banner mark="안내" title="시즌 기록을 불러오지 못했어요" action={<ReloadButton className={bannerActionClass} />}>
      선수 카드만 먼저 보여 드려요.
    </Banner>
  );
}

// 호박색 카드. 앞의 알약은 제목이 같은 말을 하므로 화면 낭독기는 건너뛴다. 할 일 버튼(action)이 있으면 설명 아래에 둔다.
// 글 칸 기본 폭 11rem: 큰 글씨에서 알약 옆에 이만큼도 안 남으면 글 칸을 알약 아래 줄로 내려 띠 폭을 다 쓴다.
// 앱 2배에서 알약 옆 글 칸이 157px뿐이라 제목이 세 줄로 갈리고 '다시 불러오기' 알약이 두 줄로 갈렸다. 1배는 그대로 한 줄이다
function Banner({
  mark,
  title,
  children,
  action,
}: {
  mark: string;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div
      role="status"
      className="flex flex-wrap items-start gap-x-3 gap-y-2 rounded-2xl bg-notice-bg px-4 py-3 text-notice-fg"
    >
      <span
        aria-hidden
        className="mt-px shrink-0 rounded-full bg-notice-mark px-2.5 py-0.5 text-badge text-notice-bg"
      >
        {mark}
      </span>
      <div className="min-w-0 flex-1 basis-[11rem]">
        <p className="text-summary">{title}</p>
        <p className="mt-0.5 text-meta opacity-90">{children}</p>
        {action && <div className="mt-2.5">{action}</div>}
      </div>
    </div>
  );
}
