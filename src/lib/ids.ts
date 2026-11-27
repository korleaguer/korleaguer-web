// 주소·쿠키로 받은 선수·경기·기사 번호의 모양 규칙. 화면(page.tsx)·proxy(없는 주소에 404)·공유 그림·기사 사진·경기 상세 GET 주소·
// 내 선수 쿠키가 같은 규칙을 쓰게 여기 하나로 둔다(같은 정규식이 여러 곳에 복사되어 있었다, PR #291·#293 리뷰). 곳마다 따로 적으면
// 한쪽만 바뀌어, 화면은 '찾는 선수가 없어요'를 그리는데 상태는 200(또는 그 반대)인 식으로 조용히 어긋난다. 모양이 맞는 값만 api에 넘긴다

/** 선수·경기 번호: 앞자리 0 없는 1~10자리 숫자 */
export const PLAYER_ID = /^[1-9]\d{0,9}$/;

/** 기사 번호: 앞자리 0 없는 1~15자리 숫자 */
export const NEWS_ID = /^[1-9]\d{0,14}$/;

/** MLB 공 번호(playId): 소문자 UUID. 공 영상 주소(GET)가 api에 넘기기 전에 본다 */
export const PLAY_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** 선수·경기 번호 글자 → 숫자. 모양이 맞지 않으면 null */
export function parseId(raw: string): number | null {
  return PLAYER_ID.test(raw) ? Number(raw) : null;
}
