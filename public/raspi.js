(function () {
  const w = window.innerWidth;
  const h = window.innerHeight;

  // 라파 7" 기준: 작으면 raspi 클래스 부여
  if (w <= 820 && h <= 600) {
    document.documentElement.classList.add('raspi');
  }

  // 이모지 대체(옵션): 네모(□) 감지시 간단 텍스트로 교체
  // 필요 없으면 아래 블럭 삭제
  const maybeSquare = /�|□/; // 대체문자/네모
  // 간단한 후보 셋만 처리
  const replacements = [
    { find: /🔔/g, text: '[알림]' },
    { find: /🎤/g, text: '[마이크]' },
    { find: /📞/g, text: '[전화]' },
    { find: /🗺️/g, text: '[지도]' },
    { find: /🚨/g, text: '[응급]' }
  ];
  // body 텍스트에 네모 있으면 간단 치환
  setTimeout(() => {
    if (maybeSquare.test(document.body.innerText)) {
      replacements.forEach(r => {
        document.body.innerHTML = document.body.innerHTML.replace(r.find, r.text);
      });
    }
  }, 300);
})();
