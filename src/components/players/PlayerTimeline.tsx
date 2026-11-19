import Link from "next/link";
import type { PlayerSummary, Timeline } from "@/lib/api";
import { bandDays, dayIndex, KIND_NAME } from "@/lib/timeline";
import PlayerTimelineRow, { BAND_CLASS } from "./PlayerTimelineRow";

const LEGEND = ["MLB", "MINORS", "INJURED", "NO_TEAM"] as const;
/** 사진을 바로 받을 앞 줄 수(선수는 여섯 명 안팎이라 휴대폰 첫 화면 뒤까지 받아도 작다) */
const EAGER_ROWS = 6;

/** 달 눈금: 띠가 덮는 달마다 그 달 1일의 자리(첫 달은 띠 시작) */
function monthTicks(from: string, to: string) {
  const ticks: { month: number; day: number }[] = [];
  let y = Number(from.slice(0, 4));
  let m = Number(from.slice(5, 7));
  const endKey = to.slice(0, 7);
  while (`${y}-${String(m).padStart(2, "0")}` <= endKey) {
    const first = `${y}-${String(m).padStart(2, "0")}-01`;
    ticks.push({ month: m, day: dayIndex(from, to, first < from ? from : first) });
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return ticks;
}

/**
 * 선수 탭 '어디서 뛰었나' 연표: 한 줄 안내, 시즌 고르기(시즌이 둘 이상일 때), 범례, 선수 줄.
 * 순서는 내 선수(별) 먼저, 그다음 가장 최근 이동이 늦은 순(이동이 없으면 뒤).
 */
export default function PlayerTimeline({
  players,
  timeline,
  myIds,
}: {
  players: PlayerSummary[];
  timeline: Timeline;
  myIds: number[];
}) {
  const entries = new Map(timeline.players.map((p) => [p.playerId, p]));
  const lastMove = (id: number) => entries.get(id)?.lastMoveOn ?? "";
  const ordered = players
    .map((p, i) => ({ p, i }))
    .sort(
      (a, b) =>
        Number(myIds.includes(b.p.id)) - Number(myIds.includes(a.p.id)) ||
        (lastMove(a.p.id) < lastMove(b.p.id) ? 1 : lastMove(a.p.id) > lastMove(b.p.id) ? -1 : 0) ||
        a.i - b.i,
    )
    .map(({ p }) => p);
  const total = bandDays(timeline.from, timeline.to);
  const latest = Math.max(...timeline.seasons, timeline.season);

  return (
    <div className="space-y-3">
      <p className="px-1 text-meta text-muted">{`${timeline.season} · 어디서 뛰었나`}</p>
      {timeline.seasons.length >= 2 && (
        <nav aria-label="시즌 고르기" className="flex gap-2 px-1">
          {timeline.seasons.map((y) => {
            const current = y === timeline.season;
            return (
              <Link
                key={y}
                href={y === latest ? "/players" : `/players?season=${y}`}
                aria-current={current ? "page" : undefined}
                className={`press tap-target rounded-full px-3.5 py-1.5 text-label ${current ? "bg-accent-soft text-accent-ink" : "bg-surface-2 text-neutral-pill-fg"}`}
              >
                {y}
              </Link>
            );
          })}
        </nav>
      )}
      <ul className="flex flex-wrap gap-x-3 gap-y-1 px-1 text-caption text-muted" aria-label="띠 색 설명">
        {LEGEND.map((k) => (
          <li key={k} className="flex items-center gap-1.5">
            <span aria-hidden className={`size-2 rounded-full ${BAND_CLASS[k]}`} />
            {KIND_NAME[k]}
          </li>
        ))}
        {timeline.inSeason && (
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="h-3 border-l border-dashed border-foreground" />
            오늘
          </li>
        )}
      </ul>
      <section className="card px-4 pt-3">
        <div aria-hidden className="relative h-4 text-micro text-muted">
          {monthTicks(timeline.from, timeline.to).map((t, i) => (
            <span key={t.month} className="absolute tabular-nums" style={{ left: `${(t.day / total) * 100}%` }}>
              {i === 0 ? `${t.month}월` : t.month}
            </span>
          ))}
        </div>
        <ul className="divide-y divide-line">
          {ordered.map((p, i) => (
            <PlayerTimelineRow
              key={p.id}
              player={p}
              entry={entries.get(p.id) ?? null}
              timeline={timeline}
              isMine={myIds.includes(p.id)}
              returned={timeline.season === latest}
              eagerPhoto={i < EAGER_ROWS}
            />
          ))}
        </ul>
      </section>
    </div>
  );
}
