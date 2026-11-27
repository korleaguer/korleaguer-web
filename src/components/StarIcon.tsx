/** 별 아이콘. filled면 칠한 별(내 선수), 아니면 테두리 별 */
export default function StarIcon({ filled, className = "" }: { filled: boolean; className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      className={className}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinejoin="round"
    >
      <path d="M10 2.6l2.27 4.6 5.08.74-3.67 3.58.87 5.06L10 14.2l-4.55 2.38.87-5.06L2.65 7.94l5.08-.74L10 2.6z" />
    </svg>
  );
}
