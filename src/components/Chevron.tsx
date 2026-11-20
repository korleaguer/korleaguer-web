/**
 * 누르면 다른 화면이나 창이 열린다는 줄 끝 표시(›). 옆 글자가 뜻을 말하므로 화면 낭독기는 건너뛴다.
 * 거론 구단 알약·막대 줄(home/LinkedTeams), 기록 화면 순위 줄(records/RecordRows), 선수 탭 줄(players/PlayerTimelineRow)이 같이 쓴다. 크기가 rem이라 앱 큰 글씨를 따른다.
 */
export default function Chevron({ small = false }: { small?: boolean }) {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className={`shrink-0 text-muted ${small ? "size-2.5" : "size-3"}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3.5 10.5 8 6 12.5" />
    </svg>
  );
}
