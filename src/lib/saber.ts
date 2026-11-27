// 타자·투수로 갈리는 응답(MLB 안 위치, 지난 시즌 표)을 가르는 함수. 클라이언트 컴포넌트도 쓰므로 api.ts(서버 전용)와 따로 둔다.
import type { components } from "@/lib/api-schema";
import type { CareerSeason, PlayerSaber } from "@/lib/api";

type S = components["schemas"];

/** 타자 모양인지. 서버는 타자·투수를 키로만 나눈다(투수 모양에만 inningsOuts가 있다) */
export function isHitterSaber(s: PlayerSaber): s is S["PlayerSaberHitter"] {
  return !("inningsOuts" in s);
}

/** 타자 시즌인지. 지난 시즌 표도 같은 규칙이다 */
export function isHitterSeason(s: CareerSeason): s is S["CareerSeasonHitter"] {
  return !("inningsOuts" in s);
}
