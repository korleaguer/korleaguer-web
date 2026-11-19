"use client"; // '선수 고르기' 창을 열고 닫는 상태가 있어서 클라이언트 컴포넌트다.

import { useEffect, useRef, useState } from "react";
import type { PlayerSummary } from "@/lib/api";
import type { ReactNode } from "react";
import BottomSheet from "@/components/BottomSheet";
import PlayerAvatar from "@/components/PlayerAvatar";
import { useHistorySheet } from "@/lib/useHistorySheet";
import OrderList from "./OrderList";
import StarIcon from "./StarIcon";
import { useFocusAfterRemove } from "./useFocusAfterRemove";
import { useMyPlayerToggle } from "./useMyPlayerToggle";

interface Props {
  /**
   * 제목 아래 작은 글씨. 예: "내 선수 3명 · 9월 21일(월) ~ 27일(일) · 기준 11월 17일(화) 09:00".
   * 기준 시각은 한 덩어리로 다음 줄에 넘기게 요소(WordGroup)로 감싸 오므로 글자가 아니라 ReactNode다
   */
  subtitle: ReactNode;
  /** 고를 수 있는 선수 전원 */
  players: PlayerSummary[];
  selectedIds: number[];
}

/** '선수 고르기' 창을 열며 쌓은 주소 기록 표시(history.state의 키). 다른 창들의 표시와 다르다 */
const PICKER_STATE = "korleaguerMyPicker";

/**
 * 제목 '내 선수' + 오른쪽 '선수 고르기' 버튼. 누르면 아래에서 올라오는 창(640px 이상은 가운데 창)에 선수 전원 목록이 열리고,
 * 줄을 누르면 넣거나 뺀다(이슈 #326: 예전에는 바로 아래 739px이 열려 카드를 모두 밀어 내렸다).
 * 아무도 안 골랐으면 창 없이 화면에 바로 목록을 둔다(inline): 부제가 "좋아하는 선수를 넣으면"이라고 하는데 버튼 뒤에 숨기면
 * 넣을 곳이 안 보인다(이슈 #185). 마지막 선수를 빼서 0명이 돼도 다시 화면에 둔다.
 * 0명에서 1명이 되어도 그 목록은 그대로 둔다(예전 규칙 유지): 방금 하나를 넣은 사람은 이어서 더 넣을 텐데, 목록이 창으로
 * 바뀌어 사라지면 흐름이 끊긴다. 이때 버튼은 '완료'가 되어 누르면 목록을 접고, 그다음부터는 창 방식이다.
 */
export default function MyHeader({ subtitle, players, selectedIds }: Props) {
  const empty = selectedIds.length === 0;
  const [inline, setInline] = useState(empty);
  // 마지막 선수를 빼서 0명이 되면 목록을 화면에 둔다. 그려진 뒤 바뀐 값이라 effect 대신 렌더 중에 앞 값과 견준다(React 권장 방식).
  // 1명 이상이 돼도 열린 목록은 닫지 않는다
  const [wasEmpty, setWasEmpty] = useState(empty);
  if (empty !== wasEmpty) {
    setWasEmpty(empty);
    if (empty) setInline(true);
  }
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { open, openSheet, close } = useHistorySheet(PICKER_STATE, buttonRef);
  // 창이 열린 채 0명이 되면(창 안에서 마지막 선수를 뺌) 목록이 화면에 놓이니 창은 닫는다(둘이 겹쳐 보이지 않게)
  useEffect(() => {
    if (inline && open) close();
  }, [inline, open, close]);
  // 카드의 별로 선수를 빼서 카드와 함께 포커스가 사라지면 다음 카드 이름(아무도 안 남으면 이 제목)으로 옮긴다.
  // 늘 화면에 있고 고른 선수 목록을 받는 곳이 여기라서 카드 목록 대신 여기서 본다(0명이면 카드 목록 자체가 없어진다)
  const titleRef = useRef<HTMLHeadingElement>(null);
  useFocusAfterRemove(selectedIds, titleRef);
  const selected = new Set(selectedIds);
  // 고른 순서대로 선수 정보. 화면 순서 목록에 쓴다
  const ordered = selectedIds
    .map((id) => players.find((p) => p.id === id))
    .filter((p): p is PlayerSummary => p != null);
  // 2명 이상이면 화면 순서도 이 안에서 바꾼다고 적는다(순서 목록은 2명부터 생기는데 열어 봐야 알 수 있었다, 11-17 점검)
  const label = ordered.length >= 2 ? "선수 고르기 · 순서" : "선수 고르기";

  return (
    <div>
      {/* 제목 칸 기본 폭 5rem: 큰 글씨에서 이만큼도 안 남으면 '선수 고르기' 버튼을 다음 줄로 내린다
          (버튼 옆에서 '내 선수'가 한 글자씩 세 줄로 갈렸다, 이슈 #264) */}
      <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-2 px-1">
        <div className="min-w-0 flex-1 basis-[5rem]">
          {/* tabIndex -1: 마지막 카드를 별로 빼면 포커스를 받는다(Tab 순서에는 넣지 않는다). 포커스 테두리가 글자에 붙게 w-fit */}
          <h1 ref={titleRef} tabIndex={-1} className="w-fit text-display">
            내 선수
          </h1>
          <p className="mt-0.5 text-meta text-muted">{subtitle}</p>
        </div>
        {/* 0명이면 목록이 이미 화면에 있어 버튼을 두지 않는다. 화면에 둔 목록이 남은 채 1명 이상이면 '완료'로 접는다 */}
        {inline ? (
          !empty && (
            <button
              type="button"
              onClick={() => setInline(false)}
              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-surface px-3.5 py-1.5 text-label shadow-[var(--shadow-card)] transition duration-150 hover:shadow-[var(--shadow-card-hover)] press tap-target"
            >
              완료
            </button>
          )
        ) : (
          <button
            ref={buttonRef}
            type="button"
            aria-haspopup="dialog"
            onClick={openSheet}
            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-surface px-3.5 py-1.5 text-label shadow-[var(--shadow-card)] transition duration-150 hover:shadow-[var(--shadow-card-hover)] press tap-target"
          >
            {label}
            <svg
              aria-hidden
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-3.5 text-muted"
            >
              <path d="m6 4 4 4-4 4" />
            </svg>
          </button>
        )}
      </div>

      {inline && (
        <section aria-label="선수 고르기" className="card mt-3 p-2">
          <PickerBody ordered={ordered} players={players} selected={selected} columns="sm:grid-cols-2 lg:grid-cols-3" Heading="h2" />
        </section>
      )}
      {!inline && open && (
        <BottomSheet title={label} onClose={close} bodyClassName="px-2" widthClassName="sm:max-w-2xl">
          <PickerBody ordered={ordered} players={players} selected={selected} columns="sm:grid-cols-2" Heading="h3" />
        </BottomSheet>
      )}
    </div>
  );
}

