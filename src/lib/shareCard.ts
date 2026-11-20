import { getHome, getPlayer, getRecords } from "@/lib/api";
import { pickRankRows } from "@/lib/koreanRank";
import { formatUsd } from "@/components/home/MlbChallenge";

/** 순위 카드 한 줄 */
export interface ShareCardRow {
  rank: number;
  name: string;
  /** 단위 없이 값만('1,671', '1억 1,300만') */
  value: string;
  /** 막대 길이 0~1 */
  ratio: number;
  /** 이 카드의 선수 */
  me: boolean;
  /** 앞선 선수와 값 차이가 커서 막대를 줄여 그린 줄: 막대 끝에 끊김 표시를 그린다(설명 글 없이) */
  broken: boolean;
}

/**
 * 선수 페이지 공유 카드(한국인 순위 카드, 11-21 사용자가 고른 C안, 이슈 #381). 사진·팀 색·로고 없이 순위 목록과 선수만 그린다.
 * - rank: 한국인 메이저리거 통산 순위 틀. 종목은 선수 페이지 '한국인 통산 기록' 첫 줄과 같다(lib/koreanRank.ts)
 * - posting: 포스팅 계약 순위 틀(보장액 순). 통산 순위 종목이 없는 선수(투수 등)가 포스팅으로 계약한 적이 있을 때
 */
export interface ShareCard {
  kind: "rank" | "posting";
  /** 맨 위 작은 이름표('한국인 메이저리거 통산 안타') */
  title: string;
  name: string;
  /** 이름 아래 큰 글씨('역대 4위') */
  headline: string;
  /** 큰 글씨 아래 한 줄('넘기까지 32안타 · 넘으면 한국인 3위') */
  sub: string;
  rows: ShareCardRow[];
  /** 맨 아래 출처 줄 */
  source: string;
  /** 그림의 대체 글(낭독기용, 그림 속 말과 같은 내용) */
  alt: string;
}

/** 카드에 그리는 줄 수 */
const ROWS = 6;
/** 맨 앞 줄이 둘째 줄의 이 배수보다 크면 막대를 줄여 그린다 */
const BREAK_RATIO = 1.6;

interface Entry {
  rank: number;
  name: string;
  amount: number;
  text: string;
  me: boolean;
}

/**
 * 줄 여섯 개를 고른다. 선수가 6위 안이면 맨 위부터, 아니면 1위 + 선수 주변 다섯 줄(등수가 이어지지 않아도 등수를 그대로 적는다).
 * 막대는 1위가 둘째 줄의 1.6배보다 크면 줄여서(끊김 표시) 나머지 막대가 짧아지지 않게 한다
 */
export function windowRows(entries: Entry[]): ShareCardRow[] | null {
  const at = entries.findIndex((e) => e.me);
  if (at < 0) return null;
  let picked: Entry[];
  if (entries.length <= ROWS || at < ROWS - 1) picked = entries.slice(0, ROWS);
  else {
    const start = Math.min(Math.max(at - 3, 1), entries.length - (ROWS - 1));
    picked = [entries[0], ...entries.slice(start, start + ROWS - 1)];
  }
  const broken = picked.length > 1 && picked[0].amount > picked[1].amount * BREAK_RATIO;
  const rest = Math.max(...picked.slice(broken ? 1 : 0).map((e) => e.amount));
  // 끊긴 1위는 막대를 가득 채우고, 나머지는 가장 긴 막대가 80%가 되게 해서 끊긴 막대가 더 길어 보이게 한다
  const scale = broken ? rest / 0.8 : rest;
  return picked.map((e, i) => ({
    rank: e.rank,
    name: e.name,
    value: e.text,
    ratio: broken && i === 0 ? 1 : scale > 0 ? Math.min(1, e.amount / scale) : 0,
    me: e.me,
    broken: broken && i === 0,
  }));
}

function sourceLine(generatedAt: string, label: string): string {
  const date = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric" }).format(new Date(generatedAt));
  return `${label} · ${date} 기준`;
}

/**
 * 선수의 공유 카드 내용. 만들 수 없으면 null(선수가 없거나 순위 종목도 포스팅 계약도 없을 때, 기록을 못 받았을 때).
 * 선수 페이지 공유 창(그림 보이기)과 그림 경로(players/[id]/card)가 같은 값을 쓴다
 */
export async function getShareCard(playerId: number): Promise<ShareCard | null> {
  const player = await getPlayer(playerId);
  if (!player.ok) return null;
  const name = player.data.player.nameKo;

  const records = await getRecords();
  if (records.ok) {
    const top = pickRankRows(records.data.next, playerId)[0];
    const category = top && records.data.categories.find((c) => c.key === top.category);
    if (top && category) {
      const rows = windowRows(
        category.leaders.map((l) => ({
          rank: l.rank,
          name: l.nameKo,
          amount: l.value,
          text: l.value.toLocaleString("ko-KR"),
          me: l.playerId === playerId,
        })),
      );
      if (rows) {
        const sub = `넘기까지 ${top.toPass.toLocaleString("ko-KR")}${top.unit} · 넘으면 한국인 ${top.rankAfter}위`;
        return {
          kind: "rank",
          title: `한국인 메이저리거 통산 ${category.label}`,
          name,
          headline: `역대 ${top.rank}위`,
          sub,
          rows,
          source: sourceLine(records.data.generatedAt, "기록 MLB"),
          alt: `${name}, 한국인 메이저리거 통산 ${category.label} 역대 ${top.rank}위. ${sub}`,
        };
      }
    }
  }

  // 포스팅 계약 순위 틀: 통산 순위 종목이 없는 선수(투수 등). 비시즌 홈이 주는 지난 포스팅 계약에서 찾는다
  const home = await getHome();
  const history = home.ok ? (home.data.posting?.history ?? []) : [];
  const deals = history
    .flatMap((h) => (h.deal?.guaranteedUsd != null ? [{ name: h.nameKo, season: h.season, deal: h.deal, usd: h.deal.guaranteedUsd }] : []))
    .sort((a, b) => b.usd - a.usd || b.season - a.season);
  const mine = deals.find((d) => d.name === name);
  if (!mine) return null;
  const rank = deals.filter((d) => d.usd > mine.usd).length + 1;
  const rows = windowRows(
    deals.map((d) => ({
      rank: deals.filter((x) => x.usd > d.usd).length + 1,
      name: d.name,
      amount: d.usd,
      text: formatUsd(d.usd).replace(/ 달러$/, ""),
      me: d.name === name,
    })),
  );
  if (!rows) return null;
  const sub = [`${mine.season} 포스팅`, mine.deal.mlbTeamKo].filter(Boolean).join(" · ");
  return {
    kind: "posting",
    title: "포스팅 계약 보장액 · 달러",
    name,
    headline: `역대 ${rank}위`,
    sub,
    rows,
    source: home.ok ? sourceLine(home.data.generatedAt, "기록 MLB·언론 보도") : "기록 MLB·언론 보도",
    alt: `${name}, 포스팅 계약 보장액 역대 ${rank}위. ${sub}`,
  };
}
