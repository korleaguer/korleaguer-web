// 하나만 고르는 라디오 묶음(WAI-ARIA APG Radio Group)의 키 규칙 한 곳.

/**
 * 키로 옮겨 갈 자리(0부터). ←↑ 앞, →↓ 다음(끝에서는 반대쪽 끝으로), Home·End 처음·끝. 다른 키면 null.
 * at은 지금 포커스가 있는 자리, count는 고를 수 있는 것의 수다. 경기별 막대·소속팀 사진·달러/원화가 함께 쓴다.
 * 옮긴 뒤 고르기·포커스·진동은 부품마다 달라서(경기 없는 칸 건너뛰기, 번갈아 보기 등) 부르는 쪽이 한다
 */
export function radioKeyIndex(key: string, at: number, count: number): number | null {
  if (count <= 0) return null;
  const step = key === "ArrowLeft" || key === "ArrowUp" ? -1 : key === "ArrowRight" || key === "ArrowDown" ? 1 : 0;
  if (step !== 0) return (((at + step) % count) + count) % count;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  return null;
}
