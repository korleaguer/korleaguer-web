"use client"; // 누르면 창을 열고, 창 안에서 상대를 고르는 상태가 있어서 클라이언트 컴포넌트다.

import { useRef, useState, type KeyboardEvent } from "react";
import type { CompareLine, SamePair } from "@/lib/api";
import BottomSheet from "@/components/BottomSheet";
import Chevron from "@/components/Chevron";
import InfoTip from "@/components/InfoTip";
import PlayerAvatar from "@/components/PlayerAvatar";
import SheetOpener from "@/components/SheetOpener";
import { SameGamesSheetBody, sameGamesRecord, sameGamesTitle } from "@/components/compare/SameGames";
import { COMPARE_ROWS, leads, sampleNote, type CompareKey } from "@/lib/compare";
import { formatRate, teamLabel, withAndParticle } from "@/lib/format";
import { signedPct } from "@/lib/leagueWords";
import { useHistorySheet } from "@/lib/useHistorySheet";

/** 창을 열며 쌓는 주소 기록 표시 */
const HISTORY_STATE = "korleaguerCompare";
/** 비교 창 안에서 여는 같은 경기 창의 표시. 선수 페이지 '같은 경기에 나온 선수' 줄의 표시와 달라야 한다(같으면 그 줄의 창도 같이 열린다) */
const sameStateKey = (otherId: number) => `korleaguerCompareSame${otherId}`;

/**
 * 선수 페이지 '○○○과 비교 ›' 줄과 두 선수 비교 창(사용자 11-22 시안 1B, 이슈 #422).
 * 줄: 흰 카드 한 줄(두 사람 사진 원 + '김혜성과 비교' + ›). 처음 상대(initialId)는 서버에서 고른다(lib/compare pickDefaultOpponent).
 * 창: 상대 고르기 알약 → 두 사람 → 숫자 표(평균 대비 + 6줄, 앞선 숫자만 진한 파랑 굵게) → 맨 아래 '같은 경기 n번 · 팀 전적 ›'.
 * 창 안에서 상대를 바꿔도 줄의 이름은 그대로다(처음 고른 상대). 창은 뒤로 가기로 닫힌다(useHistorySheet).
 */
export default function CompareEntry({
  me,
  others,
  initialId,
  pairs,
  season,
}: {
  me: CompareLine;
  /** 견줄 상대(하나 이상) */
  others: CompareLine[];
  /** 처음 보일 상대 */
  initialId: number;
  /** 이 선수의 같은 경기 묶음(상대마다). 없는 상대는 맨 아래 줄이 없다 */
  pairs: SamePair[];
  season: number;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { open, openSheet, close } = useHistorySheet(HISTORY_STATE, buttonRef);
  const [pickedId, setPickedId] = useState(initialId);
  const first = others.find((o) => o.player.id === initialId) ?? others[0];
  const picked = others.find((o) => o.player.id === pickedId) ?? first;
  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="dialog"
        onClick={openSheet}
        className="card press-soft flex min-h-14 w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left"
      >
        <span className="flex shrink-0 -space-x-2">
          <Avatar line={me} size={28} />
          <Avatar line={first} size={28} />
        </span>
        <span className="min-w-0 flex-1 text-button">{`${withAndParticle(first.player.nameKo)} 비교`}</span>
        <Chevron small />
      </button>
      {open && (
        <BottomSheet title="두 선수 비교" onClose={close}>
          <CompareBody me={me} others={others} picked={picked} onPick={setPickedId} pairs={pairs} season={season} />
        </BottomSheet>
      )}
    </>
  );
}

function Avatar({ line, size }: { line: CompareLine; size: 28 | 44 }) {
  const p = line.player;
  return <PlayerAvatar nameKo={p.nameKo} photoUrl={p.photoUrl} teamAbbr={p.teamAbbr} photoTeamAbbr={p.photoTeamAbbr} size={size} eager />;
}

