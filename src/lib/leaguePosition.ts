// MLB 안 위치(백분위 막대) 줄 계산. 선수 페이지 판과 홈 성적표 작은 판이 같은 줄을 그린다.
import type { PlayerSaber } from "@/lib/api";
import { leagueWords } from "@/lib/leagueWords";
import { isHitterSaber } from "@/lib/saber";

export interface Row {
  label: string;
  /** 1~99(높을수록 좋다). 견줄 선수가 아직 없으면 null */
  pct: number | null;
  /**
   * 막대 아래 한 줄에 모으는 그 칸의 실제 값("종합 WAR +1.0", "주루 +0.7점"). 값만 모아 두면 'WAR'가 어느 막대 값인지
   * 줄마다 맞춰 봐야 해서 막대 이름을 앞에 붙인다(주루·수비·삼진·볼넷은 값 이름에 이미 들어 있다)
   */
  raw: string | null;
}

/** +1.2 / −0.4 (빼기는 진짜 빼기 글자) */
function signed(value: number | null, digits = 1): string | null {
  if (value == null) return null;
  const fixed = Math.abs(value).toFixed(digits);
  return `${value < 0 && Number(fixed) !== 0 ? "−" : "+"}${fixed}`;
}

/**
 * 막대 네 줄(맨 앞이 '종합'). 타격·실점 억제의 실제 값은 지표 이름(wRC+·ERA-) 대신 리그 대비 말로 쓴다(사용자 11-21).
 * ERA-는 낮을수록 좋아서 ERA+ 꼴(100 ÷ ERA- × 100)로 바꿔 말한다. 표본이 적어 서버가 위치를 매기지 않았으면 null. 선수 페이지 판(LeaguePosition)과 홈 성적표 작은 판(LeaguePositionCompact)이 같이 쓴다 */
export function rowsOf(saber: PlayerSaber): Row[] | null {
  if (isHitterSaber(saber)) {
    const p = saber.percentiles;
    if (!p) return null;
    return [
      { label: "종합", pct: p.overall, raw: saber.war == null ? null : `종합 WAR ${signed(saber.war)}` },
      { label: "타격", pct: p.batting, raw: saber.wrcPlus == null ? null : `타격 ${leagueWords(saber.wrcPlus, false).text}` },
      { label: "주루", pct: p.baseRunning, raw: saber.baseRunning == null ? null : `주루 ${signed(saber.baseRunning)}점` },
      { label: "수비", pct: p.fielding, raw: saber.fielding == null ? null : `수비 ${signed(saber.fielding)}점` },
    ];
  }
  const p = saber.percentiles;
  if (!p) return null;
  return [
    { label: "종합", pct: p.overall, raw: saber.war == null ? null : `종합 WAR ${signed(saber.war)}` },
    { label: "실점 억제", pct: p.runPrevention, raw: saber.eraPlus == null ? null : `실점 억제 ${leagueWords(saber.eraPlus, true).text}` },
    { label: "삼진", pct: p.strikeouts, raw: saber.strikeoutRate == null ? null : `삼진 비율 ${saber.strikeoutRate.toFixed(1)}%` },
    // '볼넷 상위 10%'는 볼넷을 많이 준다로 읽혀 '실점 억제'처럼 '볼넷 억제'(볼넷을 적게 줄수록 위). 이름 칸(4.25rem)에 그대로 든다
    { label: "볼넷 억제", pct: p.walks, raw: saber.walkRate == null ? null : `볼넷 비율 ${saber.walkRate.toFixed(1)}%` },
  ];
}
