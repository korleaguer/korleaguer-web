// api 서버 주소. api를 부르는 곳(lib/api.ts·사진 경로·공유 그림·proxy)이 모두 이 함수로 주소를 만들어 기본 주소가 한 곳에만 있다.
// proxy도 쓰므로 react·next/cache를 들이지 않는 따로 파일에 둔다(lib/api.ts에서 가져오면 그 캐시 코드까지 proxy 묶음에 들어가
// 묶음이 약 110KB 커진다).

/** api 경로('/api/players/1')를 API_BASE_URL(없으면 로컬 개발용 8080) 뒤에 붙인 주소 */
export function apiUrl(path: string): URL {
  return new URL(path, process.env.API_BASE_URL ?? "http://localhost:8080");
}
