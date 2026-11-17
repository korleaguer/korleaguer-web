// 경기 상세·공 영상 주소(Route Handler)가 주소에서 받은 번호를 확인하는 규칙. 누구나 부를 수 있는 GET 주소라
// 모양이 맞는 값만 api에 넘긴다(그 선수 경기인지는 api가 다시 확인한다). 두 주소가 같은 규칙을 쓰게 여기 하나로 둔다

/** 선수·경기 번호: 1 이상, 10자리 이하 정수 */
export const ID = /^[1-9]\d{0,9}$/;

/** MLB 공 번호(playId): 소문자 UUID */
export const PLAY_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** 실패 응답. 브라우저·앞단이 저장하지 않게 한다(서버가 돌아오면 바로 다시 받는다) */
export function failed(status: number) {
  return Response.json(null, { status, headers: { "cache-control": "no-store" } });
}
