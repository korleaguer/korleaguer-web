"use client"; // 끌어서 옮기기(pointer 이벤트)와 버튼·키보드 옮기기가 있어서 클라이언트 컴포넌트다.

import { useLayoutEffect, useOptimistic, useRef, useState, useTransition, type KeyboardEvent, type PointerEvent } from "react";
import { setMyPlayersOrder } from "@/app/my/actions";
import type { PlayerSummary } from "@/lib/api";
import { haptic } from "@/lib/app";
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
 * 끌지 않고도 바꿀 수 있게 줄마다 '위로'·'아래로' 버튼을 둔다(WCAG 2.2 SC 2.5.7, 이슈 #250: 화면 낭독기·스위치·음성 제어).
 * 키보드는 손잡이에 초점을 두고 위·아래 화살표도 된다. 옮기면 쿠키 순서를 바꾸고 카드 순서가 바로 바뀐다.
 * 옮긴 뒤에도 포커스는 옮긴 줄의 같은 버튼에 남는다(줄 순서를 바꾸면 React가 DOM을 옮겨 포커스가 사라질 수 있다).
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
  /** 옮긴 뒤 포커스를 돌려줄 버튼('<선수 번호>-<up|down|handle>') */
  const refocusRef = useRef<string | null>(null);
  const order = live ?? saved;

  // 줄을 옮기면 React가 DOM 줄을 다시 꽂으며 그 안의 포커스가 사라질 수 있다. 옮긴 버튼에 다시 포커스를 둔다
  useLayoutEffect(() => {
    const key = refocusRef.current;
    if (!key) return;
    refocusRef.current = null;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-move="${key}"]`);
    if (el && document.activeElement !== el) el.focus();
  }, [order]);

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
    // 앱 안이면 잡는 순간 가벼운 톡
    haptic("tap");
  }

  function onPointerMove(e: PointerEvent<HTMLButtonElement>) {
    if (!drag || !live) return;
    const y = e.clientY - listTop();
    const to = Math.min(live.length - 1, Math.max(0, Math.round((y - drag.grab) / drag.row)));
    const from = live.indexOf(drag.id);
    if (to !== from) {
      setLive(move(live, from, to));
      // 한 칸 옮길 때마다 고르기 틱(토스처럼 칸을 넘는 것을 손끝에 알린다)
      haptic("select");
    }
    setDrag({ ...drag, y });
  }

  function onPointerEnd() {
    if (drag && live) commit(live, drag.id);
    setDrag(null);
    setLive(null);
  }

  /** 한 칸 위(-1)·아래(1)로. 맨 위·맨 아래면 그대로 */
  function moveBy(id: number, step: -1 | 1, control: "up" | "down" | "handle") {
    const from = order.indexOf(id);
    const to = from + step;
    if (to < 0 || to >= order.length) return;
    refocusRef.current = `${id}-${control}`;
    haptic("select");
    commit(move(order, from, to), id);
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, id: number) {
    const step = e.key === "ArrowUp" ? -1 : e.key === "ArrowDown" ? 1 : 0;
    if (step === 0) return;
    e.preventDefault();
    moveBy(id, step, "handle");
  }

  return (
    <>
      <p id="order-help" className="sr-only">
        줄마다 위로·아래로 버튼이나 키보드 위·아래 화살표로 순서를 옮길 수 있어요. 손잡이를 끌어도 돼요.
      </p>
      {/* PC에서 ▲▼가 이름에서 멀어지지 않게 폭을 줄인다(근접성, 이슈 #257). 줄이 좁으면(@container) 그림용 번호 칸을 숨긴다 */}
      <ol ref={listRef} className="@container relative max-w-md">
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
              className={`flex h-[max(3rem,48px)] items-center gap-[10px] rounded-xl px-1 ${dragging ? "relative z-10 bg-surface shadow-[var(--shadow-card-hover)]" : ""}`}
              style={dragging ? { transform: `translateY(${offset}px)` } : undefined}
            >
              <button
                type="button"
                aria-label={`${player.nameKo} 끌어서 옮기기`}
                aria-describedby="order-help"
                data-move={`${id}-handle`}
                onPointerDown={(e) => onPointerDown(e, id)}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerEnd}
                onPointerCancel={onPointerEnd}
                onKeyDown={(e) => onKeyDown(e, id)}
                className={`tap-target grid size-[36px] shrink-0 touch-none place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-foreground ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
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
              {/* 간격은 px(큰 글씨에서 이름 칸을 지킨다). 줄 폭이 300px보다 좁으면(320px 화면 등) 번호 칸을 숨겨 이름을 남긴다 */}
              <span aria-hidden className="w-4 shrink-0 text-center text-caption font-bold tabular-nums text-muted @max-[300px]:hidden">
                {index + 1}
              </span>
              <PlayerAvatar size={28} nameKo={player.nameKo} photoUrl={player.photoUrl} teamAbbr={player.teamAbbr} />
              <span className="min-w-0 flex-1 truncate text-summary">{player.nameKo}</span>
              {/* ▲▼는 한 묶음(사이 간격 없음): 큰 글씨에서도 이름 칸이 남게(이슈 #257) */}
              <span className="flex shrink-0">
                <MoveButton
                  dir="up"
                  name={player.nameKo}
                  id={id}
                  atEnd={index === 0}
                  onMove={() => moveBy(id, -1, "up")}
                />
                <MoveButton
                  dir="down"
                  name={player.nameKo}
                  id={id}
                  atEnd={index === order.length - 1}
                  onMove={() => moveBy(id, 1, "down")}
                />
              </span>
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

/**
 * 한 칸 위·아래로 버튼(44px). 맨 위의 '위로'·맨 아래의 '아래로'는 끄되 disabled 대신 aria-disabled로 둔다:
 * 옮겨서 끝에 닿은 순간 버튼이 disabled가 되면 그 버튼에 있던 포커스가 사라진다.
 * 크기는 px로 고정한다(앱에서 글자를 키우면 rem 버튼 두 개가 이름 칸을 다 먹었다, 이슈 #257).
 * 꺼진 버튼은 아이콘만 흐리게 한다(버튼 전체를 흐리면 포커스 테두리까지 흐려진다)
 */
function MoveButton({
  dir,
  name,
  id,
  atEnd,
  onMove,
}: {
  dir: "up" | "down";
  name: string;
  id: number;
  atEnd: boolean;
  onMove: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={`${name} ${dir === "up" ? "위로" : "아래로"}`}
      aria-disabled={atEnd || undefined}
      data-move={`${id}-${dir}`}
      onClick={() => {
        if (!atEnd) onMove();
      }}
      // 꺼진 끝 버튼은 눌림 효과(press)도 없앤다(누를 수 있어 보이지 않게)
      className={`grid size-[44px] shrink-0 place-items-center rounded-lg text-muted ${
        atEnd ? "cursor-default [&>svg]:opacity-30" : "press cursor-pointer hover:bg-surface-2 hover:text-foreground"
      }`}
    >
      <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d={dir === "up" ? "m4 10 4-4 4 4" : "m4 6 4 4 4-4"} />
      </svg>
    </button>
  );
}
