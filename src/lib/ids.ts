// 주소·쿠키로 받은 선수·경기 번호의 모양 규칙. 선수 페이지·공유 그림·경기 상세 GET 주소·내 선수 쿠키가 같은 규칙을 쓰게
// 여기 하나로 둔다(같은 정규식이 다섯 곳에 복사되어 있었다, PR #291 리뷰). 모양이 맞는 값만 api에 넘긴다

/** 선수·경기 번호: 1 이상, 10자리 이하 정수 */
const ID = /^[1-9]\d{0,9}$/;

/** 번호 글자 → 숫자. 모양이 맞지 않으면 null */
export function parseId(raw: string): number | null {
  return ID.test(raw) ? Number(raw) : null;
}
