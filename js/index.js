import { loadManifest, loadStep } from './loader.js';
import { loadSolved } from './progress.js';
import { isStepComplete } from './engine.js';
import { DRILLS, findDrill, recommendedLevel } from './generators.js';
import { loadState, updateState, resetAll } from './store.js';
import {
  dayString, dailyMissions, missionsDone, buySticker, currentStreak, MISSION_BONUS,
} from './rewards.js';
import { STICKERS } from './stickers.js';
import { play, speak } from './sound.js';
import { renderArt } from './comic.js';
import { icon, starRow } from './icons.js';
import { el, button, link, gameTile, renderStats, mountChrome } from './ui.js';

const viewRoot = document.getElementById('view');
const TABS = [
  { view: 'missions', icon: 'home', label: '홈' },
  { view: 'learn', icon: 'book', label: '배우기' },
  { view: 'play', icon: 'game', label: '게임' },
  { view: 'stickers', icon: 'award', label: '컬렉션' },
  { view: 'settings', icon: 'sliders', label: '설정' },
];
const VIEWS = { missions, learn, play: games, stickers, settings };
let gameFilter = null;

// 레슨 목록은 한 번만 읽는다. 한 파일이 깨져도 나머지 레슨은 보여 준다.
let lessonsPromise = null;
function loadLessons() {
  if (!lessonsPromise) {
    lessonsPromise = loadManifest().then(async (ids) => {
      const results = await Promise.allSettled(ids.map((id) => loadStep(id)));
      results.filter((r) => r.status === 'rejected').forEach((r) => console.error(r.reason));
      return {
        lessons: results.filter((r) => r.status === 'fulfilled').map((r) => r.value),
        failed: results.some((r) => r.status === 'rejected'),
      };
    });
    lessonsPromise.catch(() => { lessonsPromise = null; });
  }
  return lessonsPromise;
}

function header(title, sub) {
  const h = el('div', 'view-head');
  h.appendChild(el('h1', 'view-title', title));
  if (sub) h.appendChild(el('p', 'view-sub', sub));
  return h;
}

function section(title, sub) {
  const s = el('section', 'section');
  const head = el('div', 'section-head');
  head.appendChild(el('h2', 'section-title', title));
  if (sub) head.appendChild(el('p', 'section-sub', sub));
  s.appendChild(head);
  return s;
}

function chip(text, cls = '') {
  return el('span', `chip ${cls}`.trim(), text);
}

function levelStars(state, drill, level) {
  return state.stars[`drill:${drill.id}:L${level}`] ?? (level === 1 ? state.stars[`drill:${drill.id}`] || 0 : 0);
}

function levelDots(state, drill) {
  const dots = el('span', 'level-dots');
  drill.levels.forEach((_, i) => {
    const n = levelStars(state, drill, i + 1);
    const d = el('span', `dot s${n}`);
    d.title = `Lv.${i + 1} 별 ${n}개`;
    dots.appendChild(d);
  });
  return dots;
}

function gameCard(drill, state) {
  const a = link('game-card', undefined, `drill.html?id=${encodeURIComponent(drill.id)}`);
  const body = el('span', 'game-body');
  body.append(
    el('span', 'game-title', drill.title),
    el('span', 'game-meta', `${drill.grade}학년 · ${drill.area}`),
    levelDots(state, drill)
  );
  a.append(gameTile(drill), body);
  return a;
}

function missionRow(drill, state, done) {
  const a = link(done ? 'row-card done' : 'row-card', undefined, `drill.html?id=${encodeURIComponent(drill.id)}`);
  const rec = recommendedLevel(drill, state.settings.grade);
  const body = el('span', 'row-body');
  body.append(el('span', 'row-title', drill.title), el('span', 'row-meta', `추천 Lv.${rec} · ${drill.levels[rec - 1]}`));
  const status = done ? el('span', 'status done') : el('span', 'status');
  if (done) status.append(icon('check', 16), el('span', null, '완료'));
  else status.append(icon('coin', 16), el('span', null, `+${MISSION_BONUS}`));
  a.append(gameTile(drill, 'sm'), body, status);
  return a;
}

function lessonThumb(step) {
  const t = el('span', 'thumb');
  const first = step.scenes[0];
  if (first.art) t.appendChild(renderArt(first.art));
  else if (first.image) {
    const img = el('img');
    img.src = first.image;
    img.alt = '';
    t.appendChild(img);
  } else t.appendChild(el('span', 'thumb-text', first.visual));
  return t;
}

function lessonCard(step, state) {
  const a = link('lesson-card', undefined, `step.html?id=${encodeURIComponent(step.id)}`);
  const stars = state.stars[`lesson:${step.id}`] || 0;
  const done = isStepComplete(step, loadSolved(step.id));
  const body = el('span', 'lesson-body');
  const top = el('span', 'lesson-top');
  top.append(chip(`${step.grade}학년`), done || stars ? starRow(stars) : chip('새 레슨', 'chip-new'));
  body.append(top, el('span', 'lesson-title', step.title), el('span', 'lesson-desc', step.principle));
  a.append(lessonThumb(step), body);
  return a;
}

