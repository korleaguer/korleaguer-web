"use client"; // 끌어서 옮기기(pointer 이벤트)와 버튼·키보드 옮기기가 있어서 클라이언트 컴포넌트다.

import { useLayoutEffect, useOptimistic, useRef, useState, useTransition, type KeyboardEvent, type PointerEvent } from "react";
import { setMyPlayersOrder } from "@/app/my/actions";
import type { PlayerSummary } from "@/lib/api";
import { haptic } from "@/lib/app";
import { callAction } from "@/lib/callAction";
import { moveFocus } from "@/lib/focus";
import type { ToastPress } from "@/lib/toast";
import PlayerAvatar from "@/components/PlayerAvatar";
import { toastSaveFailed } from "./toastSaveFailed";

/** 줄을 옮기는 버튼: 위로·아래로·손잡이(끌기·화살표) */
type Control = "up" | "down" | "handle";

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
 * 저장하지 못하면 원래 순서로 돌아가고, 별 저장과 같은 알림 '저장하지 못했어요' + '다시 시도'를 띄운다(save).
 */
export default function OrderList({ players }: { players: PlayerSummary[] }) {
  const byId = new Map(players.map((p) => [p.id, p]));
  const [saved, setSaved] = useOptimistic(players.map((p) => p.id));
  const [, startTransition] = useTransition();
  const [live, setLive] = useState<number[] | null>(null); // 끄는 동안의 순서
  const [drag, setDrag] = useState<Drag | null>(null);
  const [message, setMessage] = useState("");
  const listRef = useRef<HTMLOListElement>(null);
  /** 옮긴 뒤 포커스를 돌려줄 버튼('<선수 번호>-<up|down|handle>')과 그 버튼이 보이게 화면을 움직일지 */
  const refocusRef = useRef<{ key: string; scroll: boolean } | null>(null);
  // 마지막으로 그린 순서. 알림의 '다시 시도'는 저장에 실패한 때 만든 함수라 그때 값을 들고 있어서, 누르는 때의 순서는 여기서 본다
  const savedRef = useRef(saved);
  const order = live ?? saved;

  useLayoutEffect(() => {
    savedRef.current = saved;
  });

  // 줄을 옮기면 React가 DOM 줄을 다시 꽂으며 그 안의 포커스가 사라질 수 있다. 옮긴 버튼에 다시 포커스를 둔다
  useLayoutEffect(() => {
    const target = refocusRef.current;
    if (!target) return;
    refocusRef.current = null;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-move="${target.key}"]`);
    if (el && document.activeElement !== el) moveFocus(el, target.scroll);
  }, [order]);

  const rowHeight = () => (listRef.current?.firstElementChild as HTMLElement | null)?.offsetHeight ?? 48;
  const listTop = () => listRef.current?.getBoundingClientRect().top ?? 0;

  /** 옮긴 순서를 알리고 저장한다. 알림의 '다시 시도'(옛 화면의 함수)도 부르므로 그린 값 대신 savedRef와 비교한다 */
  function commit(next: number[], movedId: number, control: Control) {
    setMessage(`${byId.get(movedId)?.nameKo ?? ""}, ${next.length}명 중 ${next.indexOf(movedId) + 1}번째`);
    if (next.join() === savedRef.current.join()) return;
    save(next, movedId, control);
  }

  /**
   * 순서를 쿠키에 저장한다. 서버까지 닿지 못하거나(연결 끊김) 서버가 실패하면 서버 함수가 오류를 던진다. 잡지 않으면 화면 전체가
   * 오류 화면(error.tsx)으로 바뀌었다(전수조사 L324). 쿠키 순서는 그대로라 이 전환이 끝나며 목록이 원래 순서로 돌아간다
   * (useOptimistic). 별 저장과 같은 알림을 띄우고, 화면 낭독기에는 그 선수가 원래 자리로 돌아갔다고 알린다
   * (알림 띠도 읽히지만 두 알림이 한꺼번에 오면 낭독기가 하나를 건너뛸 수 있어 목록 알림에도 실패를 넣는다)
   */
  function save(next: number[], movedId: number, control: Control) {
    startTransition(async () => {
      setSaved(next);
      const result = await callAction(() => setMyPlayersOrder(next));
      if (result.ok) return;
      haptic("error");
      // 원래 순서로 돌아가며 줄이 옮겨질 때 그 안의 포커스가 사라지지 않게, 지금 포커스가 있는 이 목록 버튼에 다시 둔다
      const active = document.activeElement;
      if (active instanceof HTMLElement && active.dataset.move && listRef.current?.contains(active)) {
        refocusRef.current = { key: active.dataset.move, scroll: true };
      }
      setMessage(`${byId.get(movedId)?.nameKo ?? ""}, 저장하지 못해 원래 자리로 돌아갔어요`);
      toastSaveFailed(result.failure, (press) => retry(movedId, next.indexOf(movedId), control, press));
    });
  }

  /**
   * 알림 '다시 시도': 못 옮긴 선수를 누르는 때의 순서에서 그 자리(to)로 다시 옮긴다. 실패한 때의 순서를 통째로 다시 보내면
   * 그사이 옮긴 다른 줄이 되돌아간다. 그사이 내 선수에서 빠졌으면 그대로 둔다.
   * 알림 버튼에 포커스가 있었으면(알림과 함께 사라진다) 그 줄의 같은 버튼으로 돌려준다. 키보드로 눌렀을 때만 화면을 움직인다
   */
  function retry(id: number, to: number, control: Control, press: ToastPress) {
    const now = savedRef.current;
    const from = now.indexOf(id);
    if (from < 0) return;
    const next = move(now, from, Math.min(to, now.length - 1));
    if (press.focused) {
      const key = `${id}-${control}`;
      moveFocus(listRef.current?.querySelector<HTMLElement>(`[data-move="${key}"]`), press.keyboard);
      // 순서가 바뀌면 줄이 옮겨지며 포커스가 사라질 수 있어 그린 뒤 다시 둔다(이미 그 자리면 그대로라 남기지 않는다)
      if (next.join() !== now.join()) refocusRef.current = { key, scroll: press.keyboard };
    }
    commit(next, id, control);
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
    if (drag && live) commit(live, drag.id, "handle");
    setDrag(null);
    setLive(null);
  }

  /** 한 칸 위(-1)·아래(1)로. 맨 위·맨 아래면 그대로 */
  function moveBy(id: number, step: -1 | 1, control: Control) {
    const from = order.indexOf(id);
    const to = from + step;
    if (to < 0 || to >= order.length) return;
    refocusRef.current = { key: `${id}-${control}`, scroll: true };
    haptic("select");
    commit(move(order, from, to), id, control);
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
