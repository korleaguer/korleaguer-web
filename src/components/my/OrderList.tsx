"use client"; // 끌어서 옮기기(pointer 이벤트)와 키보드 옮기기가 있어서 클라이언트 컴포넌트다.

import { useOptimistic, useRef, useState, useTransition, type KeyboardEvent, type PointerEvent } from "react";
import { setMyPlayersOrder } from "@/app/my/actions";
import type { PlayerSummary } from "@/lib/api";
import PlayerAvatar from "@/components/PlayerAvatar";

interface Drag {
  id: number;
  /** 목록 위끝에서 잰 포인터 위치(px) */
  y: number;
  /** 잡은 줄 안에서 포인터가 있는 높이(px). 줄이 손가락을 따라오게 한다 */
  grab: number;
  /** 줄 높이(px). 잡을 때 한 번 잰다 */
  row: number;
}

/** 배열에서 from 자리 값을 to 자리로 옮긴 새 배열 */
function move<T>(list: readonly T[], from: number, to: number): T[] {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/**
 * '내 선수' 화면 순서 목록. 손잡이를 마우스·손가락으로 끌어 위아래로 옮긴다.
 * 키보드는 손잡이에 초점을 두고 위·아래 화살표. 놓으면 쿠키 순서를 바꾸고 카드 순서가 바로 바뀐다.
 * 줄 높이가 모두 같다고 보고(한 줄 48px) 포인터 위치로 들어갈 자리를 정한다.
 */
export default function OrderList({ players }: { players: PlayerSummary[] }) {
  const byId = new Map(players.map((p) => [p.id, p]));
  const [saved, setSaved] = useOptimistic(players.map((p) => p.id));
  const [, startTransition] = useTransition();
  const [live, setLive] = useState<number[] | null>(null); // 끄는 동안의 순서
  const [drag, setDrag] = useState<Drag | null>(null);
  const [message, setMessage] = useState("");
  const listRef = useRef<HTMLOListElement>(null);
  const order = live ?? saved;

  const rowHeight = () => (listRef.current?.firstElementChild as HTMLElement | null)?.offsetHeight ?? 48;
  const listTop = () => listRef.current?.getBoundingClientRect().top ?? 0;

  function commit(next: number[], movedId: number) {
    const name = byId.get(movedId)?.nameKo ?? "";
    setMessage(`${name}, ${next.length}명 중 ${next.indexOf(movedId) + 1}번째`);
    if (next.join() === saved.join()) return;
    startTransition(async () => {
      setSaved(next);
      await setMyPlayersOrder(next);
    });
  }

  function onPointerDown(e: PointerEvent<HTMLButtonElement>, id: number) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const y = e.clientY - listTop();
    const row = rowHeight();
    setDrag({ id, y, grab: y - order.indexOf(id) * row, row });
    setLive(order);
  }

  function onPointerMove(e: PointerEvent<HTMLButtonElement>) {
    if (!drag || !live) return;
    const y = e.clientY - listTop();
    const to = Math.min(live.length - 1, Math.max(0, Math.round((y - drag.grab) / drag.row)));
    const from = live.indexOf(drag.id);
    if (to !== from) setLive(move(live, from, to));
    setDrag({ ...drag, y });
  }

  function onPointerEnd() {
    if (drag && live) commit(live, drag.id);
    setDrag(null);
    setLive(null);
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, id: number) {
    const step = e.key === "ArrowUp" ? -1 : e.key === "ArrowDown" ? 1 : 0;
    if (step === 0) return;
    e.preventDefault();
    const from = order.indexOf(id);
    const to = from + step;
    if (to < 0 || to >= order.length) return;
    commit(move(order, from, to), id);
  }

  return (
    <>
      <p id="order-help" className="sr-only">
        위·아래 화살표로 순서를 옮깁니다. 마우스나 손가락으로 손잡이를 끌어도 됩니다.
      </p>
      <ol ref={listRef} className="relative">
        {order.map((id, index) => {
          const player = byId.get(id);
          if (!player) return null;
          const dragging = drag?.id === id;
          // 끄는 줄은 포인터를 따라 움직이되 목록 밖으로는 나가지 않는다.
          const offset = dragging
            ? Math.min(
                (order.length - 1 - index) * drag.row,
                Math.max(-index * drag.row, drag.y - drag.grab - index * drag.row),
              )
            : 0;
          return (
            <li
              key={id}
              className={`flex h-12 items-center gap-2.5 rounded-xl px-1 ${dragging ? "relative z-10 bg-surface shadow-[var(--shadow-card-hover)]" : ""}`}
              style={dragging ? { transform: `translateY(${offset}px)` } : undefined}
            >
              <button
                type="button"
                aria-label={`${player.nameKo} 순서 옮기기`}
                aria-describedby="order-help"
                onPointerDown={(e) => onPointerDown(e, id)}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerEnd}
                onPointerCancel={onPointerEnd}
                onKeyDown={(e) => onKeyDown(e, id)}
                className={`grid size-9 shrink-0 touch-none place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-foreground ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
              >
                <svg aria-hidden viewBox="0 0 16 16" className="size-4 fill-current">
                  <circle cx="5.5" cy="3.5" r="1.25" />
                  <circle cx="10.5" cy="3.5" r="1.25" />
                  <circle cx="5.5" cy="8" r="1.25" />
                  <circle cx="10.5" cy="8" r="1.25" />
                  <circle cx="5.5" cy="12.5" r="1.25" />
                  <circle cx="10.5" cy="12.5" r="1.25" />
                </svg>
              </button>
              <span aria-hidden className="w-4 shrink-0 text-center text-xs font-bold tabular-nums text-muted">
                {index + 1}
              </span>
              <PlayerAvatar size={28} nameKo={player.nameKo} photoUrl={player.photoUrl} teamAbbr={player.teamAbbr} />
              <span className="min-w-0 flex-1 truncate text-sm font-bold">{player.nameKo}</span>
            </li>
          );
        })}
      </ol>
      <p aria-live="polite" className="sr-only">
        {message}
      </p>
    </>
  );
}
