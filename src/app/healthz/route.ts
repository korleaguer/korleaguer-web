// 컨테이너 헬스체크용(Docker HEALTHCHECK, 배포 스크립트가 새 컨테이너가 떴는지 볼 때 쓴다).
// API가 꺼져 있어도 웹 서버만 떠 있으면 200을 준다(웹 교체가 API 상태에 묶이지 않게).
// 본문은 "ok 0.2.0"(배포 버전, 이미지를 만들 때 APP_VERSION으로 박힌다). 배포 워크플로가 공개 주소에서 새 버전이 나오는지 본다.
export function GET() {
  return new Response(`ok ${process.env.APP_VERSION ?? "dev"}`, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
}
