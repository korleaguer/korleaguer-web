"use client"; // 누르면 창을 열고, 창 안에서 짝을 고르는 상태가 있어서 클라이언트 컴포넌트다.

import { useRef, useState } from "react";
import BottomSheet from "@/components/BottomSheet";
import Chevron from "@/components/Chevron";
import Section from "@/components/Section";
import { PairAvatar, PairHeads, PairTable, PillPicker, type PairPerson, type PairRow } from "@/components/PairTable";
import { SameGamesLine } from "@/components/SameGamesSheet";
import { formatRate } from "@/lib/format";
import { useHistorySheet } from "@/lib/useHistorySheet";
import type { WeekHitter, WeekSame } from "@/lib/week";

/** 창을 열며 쌓는 주소 기록 표시 */
const HISTORY_STATE = "korleaguerWeek";
/** 이 창 안에서 여는 같은 경기 창의 표시(짝마다 다르다) */
const sameStateKey = (aId: number, bId: number) => `korleaguerWeekSame${aId}-${bId}`;

function person(h: WeekHitter, sub: string | null): PairPerson {
  return { nameKo: h.nameKo, photoUrl: h.photoUrl, teamAbbr: h.teamAbbr, photoTeamAbbr: h.photoTeamAbbr, sub };
}

/** '19타수 8안타 1홈런'(홈런은 있을 때만) */
function weekLine(h: WeekHitter): string {
  return `${h.atBats}타수 ${h.hits}안타${h.homeRuns > 0 ? ` ${h.homeRuns}홈런` : ""}`;
}

/**
 * 시즌 중 홈 '이번 주 두 선수'(사용자 11-22 시안 3B, 이슈 #424). 층 화면 아래 구경하는 자리다.
 * 카드: 선수마다 한 줄(28px 사진 원 · 이름 · '19타수 8안타 1홈런' · 오른쪽 끝 타율 굵게). 휴대폰은 위아래 두 줄, PC는 좌우 두 칸. 한 주 표본이라 앞선 쪽을 파랑으로 칠하지 않고,
 * 주간 판정 말과 OPS도 카드에 쓰지 않는다. 카드 전체가 버튼이고 누르면 표 창(경기·안타·홈런·타점·볼넷·타율·OPS)이 열린다.
 * hitters는 이번 주 10타석 이상 친 타자(내 선수 먼저, 타석 많은 순)로 둘 이상이어야 한다. 카드에는 앞의 둘이 서고,
 * 셋 이상이면 창에서 짝을 고른다. 두 사람이 이번 주 같은 경기에 나왔으면 창 맨 아래 '같은 경기 3번 · 팀 전적 ›'(sames).
 */
export default function WeekPair({ label, hitters, sames }: { label: string; hitters: WeekHitter[]; sames: WeekSame[] }) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { open, openSheet, close } = useHistorySheet(HISTORY_STATE, buttonRef);
  // 짝: 앞 선수부터 (0,1) (0,2) (1,2) … 카드의 두 사람이 첫 짝이다
  const pairs = hitters.flatMap((a, i) => hitters.slice(i + 1).map((b) => ({ key: `${a.playerId}-${b.playerId}`, a, b })));
  const [pickedKey, setPickedKey] = useState(pairs[0].key);
  const picked = pairs.find((p) => p.key === pickedKey) ?? pairs[0];
  return (
    <Section id="week-title" title="이번 주 두 선수" aside={label}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="dialog"
        onClick={openSheet}
        className="card press-soft flex w-full cursor-pointer items-center gap-1 overflow-hidden pr-3 text-left"
      >
        {/* PC(1024px 이상)는 두 사람을 좌우 두 칸으로 둔다(층 줄과 같은 두 칸). 한 줄을 화면 폭으로 늘이면 타율이 기록에서 멀어진다 */}
        <span className="block min-w-0 flex-1 divide-y divide-line lg:grid lg:grid-cols-2 lg:divide-x lg:divide-y-0">
          <CardLine h={hitters[0]} />
          <CardLine h={hitters[1]} />
        </span>
        <Chevron small />
      </button>
      {open && (
        <BottomSheet title="이번 주 두 선수" onClose={close}>
          <WeekBody
            label={label}
            pairs={pairs}
            picked={picked}
            onPick={setPickedKey}
            same={sames.find((s) => s.aId === picked.a.playerId && s.bId === picked.b.playerId) ?? null}
          />
        </BottomSheet>
      )}
    </Section>
  );
}

