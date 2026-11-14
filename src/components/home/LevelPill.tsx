/** 마이너 시즌 기록 줄의 팀 옆 작은 알약: 마지막으로 뛴 단계(트리플A 등). className으로 앞 간격을 바꾼다 */
export default function LevelPill({ level, className = "ml-1.5" }: { level: string; className?: string }) {
  return (
    <span
      // leading-none: 기록 표 마이너 줄 안에 들어가 줄 높이를 키우지 않게(이슈 #204 리뷰)
      className={`inline-flex rounded-full bg-neutral-pill px-1.5 py-0.5 align-middle text-badge leading-none text-neutral-pill-fg ${className}`}
    >
      {level}
    </span>
  );
}
