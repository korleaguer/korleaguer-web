import type { CareerSeason } from "@/lib/api";
import { formatEra, formatInningsOuts, formatRate, formatWar } from "@/lib/format";
import { STEADY_OUTS, STEADY_PA } from "@/lib/seasonStats";
import ScrollBox from "@/components/ScrollBox";
import Section from "@/components/Section";

function whole(value: number | null): string {
  return value == null ? "-" : String(Math.round(value));
}

/**
 * 표본이 적은 시즌인지: 타자 100타석·투수 30이닝 미만. 시즌 성적의 '참고용' 한 줄(smallSampleNote)과 같은 문턱이다
 * (사용자 결정 4, 전수조사 L320). 타석·이닝을 모르면(옛 api) 흐리게 두지 않는다
 */
function smallSample(s: CareerSeason): boolean {
  return s.kind === "hitter"
    ? s.plateAppearances != null && s.plateAppearances < STEADY_PA
    : s.inningsOuts != null && s.inningsOuts < STEADY_OUTS;
}

/**
 * 선수 화면 '시즌별 기록': MLB 정규시즌 연도별 한 줄(최신부터, korleaguer-server#133).
 * 휴대폰 폭에 맞게 연도 아래 팀을 작게 쓰고, 숫자는 타자 경기·타율·홈런·OPS·wRC+·WAR, 투수 등판·이닝·평균자책점·탈삼진·ERA-·WAR.
 * 표본이 적은 시즌(배지환 2026 메이저 4타석 OPS 1.167, 고우석 2026 4이닝)은 숫자를 흐린 글자로 써서 많이 뛴 시즌과 같은 무게로
 * 읽히지 않게 한다.
 * KBO 기록은 아직 없다(머리 카드의 '소속팀 사진' 줄, 그 줄이 없으면 정보 한 줄의 한국 시절이 대신한다).
 */
export default function CareerSeasons({ seasons: all }: { seasons: CareerSeason[] }) {
  if (all.length === 0) return null;
  // 표 머리가 한 종류라 최신 시즌과 같은 종류(타자·투수) 줄만 둔다(역할이 바뀐 선수의 옛 줄이 다른 머리 아래 들어가지 않게)
  const hitter = all[0].kind === "hitter";
  const seasons = all.filter((s) => s.kind === all[0].kind);
  const head = hitter ? ["경기", "타율", "홈런", "OPS", "wRC+", "WAR"] : ["등판", "이닝", "평균자책점", "탈삼진", "ERA-", "WAR"];
  const small = seasons.filter(smallSample).map((s) => s.season);
  // '100타석이 안 돼', '30이닝이 안 돼'(문턱은 seasonStats 한 곳)
  const need = hitter ? `${STEADY_PA}타석` : `${STEADY_OUTS / 3}이닝`;
  return (
    <Section id="seasons-title" title="시즌별 기록" aside="MLB 정규시즌">
      {/* 좁은 폰·앱 큰 글씨에서는 표가 카드보다 넓어 이 상자 안에서 가로로 민다. 칸에 링크가 없어 키보드로 밀 수 있게 넘칠 때만
          Tab이 머문다(ScrollBox). 바깥 section이 이미 '시즌별 기록' 영역이라 같은 이름의 영역(region)을 또 만들지 않고, 넘칠 때
          이름 붙은 묶음(group)이 된다 */}
      <ScrollBox labelledBy="seasons-title" className="card">
        <table className="w-full min-w-[20rem] text-meta tabular-nums">
          {/* 보이는 WAR 풀이는 위 'MLB 타자 중에서' 각주 한 곳에만 둔다(같은 안내 두 번 금지). 낭독기에는 표에 들어올 때 한 번
              읽는 표 설명으로 붙인다. 'WAR' 열 머리에 넣으면 낭독기가 칸을 옮길 때마다 열 머리를 함께 읽어 시즌 줄마다 되풀이했다.
              흐린 줄도 같다: 낭독기는 흐림을 못 보니 어느 시즌이 참고용인지 여기서 한 번 읽고, 줄(행 머리)마다 붙이지 않는다 */}
          <caption className="sr-only">
            WAR는 대체 선수보다 더 번 승수(0이 평균 아님)
            {small.length > 0 && `. ${small.join(", ")} 시즌은 ${need}이 안 돼 참고용`}
          </caption>
          <thead className="text-caption text-muted">
            <tr className="border-b border-line">
              <th scope="col" className="py-2.5 pl-4 pr-2 text-left font-semibold">
                시즌
              </th>
              {head.map((h, i) => (
                <th key={h} scope="col" className={`py-2.5 text-right font-semibold ${i === head.length - 1 ? "pr-4" : "px-1.5"}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {seasons.map((s) => {
              const cells =
                s.kind === "hitter"
                  ? [whole(s.games), formatRate(s.avg), whole(s.homeRuns), formatRate(s.ops), whole(s.wrcPlus), formatWar(s.war)]
                  : [whole(s.games), formatInningsOuts(s.inningsOuts), formatEra(s.era), whole(s.strikeouts), whole(s.eraMinus), formatWar(s.war)];
              const dim = smallSample(s) ? "text-muted" : "";
              return (
                <tr key={s.season}>
                  <th scope="row" className="py-2.5 pl-4 pr-2 text-left font-normal">
                    <span className="block font-bold">{s.season}</span>
                    {s.teamKo && <span className="block max-w-[6.5rem] truncate text-caption text-muted">{s.teamKo}</span>}
                  </th>
                  {cells.map((c, i) => (
                    <td key={head[i]} className={`py-2.5 text-right ${i === cells.length - 1 ? "pr-4 font-semibold" : "px-1.5"} ${dim}`}>
                      {c}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </ScrollBox>
      {small.length > 0 && (
        // 흐린 까닭은 표 아래 한 번만(줄마다 '참고용'을 쓰면 같은 말이 되풀이된다). 표 상자 밖에 둬서 표를 가로로 밀어도 따라가지 않는다.
        // 낭독기는 위 표 설명(caption)에서 시즌까지 붙여 읽으므로 여기서는 읽지 않는다
        <p aria-hidden className="mt-2 px-1 text-micro text-muted">
          숫자가 흐린 시즌은 {need}이 안 돼 참고용이에요.
        </p>
      )}
    </Section>
  );
}
