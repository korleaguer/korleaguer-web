// 시즌 기록 표의 마이너 줄에 쓰는 작은 조각들(이슈 #88).

/**
 * 같은 선수의 메이저 줄 바로 밑 마이너 줄의 이름 칸. 사진(24px) + 간격(8px)만큼 들여 이름 밑에 맞춘다.
 * 화면에는 '마이너'만 보이고, 화면 낭독기에는 선수 이름도 읽어 준다.
 */
export function MinorRowLabel({ nameKo }: { nameKo: string }) {
  return (
    <span className="block pl-8 text-xs font-semibold text-muted">
      <span className="sr-only">{nameKo} </span>마이너
    </span>
  );
}

/**
 * 메이저 줄이 없는(마이너에서만 뛴) 선수 묶음의 제목 줄. 표 전체 너비를 차지하고,
 * 표를 가로로 밀어도 글자는 왼쪽에 붙어 있다. 화면 낭독기에는 아래 줄들의 묶음 제목으로 읽힌다.
 */
export function MinorsOnlyHeader({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <th
        scope="rowgroup"
        colSpan={colSpan}
        className="border-t border-line bg-surface-2 px-2.5 py-1.5 text-left text-xs font-semibold text-muted"
      >
        <span className="sticky left-4">마이너에서만 뛴 선수</span>
      </th>
    </tr>
  );
}
