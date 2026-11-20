/**
 * 아래 창(경기 상세·거론 구단·성적표·BottomSheet) 머리 오른쪽의 닫기 버튼. 창 네 곳이 같은 모양을 쓴다.
 * 누르는 자리는 44px(iOS 최소 크기)이고, 보이는 것은 그 가운데 32px 회색 동그라미 안의 X다(iOS 시트의 닫기와 같은 꼴).
 * 예전에는 회색 X만 있어 누르는 곳인지 덜 보였고, 창을 열 때 이 버튼이 포커스를 받아 아이폰에서 44px 파란 테두리가
 * 동그랗게 그려졌다(이슈 #354, 지금은 창 자체가 포커스를 받는다: useModalDialog).
 * 키보드로 왔을 때의 포커스 테두리는 44px 바깥이 아니라 보이는 동그라미에 붙인다.
 */
export default function SheetCloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label="닫기"
      onClick={onClick}
      className="press group grid size-[44px] shrink-0 cursor-pointer place-items-center rounded-full text-muted focus-visible:outline-none"
    >
      <span
        aria-hidden
        className="grid size-8 place-items-center rounded-full bg-surface-2 transition-colors group-hover:bg-line group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-accent group-focus-visible:outline-solid"
      >
        <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M4 4l8 8M12 4l-8 8" />
        </svg>
      </span>
    </button>
  );
}
