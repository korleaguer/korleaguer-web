/**
 * 숨은 문서(뒤에 있는 탭, 숨은 앱 화면)에서 화면 전환(View Transitions, PageSuspense)이 건너뛰어질 때 나는 InvalidStateError를
 * 콘솔·개발 오버레이에 띄우지 않는다. 브라우저는 움직임만 건너뛰고 화면은 그대로 바뀌어서, 고칠 것이 없는 소음이다(#287부터).
 * - 화면 안에서 옮겨 갈 때: React는 이 오류를 크롬 옛 문구('Transition was aborted because of invalid state')와 글자가 같을 때만
 *   무시한다. 지금 크롬은 끝에 '. Document hidden'을 붙여서 React가 onRecoverableError로 넘기고, Next가 reportError로 다시 던진다
 *   (창 'error' 이벤트, 콘솔 'Uncaught InvalidStateError')
 * - 첫 화면을 받으며 늦게 온 내용을 드러낼 때: React 스트리밍 스크립트가 전환의 ready에 finally만 걸어 거절이 처리되지 않는다
 *   ('unhandledrejection', 콘솔 'Uncaught (in promise)')
 * 숨은 문서 때문에 건너뛴 전환의 오류만 거르고 다른 오류는 그대로 둔다. 스트리밍 스크립트보다 먼저 들어야 해서 head 안 인라인 스크립트다.
 * preventDefault는 콘솔 줄을, stopImmediatePropagation은 뒤에 붙는 창 리스너를 막는다. 개발 오버레이(Next 16 next-devtools
 * use-error-handler)는 defaultPrevented를 보지 않아 뒤쪽이 있어야 뜨지 않는다. 운영의 다른 창 리스너는 Next 리다이렉트 처리
 * (리다이렉트 오류만 다룬다)뿐이라 지금 막히는 것은 없고, 나중에 붙일 오류 수집 도구도 이 소음은 받지 않게 일부러 둔다.
 * 크롬이 문구를 또 바꾸면 다시 콘솔에 찍힌다(동작은 그대로)
 */
const SCRIPT = `(function () {
  var hidden = /^(Transition was aborted because of invalid state\\. Document hidden|View transition was skipped because document visibility state is hidden|Skipping view transition because document visibility state has become hidden)/;
  function quiet(event, reason) {
    if (reason && reason.name === "InvalidStateError" && hidden.test(String(reason.message))) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }
  addEventListener("unhandledrejection", function (event) { quiet(event, event.reason); });
  addEventListener("error", function (event) { quiet(event, event.error); });
})();`;

export default function HiddenTransitionGuard() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
