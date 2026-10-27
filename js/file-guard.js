// index.html을 더블클릭해서(file://) 열면 모듈 스크립트와 데이터 파일을 읽을 수 없어 빈 화면이 된다.
// 그럴 때 빈 화면 대신 여는 방법을 안내한다. 일반 스크립트라서 file://에서도 실행된다.
(function () {
  if (location.protocol !== 'file:') return;
  document.addEventListener('DOMContentLoaded', function () {
    document.body.className = '';
    document.body.innerHTML =
      '<main class="page narrow">' +
      '<div class="result-card">' +
      '<h1 class="result-title">이 파일은 바로 열 수 없어요</h1>' +
      '<p class="result-sub">브라우저 보안 규칙 때문에 index.html을 더블클릭하면 앱이 실행되지 않아요.</p>' +
      '<div class="principle"><p>폴더에 있는 <b>start.bat</b>을 더블클릭하면 브라우저에서 바로 열려요.<br>' +
      '또는 GitHub Pages에 올린 주소로 접속하세요.</p></div>' +
      '</div></main>';
  });
})();
