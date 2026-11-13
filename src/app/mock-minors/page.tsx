// 임시 시안(커밋하지 않음): 경기 기록에 마이너 경기를 넣는 네 가지 방법. ?v=1|2|3|4&id=2|6
// 데이터: 운영 API 응답(scratchpad/prod-json) + MLB 공식 마이너 경기 기록(scratchpad/minors). 마이너 기간의 메이저 '결장' 줄은 운영(#136)처럼 뺀다.
import fs from "node:fs";
import { connection } from "next/server";
import type { GameLine, RosterMove } from "@/lib/api";
import Section from "@/components/Section";
import GameRow from "@/components/player/GameRow";
import ResultPill from "@/components/ResultPill";
import Highlights from "@/components/Highlights";
import { formatShortDate, formatWeekday, formatRate, formatEra } from "@/lib/format";

const S = "/private/tmp/claude-501/-Users-kevin-project-2026-my-service/c6302078-e238-44e1-a12f-c48b7e506e56/scratchpad";
const LEVEL: Record<string, string> = { "11": "트리플A", "12": "더블A", "13": "하이A", "14": "싱글A" };
const CITY: Record<string, string> = {
  Albuquerque: "앨버커키", Charlotte: "샬럿", "El Paso": "엘패소", "Las Vegas": "라스베이거스", Reno: "리노", "Round Rock": "라운드록",
  Sacramento: "새크라멘토", "Salt Lake": "솔트레이크", "Sugar Land": "슈거랜드", Tacoma: "타코마", "Oklahoma City": "오클라호마시티",
  Toledo: "톨레도", Erie: "이리", "Lehigh Valley": "리하이밸리", Columbus: "콜럼버스", Indianapolis: "인디애나폴리스", Louisville: "루이빌",
  Iowa: "아이오와", Omaha: "오마하", "St. Paul": "세인트폴", Nashville: "내슈빌", Memphis: "멤피스", Durham: "더럼", Norfolk: "노퍽",
  Gwinnett: "귀넷", Jacksonville: "잭슨빌", Buffalo: "버펄로", Rochester: "로체스터", Syracuse: "시러큐스", Worcester: "우스터",
  "Scranton/Wilkes-Barre": "스크랜턴", Altoona: "앨투나", Akron: "애크런", Harrisburg: "해리스버그", Bowie: "보위", Chesapeake: "체서피크",
  Binghamton: "빙햄턴", Hartford: "하트퍼드", Portland: "포틀랜드", "New Hampshire": "뉴햄프셔", Reading: "레딩", Somerset: "서머싯",
  "Fort Worth": "포트워스", Biloxi: "빌럭시", Pensacola: "펜서콜라", Montgomery: "몽고메리", Birmingham: "버밍엄", Chattanooga: "채터누가",
  Rocket: "로켓시티", Knoxville: "녹스빌", Columbia: "컬럼비아", Mississippi: "미시시피", Tennessee: "테네시", Wichita: "위치타",
  Arkansas: "아칸소", Tulsa: "털사", Springfield: "스프링필드", "Northwest Arkansas": "노스웨스트아칸소", "San Antonio": "샌안토니오",
  Midland: "미들랜드", Amarillo: "애머릴로", Corpus: "코퍼스크리스티", Frisco: "프리스코",
};
const city = (name: string) => Object.entries(CITY).find(([k]) => name.startsWith(k))?.[1] ?? name;

interface Split {
  date: string;
  isHome: boolean;
  isWin: boolean;
  team: { name: string };
  opponent: { name: string };
  game: { gamePk: number };
  stat: Record<string, number | string>;
}
interface Row {
  game: GameLine;
  /** 마이너 경기면 단계·팀, 메이저면 null */
  minor: { level: string; team: string } | null;
}
type Item =
  | { kind: "row"; row: Row }
  | { kind: "month"; label: string; summary: string }
  | { kind: "move"; up: boolean; text: string; date: string }
  | { kind: "skip"; games: GameLine[] };

