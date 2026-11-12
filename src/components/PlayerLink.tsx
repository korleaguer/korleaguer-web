import Link from "next/link";
import PlayerAvatar, { type AvatarSize } from "./PlayerAvatar";

interface Props {
  playerId: number;
  nameKo: string;
  photoUrl: string | null;
  teamAbbr: string | null;
  /** 사진 크기. 표·순위는 24, 시즌 1위 카드는 28 */
  avatarSize?: Extract<AvatarSize, 24 | 28>;
  /** 글자 굵기·너비 등. 링크 전체(사진 + 이름)에 붙는다 */
  className?: string;
}

/** 작은 사진 + 선수 이름. 누르면 선수 페이지로 간다. */
export default function PlayerLink({
  playerId,
  nameKo,
  photoUrl,
  teamAbbr,
  avatarSize = 24,
  className = "",
}: Props) {
  return (
    <Link
      href={`/players/${playerId}`}
      className={`press group inline-flex min-w-0 items-center gap-2 ${className}`}
    >
      <PlayerAvatar size={avatarSize} nameKo={nameKo} photoUrl={photoUrl} teamAbbr={teamAbbr} />
      <span className="truncate group-hover:text-accent-ink group-hover:underline">{nameKo}</span>
    </Link>
  );
}
