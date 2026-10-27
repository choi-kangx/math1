// 여러 화면이 함께 쓰는 DOM 도우미.
import { currentStreak, dayString } from './rewards.js';

export function el(tag, className, text) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

export function button(className, text, onClick) {
  const b = el('button', className, text);
  b.type = 'button';
  if (onClick) b.addEventListener('click', onClick);
  return b;
}

export function link(className, text, href) {
  const a = el('a', className, text);
  a.href = href;
  return a;
}

export function starsText(n, max = 3) {
  return '★'.repeat(n) + '☆'.repeat(Math.max(0, max - n));
}

// 위쪽 막대의 코인, 연속 출석 표시를 갱신한다.
export function renderStats(state) {
  const coins = document.getElementById('stat-coins');
  const streak = document.getElementById('stat-streak');
  if (coins) coins.textContent = `🪙 ${state.coins}`;
  if (streak) streak.textContent = `🔥 ${currentStreak(state.streak, dayString())}일`;
}
