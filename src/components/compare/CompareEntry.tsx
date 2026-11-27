"use client"; // 누르면 창을 열고, 창 안에서 상대를 고르는 상태가 있어서 클라이언트 컴포넌트다.

import { useRef, useState } from "react";
import type { CompareLine, SamePair } from "@/lib/api";
import BottomSheet from "@/components/BottomSheet";
import Chevron from "@/components/Chevron";
import InfoTip from "@/components/InfoTip";
import { PairAvatar, PairHeads, PairTable, PillPicker, type PairPerson, type PairRow } from "@/components/PairTable";
import SheetOpener from "@/components/SheetOpener";
import { SameGamesSheetBody, sameGamesRecord, sameGamesTitle } from "@/components/SameGamesSheet";
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
          <PairAvatar person={person(me)} size={28} />
          <PairAvatar person={person(first)} size={28} />
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

/** 비교 줄의 선수를 공통 머리 모양으로: 이름 아래는 팀('전 애틀랜타') */
function person(line: CompareLine): PairPerson {
  const p = line.player;
  return { nameKo: p.nameKo, photoUrl: p.photoUrl, teamAbbr: p.teamAbbr, photoTeamAbbr: p.photoTeamAbbr, sub: teamLabel(p) };
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
  const rows: PairRow[] = COMPARE_ROWS.map((row) => ({
    key: row.key,
    label: row.label,
    a: value(me, row.key, row.rate),
    b: value(picked, row.key, row.rate),
    leadA: leads(row.key, me, picked),
    leadB: leads(row.key, picked, me),
  }));
  if (me.wrcPlus != null && picked.wrcPlus != null) {
    rows.unshift({
      key: "plus",
      tight: true,
      label: (
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
      ),
      a: signedPct(me.wrcPlus),
      b: signedPct(picked.wrcPlus),
      leadA: leads("plus", me, picked),
      leadB: leads("plus", picked, me),
    });
  }
  return (
    <div>
      {others.length > 1 && (
        <PillPicker
          label="비교할 선수"
          options={others.map((o) => ({ key: String(o.player.id), label: o.player.nameKo }))}
          picked={String(picked.player.id)}
          onPick={(key) => onPick(Number(key))}
        />
      )}
      <PairHeads a={person(me)} b={person(picked)} />
      <PairTable
        caption={`${me.player.nameKo}, ${picked.player.nameKo} ${season} 시즌 메이저 기록`}
        aName={me.player.nameKo}
        bName={picked.player.nameKo}
        rows={rows}
      />
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
