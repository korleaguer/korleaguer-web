// 서버 함수(서버 액션)를 부르고, 던진 실패를 값으로 돌려받는 도우미. 브라우저 쪽 컴포넌트가 쓴다.
// 부르는 곳마다 실패를 잡는 모양이 달랐고(.catch(() => undefined) 등) 실패가 돌려받는 값의 타입에 드러나지 않았다(PR #301 리뷰).
import { unstable_isUnrecognizedActionError, unstable_rethrow } from "next/navigation";

/**
 * 서버 함수가 실패한 까닭.
 * - failed: 서버까지 닿지 못했거나(연결 끊김, 배포 중 잠깐 꺼짐) 서버가 실패했다. 다시 하면 될 수 있다.
 * - stale: 이 화면이 옛 배포라 서버가 그 서버 함수를 모른다. 서버 함수 번호는 빌드마다 새로 만드는 키로 정해져서(Docker 빌드에
 *   .next 캐시가 없다) develop 병합마다 바뀌고, 배포 전에 열어 둔 탭이 받는다. 다시 해도 같아서 페이지를 새로 받아야 낫는다
 *   (다시 시도만 두면 몇 번을 눌러도 같은 실패만 났다, PR #301 리뷰).
 */
export type ActionFailure = "failed" | "stale";

export type ActionResult<T> = { ok: true; value: T } | { ok: false; failure: ActionFailure };

/**
 * 서버 함수를 부른다. 던지면(연결 끊김·서버 오류·옛 배포) 실패 값으로 바꾼다: 그대로 두면 화면 전체가 오류 화면(error.tsx)으로
 * 바뀌어 보던 화면을 잃었다(전수조사 L324). redirect·notFound처럼 Next가 처리할 오류는 그대로 다시 던진다(unstable_rethrow).
 * 서버 함수가 실패를 값으로 돌려주게만 하면 서버까지 못 간 경우(연결 끊김)를 못 잡아서 브라우저에서 잡는다.
 */
export async function callAction<T>(action: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, value: await action() };
  } catch (error) {
    unstable_rethrow(error);
    return { ok: false, failure: unstable_isUnrecognizedActionError(error) ? "stale" : "failed" };
  }
}
