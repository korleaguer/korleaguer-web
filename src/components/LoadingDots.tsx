import type { ReactNode } from "react";

/**
 * 기다리는 동안 글자 대신 점 3개(토스 버튼 로딩처럼). 글자는 투명하게 남겨 두어 버튼 폭이 그대로다.
 * 화면 낭독기는 글자를 그대로 읽고, 점은 건너뛴다.
 */
export default function LoadingDots({ loading, children }: { loading: boolean; children: ReactNode }) {
  return (
    <span className="relative inline-grid place-items-center">
      <span className={loading ? "opacity-0" : undefined}>{children}</span>
      {loading && (
        <span aria-hidden className="loading-dots absolute">
          <span />
          <span />
          <span />
        </span>
      )}
    </span>
  );
}
