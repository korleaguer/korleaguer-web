import type { ReactNode } from "react";
import type { DataMode } from "@/lib/api";

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
 * 시즌 기록(홈 api)을 받지 못했을 때 맨 위 띠. 선수 목록은 오류 화면 대신 이 띠와 함께 카드를 먼저 그린다(11-17 전수조사).
 * 카드의 기록 칸은 비워 두므로 왜 비었는지 여기서 한 번만 말한다
 */
export function StatsFailedBanner() {
  return (
    <Banner mark="안내" title="시즌 기록을 불러오지 못했어요">
      선수 카드만 먼저 보여 드려요. 잠시 뒤 다시 불러와 주세요.
    </Banner>
  );
}

// 호박색 카드. 앞의 알약은 제목이 같은 말을 하므로 화면 낭독기는 건너뛴다.
function Banner({ mark, title, children }: { mark: string; title: string; children: ReactNode }) {
  return (
    <div role="status" className="flex items-start gap-3 rounded-2xl bg-notice-bg px-4 py-3 text-notice-fg">
      <span
        aria-hidden
        className="mt-px shrink-0 rounded-full bg-notice-mark px-2.5 py-0.5 text-badge text-notice-bg"
      >
        {mark}
      </span>
      <div className="min-w-0">
        <p className="text-summary">{title}</p>
        <p className="mt-0.5 text-meta opacity-90">{children}</p>
      </div>
    </div>
  );
}
