/**
 * 앞뒤로 한 칸 옮기는 44px 둥근 화살표 버튼: 경기 상세 창의 이전·다음 경기, 내 선수 카드의 고른 경기 앞뒤.
 * 두 곳이 같은 모양을 따로 그리면 한쪽만 고쳐져 어긋나서(이슈 #256 같은 수정) 이것 하나를 같이 쓴다.
 * 크기는 글자 배율과 상관없이 44px(px)다(누름 영역 기준, 큰 글씨에서 rem이면 너무 커졌다, 이슈 #264). 아이콘 그림(1rem)은 글자와 함께 커진다.
 * 끝이라 옮길 곳이 없으면(onClick null) 끄되 disabled 대신 aria-disabled로 둔다: 누른 버튼이 disabled가 되면 포커스가 사라지고,
 * 반대 버튼으로 옮기면 Enter를 누르고 있을 때 앞뒤로 오락가락한다(내 선수 순서 버튼과 같다). 꺼진 버튼은 아이콘만 흐리게 해서
 * 포커스 테두리는 또렷하게 남긴다.
 */
export default function StepButton({
  dir,
  label,
  onClick,
  hoverClass,
}: {
  dir: "prev" | "next";
  label: string;
  /** 누르면 할 일. 끝이라 옮길 곳이 없으면 null(꺼진 버튼) */
  onClick: (() => void) | null;
  /** 켜진 버튼에 마우스를 올렸을 때 모양(원 색·커서). 놓인 바탕에 맞춘다(흰 창 위면 surface-2, 회색 칸 위면 한 단계 다른 회색 line) */
  hoverClass: string;
}) {
  const off = !onClick;
  return (
    <button
      type="button"
      aria-label={label}
      aria-disabled={off || undefined}
      onClick={() => onClick?.()}
      className={`grid size-[44px] shrink-0 place-items-center rounded-full text-muted ${
        off ? "cursor-default [&>svg]:opacity-30" : `press ${hoverClass}`
      }`}
    >
      <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d={dir === "prev" ? "M10 3 5 8l5 5" : "m6 3 5 5-5 5"} />
      </svg>
    </button>
  );
}
