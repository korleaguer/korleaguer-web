import type { RosterMove } from "@/lib/api";
import Section from "@/components/Section";
import ScrollList from "@/components/ScrollList";
import ShowMore from "@/components/ShowMore";
import { cacheLife } from "next/cache";
import MovePill from "./MovePill";

/** 처음에 보여 줄 줄 수. 나머지는 '더 보기'로 펼친다 */
const VISIBLE = 6;

/** "2026-08-30" → "2026.08.30" */
function dotDate(date: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.replaceAll("-", ".") : date;
}

/**
 * 선수 이동 기록(최신부터): 날짜 · 무엇(알약) · 어디서 어디로. 알약은 MovePill(경기 달력 아래 이동 줄과 같다).
 * 이동 기록은 시각 없이 미국 날짜만 와서, 한국 날짜인 경기 달력 칸과 하루 다를 수 있다. 그래서 제목 옆에 '미국 날짜'를
 * 한 번 적는다(달력 아래 이동 줄과 같은 규칙, DESIGN.md 문구 원칙). 줄마다 붙이면 같은 말이 되풀이된다
 */
export default async function RosterMoves({ moves }: { moves: RosterMove[] }) {
  // 잠깐 재사용: 같은 데이터면 30초 동안 그려 둔 것을 다시 쓴다(쿠키와 상관없는 부품이라 모두에게 같다).
  // 운영 서버(라즈베리파이 4)는 화면 그리기가 느려서 큰 부품을 매번 그리지 않는다.
  "use cache";
  cacheLife({ stale: 30, revalidate: 30, expire: 300 });
  const shown = moves.slice(0, VISIBLE);
  const rest = moves.slice(VISIBLE);

  return (
    <Section id="moves-title" title="이동 기록" aside={moves.length > 0 ? `미국 날짜 · ${moves.length}건` : undefined}>
      {moves.length === 0 ? (
        <p className="card px-4 py-5 text-body text-muted">최근 두 시즌 동안 이동 기록이 없어요.</p>
      ) : (
        <div className="card">
          <ol className="divide-y divide-line">
            {shown.map((move, i) => (
              <MoveRow key={`${move.date}-${move.typeCode}-${i}`} move={move} />
            ))}
          </ol>
          {/* 펼치면 나머지 줄이 버튼 위에 붙고, 버튼은 맨 아래에서 '접기'가 된다 */}
          {rest.length > 0 && (
            <ShowMore moreLabel={`${rest.length}건 더 보기`} buttonClassName="border-t border-line py-2.5">
              {/* 이동이 많은 선수(20건 넘게)도 화면이 아래로 끝없이 늘지 않게, 펼친 줄은 일정 높이 안에서 스크롤한다 */}
              {/* 넘칠 때만 키보드로 닿는 영역이 된다(ScrollList, 이슈 #294). 상자 높이 26rem은 그대로(11-10 사용자 결정) */}
              <ScrollList
                label="이동 기록 더 보기 목록"
                className="max-h-[26rem] divide-y divide-line overflow-y-auto overscroll-contain border-t border-line"
              >
                {rest.map((move, i) => (
                  <MoveRow key={`${move.date}-${move.typeCode}-r${i}`} move={move} />
                ))}
              </ScrollList>
            </ShowMore>
          )}
        </div>
      )}
    </Section>
  );
}

function MoveRow({ move }: { move: RosterMove }) {
  const route = [move.fromTeam, move.toTeam].filter(Boolean).join(" → ");

  // 오른쪽 칸이 10rem(가장 긴 알약 '마이너 이관(아웃라이트)' 한 줄)도 안 남으면(큰 글씨) 날짜 아래 줄로 내려 줄 폭을 다 쓴다.
  // 날짜 옆에 붙여 두면 알약·경로가 한두 글자 폭으로 찌그러지고 알약이 화면 밖으로 나갔다(앱 2배, 이슈 #264)
  return (
    <li className="flex flex-wrap items-start gap-x-3 gap-y-1 px-4 py-3">
      <time dateTime={move.date} className="w-[5.25rem] shrink-0 pt-0.5 text-meta tabular-nums text-muted">
        {dotDate(move.date)}
      </time>
      <div className="min-w-[min(10rem,100%)] flex-1">
        <MovePill move={move} className="px-2.5" />
        {route && <p className="mt-1 text-meta text-pretty">{route}</p>}
      </div>
    </li>
  );
}
