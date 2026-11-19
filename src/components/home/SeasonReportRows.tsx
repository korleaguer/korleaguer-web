"use client"; // 고른 줄을 기억하고(휴대폰은 아래 창, PC는 오른쪽 칸), 별을 눌러 순서가 바뀌어도 줄을 그 자리에 두려고 처음 순서를 붙잡아 두는 클라이언트 컴포넌트다.

import Chevron from "@/components/Chevron";
import { useRouter } from "next/navigation";
import { memo, useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode, type TouchEvent as ReactTouchEvent } from "react";
import { createPortal } from "react-dom";
import PlayerAvatar from "@/components/PlayerAvatar";
import { linkedSheetOpen } from "@/components/home/LinkedTeams";
import { useModalDialog } from "@/lib/useModalDialog";
import { useSheetDrag } from "@/lib/useSheetDrag";

/**
 * 성적표 목록 한 줄. 내용은 서버가 그리고(SeasonReportList), 여기서는 줄을 눌러 고른 선수를 보이는 일만 맡는다.
 *
 * 칸 규칙: 서버가 만든 요소 칸(head·spark·second·panel)은 Row에서 늘 감싸개(span·div) 안에 혼자 둔다. 다른 자식과
 * 나란히 두지 않는다. 클라이언트 JSX는 자식이 여럿이면 만들 때 자식마다 'key 검사 끝' 표시를 하는데, 다른 화면에서 올 때
 * 클라이언트 코드가 아직 안 받아진 서버 요소는 나중에 풀리는 자리(lazy)로 와서 표시를 못 한다. 풀린 뒤 React가 그 요소를
 * key 없는 목록 자식으로 검사해 'Each child in a list should have a unique "key" prop … It was passed a child from
 * SeasonReportList' 경고를 냈다(react-dom warnOnInvalidKey, 이슈 #295, 뉴스 → 홈 이동에서 재현). 자식이 하나면 목록 검사를
 * 하지 않는다. 버튼 안 사진은 다른 자식과 나란히 놓여야 해서 요소가 아니라 값(photo)으로 받아 여기서 그린다
 */
export interface ReportRow {
  /** 선수 번호 */
  id: number;
  /** 버튼 왼쪽 44px 사진에 쓸 값(요소가 아닌 까닭은 위 칸 규칙) */
  /** eager: 첫 화면 안 줄이면 사진을 바로 받는다(성적표가 홈 맨 위일 때 앞 줄들, SeasonReportList) */
  photo: { nameKo: string; photoUrl: string | null; teamAbbr: string | null; eager: boolean };
  /** 버튼 가운데: 이름·판정·상태와 숫자 한 줄(버튼 안이라 span만) */
  head: ReactNode;
  /** 버튼 오른쪽 작은 달별 막대(늘 보인다). 달별 기록이 없으면 null */
  spark: ReactNode;
  /** 버튼 밖 둘째 줄(거론 구단 또는 이번 겨울 기사). 없으면 null */
  second: ReactNode;
  /** 자세히 보이는 곳이 둘째 줄과 같은 말을 하면(거론 구단 알약) PC에서 고른 줄의 둘째 줄을 숨긴다(오른쪽 칸과 한 화면에 같이 보여 같은 말 두 번 금지). 휴대폰은 창이 목록을 덮어 겹치지 않는다 */
  secondInPanel: boolean;
  /** 자세히 보이는 곳(휴대폰은 아래 창 몸, PC는 오른쪽 칸). 거론 구단 알약(LinkedTeams)이 들어 있어 한 번에 한 곳에만 그린다 */
  panel: ReactNode;
  /** 자세히 보이는 곳에 든 거론 구단 기사 창의 이름(LinkedTeams sheetKey). 없으면 null */
  sheetKey: string | null;
  /**
   * 줄 모양을 통째로 정할 때(선수 탭 연표, 이슈 #334): 있으면 위 사진·head·spark·둘째 줄 대신 이 내용이 줄 버튼 안을 채운다
   * (버튼 안이라 span만). 눌러서 아래 창·오른쪽 칸이 열리는 일은 그대로다. 없으면 성적표 줄 모양
   */
  line?: ReactNode;
  /** 줄 버튼 밖 오른쪽 위에 놓는 것(별). line이 있을 때만 쓴다. 눌러도 창이 열리지 않는다 */
  star?: ReactNode;
}

