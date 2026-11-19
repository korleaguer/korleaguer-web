import Link from "next/link";
import type { PlayerSummary, RosterMove, Timeline, TimelineKind, TimelinePlayer } from "@/lib/api";
import { formatEra, formatRate, teamLabel } from "@/lib/format";
import { bandDays, bandSummary, buildFacts, buildMarkers, dayIndex, koDate, monthTicks } from "@/lib/timeline";
import MyPlayerToggle from "@/components/my/MyPlayerToggle";
import MovePill from "@/components/player/MovePill";
import PlayerAvatar from "@/components/PlayerAvatar";
import type { ReportRow } from "@/components/home/SeasonReportRows";

/** 구간 색(토큰이라 라이트·다크가 따라간다): 메이저 파랑 · 마이너 회색 · 부상 빨강 · 팀 없음 보라. 범례도 같이 쓴다 */
export const BAND_CLASS: Record<TimelineKind, string> = {
  MLB: "bg-accent",
  MINORS: "bg-muted/45",
  INJURED: "bg-danger-fg",
  NO_TEAM: "bg-fa-fg",
};

const pct = (days: number, total: number) => `${(days / total) * 100}%`;

/** 숫자 한 줄: '85경기 · wRC+ 78 · 타율 .262', 투수는 '36경기 · ERA+ 127 · 평균자책점 3.91', 마이너면 앞에 단계('트리플A 85경기') */
function statLine(stat: NonNullable<TimelinePlayer["stat"]>, role: PlayerSummary["role"]): string {
  const games = `${stat.level === "MINORS" && stat.levelKo ? `${stat.levelKo} ` : ""}${stat.games}경기`;
  if (role === "PITCHER") {
    return [games, stat.eraPlus != null ? `ERA+ ${stat.eraPlus}` : null, stat.era != null ? `평균자책점 ${formatEra(stat.era)}` : null]
      .filter(Boolean)
      .join(" · ");
  }
  return [games, stat.wrcPlus != null ? `wRC+ ${stat.wrcPlus}` : null, stat.avg != null ? `타율 ${formatRate(stat.avg)}` : null]
    .filter(Boolean)
    .join(" · ");
}

/**
 * 띠 한 줄(전부 span: 줄 버튼 안에도 들어간다). tall이면 창 안 큰 띠(높이 16px)에 날짜 눈금(달)을 위에 붙인다.
 * 띠는 그림이라 화면 낭독기에는 구간 요약 글(label)을 읽어 준다
 */
function Band({
  timeline,
  entry,
  returnedKo,
  label,
  tall = false,
}: {
  timeline: Timeline;
  entry: TimelinePlayer | null;
  returnedKo: string | null;
  label: string;
  tall?: boolean;
}) {
  const total = bandDays(timeline.from, timeline.to);
  const segments = entry?.segments ?? [];
  const markers = entry ? buildMarkers(entry.moves, timeline.from, timeline.to) : [];
  const today = timeline.inSeason ? dayIndex(timeline.from, timeline.to, timeline.today) : null;
  const last = segments[segments.length - 1];
  const h = tall ? 22 : 18;

  // 그 시즌 기록이 없는 선수(서버가 구간을 비워 준다): 띠 자리에 흐린 글자 한 줄
  if (segments.length === 0) {
    return (
      <span className="flex items-center text-caption text-muted" style={{ height: h }}>
        기록 없음
      </span>
    );
  }

  return (
    <span className="block">
      {tall && (
        <span aria-hidden className="relative block h-4 text-micro text-muted">
          {monthTicks(timeline.from, timeline.to).map((t, i) => (
            <span key={t.month} className="absolute tabular-nums" style={{ left: pct(t.day, total) }}>
              {i === 0 ? `${t.month}월` : t.month}
            </span>
          ))}
        </span>
      )}
      <span className="relative block" style={{ height: h }}>
        <span
          aria-hidden
          className={`absolute inset-x-0 block overflow-hidden rounded-full bg-surface-2 ${tall ? "top-[3px] h-4" : "top-[3px] h-3"}`}
        >
          {segments.map((g) => {
            const start = dayIndex(timeline.from, timeline.to, g.from);
            const days = bandDays(g.from, g.to);
            return (
              <span
                key={g.from}
                className={`absolute inset-y-0 block min-w-[3px] ${BAND_CLASS[g.kind]}`}
                style={{ left: pct(start, total), width: pct(days, total) }}
              >
                {/* 국내로 돌아간 선수: 팀 없음 구간 끝에 구단 글자 */}
                {g === last && g.kind === "NO_TEAM" && returnedKo && days > (total * 40) / 264 && (
                  <span className="absolute inset-y-0 right-1.5 flex items-center text-micro font-bold leading-none text-fa-bg">
                    {returnedKo.split(" ")[0]}
                  </span>
                )}
              </span>
            );
          })}
        </span>
        {markers.map((m) => (
          <span
            key={m.date}
            aria-hidden
            title={m.labels.join(" · ")}
            className="absolute top-0 block w-[2px] -translate-x-1/2 rounded-full bg-foreground ring-1 ring-surface"
            style={{ left: pct(m.day + 0.5, total), height: h }}
          />
        ))}
        {today != null && (
          <span
            aria-hidden
            className="absolute top-0 block -translate-x-1/2 border-l border-dashed border-foreground"
            style={{ left: pct(today + 0.5, total), height: h }}
          />
        )}
        <span className="sr-only">{label}</span>
      </span>
    </span>
  );
}

