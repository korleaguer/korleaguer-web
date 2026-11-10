/** 새 탭으로 열리는 링크 옆 화살표(↗). 글자 크기를 따르고, 옆 글자가 뜻을 말하므로 화면 낭독기는 건너뛴다. */
export default function ExternalLinkIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="inline-block size-[0.875em] shrink-0"
    >
      <path d="M5.5 10.5 11 5M6 5h5v5" />
    </svg>
  );
}
