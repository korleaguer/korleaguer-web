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
        <Banner title="샘플 데이터 — 실제 기록이 아닙니다">
          API 키 없이 실행 중이라 지어낸 숫자를 보여 주고 있습니다.
        </Banner>
      )}
      {!statsAvailable && (
        <Banner title="선수 기록을 받으려면 유료 요금제가 필요합니다">
          경기 일정과 결과만 보여 줍니다.
        </Banner>
      )}
    </div>
  );
}

function Banner({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div
      role="status"
      className="rounded-lg border-l-4 border-notice-line bg-notice-bg px-4 py-3 text-notice-fg"
    >
      <p className="text-base font-extrabold">{title}</p>
      <p className="mt-0.5 text-xs opacity-80">{children}</p>
    </div>
  );
}
