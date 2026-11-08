import type { CSSProperties, ReactNode } from "react";
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
        <Banner mark="견본" title="샘플 데이터 — 실제 기록이 아닙니다">
          API 키 없이 실행 중이라 지어낸 숫자를 보여 주고 있습니다.
        </Banner>
      )}
      {!statsAvailable && (
        <Banner mark="안내" title="선수 기록을 받으려면 유료 요금제가 필요합니다">
          경기 일정과 결과만 보여 줍니다.
        </Banner>
      )}
    </div>
  );
}

// 여권 견본처럼 비뚤게 찍힌 도장. 제목이 같은 말을 하므로 화면 낭독기는 건너뛴다.
const MARK_STYLE = { "--tilt": "-4deg" } as CSSProperties;

function Banner({ mark, title, children }: { mark: string; title: string; children: ReactNode }) {
  return (
    <div
      role="status"
      className="flex items-center gap-4 rounded-[10px] bg-notice-bg px-4 py-3 text-notice-fg"
    >
      <span aria-hidden className="stamp h-11 min-w-14 px-2 text-sm tracking-[0.2em]" style={MARK_STYLE}>
        {mark}
      </span>
      <div className="min-w-0">
        <p className="text-base font-extrabold">{title}</p>
        <p className="mt-0.5 text-xs opacity-85">{children}</p>
      </div>
    </div>
  );
}
