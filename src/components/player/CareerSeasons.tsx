import type { CareerSeason } from "@/lib/api";
import { formatEra, formatInningsOuts, formatRate } from "@/lib/format";
import Section from "@/components/Section";

function oneDigit(value: number | null): string {
  return value == null ? "-" : value.toFixed(1).replace("-", "−");
}

function whole(value: number | null): string {
  return value == null ? "-" : String(Math.round(value));
}

/**
 * 선수 화면 '시즌별 기록': MLB 정규시즌 연도별 한 줄(최신부터, korleaguer-server#133).
 * 휴대폰 폭에 맞게 연도 아래 팀을 작게 쓰고, 숫자는 타자 경기·타율·홈런·OPS·wRC+·WAR, 투수 경기·이닝·평균자책점·삼진·ERA-·WAR.
 * KBO 기록은 아직 없다(선수 정보의 경력 줄이 대신한다).
 */
export default function CareerSeasons({ seasons: all }: { seasons: CareerSeason[] }) {
  if (all.length === 0) return null;
  // 표 머리가 한 종류라 최신 시즌과 같은 종류(타자·투수) 줄만 둔다(역할이 바뀐 선수의 옛 줄이 다른 머리 아래 들어가지 않게)
  const hitter = all[0].kind === "hitter";
  const seasons = all.filter((s) => s.kind === all[0].kind);
  const head = hitter ? ["경기", "타율", "홈런", "OPS", "wRC+", "WAR"] : ["경기", "이닝", "평균자책", "삼진", "ERA-", "WAR"];
  return (
    <Section id="seasons-title" title="시즌별 기록" aside="MLB 정규시즌">
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[20rem] text-sm tabular-nums">
          <thead className="text-[0.6875rem] text-muted">
            <tr className="border-b border-line">
              <th scope="col" className="py-2.5 pl-4 pr-2 text-left font-medium">
                시즌
              </th>
              {head.map((h, i) => (
                <th key={h} scope="col" className={`py-2.5 text-right font-medium ${i === head.length - 1 ? "pr-4" : "px-1.5"}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {seasons.map((s) => {
              const cells =
                s.kind === "hitter"
                  ? [whole(s.games), formatRate(s.avg), whole(s.homeRuns), formatRate(s.ops), whole(s.wrcPlus), oneDigit(s.war)]
                  : [whole(s.games), formatInningsOuts(s.inningsOuts), formatEra(s.era), whole(s.strikeouts), whole(s.eraMinus), oneDigit(s.war)];
              return (
                <tr key={s.season}>
                  <th scope="row" className="py-2.5 pl-4 pr-2 text-left font-normal">
                    <span className="block font-bold">{s.season}</span>
                    {s.teamKo && <span className="block max-w-[6.5rem] truncate text-[0.6875rem] text-muted">{s.teamKo}</span>}
                  </th>
                  {cells.map((c, i) => (
                    <td key={head[i]} className={`py-2.5 text-right ${i === cells.length - 1 ? "pr-4 font-semibold" : "px-1.5"}`}>
                      {c}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Section>
  );
}