/** 이어진 메이저 결장 2경기 이상은 한 줄로(웹 #179와 같은 접기) */
function collapse(items: Item[]): Item[] {
  const out: Item[] = [];
  for (const it of items) {
    const prev = out[out.length - 1];
    const off = it.kind === "row" && !it.row.minor && !it.row.game.played;
    if (off && prev?.kind === "skip") prev.games.push(it.row.game);
    else if (off && prev?.kind === "row" && !prev.row.minor && !prev.row.game.played) out[out.length - 1] = { kind: "skip", games: [prev.row.game, it.row.game] };
    else out.push(it);
  }
  return out;
}

function outsOf(ip: string): number {
  const [w, f] = ip.split(".");
  return Number(w) * 3 + Number(f ?? 0);
}
function innText(outs: number): string {
  const r = outs % 3;
  return `${Math.floor(outs / 3)}${r === 1 ? "⅓" : r === 2 ? "⅔" : ""}`;
}

/** 마이너 기록 한 경기를 메이저 줄과 같은 모양(GameLine)으로 */
function minorLine(s: Split, base: GameLine, pitcher: boolean): GameLine {
  const n = (k: string) => Number(s.stat[k] ?? 0);
  const d = new Date(`${s.date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1); // 미국 저녁 경기 → 한국 다음 날 아침(시안용 어림)
  const kst = `${d.toISOString().slice(0, 10)}T08:05:00+09:00`;
  let summary: string;
  if (pitcher) {
    const outs = outsOf(String(s.stat.inningsPitched ?? "0"));
    const runs = n("runs");
    const er = n("earnedRuns");
    const parts = [`${innText(outs)}이닝`, n("hits") ? `${n("hits")}피안타` : "무피안타", runs ? `${runs}실점(${er}자책)` : "무실점"];
    if (n("strikeOuts")) parts.push(`${n("strikeOuts")}탈삼진`);
    if (n("baseOnBalls")) parts.push(`${n("baseOnBalls")}볼넷`);
    summary = parts.join(" ");
  } else {
    const parts = n("atBats") || n("baseOnBalls") ? [`${n("atBats")}타수 ${n("hits") ? `${n("hits")}안타` : "무안타"}`] : ["출전"];
    if (n("homeRuns")) parts.push(`${n("homeRuns")}홈런`);
    if (n("rbi")) parts.push(`${n("rbi")}타점`);
    if (n("baseOnBalls")) parts.push(`${n("baseOnBalls")}볼넷`);
    if (n("stolenBases")) parts.push(`${n("stolenBases")}도루`);
    summary = parts.join(" ");
  }
  const outs = pitcher ? outsOf(String(s.stat.inningsPitched ?? "0")) : 0;
  return {
    ...base,
    gameId: s.game.gamePk,
    startTimeKst: kst,
    teamKo: city(s.team.name),
    teamAbbr: null,
    opponentKo: city(s.opponent.name),
    opponentAbbr: null,
    home: s.isHome,
    teamScore: null,
    opponentScore: null,
    result: s.isWin ? "W" : "L",
    gameStatus: "final",
    played: true,
    summary,
    lineup: null,
    batting: pitcher
      ? null
      : {
          atBats: n("atBats"), hits: n("hits"), homeRuns: n("homeRuns"), rbi: n("rbi"), walks: n("baseOnBalls"), stolenBases: n("stolenBases"),
          doubles: n("doubles"), triples: n("triples"), hitByPitch: n("hitByPitch"), sacFlies: n("sacFlies"), plateAppearances: n("plateAppearances"), strikeouts: n("strikeOuts"),
        },
    pitching: pitcher
      ? { outs, inningsText: innText(outs), runs: n("runs"), earnedRuns: n("earnedRuns"), strikeouts: n("strikeOuts"), win: n("wins") > 0, loss: n("losses") > 0, save: n("saves") > 0 }
      : null,
  };
}

function load(id: string) {
  const d = JSON.parse(fs.readFileSync(`${S}/prod-json/players-${id}.json`, "utf8")) as {
    player: { nameKo: string; mlbUrl: string; level: string | null };
    games: GameLine[];
    moves: RosterMove[];
  };
  const mlbId = d.player.mlbUrl.split("/").pop();
  const pitcher = d.games[0]?.role === "PITCHER";
  const minors: Row[] = [];
  for (const sp of Object.keys(LEVEL)) {
    const f = `${S}/minors/${mlbId}-${sp}.json`;
    if (!fs.existsSync(f)) continue;
    const splits = (JSON.parse(fs.readFileSync(f, "utf8")).stats?.[0]?.splits ?? []) as Split[];
    for (const s of splits) minors.push({ game: minorLine(s, d.games[0], pitcher), minor: { level: LEVEL[sp], team: city(s.team.name) } });
  }
  // 운영(#136)처럼 마이너에 있던 날(강등·이관 ~ 콜업·트레이드·메이저 계약)의 메이저 '결장' 줄은 뺀다
  const levelMoves = [...d.moves]
    .filter((m) => /콜업|강등|이관|트레이드|클레임|계약/.test(m.labelKo))
    .sort((a, b) => a.date.localeCompare(b.date));
  const usDay = (g: GameLine) => new Date(new Date(g.startTimeKst).getTime() - 5 * 3600_000).toISOString().slice(0, 10);
  const inMinors = (g: GameLine) => {
    const last = levelMoves.filter((m) => m.date <= usDay(g)).pop();
    return !!last && /강등|이관/.test(last.labelKo);
  };
  const mlb: Row[] = d.games.filter((g) => g.played || !inMinors(g)).map((g) => ({ game: g, minor: null }));
  const rows = [...mlb, ...minors].sort((a, b) => b.game.startTimeKst.localeCompare(a.game.startTimeKst));
  const moves = d.moves.filter((m) => m.date.startsWith("2026") && /콜업|강등|이관/.test(m.labelKo));
  return { ...d, rows, moves, pitcher };
}

const levelOf = (r: Row) => r.minor?.level ?? "메이저";
function stat(rows: Row[], pitcher: boolean): string {
  const p = rows.filter((r) => r.game.played);
  if (pitcher) {
    const outs = p.reduce((a, r) => a + (r.game.pitching?.outs ?? 0), 0);
    const er = p.reduce((a, r) => a + (r.game.pitching?.earnedRuns ?? 0), 0);
    return outs ? `평균자책점 ${formatEra((er * 27) / outs)}` : "";
  }
  const ab = p.reduce((a, r) => a + (r.game.batting?.atBats ?? 0), 0);
  const h = p.reduce((a, r) => a + (r.game.batting?.hits ?? 0), 0);
  return ab ? `타율 ${formatRate(h / ab)}` : "";
}
function levelSummary(rows: Row[], pitcher: boolean): string {
  const groups = new Map<string, Row[]>();
  for (const r of rows.filter((x) => x.game.played)) groups.set(levelOf(r), [...(groups.get(levelOf(r)) ?? []), r]);
  return [...groups].map(([l, rs]) => `${l} ${rs.length}경기${stat(rs, pitcher) ? ` ${stat(rs, pitcher).replace("타율 ", "").replace("평균자책점 ", "ERA ")}` : ""}`).join(" · ");
}
const month = (r: Row) => Number(r.game.startTimeKst.slice(5, 7));

function withMonths(rows: Row[], pitcher: boolean, all: Row[]): Item[] {
  const out: Item[] = [];
  let last = -1;
  for (const r of rows) {
    if (month(r) !== last) {
      last = month(r);
      out.push({ kind: "month", label: `${last}월`, summary: levelSummary(all.filter((x) => month(x) === last), pitcher) });
    }
    out.push({ kind: "row", row: r });
  }
  return out;
}
function firstN(items: Item[], n = 10): Item[] {
  const out: Item[] = [];
  let rows = 0;
  for (const it of collapse(items)) {
    if ((it.kind === "row" || it.kind === "skip") && ++rows > n) break;
    out.push(it);
  }
  return out;
}

/** 메이저 GameRow와 같은 칸 배치에 단계 표시 하나 */
function MinorRow({ g, level }: { g: GameLine; level: string }) {
  return (
    <li className="flex gap-3 p-3.5">
      <p className="w-12 shrink-0 text-center">
        <span className="block whitespace-nowrap text-base font-bold leading-snug tabular-nums">{formatShortDate(g.startTimeKst)}</span>
        <span className="block text-xs text-muted">{formatWeekday(g.startTimeKst)}</span>
      </p>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[0.8125rem] text-muted">
          <span className="rounded-md bg-surface-2 px-1.5 py-px text-[0.6875rem] font-bold text-foreground/70">{level}</span>
          <span>vs {g.opponentKo}</span>
          <span>{`· ${g.home ? "홈" : "원정"}`}</span>
          <ResultPill result={g.result} className="ml-auto" />
        </div>
        <p className="mt-1 text-[0.9375rem] font-semibold leading-[1.45]">{g.summary}</p>
        <Highlights line={g} className="mt-1.5" />
      </div>
    </li>
  );
}

function Rows({ items }: { items: Item[] }) {
  return (
    <ul className="divide-y divide-line">
      {items.map((it, i) =>
        it.kind === "month" ? (
          <li key={`m${i}`} className="flex items-baseline justify-between gap-3 border-b-0 px-3.5 pt-3.5 pb-0.5 text-xs">
            <span className="font-bold">{it.label}</span>
            <span className="truncate text-muted tabular-nums">{it.summary}</span>
          </li>
        ) : it.kind === "skip" ? (
          <li key={`s${i}`} className="flex items-center justify-between gap-3 px-3.5 py-3">
            <span className="text-[0.9375rem] font-bold tabular-nums">
              {formatShortDate(it.games[it.games.length - 1].startTimeKst)}–{formatShortDate(it.games[0].startTimeKst)}
            </span>
            <span className="text-[0.8125rem] text-muted">결장 {it.games.length}경기 ⌄</span>
          </li>
        ) : it.kind === "move" ? (
          <li key={`v${i}`} className={`flex items-center gap-2 px-3.5 py-2.5 text-[0.8125rem] font-bold ${it.up ? "bg-accent-soft text-accent-ink" : "bg-surface-2 text-muted"}`}>
            <span aria-hidden>{it.up ? "▲" : "▼"}</span>
            <span className="tabular-nums">{it.date}</span>
            <span>{it.text}</span>
          </li>
        ) : it.row.minor ? (
          <MinorRow key={`n${it.row.game.gameId}`} g={it.row.game} level={it.row.minor.level} />
        ) : (
          <GameRow key={`g${it.row.game.gameId}`} game={it.row.game} />
        ),
      )}
    </ul>
  );
}

const More = ({ n }: { n: number }) => (
  <p className="border-t border-line py-2.5 text-center text-sm font-semibold text-accent">{n > 0 ? `${n}경기 더 보기` : "더 보기"}</p>
);

export default async function MockMinors({ searchParams }: { searchParams: Promise<{ v?: string; id?: string }> }) {
  await connection();
  const { v = "1", id = "2" } = await searchParams;
  const d = load(id);
  const { rows, pitcher } = d;
  const played = rows.filter((r) => r.game.played);
  const count = (l: string) => played.filter((r) => levelOf(r) === l).length;
  const levels = [...new Set(played.map(levelOf))];
  // 지금 있는 곳: 가장 최근에 뛴 경기의 단계
  const now = played[0] ? levelOf(played[0]) : "메이저";

  let body: React.ReactNode;
  if (v === "1") {
    // 1. 한 목록에 섞기: 마이너 줄도 메이저와 같은 모양, '트리플A' 표시만
    const items = withMonths(rows, pitcher, rows);
    body = (
      <Section id="g" title="경기 기록" aside={levels.map((l) => `${l} ${count(l)}`).join(" · ")}>
        <div className="card overflow-hidden">
          <Rows items={firstN(items)} />
          <More n={0} />
        </div>
      </Section>
    );
  } else if (v === "2") {
    // 2. 단계 고르기: 지금 있는 곳이 먼저 열린다
    const sel = rows.filter((r) => levelOf(r) === now);
    const items = withMonths(sel, pitcher, sel);
    body = (
      <Section id="g" title="경기 기록">
        <div className="space-y-2.5">
          <div className="flex w-fit gap-0.5 rounded-full bg-surface p-1 shadow-[var(--shadow-card)]">
            {[now, ...levels.filter((l) => l !== now)].map((l) => (
              <span key={l} className={`rounded-full px-3 py-1 text-[0.8125rem] font-semibold tabular-nums ${l === now ? "bg-accent-soft text-accent-ink" : "text-muted"}`}>
                {l} {count(l)}
              </span>
            ))}
          </div>
          <div className="card overflow-hidden">
            <Rows items={firstN(items)} />
            <More n={0} />
          </div>
        </div>
      </Section>
    );
  } else if (v === "3") {
    // 3. 섞기 + 오르내림: 콜업·강등을 경기 사이 띠로
    const items: Item[] = [];
    const moves = [...d.moves];
    let last = -1;
    for (const r of rows) {
      while (moves.length && moves[0].date >= r.game.startTimeKst.slice(0, 10)) {
        const m = moves.shift()!;
        const up = /콜업/.test(m.labelKo);
        items.push({ kind: "move", up, date: formatShortDate(`${m.date}T12:00:00+09:00`), text: up ? "메이저 콜업" : "마이너로 내려감" });
      }
      if (month(r) !== last) {
        last = month(r);
        items.push({ kind: "month", label: `${last}월`, summary: levelSummary(rows.filter((x) => month(x) === last), pitcher) });
      }
      items.push({ kind: "row", row: r });
    }
    body = (
      <Section id="g" title="경기 기록" aside={levels.map((l) => `${l} ${count(l)}`).join(" · ")}>
        <div className="card overflow-hidden">
          <Rows items={firstN(items)} />
          <More n={0} />
        </div>
      </Section>
    );
  } else {
    // 4. 단계별 카드: 지금 있는 곳 카드가 위, 카드 머리에 그 단계 시즌 성적
    const order = [now, ...levels.filter((l) => l !== now)];
    body = (
      <Section id="g" title="경기 기록">
        <div className="space-y-3">
          {order.map((l) => {
            const rs = rows.filter((r) => levelOf(r) === l && r.game.played);
            const team = rs[0]?.minor?.team ?? rs[0]?.game.teamKo ?? "";
            return (
              <div key={l} className="card overflow-hidden">
                <div className="flex items-baseline justify-between gap-3 border-b border-line px-3.5 py-3">
                  <span className="text-[0.9375rem] font-bold">
                    {l} <span className="font-medium text-muted">· {team}</span>
                  </span>
                  <span className="text-xs text-muted tabular-nums">
                    {rs.length}경기 {stat(rs, pitcher)}
                  </span>
                </div>
                <Rows items={rs.slice(0, l === now ? 5 : 3).map((row) => ({ kind: "row", row }))} />
                <More n={rs.length - (l === now ? 5 : 3)} />
              </div>
            );
          })}
        </div>
      </Section>
    );
  }
  return <main className="mx-auto max-w-[402px] px-4 py-6">{body}</main>;
}
