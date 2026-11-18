"use client"; // 줄마다 펼치고 접는 상태를 기억하고, 별을 눌러 순서가 바뀌어도 줄을 그 자리에 두려고 처음 순서를 붙잡아 두는 클라이언트 컴포넌트다.

import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type ReactNode } from "react";
import PlayerAvatar from "@/components/PlayerAvatar";
import { linkedSheetOpen } from "@/components/home/LinkedTeams";

/** 성적표 목록 한 줄. 내용은 서버가 그리고(SeasonReportList), 여기서는 펼치기·접기만 맡는다 */
export interface ReportRow {
  /** 선수 번호 */
  id: number;
  /**
   * 버튼 왼쪽 44px 사진에 쓸 값. 사진은 요소가 아니라 값으로 받아 여기서 그린다(이슈 #295). 서버가 만든 사진 요소
   * (<PlayerAvatar>)를 버튼의 여러 자식 사이에 그대로 두면, 다른 화면에서 홈으로 올 때 그 요소가 늦게 풀려 React가 key 없는
   * 목록 자식으로 보고 'Each child in a list should have a unique "key" prop … It was passed a child from SeasonReportList'
   * 경고를 냈다. 다른 칸(head·spark)은 span 하나로 감싸 자식이 하나라 괜찮다
   */
  photo: { nameKo: string; photoUrl: string | null; teamAbbr: string | null };
  /** 버튼 가운데: 이름·판정·상태와 숫자 한 줄(버튼 안이라 span만) */
  head: ReactNode;
  /** 접혀 있을 때 버튼 오른쪽 작은 달별 막대. 달별 기록이 없으면 null */
  spark: ReactNode;
  /** 버튼 밖 둘째 줄(거론 구단 또는 이번 겨울 기사). 없으면 null */
  second: ReactNode;
  /** 펼친 곳이 둘째 줄과 같은 말을 하면(거론 구단 알약) 펼쳤을 때 둘째 줄을 숨긴다(같은 말 두 번 금지) */
  secondInPanel: boolean;
  /** 펼친 곳 */
  panel: ReactNode;
  /** 펼친 곳에 든 거론 구단 기사 창의 이름(LinkedTeams sheetKey). 없으면 null */
  sheetKey: string | null;
}

/**
 * 홈 '2026 시즌 성적표'의 줄 목록(사용자 11-17 '목록 + 누르면 펼치기', 이슈 #276).
 * 줄마다 WAI-ARIA APG 아코디언: 제목(h3) 안 버튼이 aria-expanded·aria-controls로 펼친 곳(role=region)을 연다.
 * 줄은 서로 따로 펼친다(여럿을 함께 펼쳐 견줄 수 있다). 처음에는 맨 위 줄만 펼친다(내 선수가 있으면 내 선수가 맨 위다).
 * 펼친 상태는 주소에 쓰지 않는다.
 * 별을 누르면 쿠키가 바뀌어 서버가 '내 선수 먼저' 순서로 다시 그리는데, 누른 줄이 그 자리에서 맨 위로 튀면 손가락 밑 내용이
 * 바뀐다(전수조사 P3 '누른 순간엔 자리 유지, 다음 방문 때 순서 반영'). 그래서 처음 그린 순서를 붙잡아 두고, 새로 생긴 줄만 맨 끝에 둔다.
 *
 * 붙잡은 순서는 이번에 들어온 동안만 쓴다. Next 16(cacheComponents)은 다른 화면으로 가도 이 화면을 지우지 않고 숨겨 두었다가
 * 상태째 다시 보여서, /my에서 별을 바꾸고 '홈' 링크로 돌아와도 옛 순서가 남았다(머리는 '내 선수 먼저'인데 뺀 선수가 맨 위에 펼친 채).
 * 그래서 목록을 bfcacheId(이 화면 데이터에 Next가 붙이는 번호)로 묶는다. 링크로 새로 들어오면 번호가 바뀌어 지금 순서로
 * 처음부터 그리고(맨 위 줄만 펼침), 뒤로 가기로 돌아오면 같은 번호라 떠날 때 모습(펼친 줄·순서)이 그대로다.
 * 같은 화면에서 별을 눌러 서버가 다시 그릴 때도 번호가 그대로라 자리를 지킨다. 다른 화면에서 별을 바꾸면 Next가 뒤로 가기용
 * 데이터를 버려서, 뒤로 가기로 와도 새 번호로 다시 그린다.
 */
export default function SeasonReportRows({ rows }: { rows: ReportRow[] }) {
  const { bfcacheId } = useRouter();
  return <RowList key={bfcacheId} rows={rows} />;
}

