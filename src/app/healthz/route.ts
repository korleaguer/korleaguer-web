// 컨테이너 헬스체크용(Docker HEALTHCHECK, 배포 스크립트가 새 컨테이너가 떴는지 볼 때 쓴다).
// API가 꺼져 있어도 웹 서버만 떠 있으면 200을 준다(웹 교체가 API 상태에 묶이지 않게).
export function GET() {
  return new Response("ok", { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
}
