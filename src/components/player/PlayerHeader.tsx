import type { ReactNode } from "react";
import type { PlayerDetail } from "@/lib/api";
import { formatAge, formatBirthDate, formatBody, formatSummary, teamLabel, teamPrefix } from "@/lib/format";
import { kboTeamColor, teamColor } from "@/lib/teams";
import ExternalLinkIcon from "@/components/ExternalLinkIcon";
import LevelChip from "@/components/LevelChip";
import PlayerSubline from "@/components/PlayerSubline";
import TeamName from "@/components/TeamName";
import MyPlayerToggle from "@/components/my/MyPlayerToggle";
import PhotoStage, { type Shot } from "@/components/player/PhotoStage";
import Words from "@/components/Words";

/**
 * 선수 페이지 머리 카드. 위쪽 팀 색 띠에 흰 테두리 원형 사진이 걸치고, 아래에 이름 · 영문 이름 · 기본 정보 한 줄.
 * 사진 오른쪽에 '내 선수' 넣기 버튼. 띠 색은 globals.css의 .team-band가 정한다(다크 모드에서는 어두운 팀 색을 밝힌다).
 * 과거 소속팀(KBO) 시절 사진이 있으면 '소속팀 사진' 알약으로 넘겨 본다(오래된 팀 → 지금 팀, 처음에는 지금 팀).
 * 과거 소속팀 사진은 api가 MLB 사진과 같은 틀(배경 없음, 같은 얼굴 크기)로 맞춘 편집본이라 넘겨도 원 안 얼굴이 그대로다.
 * 기본 정보 아래 흐린 한 줄이 선수 정보다(PlayerFacts).
 */
export default function PlayerHeader({ player, isMine }: { player: PlayerDetail; isMine: boolean }) {
  const shots: Shot[] = [
    ...player.careerPhotos.map((c, i) => ({
      key: `past-${i}`,
      label: c.teamKo,
      years: c.years,
      photoUrl: c.photoUrl,
      color: kboTeamColor(c.teamKo),
      // 옛 api는 KBO 원본(배경 있는 증명사진, /photos/kbo-…)을 줬다
      frame: c.photoUrl.startsWith("/photos/kbo-") ? ("cover" as const) : ("silo" as const),
    })),
    {
      key: "now",
      // FA·국내 복귀면 마지막 MLB 팀 사진이라 '전 미네소타'(기본 정보 줄과 같은 규칙). 그냥 '미네소타'면 지금 소속처럼 읽혔다
      label: teamLabel(player) ?? "지금",
      years: null,
      photoUrl: player.photoUrl,
      color: teamColor(player.teamAbbr),
      frame: "silo" as const,
    },
  ];

  return (
    <section aria-labelledby="player-name" className="card overflow-hidden">
      <PhotoStage
        nameKo={player.nameKo}
        shots={shots}
        initial={shots.length - 1}
        toggle={<MyPlayerToggle playerId={player.id} nameKo={player.nameKo} initialOn={isMine} variant="pill" />}
      >
        <h1 id="player-name" className="mt-2 text-display">
          {player.nameKo}
        </h1>
        <PlayerSubline player={player} className="mt-0.5" />
        <PlayerBasics player={player} className="mt-2" />
        <PlayerFacts player={player} className="mt-1.5" />
      </PhotoStage>
    </section>
  );
}

/**
 * 이름 아래 기본 정보 한 줄: '메이저 · (로고) 샌프란시스코 · 우익수 · 만 28세'.
 * 예전에는 정보 알약이었는데, 바로 옆 '소속팀 사진'·'내 선수' 알약(누르는 것)과 모양이 같아 눌릴 것처럼 보였다.
 * 알약은 누르는 것과 드문 상태에만 쓴다(사용자 규칙 11-17 '알약은 아껴 쓰기'). 그래서 글자로 두고, 드문 상태(FA·국내 복귀)만
 * 알약으로 줄 맨 앞에 남긴다('[FA] 전 애틀랜타 · 유격수 · 만 31세'). 글자색은 예전 알약 글자와 같은 neutral-pill-fg라
 * 아래 흐린 선수 정보 줄(PlayerFacts)보다 한 단계 진하다. 값이 없는 항목은 빼고, 하나도 없으면 그리지 않는다.
 * 항목은 쪼개지 않고 좁으면 항목 사이에서 줄을 바꾼다(마이너 팀 이름은 길어서 '마이너'와 따로 둔다: 'Indianapolis Indians').
 * 선수 목록 카드는 카드 전체가 링크라 알약(InfoChips) 그대로다.
 */
