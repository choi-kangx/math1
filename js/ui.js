// 여러 화면이 함께 쓰는 DOM 도우미.
import { currentStreak, dayString } from './rewards.js';
import { icon } from './icons.js';

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

// 아이콘과 글자가 함께 있는 요소
export function withIcon(node, name, text, size = 18) {
  node.append(icon(name, size));
  if (text !== undefined) node.append(el('span', null, text));
  return node;
}

export function starsText(n, max = 3) {
  return '★'.repeat(n) + '☆'.repeat(Math.max(0, max - n));
}

// 게임 타일: 영역별 색과 기호. 이모지 대신 기호 글자를 쓴다.
const GLYPHS = {
  count: '123', compare: '>', add10: '+', sub10: '−', make10: '10', shape: '△',
  addcarry: '+¹', subborrow: '−¹', times: '×', skip: '…', clock: '3:15', divide: '÷',
  mul21: '×²', fraction: '½', word: '“ ”', add3: '999', mixed: '( )', bigmul: '××',
  area: 'cm²', factors: 'a|b', fracop: '⅔', decimal: '.5', ratio: '%', equation: 'x',
};
const HUES = {
  '수와 연산': 'violet', 도형: 'teal', 측정: 'amber', '변화와 관계': 'rose', '문제 해결': 'sky',
};
export function gameTile(drill, size = 'md') {
  const t = el('span', `tile tile-${HUES[drill.area] || 'violet'} tile-${size}`, GLYPHS[drill.id] || drill.title.slice(0, 1));
  t.setAttribute('aria-hidden', 'true');
  return t;
}

// 위쪽 막대의 코인, 연속 학습 표시를 갱신한다.
export function renderStats(state) {
  const coins = document.getElementById('stat-coins');
  const streak = document.getElementById('stat-streak');
  if (coins) {
    coins.replaceChildren(icon('coin', 16), el('span', null, String(state.coins)));
    coins.title = '코인';
  }
  if (streak) {
    streak.replaceChildren(icon('flame', 16), el('span', null, `${currentStreak(state.streak, dayString())}일`));
    streak.title = '연속 학습';
  }
}

// 페이지 상단 막대(로고, 탭, 코인)를 채운다. 세 페이지가 함께 쓴다.
export function mountChrome({ back, title } = {}) {
  const bar = document.getElementById('topbar');
  if (!bar) return;
  bar.textContent = '';
  if (back) {
    const a = link('back-btn', undefined, back);
    a.setAttribute('aria-label', '뒤로');
    a.append(icon('back', 22));
    bar.append(a, el('span', 'topbar-title', title || ''));
  } else {
    const brand = link('brand', undefined, 'index.html#missions');
    brand.append(el('span', 'brand-mark', '∑'), el('span', 'brand-name', '수학 놀이터'));
    bar.appendChild(brand);
  }
  const stats = el('div', 'stats');
  const streak = el('span', 'pill pill-flame'); streak.id = 'stat-streak';
  const coins = el('span', 'pill pill-coin'); coins.id = 'stat-coins';
  stats.append(streak, coins);
  bar.appendChild(stats);
}