function CompareBody({
  me,
  others,
  picked,
  onPick,
  pairs,
  season,
}: {
  me: CompareLine;
  others: CompareLine[];
  picked: CompareLine;
  onPick: (id: number) => void;
  pairs: SamePair[];
  season: number;
}) {
  const pair = pairs.find((p) => p.other.playerId === picked.player.id) ?? null;
  const notes = [sampleNote(me), sampleNote(picked)].filter((n): n is string => n != null);
  const showPlus = me.wrcPlus != null && picked.wrcPlus != null;
  return (
    <div>
      {others.length > 1 && <Picker others={others} pickedId={picked.player.id} onPick={onPick} />}
      {/* 큰 글씨로 줄이 좁아지면(18rem 미만) 사진을 이름 위로 올려 이름이 글자마다 갈리지 않게 한다 */}
      <div className="@container grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 pt-3">
        <Head line={me} />
        <span aria-hidden className="text-caption text-muted">
          vs
        </span>
        <Head line={picked} right />
      </div>
      <div className="mt-3 overflow-hidden rounded-xl border border-line">
        <table className="w-full table-fixed text-center">
          <caption className="sr-only">{`${me.player.nameKo}, ${picked.player.nameKo} ${season} 시즌 메이저 기록`}</caption>
          <thead className="sr-only">
            <tr>
              <th scope="col">{me.player.nameKo}</th>
              <th scope="col">항목</th>
              <th scope="col">{picked.player.nameKo}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {showPlus && (
              <tr>
                <Cell lead={leads("plus", me, picked)}>{signedPct(me.wrcPlus!)}</Cell>
                <th scope="row" className="py-1 text-caption font-normal text-muted">
                  <span className="inline-flex items-center gap-0.5">
                    평균 대비
                    <InfoTip
                      title="평균 대비"
                      lines={[
                        "'+2%'는 리그 평균 타자를 100으로 놓고 견준 값(wRC+ 102)이에요. 안타뿐 아니라 볼넷과 장타까지 담았어요.",
                        "파란 숫자가 앞선 쪽이에요. 한쪽이 100타석이 안 되면 칠하지 않고, 경기 수가 1.5배 넘게 다르면 홈런·타점·도루는 칠하지 않아요.",
                        "평균 대비는 평균보다 잘 친 쪽만 칠해요.",
                      ]}
                    />
                  </span>
                </th>
                <Cell lead={leads("plus", picked, me)}>{signedPct(picked.wrcPlus!)}</Cell>
              </tr>
            )}
            {COMPARE_ROWS.map((row) => (
              <tr key={row.key}>
                <Cell lead={leads(row.key, me, picked)}>{value(me, row.key, row.rate)}</Cell>
                <th scope="row" className="py-2.5 text-caption font-normal text-muted">
                  {row.label}
                </th>
                <Cell lead={leads(row.key, picked, me)}>{value(picked, row.key, row.rate)}</Cell>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {notes.length > 0 && <p className="mt-2 text-center text-meta text-muted tabular-nums">{notes.join(" · ")}</p>}
      {pair && (
        <div className="-mx-4 mt-3 border-t border-line">
          <SheetOpener
            stateKey={sameStateKey(picked.player.id)}
            sheetTitle={sameGamesTitle(me.player.nameKo, pair)}
            className="press-soft flex min-h-11 w-full cursor-pointer items-center justify-between gap-2 px-4 py-2.5 text-left text-button text-accent-ink"
            label={
              <>
                <span>
                  {`같은 경기 ${pair.games}번`}
                  <span className="font-normal text-muted">{` · ${sameGamesRecord(pair, me.player.nameKo)}`}</span>
                </span>
                <Chevron small />
              </>
            }
          >
            <SameGamesSheetBody pair={pair} nameKo={me.player.nameKo} />
          </SheetOpener>
        </div>
      )}
    </div>
  );
}

function value(line: CompareLine, key: Exclude<CompareKey, "plus">, rate: boolean): string {
  const v = line[key];
  return rate ? formatRate(v) : String(v ?? "-");
}

/** 숫자 칸. 앞선 쪽만 진한 파랑 굵게(기록 표 '1위 숫자'와 같은 규칙), 낭독기에는 '앞섬'을 붙인다 */
function Cell({ lead, children }: { lead: boolean; children: string }) {
  return (
    <td className={`w-[36%] px-1 py-2.5 tabular-nums ${lead ? "text-heading text-accent-ink" : "text-body"}`}>
      {children}
      {lead && <span className="sr-only"> 앞섬</span>}
    </td>
  );
}

/** 두 사람 머리: 사진 원(사진 속 팀 색) · 이름 · 팀('전 애틀랜타'). 오른쪽 사람은 사진이 바깥쪽에 오게 뒤집는다 */
function Head({ line, right = false }: { line: CompareLine; right?: boolean }) {
  return (
    <div
      className={`flex min-w-0 items-center gap-2.5 @max-[18rem]:flex-col @max-[18rem]:gap-1 @max-[18rem]:text-center ${right ? "flex-row-reverse text-right" : ""}`}
    >
      <Avatar line={line} size={44} />
      <div className="min-w-0 break-keep [overflow-wrap:anywhere]">
        <p className="text-heading">{line.player.nameKo}</p>
        <p className="text-meta text-muted">{teamLabel(line.player)}</p>
      </div>
    </div>
  );
}

/**
 * 상대 고르기: 누르는 알약(하나만 고르는 라디오 묶음). 고른 알약은 연파랑 + 굵게(색만으로 구분하지 않는다). 많으면 옆으로 민다.
 * 화살표 키로 옮기면 바로 고른다(라디오 묶음 관례), Tab은 고른 알약에만 멈춘다
 */
function Picker({ others, pickedId, onPick }: { others: CompareLine[]; pickedId: number; onPick: (id: number) => void }) {
  const groupRef = useRef<HTMLDivElement>(null);
  function onKey(e: KeyboardEvent) {
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (step === 0) return;
    e.preventDefault();
    const index = others.findIndex((o) => o.player.id === pickedId);
    const next = others[(index + step + others.length) % others.length];
    onPick(next.player.id);
    groupRef.current?.querySelector<HTMLElement>(`[data-player="${next.player.id}"]`)?.focus();
  }
  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label="비교할 선수"
      onKeyDown={onKey}
      // 알약의 누름 영역(44px)이 스크롤 상자에 잘리지 않게 위아래를 띄운다(news/NewsPlayerPicker와 같다)
      className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto overflow-y-hidden px-4 py-[max(0.25rem,calc(22px-1rem))]"
    >
      {others.map((o) => {
        const on = o.player.id === pickedId;
        return (
          <button
            key={o.player.id}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            data-player={o.player.id}
            onClick={() => onPick(o.player.id)}
            className={`press tap-target inline-flex min-h-8 shrink-0 items-center rounded-full px-3 text-label ${
              on ? "bg-accent-soft text-accent-ink" : "bg-surface-2 text-muted hover:text-foreground"
            }`}
          >
            <span className={`bold-reserve whitespace-nowrap ${on ? "font-extrabold" : ""}`} data-text={o.player.nameKo}>
              {o.player.nameKo}
            </span>
          </button>
        );
      })}
    </div>
  );
}
