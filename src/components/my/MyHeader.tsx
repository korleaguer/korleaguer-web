"use client"; // '선수 고르기'를 열고 닫는 상태가 있어서 클라이언트 컴포넌트다.

import { useState } from "react";
import type { PlayerSummary } from "@/lib/api";
import PlayerAvatar from "@/components/PlayerAvatar";
import OrderList from "./OrderList";
import StarIcon from "./StarIcon";
import { useMyPlayerToggle } from "./useMyPlayerToggle";

interface Props {
  /** 제목 아래 작은 글씨. 예: "고른 선수 3명 · 9월 21일(월) ~ 27일(일)" */
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
  const selected = new Set(selectedIds);
  // 고른 순서대로 선수 정보. 화면 순서 목록에 쓴다
  const ordered = selectedIds
    .map((id) => players.find((p) => p.id === id))
    .filter((p): p is PlayerSummary => p != null);

  return (
    <div>
      <div className="flex items-end justify-between gap-3 px-1">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-[-0.02em]">내 선수</h1>
          <p className="mt-0.5 text-[0.8125rem] text-muted">{subtitle}</p>
        </div>
        <button
          type="button"
          aria-expanded={open}
          aria-controls="my-picker"
          onClick={() => {
            setOpen((v) => !v);
            setOpened(true);
          }}
          className="inline-flex shrink-0 items-center gap-1 rounded-full bg-surface px-3.5 py-1.5 text-[0.8125rem] font-semibold shadow-[var(--shadow-card)] transition duration-150 hover:shadow-[var(--shadow-card-hover)] press tap-target"
        >
          선수 고르기
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
              <h2 className="px-2 pb-1 pt-1 text-xs font-semibold text-muted">화면 순서 · 손잡이를 끌어서 바꾸기</h2>
              <OrderList players={ordered} />
            </div>
          )}
          <h2 className="sr-only">전체 선수</h2>
          <p className="px-2 pb-1.5 pt-1 text-xs text-muted">
            누르면 내 선수에 넣거나 뺄 수 있어요. 가입 없이 이 기기에만 저장돼요.
          </p>
          {players.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted">아직 등록된 선수가 없어요.</p>
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
  const meta = [player.teamKo, player.positionKo].filter(Boolean).join(" · ");

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
          <span className="block text-sm font-bold">{player.nameKo}</span>
          {meta && <span className="block truncate text-xs text-muted">{meta}</span>}
        </span>
        <StarIcon filled={on} className={`size-5 shrink-0 ${on ? "text-accent-ink" : "text-muted"}`} />
        <span className="sr-only">내 선수</span>
      </button>
    </li>
  );
}
