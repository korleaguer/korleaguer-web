import { Fragment } from "react";
import type { BuzzStat, GameLine } from "@/lib/api";
import Celebrate from "@/components/Celebrate";

interface Highlight {
  text: string;
  /** 가장 큰 활약(홈런, 승리투수, 세이브)은 채운 주황, 나머지는 옅은 주황 */
  strong: boolean;
  /** 이 배지가 말하는 활약. 화제 문구(GameBuzz.stat)가 같은 활약을 말하면 카드에서 뺀다 */
  stat?: BuzzStat;
}

/** 배지를 만드는 데 쓰는 경기 한 줄의 칸 */
type HighlightSource = Pick<GameLine, "role" | "lineup" | "batting" | "pitching">;

/** 한 경기에 보여 줄 배지 수. 많으면 한 줄 기록보다 시끄러워진다 */
const MAX = 2;

interface HighlightOptions {
  /** 화제 문구가 이미 말하는 활약(GameBuzz.stat). 같은 뜻의 배지는 뺀다 */
  cover?: BuzzStat | null;
  /** 보여 줄 배지 수. 화제 문구가 있으면 문구와 합쳐 주황 표시가 둘이 되게 1로 줄인다. 기본 2 */
  max?: number;
}

/**
 * 한 경기의 좋은 활약 배지. 우선순위대로 최대 두 개.
 * 선수의 주 역할(role) 숫자만 본다. 서버 한 줄 기록도 주 역할만 쓰므로, 타자가 크게 지는 경기에 마운드에 올라도
 * 타격 배지가 투구 배지에 밀리거나 한 줄에 없는 '무실점'이 붙지 않는다.
 * 타자: 홈런 > 3안타 이상·멀티히트 > 3타점 이상 > 도루.
 * 투수: 승리투수·세이브 > 퀄리티스타트(선발 6이닝 3자책 이하, 구원이면 주지 않음) > 무실점(1이닝 이상) > 7탈삼진 이상.
 * 패전·무안타처럼 나쁜 일은 배지로 만들지 않는다(팀 결과 알약과 한 줄 기록이 이미 말한다).
 * 홈 경기 카드는 화제 문구가 있으면 같은 활약의 배지를 빼고(cover) 한 개만 남긴다(max). 뺀 자리는 다음 배지가 채운다.
 */
export function gameHighlights(
  { role, lineup, batting, pitching }: HighlightSource,
  { cover = null, max = MAX }: HighlightOptions = {},
): Highlight[] {
  const out: Highlight[] = [];
  if (role === "PITCHER" && pitching) {
    if (pitching.win) out.push({ text: "승리투수", strong: true, stat: "wins" });
    else if (pitching.save) out.push({ text: "세이브", strong: true, stat: "saves" });
    const outs = pitching.outs ?? 0;
    if (lineup !== "SUB" && outs >= 18 && pitching.earnedRuns <= 3) out.push({ text: "퀄리티스타트", strong: false });
    else if (outs >= 3 && pitching.runs === 0) out.push({ text: "무실점", strong: false });
    if (pitching.strikeouts >= 7) out.push({ text: `${pitching.strikeouts}탈삼진`, strong: false, stat: "strikeouts" });
  }
  if (role === "HITTER" && batting) {
    if (batting.homeRuns > 0) out.push({ text: batting.homeRuns > 1 ? `${batting.homeRuns}홈런` : "홈런", strong: true, stat: "homeRuns" });
    if (batting.hits >= 3) out.push({ text: `${batting.hits}안타`, strong: false, stat: "hits" });
    else if (batting.hits === 2) out.push({ text: "멀티히트", strong: false });
    if (batting.rbi >= 3) out.push({ text: `${batting.rbi}타점`, strong: false, stat: "rbi" });
    if (batting.stolenBases > 0) {
      out.push({ text: batting.stolenBases > 1 ? `${batting.stolenBases}도루` : "도루", strong: false, stat: "stolenBases" });
    }
  }
  return out.filter((h) => !cover || h.stat !== cover).slice(0, max);
}

/**
 * 좋은 활약 배지 줄(홈 경기 카드, 경기 기록 줄, '내 선수' 고른 경기 한 줄).
 * 불꽃 주황은 좋은 활약에만 쓴다. 화면 낭독기는 "활약: 홈런, 멀티히트"로 읽는다.
 */
export default function Highlights({
  line,
  className = "",
  cover,
  max,
  celebrate,
}: {
  line: HighlightSource;
  className?: string;
  cover?: BuzzStat | null;
  max?: number;
  /** 있으면 채운 주황 배지(가장 큰 표시)가 처음 보일 때 한 번 커졌다 돌아온다(홈 최근 24시간 카드). id = 경기 키, order = 카드 순서 */
  celebrate?: { id: string; order: number };
}) {
  const items = gameHighlights(line, { cover, max });
  if (items.length === 0) return null;
  const celebrated = celebrate ? items.findIndex((h) => h.strong) : -1;
  return (
    <p className={`flex flex-wrap items-center gap-1 ${className}`}>
      <span className="sr-only">{`활약: ${items.map((h) => h.text).join(", ")}`}</span>
      {items.map((h, i) => {
        const badge = (
          <span
            aria-hidden
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-badge ${h.strong ? "bg-hot-strong text-hot-on" : "bg-hot-soft text-hot-ink"}`}
          >
            {h.text}
          </span>
        );
        return i === celebrated && celebrate ? (
          <Celebrate key={h.text} id={celebrate.id} order={celebrate.order} scale={1.1} className="inline-flex">
            {badge}
          </Celebrate>
        ) : (
          <Fragment key={h.text}>{badge}</Fragment>
        );
      })}
    </p>
  );
}