function RowList({ rows }: { rows: ReportRow[] }) {
  const [firstOrder] = useState(() => rows.map((r) => r.id));
  const at = (id: number) => {
    const i = firstOrder.indexOf(id);
    return i < 0 ? firstOrder.length : i;
  };
  const shown = [...rows].sort((a, b) => at(a.id) - at(b.id));
  return (
    // @container: 줄 폭이 16rem보다 좁으면(앱 큰 글씨) 막대를 글자 아래로 내린다(Row). rem 조건이라 글자 배율을 따라간다
    <ul className="@container divide-y divide-line">
      {shown.map((row) => (
        <Row key={row.id} row={row} defaultOpen={row.id === firstOrder[0]} />
      ))}
    </ul>
  );
}

function Row({ row, defaultOpen }: { row: ReportRow; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  /** 눌러서 펼쳤나: 처음부터 펼쳐 둔 줄은 그대로 서 있고, 누른 줄만 살짝 내려오며 나타난다(.reveal, Still Numbers Rule) */
  const [pressed, setPressed] = useState(false);
  const id = useId();
  const buttonId = `${id}button`;
  const panelId = `${id}panel`;
  const { sheetKey } = row;

  // 이 선수의 거론 구단 창이 열린 채로 돌아오면(기사를 보고 뒤로 가기, 새로 고침) 줄도 펼친다. 접힌 줄 안에 알약이 숨어 있으면
  // 창을 닫을 때 포커스를 돌려줄 곳이 없다(LinkedTeams)
  useEffect(() => {
    if (!sheetKey) return;
    const sync = () => {
      if (linkedSheetOpen(sheetKey)) setOpen(true);
    };
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, [sheetKey]);

  const second = row.second != null && !(open && row.secondInPanel) ? row.second : null;
  return (
    <li>
      <h3>
        {/* 사진 44px | 글자 | 작은 막대 84px. 줄 폭이 16rem보다 좁으면(375px 휴대폰은 앱 큰 글씨 1.25배부터) 막대를 글자 아래로 내린다.
            한 줄에 두면 사진·막대가 px로 자리를 잡아 글자 칸이 한두 글자 폭으로 찌그러졌다. 보통 크기는 320px 휴대폰도 16rem을 넘는다.
            그때는 글자 덩어리가 여러 줄로 길어져서, 가운데 맞춤이면 사진이 이름에서 떨어져 내려가므로 위(이름 줄)에 붙인다.
            -mx-2 px-2: 마우스를 올렸을 때 옅은 바탕이 글자에 붙지 않게 바탕만 카드 여백 쪽으로 넓힌다(내용 자리는 그대로) */}
        <button
          id={buttonId}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => {
            setOpen(!open);
            setPressed(true);
          }}
          className={`press-soft -mx-2 grid w-[calc(100%+1rem)] cursor-pointer grid-cols-[44px_minmax(0,1fr)_84px] items-center gap-x-3 rounded-xl px-2 pt-3 text-left hover:bg-surface-2 @max-[16rem]:grid-cols-[44px_minmax(0,1fr)] @max-[16rem]:items-start ${second ? "pb-1" : open ? "pb-3" : "pb-3 lg:pb-1"}`}
        >
          <PlayerAvatar size={44} nameKo={row.photo.nameKo} photoUrl={row.photo.photoUrl} teamAbbr={row.photo.teamAbbr} />
          <span className="min-w-0">{row.head}</span>
          {open ? (
            // 펼치면 막대 자리에 '접기'(펼친 곳에 큰 막대가 있다). 상태는 aria-expanded가 읽어 주므로 글자는 숨긴다
            <span
              aria-hidden
              className="inline-flex items-center gap-0.5 self-start justify-self-end pt-0.5 text-label text-muted @max-[16rem]:col-start-2 @max-[16rem]:justify-self-start"
            >
              접기
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="size-3.5">
                <path d="M3.5 10 8 5.5 12.5 10" />
              </svg>
            </span>
          ) : (
            row.spark && (
              <span className="justify-self-end @max-[16rem]:col-start-2 @max-[16rem]:mt-1.5 @max-[16rem]:justify-self-start">
                {row.spark}
              </span>
            )
          )}
        </button>
      </h3>
      {second ? (
        // 사진만큼 들여 글자 칸과 줄을 맞춘다. 줄 폭이 16rem보다 좁으면(큰 글씨) 들이지 않고 세 줄까지 흘린다(한 줄이면 '이번 겨울 11…'만 남는다)
        <div className="pb-2 pl-[calc(44px+0.75rem)] @max-[16rem]:pl-0">{second}</div>
      ) : (
        // PC는 접힌 줄 높이를 선수마다 맞춘다: 둘째 줄이 없어도 한 줄 자리를 둔다(전수조사 P3 'PC 높이 들쭉날쭉').
        // 펼친 줄은 펼친 곳이 이어지므로 빈 줄을 두지 않는다
        !open && (
          <div aria-hidden className="hidden pb-2 lg:block">
            <p className="py-1 text-caption">{"\u00a0"}</p>
          </div>
        )
      )}
      <div id={panelId} role="region" aria-labelledby={buttonId} hidden={!open} className={`pb-4 ${pressed ? "reveal" : ""}`}>
        {row.panel}
      </div>
    </li>
  );
}
