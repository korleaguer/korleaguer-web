/** 마이너 시즌 기록 표의 팀 옆 작은 알약: 마지막으로 뛴 단계(트리플A 등) */
export default function LevelPill({ level }: { level: string }) {
  return (
    <span className="ml-1.5 inline-flex rounded-full bg-neutral-pill px-1.5 py-0.5 align-middle text-[0.6875rem] font-semibold leading-none text-neutral-pill-fg">
      {level}
    </span>
  );
}