function ring(done, total) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 84 84');
  svg.setAttribute('class', 'ring');
  const c = 2 * Math.PI * 34;
  for (const [cls, len] of [['ring-bg', c], ['ring-fg', (c * done) / total]]) {
    const circle = document.createElementNS(NS, 'circle');
    circle.setAttribute('cx', 42); circle.setAttribute('cy', 42); circle.setAttribute('r', 34);
    circle.setAttribute('class', cls);
    circle.setAttribute('stroke-dasharray', `${len} ${c}`);
    svg.appendChild(circle);
  }
  const t = document.createElementNS(NS, 'text');
  t.setAttribute('x', 42); t.setAttribute('y', 49); t.setAttribute('text-anchor', 'middle');
  t.setAttribute('class', 'ring-text');
  t.textContent = `${done}/${total}`;
  svg.appendChild(t);
  return svg;
}

async function missions(state, view) {
  const today = dayString();
  const grade = state.settings.grade;
  const ids = dailyMissions(today, DRILLS, grade);
  const done = missionsDone(state, today);
  const name = state.settings.name || '친구';
  const streak = currentStreak(state.streak, today);

  const hero = el('section', 'hero');
  const text = el('div', 'hero-text');
  text.append(
    el('p', 'hero-kicker', `${grade}학년 · 연속 학습 ${streak}일`),
    el('h1', 'hero-title', `${name}, 오늘도 한 걸음!`),
    el('p', 'hero-sub', done.length >= ids.length ? '오늘의 미션을 모두 끝냈어요. 멋져요!' : '미션 3개를 끝내고 보너스 코인을 받아요.')
  );
  const ringBox = el('div', 'hero-ring');
  ringBox.append(ring(Math.min(done.length, ids.length), ids.length), el('span', 'ring-label', '오늘의 미션'));
  hero.append(text, ringBox);
  view.appendChild(hero);

  const s = section('오늘의 미션', `별 1개 이상이면 완료 · 미션마다 코인 ${MISSION_BONUS}개`);
  const list = el('div', 'row-list');
  ids.forEach((id) => list.appendChild(missionRow(findDrill(id), state, done.includes(id))));
  s.appendChild(list);
  view.appendChild(s);

  try {
    const { lessons } = await loadLessons();
    const notDone = (l) => !isStepComplete(l, loadSolved(l.id));
    const next = lessons.find((l) => l.grade === grade && notDone(l)) || lessons.find(notDone);
    if (next) {
      const ls = section('이어서 배우기', '만화 속 질문에 답하며 원리를 찾아봐요');
      const grid = el('div', 'lesson-grid single');
      grid.appendChild(lessonCard(next, state));
      ls.appendChild(grid);
      view.appendChild(ls);
    }
  } catch (e) {
    console.error(e);
  }
}

async function learn(state, view) {
  view.appendChild(header('배우기', '이야기 속 질문에 답하며 수학 원리를 스스로 찾아봐요'));
  try {
    const { lessons, failed } = await loadLessons();
    if (lessons.length === 0) throw new Error('no lessons');
    for (const grade of [1, 2, 3, 4, 5, 6]) {
      const list = lessons.filter((l) => l.grade === grade);
      if (list.length === 0) continue;
      const s = section(`${grade}학년`);
      const grid = el('div', 'lesson-grid');
      list.forEach((l) => grid.appendChild(lessonCard(l, state)));
      s.appendChild(grid);
      view.appendChild(s);
    }
    if (failed) view.appendChild(el('p', 'notice error', '일부 레슨을 불러오지 못했어요'));
  } catch (e) {
    console.error(e);
    view.appendChild(el('p', 'notice error', '단계 목록을 불러오지 못했어요'));
  }
}

function games(state, view) {
  view.appendChild(header('연습 게임', `게임 ${DRILLS.length}종 · 단계마다 별을 모아 보세요`));
  const grades = [...new Set(DRILLS.map((d) => d.grade))].sort();
  if (gameFilter === null) gameFilter = grades.includes(state.settings.grade) ? state.settings.grade : 0;
  const bar = el('div', 'filter-bar');
  bar.setAttribute('role', 'tablist');
  [0, ...grades].forEach((g) => {
    const b = button(g === gameFilter ? 'filter on' : 'filter', g === 0 ? '전체' : `${g}학년`, () => { gameFilter = g; render(); });
    b.setAttribute('aria-pressed', String(g === gameFilter));
    bar.appendChild(b);
  });
  view.appendChild(bar);
  const grid = el('div', 'game-grid');
  DRILLS.filter((d) => gameFilter === 0 || d.grade === gameFilter).forEach((d) => grid.appendChild(gameCard(d, state)));
  view.appendChild(grid);
}