/** 창·오른쪽 칸 안 이동 목록: 그 시즌 이동 전부, 최신 먼저(MovePill은 선수 페이지 이동 기록과 같다) */
function MoveList({ moves }: { moves: RosterMove[] }) {
  if (moves.length === 0) return <p className="text-meta text-muted">이 시즌에는 이동 기록이 없어요.</p>;
  return (
    <ol className="space-y-2">
      {[...moves].reverse().map((m, i) => (
        <li key={`${m.date}-${m.typeCode}-${i}`} className="flex items-start gap-3">
          <time dateTime={m.date} className="w-[4.5rem] shrink-0 pt-0.5 text-meta tabular-nums text-muted">
            {koDate(m.date)}
          </time>
          <div className="min-w-0 flex-1">
            <MovePill move={m} className="px-2.5" />
            {(m.fromTeam || m.toTeam) && (
              <p className="mt-0.5 text-meta text-pretty">{[m.fromTeam, m.toTeam].filter(Boolean).join(" → ")}</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

/**
 * 연표 한 줄을 성적표 목록(SeasonReportRows)이 쓰는 줄 데이터로 만든다(사용자 11-19: 처음엔 요약만, 자세한 것은 휴대폰은 아래 창·PC는 오른쪽 칸).
 * 줄(line): 사진·이름·구단 / 띠 / 사실 한 줄. 별은 줄 버튼 밖(star). head: 창·오른쪽 칸 머리(이름·구단·사실 줄).
 * panel: 큰 띠(날짜 눈금) + 이동 목록 전부 + 시즌 숫자 한 줄 + 선수 페이지 링크.
 */
export function buildTimelineRow({
  player,
  entry,
  timeline,
  isMine,
  returned,
  eagerPhoto,
}: {
  player: PlayerSummary;
  entry: TimelinePlayer | null;
  timeline: Timeline;
  isMine: boolean;
  /** 국내 복귀 글('LG 트윈스 복귀')을 이 시즌 줄에 붙일지: 가장 최근 시즌일 때만 */
  returned: boolean;
  eagerPhoto: boolean;
}): ReportRow {
  const returnedKo = returned ? player.returnedKo : null;
  const moves = entry?.moves ?? [];
  const facts = buildFacts(moves, entry?.segments ?? [], !!returnedKo);
  const factLine = [...facts, returnedKo ? `${returnedKo} 복귀` : null].filter(Boolean).join(" · ");
  const label = `${player.nameKo} ${timeline.season} 시즌: ${entry && entry.segments.length > 0 ? bandSummary(entry.segments) : "기록 없음"}`;
  const team = teamLabel(player);

  return {
    id: player.id,
    photo: { nameKo: player.nameKo, photoUrl: player.photoUrl, teamAbbr: player.teamAbbr, eager: eagerPhoto },
    line: (
      <>
        <span className="flex items-center gap-2 pr-9">
          <PlayerAvatar nameKo={player.nameKo} photoUrl={player.photoUrl} teamAbbr={player.teamAbbr} size={28} eager={eagerPhoto} />
          <span className="text-body font-bold">{player.nameKo}</span>
          <span className="min-w-0 flex-1 truncate text-meta text-muted">{team}</span>
        </span>
        <span className="mt-1.5 block">
          <Band timeline={timeline} entry={entry} returnedKo={returnedKo} label={label} />
        </span>
        <span className="mt-1 block text-caption text-pretty text-muted">{factLine}</span>
      </>
    ),
    star: (
      <MyPlayerToggle playerId={player.id} nameKo={player.nameKo} initialOn={isMine} variant="icon" />
    ),
    head: (
      <>
        <span className="block text-heading">{player.nameKo}</span>
        {team && <span className="block text-meta text-muted">{team}</span>}
        {factLine && <span className="mt-0.5 block text-caption text-pretty text-muted">{factLine}</span>}
      </>
    ),
    spark: null,
    second: null,
    secondInPanel: false,
    sheetKey: null,
    panel: (
      <div className="space-y-4 pb-2">
        <Band timeline={timeline} entry={entry} returnedKo={returnedKo} label={label} tall />
        <MoveList moves={moves} />
        {entry?.stat && <p className="text-meta tabular-nums text-muted">{statLine(entry.stat, player.role)}</p>}
        <Link
          href={`/players/${player.id}`}
          className="press inline-flex min-h-11 items-center gap-0.5 whitespace-nowrap text-label text-accent-ink hover:underline"
        >
          <span className="sr-only">{`${player.nameKo} `}</span>
          선수 페이지
          <svg aria-hidden viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="size-3.5">
            <path d="m6 4 4 4-4 4" />
          </svg>
        </Link>
      </div>
    ),
  };
}
