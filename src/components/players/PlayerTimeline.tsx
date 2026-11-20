import Link from "next/link";
import type { PlayerSummary, Timeline } from "@/lib/api";
import { bandDays, KIND_NAME, monthTicks } from "@/lib/timeline";
import SeasonReportRows from "@/components/home/SeasonReportRows";
import { BAND_CLASS, buildTimelineRow } from "./PlayerTimelineRow";

const LEGEND = ["MLB", "MINORS", "INJURED", "NO_TEAM"] as const;
/** 사진을 바로 받을 앞 줄 수(선수는 여섯 명 안팎이라 휴대폰 첫 화면 뒤까지 받아도 작다) */
const EAGER_ROWS = 6;

/**
 * 선수 탭 '어디서 뛰었나' 연표: 한 줄 안내, 시즌 고르기(시즌이 둘 이상일 때), 범례, 선수 줄.
 * 순서는 내 선수(별) 먼저, 그다음 가장 최근 이동이 늦은 순(이동이 없으면 뒤).
 * 줄을 누르면 휴대폰은 아래 창, PC는 오른쪽 칸에 자세히(이동 목록 전부·숫자·선수 페이지)가 보인다. 틀은 홈 성적표와 같다(SeasonReportRows, 이슈 #325).
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
  const rows = ordered.map((p, i) =>
    buildTimelineRow({
      player: p,
      entry: entries.get(p.id) ?? null,
      timeline,
      isMine: myIds.includes(p.id),
      returned: timeline.season === latest,
      eagerPhoto: i < EAGER_ROWS,
    }),
  );

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
      <section className="card px-4 pb-1">
        <SeasonReportRows
          rows={rows}
          listHeader={
            <>
              {/* 달 눈금: 줄 띠와 같은 폭(줄 버튼의 좌우 여백은 목록과 같다) */}
              <div aria-hidden className="relative mt-3 h-4 text-micro text-muted">
                {monthTicks(timeline.from, timeline.to).map((t, i) => (
                  <span key={t.month} className="absolute tabular-nums" style={{ left: `${(t.day / total) * 100}%` }}>
                    {i === 0 ? `${t.month}월` : t.month}
                  </span>
                ))}
              </div>
            </>
          }
        />
      </section>
    </div>
  );
}
