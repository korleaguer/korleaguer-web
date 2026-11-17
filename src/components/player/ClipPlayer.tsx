"use client"; // 영상 플레이어(Video.js 10)는 브라우저에서만 돈다. 경기 상세 창이 열릴 때만 불러온다(GameDetailSheet의 dynamic).

import "@videojs/react/video/neutral-skin.css";
import type { CSSProperties } from "react";
import { I18nProvider } from "@videojs/react/i18n";
import { HlsJsVideo } from "@videojs/react/media/hlsjs-video";
import { NeutralVideoSkin, Video, VideoPlayer } from "@videojs/react/video";

/** 지금 틀 영상 하나 */
export interface Clip {
  /** 영상이 바뀌면 플레이어를 새로 만든다(이전 영상 상태가 남지 않게) */
  key: string;
  /** MLB 하이라이트 HLS(.m3u8). 있으면 이것을 쓴다(데이터가 mp4의 1/3 안팎) */
  hlsUrl: string | null;
  /** mp4(HLS가 없을 때, Baseball Savant 공 영상) */
  mp4Url: string | null;
  /** 재생 전 대표 사진 */
  posterUrl: string | null;
  /** 타석 ▶처럼 사람이 눌러 바꾼 영상이면 바로 재생을 시도한다(브라우저가 막으면 가운데 재생 버튼) */
  autoPlay: boolean;
}

// 사이트 색·글꼴에 맞춘다(DESIGN.md: 파랑 #2563eb, Pretendard). 조작부 바탕은 스킨이 어둡게 둔다
const SKIN_STYLE = {
  width: "100%",
  aspectRatio: "16 / 9",
  "--media-accent-color": "#2563eb",
  "--media-accent-text-color": "#ffffff",
  "--media-border-radius": "12px",
  "--media-font-family": "var(--font-sans)",
  "--media-object-fit": "contain",
  // 조작 버튼 36px → 44px(Apple 44pt, 이슈 #249). 스킨 기본값은 --media-spacing(4px) × 9.
  // 버튼 6개(재생·소리·자막·전송·화면 속 화면·전체 화면)와 시간 글자가 한 줄이라, 화면 폭 360px보다 좁으면
  // 1px 좁아질 때마다 0.25px씩 줄인다(최소 36px). 재 보니 320px 36px·340px 39px·360px 44px에서 시간 글자와 겹치지 않는다
  "--media-control-size": "clamp(36px, calc(44px - (360px - 100vw) / 4), 44px)",
} as CSSProperties;

/**
 * 경기 상세 창의 영상 하나. Video.js 10(Apache-2.0, 사용자 11-15 결정) Neutral 스킨, 한국어 조작부.
 * - 하이라이트: MLB HLS를 hls.js로 튼다(아이폰은 기기 내장 HLS로 자동 전환). 휴대폰 창이 작아 화질은 540p까지만 올린다
 *   (31초 하이라이트 mp4 16MB → HLS 540p 약 10MB, 360p 약 5MB. MLB 서버가 다른 사이트 요청을 허용한다: access-control-allow-origin *)
 * - 공 영상: Savant mp4를 그대로 튼다(HLS 없음).
 * 영상은 MLB 서버에서 브라우저가 바로 받는다. 우리 서버를 거치지 않고 저장하지도 않는다.
 */
export default function ClipPlayer({ clip }: { clip: Clip }) {
  return (
    <I18nProvider locale="ko">
      <VideoPlayer key={clip.key} poster={clip.posterUrl ?? undefined}>
        <NeutralVideoSkin style={SKIN_STYLE}>
          {clip.hlsUrl ? (
            <HlsJsVideo
              source={{ src: clip.hlsUrl, maxAutoResolution: "540p" }}
              playsInline
              autoPlay={clip.autoPlay}
            />
          ) : (
            <Video src={clip.mp4Url ?? undefined} playsInline preload="metadata" autoPlay={clip.autoPlay} />
          )}
        </NeutralVideoSkin>
      </VideoPlayer>
    </I18nProvider>
  );
}
