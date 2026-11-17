import type { HitterSeason, PitcherSeason, PlayerSummary } from "@/lib/api";
import { formatEra, formatRate } from "@/lib/format";

/** 기록 한 칸(이름과 값) */
export interface Stat {
  label: string;
  value: string;
}

/** 시즌 기록 한 묶음과 그 단계("메이저", "트리플A", 여러 단계면 "마이너") */
export interface LevelSeason<T> {
  line: T;
  levelKo: string;
}

/**
 * 선수 한 명의 시즌 기록 묶음들. 올해 주로 뛴 단계가 먼저다(이슈 #184).
 * 메이저 줄의 mainlyMinors(마이너 경기가 메이저보다 많음)로 정한다. 그래서 메이저 4타석 .500 같은 작은 표본이
 * 트리플A 92경기보다 앞에 서지 않는다. 경기가 0인 줄은 뺀다.
 */
export function levelSeasons<T extends HitterSeason | PitcherSeason>(major: T | null, minor: T | null): LevelSeason<T>[] {
  const majorSeason = major && major.games > 0 ? { line: major, levelKo: "메이저" } : null;
  const minorSeason = minor && minor.games > 0 ? { line: minor, levelKo: minor.levelKo ?? "마이너" } : null;
  const minorsFirst = minorSeason != null && (majorSeason == null || majorSeason.line.mainlyMinors);
  return (minorsFirst ? [minorSeason, majorSeason] : [majorSeason, minorSeason]).filter(
    (s): s is LevelSeason<T> => s != null,
  );
}

/** "메이저 143경기", "트리플A 36번 등판". 큰 숫자가 어느 단계·몇 경기 기록인지 숫자 위에 적는다 */
export function sampleLabel(season: LevelSeason<HitterSeason | PitcherSeason>, pitcher: boolean): string {
  return pitcher ? `${season.levelKo} ${season.line.games}번 등판` : `${season.levelKo} ${season.line.games}경기`;
}

/**
 * 이보다 적으면 표본이 적어 '참고용'이다: 타자 100타석, 투수 30이닝(90아웃). 서버가 MLB 중 위치를 견주는 선수 기준이고
 * 선수 페이지 'MLB 타자 중에서'(LeaguePosition)의 '참고용' 문턱과 같은 값이다(11-17 사용자 결정 '추천대로')
 */
export const STEADY_PLATE_APPEARANCES = 100;
export const STEADY_OUTS = 90;

/**
 * 표본이 적은 묶음이면 이름표 뒤에 붙일 말('4이닝이라 참고용', '31타석이라 참고용'), 충분하면 null.
 * 몇 경기 안 되는 기록이 큰 숫자로 서면 92경기 묶음과 같은 무게로 읽혀서(4이닝 평균자책점 9.00), 선수 페이지가 작은 한 줄로 줄인다
 */
export function smallSampleNote(season: LevelSeason<HitterSeason | PitcherSeason>, pitcher: boolean): string | null {
  if (pitcher) {
    const line = season.line as PitcherSeason;
    return line.outs < STEADY_OUTS ? `${line.inningsText}이닝이라 참고용` : null;
  }
  const line = season.line as HitterSeason;
  return line.plateAppearances < STEADY_PLATE_APPEARANCES ? `${line.plateAppearances}타석이라 참고용` : null;
}

/**
 * 선수 한 명의 시즌 핵심 기록 세 칸(선수 목록 카드, 공유 미리보기 그림).
 * 타자끼리, 투수끼리 같은 칸이 같은 자리에 와서 나란히 비교할 수 있다. 기록이 없으면 null
 */
export function seasonStats(
  player: Pick<PlayerSummary, "role">,
  hitting: HitterSeason | null,
  pitching: PitcherSeason | null,
): Stat[] | null {
  if (player.role === "PITCHER") {
    return pitching
      ? [
          { label: "평균자책점", value: formatEra(pitching.era) },
          { label: "승-패", value: `${pitching.wins}-${pitching.losses}` },
          { label: "탈삼진", value: String(pitching.strikeouts) },
        ]
      : null;
  }
  return hitting
    ? [
        { label: "타율", value: formatRate(hitting.avg) },
        { label: "홈런", value: String(hitting.homeRuns) },
        { label: "OPS", value: formatRate(hitting.ops) },
      ]
    : null;
}

/**
 * 선수 목록 카드·공유 그림에 보일 주 단계 기록 세 칸과 단계·경기 수 이름표. 기록이 없으면 null.
 * 투수는 투수 줄, 타자는 타자 줄만 본다.
 */
export function mainSeasonStats(
  player: Pick<PlayerSummary, "role">,
  lines: {
    hitting: HitterSeason | null;
    pitching: PitcherSeason | null;
    minorHitting: HitterSeason | null;
    minorPitching: PitcherSeason | null;
  },
): { label: string; stats: Stat[] } | null {
  const pitcher = player.role === "PITCHER";
  const main = pitcher
    ? levelSeasons(lines.pitching, lines.minorPitching)[0]
    : levelSeasons(lines.hitting, lines.minorHitting)[0];
  if (!main) return null;
  const stats = pitcher
    ? seasonStats(player, null, main.line as PitcherSeason)
    : seasonStats(player, main.line as HitterSeason, null);
  return stats ? { label: sampleLabel(main, pitcher), stats } : null;
}
