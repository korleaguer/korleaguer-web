"use client"; // 상대 고르기 알약이 키보드·누르기를 들어서 클라이언트 컴포넌트다(비교 창·이번 주 창 안에서만 쓴다).

import { useRef, type KeyboardEvent, type ReactNode } from "react";
import PlayerAvatar from "@/components/PlayerAvatar";

/** 두 사람을 나란히 견주는 창(두 선수 비교·이번 주 두 선수)의 공통 조각: 고르기 알약, 두 사람 머리, 숫자 표 */

export interface PairPerson {
  nameKo: string;
  photoUrl: string | null;
  teamAbbr: string | null;
  photoTeamAbbr?: string | null;
  /** 이름 아래 흐린 한 줄(팀 '전 애틀랜타', 이번 주 '21타석') */
  sub: string | null;
}

export function PairAvatar({ person, size }: { person: PairPerson; size: 28 | 44 }) {
  return (
    <PlayerAvatar
      nameKo={person.nameKo}
      photoUrl={person.photoUrl}
      teamAbbr={person.teamAbbr}
      photoTeamAbbr={person.photoTeamAbbr}
      size={size}
      eager
    />
  );
}

/**
 * 하나만 고르는 알약 묶음(라디오). 고른 알약은 연파랑 + 굵게(색만으로 구분하지 않는다). 많으면 옆으로 민다.
 * 화살표 키로 옮기면 바로 고른다(라디오 묶음 관례), Tab은 고른 알약에만 멈춘다
 */
export function PillPicker({
  label,
  options,
  picked,
  onPick,
}: {
  /** 묶음 이름(낭독용) */
  label: string;
  options: { key: string; label: string }[];
  picked: string;
  onPick: (key: string) => void;
}) {
  const groupRef = useRef<HTMLDivElement>(null);
  function onKey(e: KeyboardEvent) {
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (step === 0) return;
    e.preventDefault();
    const index = options.findIndex((o) => o.key === picked);
    const next = options[(index + step + options.length) % options.length];
    onPick(next.key);
    groupRef.current?.querySelector<HTMLElement>(`[data-key="${next.key}"]`)?.focus();
  }
  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKey}
      // 알약의 누름 영역(44px)이 스크롤 상자에 잘리지 않게 위아래를 띄운다(news/NewsPlayerPicker와 같다)
      className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto overflow-y-hidden px-4 py-[max(0.25rem,calc(22px-1rem))]"
    >
      {options.map((o) => {
        const on = o.key === picked;
        return (
          <button
            key={o.key}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            data-key={o.key}
            onClick={() => onPick(o.key)}
            className={`press tap-target inline-flex min-h-8 shrink-0 items-center rounded-full px-3 text-label ${
              on ? "bg-accent-soft text-accent-ink" : "bg-surface-2 text-muted hover:text-foreground"
            }`}
          >
            <span className={`bold-reserve whitespace-nowrap ${on ? "font-extrabold" : ""}`} data-text={o.label}>
              {o.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * 두 사람 머리: 사진 원(사진 속 팀 색) · 이름 · 흐린 한 줄, 가운데 흐린 'vs'. 오른쪽 사람은 사진이 바깥쪽에 오게 뒤집는다.
 * 큰 글씨로 줄이 좁아지면(18rem 미만) 사진을 이름 위로 올려 이름이 글자마다 갈리지 않게 한다
 */
export function PairHeads({ a, b }: { a: PairPerson; b: PairPerson }) {
  return (
    <div className="@container grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 pt-3">
      <Head person={a} />
      <span aria-hidden className="text-caption text-muted">
        vs
      </span>
      <Head person={b} right />
    </div>
  );
}

function Head({ person, right = false }: { person: PairPerson; right?: boolean }) {
  return (
    <div
      className={`flex min-w-0 items-center gap-2.5 @max-[18rem]:flex-col @max-[18rem]:gap-1 @max-[18rem]:text-center ${right ? "flex-row-reverse text-right" : ""}`}
    >
      <PairAvatar person={person} size={44} />
      <div className="min-w-0 break-keep [overflow-wrap:anywhere]">
        <p className="text-heading">{person.nameKo}</p>
        {person.sub && <p className="text-meta text-muted tabular-nums">{person.sub}</p>}
      </div>
    </div>
  );
}

export interface PairRow {
  key: string;
  /** 가운데 이름표(글자나 ⓘ가 붙은 조각) */
  label: ReactNode;
  a: string;
  b: string;
  /** 앞선 쪽만 진한 파랑 굵게(기록 표 '1위 숫자'와 같은 규칙). 칠하지 않는 표는 주지 않는다 */
  leadA?: boolean;
  leadB?: boolean;
  /** 이름표에 ⓘ가 있어 줄이 조금 높을 때 */
  tight?: boolean;
}

/** 테두리 숫자 표: 줄마다 [왼쪽 사람 값 | 흐린 이름표 | 오른쪽 사람 값]. 낭독기에는 칠한 칸에 '앞섬'을 붙인다 */
export function PairTable({ caption, aName, bName, rows }: { caption: string; aName: string; bName: string; rows: PairRow[] }) {
  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-line">
      <table className="w-full table-fixed text-center">
        <caption className="sr-only">{caption}</caption>
        <thead className="sr-only">
          <tr>
            <th scope="col">{aName}</th>
            <th scope="col">항목</th>
            <th scope="col">{bName}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row) => (
            <tr key={row.key}>
              <Cell lead={row.leadA === true}>{row.a}</Cell>
              <th scope="row" className={`${row.tight ? "py-1" : "py-2.5"} text-caption font-normal text-muted`}>
                {row.label}
              </th>
              <Cell lead={row.leadB === true}>{row.b}</Cell>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Cell({ lead, children }: { lead: boolean; children: string }) {
  return (
    <td className={`w-[36%] px-1 py-2.5 tabular-nums ${lead ? "text-heading text-accent-ink" : "text-body"}`}>
      {children}
      {lead && <span className="sr-only"> 앞섬</span>}
    </td>
  );
}