/**
 * 홈 '2026 시즌 성적표'의 줄 목록(사용자 11-17 '목록 + 누르면 자세히', 이슈 #276). 펼치는 대신 보이는 곳을 따로 둔다(사용자 11-19, 이슈 #325:
 * 누르면 그 자리에서 펼쳐져 아래가 밀려 내려가 스크롤이 길고 읽기 피곤하다).
 * 휴대폰(lg 미만): 줄만 보이고, 줄을 누르면 자세히(panel)가 아래에서 올라오는 창으로 열린다(ReportSheet).
 * PC(lg 이상): 카드 안 두 칸. 왼쪽 줄 목록, 오른쪽 고른 선수 칸(처음엔 맨 위 줄 = 내 선수가 있으면 내 선수). 줄을 누르면 오른쪽 칸만 바뀐다.
 * panel은 거론 구단(LinkedTeams)을 품고 있어 창과 오른쪽 칸 중 화면 폭에 맞는 한 곳에만 그린다.
 * 별을 누르면 쿠키가 바뀌어 서버가 '내 선수 먼저' 순서로 다시 그리는데, 누른 줄이 그 자리에서 맨 위로 튀면 손가락 밑 내용이
 * 바뀐다(전수조사 P3 '누른 순간엔 자리 유지, 다음 방문 때 순서 반영'). 그래서 처음 그린 순서를 붙잡아 두고, 새로 생긴 줄만 맨 끝에 둔다.
 *
 * 붙잡은 순서는 이번에 들어온 동안만 쓴다. Next 16(cacheComponents)은 다른 화면으로 가도 이 화면을 지우지 않고 숨겨 두었다가
 * 상태째 다시 보여서, /my에서 별을 바꾸고 '홈' 링크로 돌아와도 옛 순서가 남았다(머리는 '내 선수 먼저'인데 뺀 선수가 맨 위에 보인 채).
 * 그래서 목록을 bfcacheId(이 화면 데이터에 Next가 붙이는 번호)로 묶는다. 링크로 새로 들어오면 번호가 바뀌어 지금 순서로
 * 처음부터 그리고(창 닫힘·맨 위 줄 선택), 뒤로 가기로 돌아오면 같은 번호라 떠날 때 모습이 그대로다.
 * 같은 화면에서 별을 눌러 서버가 다시 그릴 때도 번호가 그대로라 자리를 지킨다. 다른 화면에서 별을 바꾸면 Next가 뒤로 가기용
 * 데이터를 버려서, 뒤로 가기로 와도 새 번호로 다시 그린다.
 */
export default function SeasonReportRows({ rows, listHeader }: { rows: ReportRow[]; listHeader?: ReactNode }) {
  const { bfcacheId } = useRouter();
  return <RowList key={bfcacheId} rows={rows} listHeader={listHeader} />;
}

/** 성적표 창을 열며 쌓은 주소 기록 표시(history.state의 키). 값은 'report:<선수 번호>'. LinkedTeams의 SHEET_STATE와 다르다 */
const REPORT_STATE = "korleaguerReportSheet";
/** 오른쪽 칸을 두는 폭(Tailwind lg, 1024px). 이보다 좁으면 휴대폰처럼 아래 창으로 보인다 */
const WIDE_QUERY = "(min-width: 64rem)";
/** 창 몸을 옆으로 이만큼(px) 이상 밀면 이전·다음 선수로 넘긴다 */
const SWIPE_STEP = 60;