/**
 * 카드 한 줄. 큰 글씨로 줄이 좁아지면(18rem 미만) 첫 줄에 이름과 타율을 두고 기록은 아래 줄로 내린다.
 * 그때는 간격·여백을 줄여(8px, 글자를 따라 커지지 않게 px) 타율이 이름 줄에서 밀려나지 않게 한다(2배 375px에서 세 글자 이름 기준)
 */
function CardLine({ h }: { h: WeekHitter }) {
  return (
    <span className="@container block">
      <span className="flex min-h-12 flex-wrap items-center gap-x-3 gap-y-0.5 px-4 py-2 @max-[18rem]:gap-x-[8px] @max-[18rem]:px-3">
        <PairAvatar person={person(h, null)} size={28} />
        <span className="min-w-[3.25rem] shrink-0 text-heading">{h.nameKo}</span>
        <span className="min-w-0 flex-1 text-summary tabular-nums @max-[18rem]:order-last @max-[18rem]:basis-full @max-[18rem]:pl-[36px]">
          {weekLine(h)}
        </span>
        {/* 타율: 나누기를 안 해도 되게 오른쪽 끝에 굵게 */}
        <span className="ml-auto shrink-0 text-heading tabular-nums">
          <span className="sr-only">타율 </span>
          {formatRate(h.avg)}
        </span>
      </span>
    </span>
  );
}

interface WeekPairOption {
  key: string;
  a: WeekHitter;
  b: WeekHitter;
}

function WeekBody({
  label,
  pairs,
  picked,
  onPick,
  same,
}: {
  label: string;
  pairs: WeekPairOption[];
  picked: WeekPairOption;
  onPick: (key: string) => void;
  same: WeekSame | null;
}) {
  const { a, b } = picked;
  const row = (key: string, name: string, pick: (h: WeekHitter) => string): PairRow => ({ key, label: name, a: pick(a), b: pick(b) });
  // 한 주 표본이라 어느 칸도 칠하지 않는다(카드의 타율과 같은 까닭)
  const rows: PairRow[] = [
    row("games", "경기", (h) => String(h.games)),
    row("hits", "안타", (h) => String(h.hits)),
    row("homeRuns", "홈런", (h) => String(h.homeRuns)),
    row("rbi", "타점", (h) => String(h.rbi)),
    row("walks", "볼넷", (h) => String(h.walks)),
    row("avg", "타율", (h) => formatRate(h.avg)),
    row("ops", "OPS", (h) => formatRate(h.ops)),
  ];
  return (
    <div>
      <p className="text-meta text-muted tabular-nums">{label}</p>
      {pairs.length > 1 && (
        <PillPicker
          label="견줄 두 선수"
          options={pairs.map((p) => ({ key: p.key, label: `${p.a.nameKo} · ${p.b.nameKo}` }))}
          picked={picked.key}
          onPick={onPick}
        />
      )}
      <PairHeads a={person(a, `${a.plateAppearances}타석`)} b={person(b, `${b.plateAppearances}타석`)} />
      <PairTable caption={`${a.nameKo}, ${b.nameKo} 이번 주 메이저 기록`} aName={a.nameKo} bName={b.nameKo} rows={rows} />
      {same && (
        <div className="-mx-4 mt-3 border-t border-line">
          <SameGamesLine stateKey={sameStateKey(a.playerId, b.playerId)} nameKo={a.nameKo} pair={same.pair} lead={`같은 경기 ${same.pair.games}번`} />
        </div>
      )}
    </div>
  );
}
