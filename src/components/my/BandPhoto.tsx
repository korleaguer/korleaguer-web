"use client"; // 사진이 안 뜰 때(onError) 이니셜 원으로 바꿔야 해서 클라이언트 컴포넌트다.

import PlayerAvatar from "@/components/PlayerAvatar";
import { useImageFailed } from "@/lib/useImageFailed";

interface Props {
  nameKo: string;
  photoUrl: string | null;
  teamAbbr: string | null;
}

/**
 * 내 선수 카드의 팀 색 무대(.player-stage) 오른쪽에 서는 배경 없는 선수 사진.
 * 띠보다 크게 두고 아래를 띠 밖으로 내려, 어깨의 잘린 선이 보이지 않고 띠 아래 끝에서 잘린 것처럼 보이게 한다.
 * 그림자를 둘러 팀 색 배경과 떨어져 보이게 한다.
 * 사진이 없거나 안 뜨면 흰 테두리 이니셜 원으로 대신한다. 이름이 바로 아래 있어 사진은 읽지 않는다.
 */
export default function BandPhoto({ nameKo, photoUrl, teamAbbr }: Props) {
  const { failed, ref, onError } = useImageFailed(photoUrl);

  if (!photoUrl || failed) {
    return (
      <span className="absolute bottom-3 right-4">
        <PlayerAvatar size={56} ring nameKo={nameKo} photoUrl={null} teamAbbr={teamAbbr} />
      </span>
    );
  }

  return (
    // 브라우저가 MLB 이미지 서버에서 직접 받는다(PlayerAvatar와 같은 이유로 next/image를 쓰지 않는다).
    // eslint-disable-next-line @next/next/no-img-element -- 우리 서버를 거치지 않고 브라우저가 직접 받는다
    <img
      ref={ref}
      src={photoUrl}
      alt=""
      width={112}
      height={112}
      referrerPolicy="no-referrer"
      onError={onError}
      // 띠(92px)보다 크게 두고 아래 16px을 띠 밖으로 내린다. 모자 위로는 여백이 조금 남는다.
      className="absolute -bottom-4 right-2 size-28 object-contain object-bottom drop-shadow-[0_3px_6px_rgb(0_0_0/0.28)]"
    />
  );
}