const subscribeWide = (onChange: () => void) => {
  const media = window.matchMedia(WIDE_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
};
const getWide = () => window.matchMedia(WIDE_QUERY).matches;
// 서버는 폭을 몰라 넓은 쪽으로 그린다(하이드레이션이 맞는다). 휴대폰이면 붙은 직후 한 번 다시 그린다. 오른쪽 칸은 CSS로도
// lg 미만에서 숨겨 그 사이 잠깐 그려져도 안 보인다
const getWideOnServer = () => true;

/** 주소 기록 표시가 성적표 창의 것이면 그 선수 번호 */
function reportInHistory(state: unknown): number | null {
  const mark = (state as Record<string, unknown> | null)?.[REPORT_STATE];
  if (typeof mark !== "string" || !mark.startsWith("report:")) return null;
  const id = Number(mark.slice("report:".length));
  return Number.isFinite(id) ? id : null;
}

/**
 * memo: 위 SeasonReportRows는 useRouter()를 써서 뒤로 가기마다 다시 그려진다. 줄 데이터가 그대로면 목록은 다시 그리지 않아
 * '표시 다시 붙이기' 효과가 앱 refresh(새 데이터)일 때만 돌게 한다(거론 구단 LinkedTeams가 서버 부품 안이라 그렇게 도는 것과 같다)
 */
const RowList = memo(function RowList({ rows, listHeader }: { rows: ReportRow[]; listHeader?: ReactNode }) {
  const [firstOrder] = useState(() => rows.map((r) => r.id));
  const at = (id: number) => {
    const i = firstOrder.indexOf(id);
    return i < 0 ? firstOrder.length : i;
  };
  const shown = [...rows].sort((a, b) => at(a.id) - at(b.id));
  const wide = useSyncExternalStore(subscribeWide, getWide, getWideOnServer);
  const asideId = `${useId()}aside`;
  const listRef = useRef<HTMLUListElement>(null);
  /** PC: 오른쪽 칸에 보이는 선수(처음엔 맨 위 줄 = 내 선수가 있으면 내 선수) */
  const [picked, setPicked] = useState<number | null>(null);
  /** 휴대폰: 아래 창에 보이는 선수. null이면 창이 닫혀 있다 */
  const [sheetId, setSheetId] = useState<number | null>(null);
  /**
   * 지금 주소 기록이 창을 열며 쌓은 것인가. history.state의 표시만 보면 안 된다: 앱이 화면으로 돌아올 때 부르는
   * router.refresh()가 Next 16에서 우리 표시를 지워서(이슈 #256), 그 뒤 닫으면 쌓은 기록이 빈 채로 남았다(LinkedTeams와 같다)
   */
  const ownsEntryRef = useRef(false);
  /** 창이 닫힌 뒤 포커스를 돌려줄 줄(마지막으로 보인 선수) */
  const shownIdRef = useRef<number | null>(null);
  /** 효과 안 listener가 늘 최신 줄·폭으로 맞추게 하는 함수(효과를 줄이 바뀔 때마다 다시 달면 창이 닫혔다 열린다) */
  const syncRef = useRef<() => void>(() => {});
  /** 닫으려고 뒤로 가기를 불렀고 아직 popstate가 오지 않았다 */
  const closingRef = useRef(false);

  const selectedId = picked ?? firstOrder[0];
  const selected = shown.find((r) => r.id === selectedId) ?? shown[0];
  const sheetIndex = !wide && sheetId !== null ? shown.findIndex((r) => r.id === sheetId) : -1;

  // 뒤로·앞으로 가기: 주소 기록의 표시에 맞춰 창을 열고 닫는다. 표시가 없어도 이 선수의 거론 구단 창이 열려 있으면 그 선수를
  // 보인다: 창 안 거론 구단 알약은 LinkedTeams가 우리 표시 없는 새 기록을 쌓는데, 뒤로 가기 한 번에 거론 구단 창만 닫히고
  // 성적표 창은 남아야 한다. 기사로 갔다가 돌아와 거론 구단 창이 다시 열릴 때도(새로 고침 포함) 그 선수를 같이 맞춘다.
  // 창을 닫을 때 포커스를 돌려줄 알약이 숨어 있지 않게 하는 일이다(LinkedTeams)
  useEffect(() => {
    syncRef.current = () => {
      closingRef.current = false;
      const marked = reportInHistory(window.history.state);
      const linkedRow = marked === null ? shown.find((r) => r.sheetKey && linkedSheetOpen(r.sheetKey)) : undefined;
      const id = marked ?? linkedRow?.id ?? null;
      ownsEntryRef.current = marked !== null;
      if (wide) {
        if (id !== null) setPicked(id);
      } else {
        setSheetId(id);
      }
    };
  });
  useEffect(() => {
    const onPop = () => syncRef.current();
    syncRef.current();
    // 캡처 단계로 받는다: Next의 popstate 처리(뒤로 가기)가 먼저 돌면 이 목록을 그 자리에서 다시 그리는데, 그때 아래 '표시 다시
    // 붙이기' 효과가 ownsEntryRef가 아직 켜진 채로 돌아 돌아온 앞 기록에 창 표시를 붙였다(닫기를 눌러도 창이 다시 열렸다).
    // window에서는 캡처 listener가 먼저 불리므로 Next보다 먼저 ownsEntryRef를 끈다
    window.addEventListener("popstate", onPop, { capture: true });
    return () => {
      window.removeEventListener("popstate", onPop, { capture: true });
      // 다른 화면으로 가며 지워지거나 숨겨지면(Next는 떠난 화면을 숨겨 두었다가 되살린다) 창을 닫아 둔다. 뒤로 가기로
      // 돌아오면 위 sync가 기록대로 다시 연다. 이때 닫히는 창은 포커스를 돌려주지 않는다(LinkedTeams와 같다)
      shownIdRef.current = null;
      setSheetId(null);
    };
  }, []);
  // 폭이 바뀌면(휴대폰 ↔ PC) 기록에 맞춰 다시 맞춘다. 창이 열린 채 넓어지면(태블릿 돌리기) 창은 사라지는데 쌓은 기록이 남아
  // 뒤로 가기를 두 번 눌러야 했다(리뷰 지적). 그 선수를 오른쪽 칸에 두고 창을 닫고 기록을 거둔다. 창이 열려 있는지는
  // shownIdRef(열린 동안 그 선수, 닫히면 null)로 본다
  useEffect(() => {
    const openId = shownIdRef.current;
    if (wide && openId !== null) {
      setPicked(openId);
      setSheetId(null);
      if (ownsEntryRef.current) {
        ownsEntryRef.current = false;
        window.history.back();
      }
      return;
    }
    syncRef.current();
  }, [wide]);

  // 앱이 화면으로 돌아올 때 부르는 router.refresh()는 지금 기록에서 우리 표시를 지운다. 창이 열린 채 우리가 쌓은 기록이면
  // 표시를 다시 붙인다(기사로 갔다가 뒤로 와도 창이 다시 열리게, 이슈 #256). 거론 구단 창이 위에 열려 있으면 그 기록은 건드리지 않는다
  useEffect(() => {
    if (sheetId === null || !ownsEntryRef.current) return;
    if (shown.some((r) => r.sheetKey && linkedSheetOpen(r.sheetKey))) return;
    const state = window.history.state;
    if (reportInHistory(state) === sheetId) return;
    window.history.replaceState({ ...state, [REPORT_STATE]: `report:${sheetId}` }, "");
  });

  // 창이 닫히면 누른 줄로 포커스를 돌려준다(WAI-ARIA APG Dialog). 창은 부품째 지워지며 닫혀서 브라우저가 돌려주지 못한다.
  // 지워지며 포커스를 잃었을 때만(body): 다른 화면으로 가며 닫힌 경우처럼 포커스가 이미 다른 곳에 있으면 빼앗지 않는다
  useEffect(() => {
    if (sheetId !== null) {
      shownIdRef.current = sheetId;
      return;
    }
    const id = shownIdRef.current;
    if (id === null) return;
    shownIdRef.current = null;
    const focused = document.activeElement;
    if (focused && focused !== document.body) return;
    listRef.current?.querySelector<HTMLElement>(`[data-report-row="${id}"]`)?.focus();
  }, [sheetId]);

  // 창 하나에 주소 기록 하나: 이미 창 기록 위면 바꿔 쓰고(창 안에서 이전·다음으로 넘길 때도), 아니면 쌓는다.
  // 주소는 그대로이고, Next가 우리 상태에 자기 상태를 덧붙인다
  const openSheet = (id: number) => {
    const mark = `report:${id}`;
    const state = window.history.state;
    if (state?.[REPORT_STATE]) window.history.replaceState({ ...state, [REPORT_STATE]: mark }, "");
    else window.history.pushState({ [REPORT_STATE]: mark }, "");
    ownsEntryRef.current = true;
    setSheetId(id);
  };
  // 닫기·바깥 누르기·Esc·끌어 내리기: 쌓은 기록이면 뒤로 가기로 지우고(popstate가 창을 닫는다), 아니면 바로 닫는다
  // 닫기 버튼과 바깥 누르기·Esc가 popstate 전에 겹쳐 들어와도 뒤로 가기는 한 번만(두 번이면 홈을 떠난다). popstate가 오면 푼다
  const closeSheet = () => {
    if (closingRef.current) return;
    if (ownsEntryRef.current) {
      closingRef.current = true;
      window.history.back();
    } else setSheetId(null);
  };

  // @container: 줄 폭이 16rem보다 좁으면(앱 큰 글씨) 막대를 글자 아래로 내린다(Row). rem 조건이라 글자 배율을 따라간다
  const list = (
    <ul ref={listRef} className="@container divide-y divide-line">
      {shown.map((row) => (
        <Row
          key={row.id}
          row={row}
          wide={wide}
          current={wide && row.id === selected.id}
          asideId={asideId}
          onPress={() => (wide ? setPicked(row.id) : openSheet(row.id))}
        />
      ))}
    </ul>
  );

  return (
    // lg 이상: 왼쪽 줄 목록 | 오른쪽 고른 선수 칸
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start lg:gap-x-6">
      {/* listHeader(선수 탭 달 눈금)는 왼쪽 줄 목록 칸 위에만 둔다. 없으면 목록이 그대로 격자 칸이다 */}
      {listHeader ? (
        <div className="min-w-0">
          {listHeader}
          {list}
        </div>
      ) : (
        list
      )}
      {/* 오른쪽 칸(PC): 머리(사진·이름·판정·숫자) + 자세히. 줄을 누르면 이 칸만 바뀌어 아래가 밀리지 않는다.
          휴대폰이면 자세히(panel)를 그리지 않는다: panel 안 거론 구단(LinkedTeams)이 창과 이 칸에 둘이면 popstate마다 창이 둘 뜬다 */}
      {wide && (
        <div
          id={asideId}
          role="region"
          aria-label={`${selected.photo.nameKo} 자세히`}
          className="mb-4 mt-3 hidden rounded-2xl border border-line p-4 lg:sticky lg:top-4 lg:block in-app:lg:top-20"
        >
          <div className="flex items-start gap-3">
            <PlayerAvatar size={44} nameKo={selected.photo.nameKo} photoUrl={selected.photo.photoUrl} teamAbbr={selected.photo.teamAbbr} eager={false} />
            <div className="min-w-0 flex-1">{selected.head}</div>
          </div>
          <div key={selected.id} className="mt-3">
            {selected.panel}
          </div>
        </div>
      )}
      {sheetIndex >= 0 && (
        <ReportSheet
          rows={shown}
          index={sheetIndex}
          onGo={(id) => openSheet(id)}
          onClose={closeSheet}
        />
      )}
    </div>
  );
});

function Row({
  row,
  wide,
  current,
  asideId,
  onPress,
}: {
  row: ReportRow;
  wide: boolean;
  current: boolean;
  asideId: string;
  onPress: () => void;
}) {
  // PC에서 고른 줄은 오른쪽 칸이 같은 말을 하면 둘째 줄을 숨긴다(같은 화면에 같이 보인다)
  const second = row.second != null && !(current && row.secondInPanel) ? row.second : null;
  if (row.line) {
    // 줄 모양을 통째로 정한 줄(선수 탭 연표): 버튼 안은 line, 별은 버튼 밖 오른쪽 위(눌러도 창이 열리지 않는다)
    return (
      <li className={current ? "-mx-2 rounded-xl bg-surface-2 px-2" : undefined}>
        <div className="relative">
          <h3>
            <button
              type="button"
              data-report-row={row.id}
              {...(wide
                ? { "aria-controls": asideId, "aria-current": current ? ("true" as const) : undefined }
                : { "aria-haspopup": "dialog" as const })}
              onClick={onPress}
              className="press-soft -mx-2 block w-[calc(100%+1rem)] cursor-pointer rounded-xl px-2 py-3 text-left hover:bg-surface-2"
            >
              <span className="block">{row.line}</span>
            </button>
          </h3>
          {row.star && <span className="absolute right-[-0.5rem] top-1.5">{row.star}</span>}
        </div>
      </li>
    );
  }
  return (
    <li className={current ? "-mx-2 rounded-xl bg-surface-2 px-2" : undefined}>
      <h3>
        {/* 사진 44px | 글자 | 작은 막대 84px. 줄 폭이 16rem보다 좁으면(375px 휴대폰은 앱 큰 글씨 1.25배부터) 막대를 글자 아래로 내린다.
            한 줄에 두면 사진·막대가 px로 자리를 잡아 글자 칸이 한두 글자 폭으로 찌그러졌다. 보통 크기는 320px 휴대폰도 16rem을 넘는다.
            그때는 글자 덩어리가 여러 줄로 길어져서, 가운데 맞춤이면 사진이 이름에서 떨어져 내려가므로 위(이름 줄)에 붙인다.
            -mx-2 px-2: 마우스를 올렸을 때 옅은 바탕이 글자에 붙지 않게 바탕만 카드 여백 쪽으로 넓힌다(내용 자리는 그대로).
            휴대폰은 누르면 아래 창이 열리고(aria-haspopup), PC는 오른쪽 칸(aria-controls)이 바뀐다(aria-current) */}
        <button
          type="button"
          data-report-row={row.id}
          {...(wide
            ? { "aria-controls": asideId, "aria-current": current ? ("true" as const) : undefined }
            : { "aria-haspopup": "dialog" as const })}
          onClick={onPress}
          className={`press-soft -mx-2 grid w-[calc(100%+1rem)] cursor-pointer grid-cols-[44px_minmax(0,1fr)_84px_0.75rem] items-center gap-x-3 rounded-xl px-2 pt-3 text-left hover:bg-surface-2 @max-[16rem]:grid-cols-[44px_minmax(0,1fr)] @max-[16rem]:items-start ${second ? "pb-1" : "pb-3 lg:pb-1"}`}
        >
          {/* 서버 요소 칸(head·spark)은 감싸개 안에 혼자 둔다(ReportRow 칸 규칙: 다른 자식과 나란히 두면 key 경고) */}
          <PlayerAvatar size={44} nameKo={row.photo.nameKo} photoUrl={row.photo.photoUrl} teamAbbr={row.photo.teamAbbr} eager={row.photo.eager} />
          <span className="min-w-0">{row.head}</span>
          {row.spark ? (
            <span className="justify-self-end @max-[16rem]:col-start-2 @max-[16rem]:mt-1.5 @max-[16rem]:justify-self-start">
              {row.spark}
            </span>
          ) : (
            <span className="@max-[16rem]:hidden" />
          )}
          {/* 누르면 자세히(아래 창·PC는 오른쪽 칸)가 열린다는 표시. 예전 목록 맨 위 글 '줄을 누르면 자세히 보여요' 대신(이슈 #329).
              줄 폭이 16rem보다 좁으면(큰 글씨) 막대를 글자 아래로 내리는 모양이라 표시는 뺀다 */}
          <span className="@max-[16rem]:hidden">
            <Chevron />
          </span>
        </button>
      </h3>
      {second ? (
        // 사진만큼 들여 글자 칸과 줄을 맞춘다. 줄 폭이 16rem보다 좁으면(큰 글씨) 들이지 않고 세 줄까지 흘린다(한 줄이면 '이번 겨울 11…'만 남는다)
        <div className="pb-2 pl-[calc(44px+0.75rem)] @max-[16rem]:pl-0">{second}</div>
      ) : (
        // PC는 줄 높이를 선수마다 맞춘다: 둘째 줄이 없어도 한 줄 자리를 둔다(전수조사 P3 'PC 높이 들쭉날쭉')
        <div aria-hidden className="hidden pb-2 lg:block">
          <p className="py-1 text-caption">{" "}</p>
        </div>
      )}
    </li>
  );
}

/**
 * 휴대폰에서 줄을 누르면 아래에서 올라오는 창(이슈 #325). 틀은 거론 구단 창(LinkedTeamSheet)·경기 상세 창(GameDetailSheet)과 같다:
 * <dialog>를 body로 띄우고(createPortal), 모달·스크롤 잠금·앱 알림은 useModalDialog, 아래로 끌어 닫기는 useSheetDrag.
 * 머리: 사진 + head + 닫기. 몸: panel(한 번에 이 창에만 그린다). 바닥: '‹ 이전 선수 · n / 6 · 다음 선수 ›'.
 * 몸을 옆으로 밀어도(가로가 세로보다 크고 SWIPE_STEP 이상) 이전·다음으로 넘긴다. 640px 이상(sm~lg)은 가운데 창이 된다.
 * 뒤로 가기·포커스 돌려주기는 여는 쪽(RowList)이 한다(이 부품은 닫힐 때 통째로 지워진다)
 */
function ReportSheet({
  rows,
  index,
  onGo,
  onClose,
}: {
  rows: ReportRow[];
  index: number;
  onGo: (id: number) => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const touchRef = useRef<{ x: number; y: number } | null>(null);
  const titleId = `${useId()}title`;
  const row = rows[index];
  const prev = index > 0 ? rows[index - 1] : null;
  const next = index < rows.length - 1 ? rows[index + 1] : null;

  useModalDialog(dialogRef);
  const { onDragStart, onDragMove, onDragEnd, close } = useSheetDrag(panelRef, onClose);
  const navRef = useRef<HTMLElement>(null);

  // 끝 선수로 넘기면 방금 누른 '다음'(첫 선수면 '이전') 버튼이 없어져 포커스가 창 밖(body)으로 떨어진다. 남은 넘기기 버튼으로 옮긴다
  useEffect(() => {
    const focused = document.activeElement;
    if (focused && focused !== document.body) return;
    navRef.current?.querySelector<HTMLElement>("button")?.focus();
  }, [index]);

  const onTouchStart = (e: ReactTouchEvent) => {
    const t = e.touches[0];
    touchRef.current = e.touches.length === 1 && t ? { x: t.clientX, y: t.clientY } : null;
  };
  const onTouchEnd = (e: ReactTouchEvent) => {
    const start = touchRef.current;
    const t = e.changedTouches[0];
    touchRef.current = null;
    if (!start || !t) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) <= Math.abs(dy) || Math.abs(dx) < SWIPE_STEP) return;
    const target = dx < 0 ? next : prev;
    if (target) onGo(target.id);
  };

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === dialogRef.current) close();
      }}
      className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none border-0 bg-black/45 p-0 text-foreground open:flex open:items-end open:justify-center sm:open:items-center"
    >
      <div
        ref={panelRef}
        className="game-sheet flex max-h-[84dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-surface shadow-[var(--shadow-card-hover)] sm:max-h-[80dvh] sm:max-w-lg sm:rounded-2xl"
      >
        {/* 끌어 닫는 머리: 앱 안에서도 길게 눌러 글자가 잡히지 않게 select-none */}
        <div
          className="shrink-0 touch-none select-none"
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
        >
          <div aria-hidden className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-line sm:hidden" />
          <div className="flex items-center gap-3 pb-1 pl-4 pr-2 pt-3 sm:pt-4">
            <PlayerAvatar size={44} nameKo={row.photo.nameKo} photoUrl={row.photo.photoUrl} teamAbbr={row.photo.teamAbbr} eager />
            {/* 창 안에서 다른 선수로 넘기면 화면 낭독기가 새 선수를 읽게 한다(제목만 바뀌고 알림이 없었다) */}
            <div id={titleId} aria-live="polite" className="min-w-0 flex-1">
              {row.head}
            </div>
            <button
              type="button"
              aria-label="닫기"
              onClick={close}
              className="press grid size-[44px] shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2"
            >
              <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
            </button>
          </div>
        </div>
        {/* 몸: 선수가 바뀌면 처음부터 다시 그려(key) 스크롤이 맨 위로 돌아온다 */}
        <div key={row.id} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-2 pt-2">
          {row.panel}
        </div>
        {/* 바닥: 목록 순서대로 이전·다음. 끝에서는 그쪽 버튼을 비워 둔다. 아이폰 앱은 아래 탭 막대가 창 위에 떠 있어 그 높이만큼 더 띄운다(globals.css) */}
        <nav
          ref={navRef}
          aria-label="선수 넘기기"
          className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-2 border-t border-line px-2 pb-[calc(env(safe-area-inset-bottom)+0.25rem)] pt-1 in-ios-app:pb-[calc(var(--app-tab-bar)+0.25rem)]"
        >
          {prev ? (
            <button
              type="button"
              onClick={() => onGo(prev.id)}
              className="press flex min-h-11 min-w-0 cursor-pointer items-center justify-start gap-1 rounded-lg px-2 text-label hover:bg-surface-2"
            >
              <span aria-hidden>‹</span>
              <span className="sr-only">이전 선수 </span>
              <span className="truncate">{prev.photo.nameKo}</span>
            </button>
          ) : (
            <span />
          )}
          <span className="text-caption text-muted tabular-nums">
            {index + 1} / {rows.length}
          </span>
          {next ? (
            <button
              type="button"
              onClick={() => onGo(next.id)}
              className="press flex min-h-11 min-w-0 cursor-pointer items-center justify-end gap-1 rounded-lg px-2 text-label hover:bg-surface-2"
            >
              <span className="sr-only">다음 선수 </span>
              <span className="truncate">{next.photo.nameKo}</span>
              <span aria-hidden>›</span>
            </button>
          ) : (
            <span />
          )}
        </nav>
      </div>
    </dialog>,
    document.body,
  );
}
