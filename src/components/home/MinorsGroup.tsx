// 시즌 기록 표의 "올해 주로 마이너" 묶음에 쓰는 작은 조각들.

/**
 * 묶음 제목 줄. 표 전체 너비를 차지하고, 표를 가로로 밀어도 글자는 왼쪽에 붙어 있다.
 * 화면 낭독기에는 아래 줄들의 묶음 제목으로 읽힌다.
 */
export function MinorsGroupHeader({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <th
        scope="rowgroup"
        colSpan={colSpan}
        className="border-t border-line bg-surface-2 px-2.5 py-1.5 text-left text-xs font-semibold text-muted"
      >
        <span className="sticky left-4">올해 주로 마이너</span>
      </th>
    </tr>
  );
}

/** 이름 아래 작은 글씨: 마이너에서 뛴 경기 수. 사진(24px) + 간격(8px)만큼 들여 이름 밑에 맞춘다 */
export function MinorGamesNote({ games }: { games: number }) {
  return <span className="mt-0.5 block pl-8 text-[0.6875rem] font-medium text-muted">{`마이너 ${games}경기`}</span>;
}
