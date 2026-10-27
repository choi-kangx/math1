// 효과음(Web Audio)과 문제 읽어 주기(Speech Synthesis). 지원하지 않으면 조용히 넘어간다.
let ctx = null;

const TUNES = {
  right: [[660, 0, 0.12], [880, 0.12, 0.18]],
  wrong: [[220, 0, 0.25]],
  coin: [[988, 0, 0.08], [1319, 0.08, 0.2]],
  finish: [[523, 0, 0.15], [659, 0.15, 0.15], [784, 0.3, 0.15], [1046, 0.45, 0.35]],
};

export function play(kind, enabled) {
  if (!enabled) return;
  try {
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return;
    if (!ctx) ctx = new AC();
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    for (const [freq, start, dur] of TUNES[kind] || []) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = kind === 'wrong' ? 'triangle' : 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.18, now + start);
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + dur + 0.02);
    }
  } catch {
    // audio not available
  }
}

// 수식 기호를 소리 내어 읽기 좋은 말로 바꾼다.
export function toSpeech(text) {
  return text
    .replace(/×/g, ' 곱하기 ')
    .replace(/÷/g, ' 나누기 ')
    .replace(/\+/g, ' 더하기 ')
    .replace(/ - /g, ' 빼기 ')
    .replace(/□/g, '네모')
    .replace(/= \?/g, '은 얼마일까요')
    .replace(/=/g, '은')
    .replace(/\?/g, '');
}

export function speak(text, enabled = true) {
  if (!enabled || !('speechSynthesis' in globalThis)) return;
  try {
    globalThis.speechSynthesis.cancel();
    const u = new globalThis.SpeechSynthesisUtterance(toSpeech(text));
    u.lang = 'ko-KR';
    u.rate = 0.9;
    globalThis.speechSynthesis.speak(u);
  } catch {
    // speech not available
  }
}
