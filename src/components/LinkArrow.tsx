/**
 * 파랑 글자 링크·단추 끝의 꺾쇠(›). 옆 글자가 뜻을 말하므로 화면 낭독기는 건너뛴다. 글자 크기를 따라 커진다(size-3.5).
 * 줄 끝 회색 표시(Chevron)와 달리 글자색을 따른다. muted면 흐린 회색(내 선수 머리 단추처럼 글자는 본문색일 때)
 */
export default function LinkArrow({ muted = false }: { muted?: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={muted ? "size-3.5 text-muted" : "size-3.5"}
    >
      <path d="m6 4 4 4-4 4" />
    </svg>
  );
}