function PlayerBasics({ player, className }: { player: PlayerDetail; className: string }) {
  // 드문 상태 알약을 그릴지는 LevelChip과 같은 조건(국내 복귀 팀 이름이 있거나 FA)으로 정한다
  const rare = player.freeAgent || Boolean(player.returnedKo);
  const items: { key: string; node: ReactNode }[] = [];
  if (!rare && player.level === "MLB") items.push({ key: "level", node: "메이저" });
  if (!rare && player.level === "MINORS") {
    items.push({ key: "level", node: "마이너" });
    if (player.levelTeam) items.push({ key: "levelTeam", node: player.levelTeam });
  }
  if (player.teamKo) {
    items.push({
      key: "team",
      node: <TeamName teamKo={player.teamKo} teamAbbr={player.teamAbbr} prefix={teamPrefix(player)} />,
    });
  }
  if (player.positionKo) items.push({ key: "position", node: player.positionKo });
  const age = formatAge(player.age);
  if (age) items.push({ key: "age", node: age });
  if (!rare && items.length === 0) return null;

  return (
    <ul className={`flex flex-wrap items-center gap-x-1.5 gap-y-1 text-meta text-neutral-pill-fg ${className}`}>
      {rare && <LevelChip player={player} as="li" className="mr-0.5" />}
      {items.map((item, i) => (
        <li key={item.key} className="inline-flex items-center gap-x-1.5 whitespace-nowrap tabular-nums">
          {i > 0 && (
            <span aria-hidden className="text-muted">
              ·
            </span>
          )}
          {item.node}
        </li>
      ))}
    </ul>
  );
}

/**
 * 기본 정보 아래 선수 정보 한 줄: '우투좌타 · 183cm 89kg · 1998.08.20 · 2024 MLB 데뷔 · MLB 공식 페이지↗'.
 * 예전에는 페이지 맨 아래(휴대폰) '선수 정보' 칸이었는데 거의 보이지 않아 머리로 올렸다(사용자 11-16 시안 C1, 이슈 #236).
 * 소속팀·포지션·나이는 위 기본 정보 줄에 있어 뺀다. 한국 시절은 '소속팀 사진' 줄(키움 히어로즈 2017–2023)과 겹쳐서,
 * 그 줄이 없는 선수('KBO 경력 없음 (고교 졸업 후 미국 진출)')만 여기에 쓴다. 영문 출생지는 뺐다.
 * 값이 없는 항목은 빼고, 하나도 없으면 그리지 않는다. 좁으면 항목 단위로 줄을 바꾼다.
 */
function PlayerFacts({ player, className }: { player: PlayerDetail; className: string }) {
  const birth = formatBirthDate(player.birthDate);
  const body = formatBody(player.heightCm, player.weightKg);
  const facts: { key: string; label: string; text: string }[] = [];
  if (player.batsThrowsKo) facts.push({ key: "bt", label: "투타", text: player.batsThrowsKo });
  if (body) facts.push({ key: "body", label: "키·몸무게", text: body });
  if (birth) facts.push({ key: "birth", label: "생년월일", text: birth });
  if (player.debutYear != null) facts.push({ key: "debut", label: "", text: `${player.debutYear} MLB 데뷔` });
  if (player.careerKo && player.careerPhotos.length === 0) {
    facts.push({ key: "career", label: "한국 시절", text: formatSummary(player.careerKo) });
  }
  if (facts.length === 0 && !player.mlbUrl) return null;

  return (
    <p className={`text-meta text-muted ${className}`}>
      {facts.map((f, i) => (
        <span key={f.key}>
          {i > 0 && " · "}
          {/* 짧은 항목은 쪼개지 않는다. 긴 한국 시절 문장만 좁은 화면·큰 글씨에서 줄을 바꾼다 */}
          <span className={f.key === "career" ? "" : "whitespace-nowrap tabular-nums"}>
            {f.label && <span className="sr-only">{`${f.label} `}</span>}
            <Words text={f.text} />
          </span>
        </span>
      ))}
      {player.mlbUrl && (
        <>
          {facts.length > 0 && " · "}
          <a
            href={player.mlbUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 whitespace-nowrap font-semibold text-accent-ink hover:underline"
          >
            MLB 공식 페이지
            <ExternalLinkIcon />
            <span className="sr-only"> (새 탭에서 열림)</span>
          </a>
        </>
      )}
    </p>
  );
}