function stickers(state, view) {
  const owned = state.stickers.length;
  view.appendChild(header('컬렉션', `${owned} / ${STICKERS.length} 모음 · 게임과 레슨으로 코인을 모아요`));
  const meter = el('div', 'meter');
  const fill = el('div', 'meter-fill');
  fill.style.width = `${(owned / STICKERS.length) * 100}%`;
  meter.appendChild(fill);
  view.appendChild(meter);

  const grid = el('div', 'collect-grid');
  STICKERS.forEach((st) => {
    const has = state.stickers.includes(st.id);
    const cell = el('div', has ? 'collect owned' : 'collect');
    const badge = el('span', 'collect-badge');
    if (has) badge.textContent = st.emoji;
    else badge.appendChild(icon('lock', 22));
    cell.append(badge, el('span', 'collect-name', has ? st.name : '???'));
    if (!has) {
      const b = button(state.coins < st.price ? 'buy-btn poor' : 'buy-btn', undefined, () => {
        let result;
        const next = updateState((cur) => {
          result = buySticker(cur, st);
          return result.state;
        });
        if (result.ok) {
          play('coin', next.settings.sound);
          render();
        } else {
          play('wrong', next.settings.sound);
          b.lastChild.textContent = '코인 부족';
          setTimeout(() => { b.lastChild.textContent = String(st.price); }, 1200);
        }
      });
      b.append(icon('coin', 14), el('span', null, String(st.price)));
      cell.appendChild(b);
    }
    grid.appendChild(cell);
  });
  view.appendChild(grid);
}

function settings(state, view) {
  view.appendChild(header('설정'));
  const save = (patch) => updateState((cur) => ({ ...cur, settings: { ...cur.settings, ...patch } }));
  const card = el('div', 'settings-card');

  const row = (label, control) => {
    const r = el('div', 'setting');
    r.append(el('span', 'setting-label', label), control);
    card.appendChild(r);
  };

  const name = el('input', 'text-input');
  name.type = 'text';
  name.maxLength = 20;
  name.value = state.settings.name;
  name.placeholder = '이름';
  name.setAttribute('aria-label', '이름');
  name.addEventListener('change', () => save({ name: name.value.trim() }));
  row('이름', name);

  const seg = el('div', 'segmented');
  [1, 2, 3, 4, 5, 6].forEach((g) => {
    seg.appendChild(button(g === state.settings.grade ? 'seg on' : 'seg', String(g), () => { save({ grade: g }); gameFilter = null; render(); }));
  });
  row('학년', seg);

  const toggle = (label, key, after) => {
    const on = state.settings[key];
    const sw = button(on ? 'switch on' : 'switch', undefined, () => {
      const next = save({ [key]: !on });
      if (after) after(next);
      render();
    });
    sw.setAttribute('role', 'switch');
    sw.setAttribute('aria-checked', String(on));
    sw.setAttribute('aria-label', label);
    sw.appendChild(el('span', 'knob'));
    row(label, sw);
  };
  toggle('효과음', 'sound', (next) => play('right', next.settings.sound));
  toggle('문제 자동으로 읽어 주기', 'speech', (next) => speak('3 + 4 = ?', next.settings.speech));
  view.appendChild(card);

  const totalStars = Object.values(state.stars).reduce((a, b) => a + b, 0);
  const stats = el('div', 'stat-grid');
  for (const [label, value] of [['플레이', state.plays], ['모은 별', totalStars], ['컬렉션', state.stickers.length]]) {
    const c = el('div', 'stat');
    c.append(el('span', 'stat-value', String(value)), el('span', 'stat-label', label));
    stats.appendChild(c);
  }
  const ss = section('나의 기록');
  ss.appendChild(stats);
  view.appendChild(ss);

  const reset = button('btn btn-danger', undefined, () => {
    if (!globalThis.confirm('코인, 별, 컬렉션, 레슨 기록이 모두 지워져요. 지울까요?')) return;
    resetAll();
    render();
  });
  reset.append(icon('trash', 18), el('span', null, '모든 기록 지우기'));
  view.appendChild(reset);
}

function mountTabs() {
  const nav = document.getElementById('tabs');
  TABS.forEach((t) => {
    const a = link('tab', undefined, `#${t.view}`);
    a.dataset.view = t.view;
    a.append(icon(t.icon, 22), el('span', null, t.label));
    nav.appendChild(a);
  });
}

function currentView() {
  const name = location.hash.replace('#', '');
  return VIEWS[name] ? name : 'missions';
}

async function render() {
  const name = currentView();
  const state = loadState();
  renderStats(state);
  document.querySelectorAll('.tab').forEach((t) => {
    if (t.dataset.view === name) t.setAttribute('aria-current', 'page');
    else t.removeAttribute('aria-current');
  });
  // 화면마다 새 상자에 그린다. 늦게 끝난 이전 화면은 떨어져 나간 상자에 그려지므로 섞이지 않는다.
  const box = el('div', 'view-box');
  viewRoot.replaceChildren(box);
  await VIEWS[name](state, box);
}

mountChrome();
mountTabs();
window.addEventListener('hashchange', () => { window.scrollTo(0, 0); render(); });
render();
