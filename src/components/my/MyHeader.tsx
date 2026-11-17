"use client"; // '선수 고르기'를 열고 닫는 상태가 있어서 클라이언트 컴포넌트다.

import { useRef, useState } from "react";
import type { PlayerSummary } from "@/lib/api";
import PlayerAvatar from "@/components/PlayerAvatar";
import OrderList from "./OrderList";
import StarIcon from "./StarIcon";
import { useFocusAfterRemove } from "./useFocusAfterRemove";
import { useMyPlayerToggle } from "./useMyPlayerToggle";

interface Props {
  /** 제목 아래 작은 글씨. 예: "내 선수 3명 · 9월 21일(월) ~ 27일(일)" */
  subtitle: string;
  /** 고를 수 있는 선수 전원 */
  players: PlayerSummary[];
  selectedIds: number[];
}

/**
 * 제목 '내 선수' + 오른쪽 '선수 고르기' 버튼. 누르면 아래에 선수 전원 목록이 열리고, 줄을 누르면 넣거나 뺀다.
 * 아무도 안 골랐으면 처음부터 열어 둔다.
 */
export default function MyHeader({ subtitle, players, selectedIds }: Props) {
  const [open, setOpen] = useState(selectedIds.length === 0);
  // 버튼으로 연 적이 있나. 처음부터 열려 있을 때(아무도 안 골랐을 때)는 움직이지 않고, 눌러서 열 때만 나타나는 움직임을 준다
  const [opened, setOpened] = useState(false);
  // 마지막 선수를 빼서 0명이 되면 목록을 연다. 아래 빈 안내가 "위 목록에서 고르세요"라고 하는데 닫혀 있으면 가리킬 것이 없다(이슈 #185).
  // 그려진 뒤 바뀐 값이라 effect 대신 렌더 중에 앞 값과 견준다(React 권장 방식). 1명 이상이 돼도 열린 목록은 닫지 않는다
  const empty = selectedIds.length === 0;
  const [wasEmpty, setWasEmpty] = useState(empty);
  if (empty !== wasEmpty) {
    setWasEmpty(empty);
    if (empty) {
      setOpen(true);
      setOpened(true);
    }
  }
  // 카드의 별로 선수를 빼서 카드와 함께 포커스가 사라지면 다음 카드 이름(아무도 안 남으면 이 제목)으로 옮긴다.
  // 늘 화면에 있고 고른 선수 목록을 받는 곳이 여기라서 카드 목록 대신 여기서 본다(0명이면 카드 목록 자체가 없어진다)
  const titleRef = useRef<HTMLHeadingElement>(null);
  useFocusAfterRemove(selectedIds, titleRef);
  const selected = new Set(selectedIds);
  // 고른 순서대로 선수 정보. 화면 순서 목록에 쓴다
  const ordered = selectedIds
    .map((id) => players.find((p) => p.id === id))
    .filter((p): p is PlayerSummary => p != null);

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
        <button
          type="button"
          aria-expanded={open}
          aria-controls="my-picker"
          onClick={() => {
            setOpen((v) => !v);
            setOpened(true);
          }}
          className="inline-flex shrink-0 items-center gap-1 rounded-full bg-surface px-3.5 py-1.5 text-label shadow-[var(--shadow-card)] transition duration-150 hover:shadow-[var(--shadow-card-hover)] press tap-target"
        >
          {/* 2명 이상이면 화면 순서도 이 안에서 바꾼다고 적는다(순서 목록은 2명부터 생기는데 열어 봐야 알 수 있었다, 11-17 점검) */}
          {ordered.length >= 2 ? "선수 고르기 · 순서" : "선수 고르기"}
          <svg
            aria-hidden
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`size-3.5 text-muted transition-transform duration-200 motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
          >
            <path d="m4 6 4 4 4-4" />
          </svg>
        </button>
      </div>

      {open && (
        <section id="my-picker" aria-label="선수 고르기" className={`card mt-3 p-2 ${opened ? "reveal" : ""}`}>
          {ordered.length >= 2 && (
            <div className="mb-2 border-b border-line pb-2">
              <h2 className="px-2 pb-1 pt-1 text-label text-muted">화면 순서 · 끌거나 버튼으로 바꾸기</h2>
              <OrderList players={ordered} />
            </div>
          )}
          <h2 className="sr-only">전체 선수</h2>
          <p className="px-2 pb-1.5 pt-1 text-caption text-muted">
            누르면 내 선수에 넣거나 뺄 수 있어요. 가입 없이 이 기기에만 저장돼요.
          </p>
          {players.length === 0 ? (
            <p className="px-2 py-3 text-body text-muted">아직 등록된 선수가 없어요.</p>
          ) : (
            <ul className="grid sm:grid-cols-2 lg:grid-cols-3">
              {players.map((p) => (
                <PickerRow key={p.id} player={p} initialOn={selected.has(p.id)} />
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

/** 고르기 목록 한 줄: 사진 · 이름 · 팀 · 별. 줄 전체가 버튼이다 */
function PickerRow({ player, initialOn }: { player: PlayerSummary; initialOn: boolean }) {
  const { on, pending, toggle } = useMyPlayerToggle(player.id, initialOn, player.nameKo);
  // 팀은 카드 이름 아래 줄(metaLine)과 같게: 국내 복귀면 그 팀, FA면 '전 마지막 팀'
  const team = player.returnedKo ?? (player.freeAgent && player.teamKo ? `전 ${player.teamKo}` : player.teamKo);
  const meta = [team, player.positionKo].filter(Boolean).join(" · ");

  return (
    <li>
      <button
        type="button"
        aria-pressed={on}
        onClick={toggle}
        className={`press-soft flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition duration-150 hover:bg-surface-2 ${pending ? "opacity-70" : ""}`}
      >
        <PlayerAvatar size={28} nameKo={player.nameKo} photoUrl={player.photoUrl} teamAbbr={player.teamAbbr} />
        <span className="min-w-0 flex-1">
          <span className="block text-summary">{player.nameKo}</span>
          {meta && <span className="block truncate text-meta text-muted">{meta}</span>}
        </span>
        <StarIcon filled={on} className={`size-5 shrink-0 ${on ? "text-accent-ink" : "text-muted"}`} />
        <span className="sr-only">내 선수</span>
      </button>
    </li>
  );
}
