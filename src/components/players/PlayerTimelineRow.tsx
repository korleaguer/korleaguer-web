import Link from "next/link";
import type { RosterMove, PlayerSummary, Timeline, TimelineKind, TimelinePlayer } from "@/lib/api";
import { formatEra, formatRate, teamLabel } from "@/lib/format";
import { bandDays, bandSummary, buildFacts, buildMarkers, dayIndex, koDate } from "@/lib/timeline";
import Chevron from "@/components/Chevron";
import PlayerAvatar from "@/components/PlayerAvatar";
import MovePill from "@/components/player/MovePill";
import MyPlayerToggle from "@/components/my/MyPlayerToggle";

/** 구간 색(토큰이라 라이트·다크가 따라간다): 메이저 파랑 · 마이너 회색 · 부상 빨강 · 팀 없음 보라. 범례도 같이 쓴다 */
export const BAND_CLASS: Record<TimelineKind, string> = {
  MLB: "bg-accent",
  MINORS: "bg-muted/45",
  INJURED: "bg-danger-fg",
  NO_TEAM: "bg-fa-fg",
};

/** 펼친 곳에 보일 이동 줄 수 */
const MOVES_SHOWN = 5;

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

function Band({
  timeline,
  entry,
  returnedKo,
  label,
}: {
  timeline: Timeline;
  entry: TimelinePlayer | null;
  returnedKo: string | null;
  label: string;
}) {
  const total = bandDays(timeline.from, timeline.to);
  const segments = entry?.segments ?? [];
  const markers = entry ? buildMarkers(entry.moves, timeline.from, timeline.to) : [];
  const today = timeline.inSeason ? dayIndex(timeline.from, timeline.to, timeline.today) : null;
  const last = segments[segments.length - 1];

  return (
    <div className="relative h-[18px]">
      {/* 띠는 그림이라 화면 낭독기에는 아래 요약 글을 읽어 준다 */}
      <div aria-hidden className="absolute inset-x-0 top-[3px] h-3 overflow-hidden rounded-full bg-surface-2">
        {segments.map((g) => {
          const start = dayIndex(timeline.from, timeline.to, g.from);
          const days = bandDays(g.from, g.to);
          return (
            <span
              key={g.from}
              className={`absolute inset-y-0 min-w-[3px] ${BAND_CLASS[g.kind]}`}
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
      </div>
      {markers.map((m) => (
        <span
          key={m.date}
          aria-hidden
          title={m.labels.join(" · ")}
          className="absolute top-0 h-[18px] w-[2px] -translate-x-1/2 rounded-full bg-foreground ring-1 ring-surface"
          style={{ left: pct(m.day + 0.5, total) }}
        />
      ))}
      {today != null && (
        <span
          aria-hidden
          className="absolute top-0 h-[18px] -translate-x-1/2 border-l border-dashed border-foreground"
          style={{ left: pct(today + 0.5, total) }}
        />
      )}
      <span className="sr-only">{label}</span>
    </div>
  );
}

function MoveList({ moves }: { moves: RosterMove[] }) {
  // 최근 것부터 몇 줄만(전부는 선수 페이지 이동 기록)
  const shown = [...moves].reverse().slice(0, MOVES_SHOWN);
  if (shown.length === 0) return <p className="text-meta text-muted">이 시즌에는 이동 기록이 없어요.</p>;
  return (
    <ol className="space-y-2">
      {shown.map((m, i) => (
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
 * 연표의 선수 한 줄: 사진·이름·구단·별 / 띠 / 사실 한 줄. 줄을 누르면 이동 목록·시즌 숫자·선수 페이지 링크가 펼쳐진다(details).
 * 별은 summary 밖 오른쪽 위에 놓는다(눌러도 줄이 펼쳐지지 않고, 버튼 안에 버튼이 들어가지 않게).
 */
export default function PlayerTimelineRow({
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
}) {
  const returnedKo = returned ? player.returnedKo : null;
  const moves = entry?.moves ?? [];
  const facts = buildFacts(moves, entry?.segments ?? [], !!returnedKo);
  const factLine = [...facts, returnedKo ? `${returnedKo} 복귀` : null].filter(Boolean).join(" · ");
  const label = `${player.nameKo} ${timeline.season} 시즌: ${entry && entry.segments.length > 0 ? bandSummary(entry.segments) : "기록 없음"}`;

  return (
    <li className="relative">
      <details className="group">
        <summary className="block cursor-pointer list-none py-3 outline-offset-2 focus-visible:outline-2 focus-visible:outline-accent [&::-webkit-details-marker]:hidden">
          <div className="flex items-center gap-2 pr-9">
            <PlayerAvatar nameKo={player.nameKo} photoUrl={player.photoUrl} teamAbbr={player.teamAbbr} size={28} eager={eagerPhoto} />
            <span className="text-body font-bold">{player.nameKo}</span>
            <span className="min-w-0 flex-1 truncate text-meta text-muted">{teamLabel(player)}</span>
          </div>
          <div className="mt-1.5">
            <Band timeline={timeline} entry={entry} returnedKo={returnedKo} label={label} />
          </div>
          <p className="mt-1 flex items-start gap-1.5 text-caption text-muted">
            <span className="min-w-0 flex-1 text-pretty">{factLine}</span>
            <span className="mt-0.5 shrink-0 transition-transform group-open:rotate-90">
              <Chevron />
            </span>
            <span className="sr-only">{`${player.nameKo} 이동 기록 펼치기`}</span>
          </p>
        </summary>
        <div className="space-y-3 pb-4 pl-9">
          <MoveList moves={moves} />
          {entry?.stat && <p className="text-meta tabular-nums text-muted">{statLine(entry.stat, player.role)}</p>}
          <Link href={`/players/${player.id}`} className="inline-flex items-center gap-1 text-label text-accent-ink">
            선수 페이지
            <Chevron small />
          </Link>
        </div>
      </details>
      <MyPlayerToggle
        playerId={player.id}
        nameKo={player.nameKo}
        initialOn={isMine}
        variant="icon"
        className="absolute right-[-0.5rem] top-1.5"
      />
    </li>
  );
}