/** 고르기 내용(순서 목록 · 안내 글 · 선수 전원 목록). 화면에 둔 목록과 창이 같이 쓴다 */
function PickerBody({
  ordered,
  players,
  selected,
  columns,
  Heading,
}: {
  ordered: PlayerSummary[];
  players: PlayerSummary[];
  selected: Set<number>;
  columns: string;
  /** 소제목 단계: 화면에 둔 목록은 h1 아래라 h2, 창은 창 제목(h2) 아래라 h3 */
  Heading: "h2" | "h3";
}) {
  return (
    <>
      {ordered.length >= 2 && (
        <div className="mb-2 border-b border-line pb-2">
          <Heading className="px-2 pb-1 pt-1 text-label text-muted">화면 순서 · 끌거나 버튼으로 바꾸기</Heading>
          <OrderList players={ordered} />
        </div>
      )}
      <Heading className="sr-only">전체 선수</Heading>
      {/* 쿠키라 브라우저마다, 앱이면 앱 안에만 따로 저장된다. '이 기기'라고 쓰면 같은 휴대폰의 다른 브라우저·앱에도 있는 줄 알았다
          (11-17 점검). 앱인지는 html[data-app]로 CSS가 가른다(서버가 그린 글과 어긋나지 않게 둘 다 그려 두고 하나만 보인다).
          좁은 카드에서 두 줄로 감기므로 줄 간격 1.5(바닥글과 같은 이유) */}
      <p className="px-2 pb-1.5 pt-1 text-caption leading-normal text-muted">
        누르면 내 선수에 넣거나 뺄 수 있어요. 가입 없이{" "}
        <span className="in-app:hidden">이 브라우저에만</span>
        <span className="hidden in-app:inline">이 앱에만</span> 저장돼요.
      </p>
      {players.length === 0 ? (
        <p className="px-2 py-3 text-body text-muted">아직 등록된 선수가 없어요.</p>
      ) : (
        <ul className={`grid ${columns}`}>
          {players.map((p) => (
            <PickerRow key={p.id} player={p} initialOn={selected.has(p.id)} />
          ))}
        </ul>
      )}
    </>
  );
}

/** 고르기 목록 한 줄: 사진 · 이름 · 팀 · 별. 줄 전체가 버튼이다 */
function PickerRow({ player, initialOn }: { player: PlayerSummary; initialOn: boolean }) {
  // ref: 알림의 '되돌리기'·'다시 시도'를 누르면 알림과 함께 사라지는 포커스를 이 줄로 돌려받는다.
  // data-my-row: 고르기를 닫았다 다시 열어 이 줄이 새로 그려졌어도 그 알림이 이 선수 줄을 찾는다(useMyPlayerToggle)
  const { on, pending, toggle, ref } = useMyPlayerToggle(player.id, initialOn, player.nameKo);
  // 팀은 카드 이름 아래 줄(metaLine)과 같게: 국내 복귀면 그 팀, FA면 '전 마지막 팀'
  const team = player.returnedKo ?? (player.freeAgent && player.teamKo ? `전 ${player.teamKo}` : player.teamKo);
  const meta = [team, player.positionKo].filter(Boolean).join(" · ");

  return (
    <li>
      <button
        ref={ref}
        type="button"
        aria-pressed={on}
        data-my-row={player.id}
        onClick={toggle}
        className={`press-soft flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition duration-150 hover:bg-surface-2 ${pending ? "opacity-70" : ""}`}
      >
        <PlayerAvatar size={28} nameKo={player.nameKo} photoUrl={player.photoUrl} teamAbbr={player.teamAbbr} />
        <span className="min-w-0 flex-1">
          {/* 별은 이름 바로 뒤(뉴스 선수 고르기와 같은 '사진 이름 ★', 사용자 11-15). 줄 끝에 두면 PC 세 칸에서
              옆 칸 선수 이름에 더 가까워 어느 선수 별인지 헷갈렸다(11-17 점검) */}
          <span className="flex items-center gap-1 text-summary">
            {player.nameKo}
            <StarIcon filled={on} className={`size-4 shrink-0 ${on ? "text-accent-ink" : "text-muted"}`} />
          </span>
          {meta && <span className="block truncate text-meta text-muted">{meta}</span>}
        </span>
        <span className="sr-only">내 선수</span>
      </button>
    </li>
  );
}
