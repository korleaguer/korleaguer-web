// 경기 상세·공 영상 주소(Route Handler)가 함께 쓰는 것. 누구나 부를 수 있는 GET 주소라 모양이 맞는 값만 api에 넘긴다
// (그 선수 경기인지는 api가 다시 확인한다). 선수·경기 번호 규칙은 다른 화면과 같은 lib/ids.ts의 parseId다

/** MLB 공 번호(playId): 소문자 UUID */
export const PLAY_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** 실패 응답. 브라우저·앞단이 저장하지 않게 한다(서버가 돌아오면 바로 다시 받는다) */
export function failed(status: number) {
  return Response.json(null, { status, headers: { "cache-control": "no-store" } });
}
