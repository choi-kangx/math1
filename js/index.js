import { loadManifest, loadStep } from './loader.js';
import { loadSolved } from './progress.js';
import { isStepComplete } from './engine.js';
import { DRILLS, findDrill } from './generators.js';
import { loadState, updateState, resetAll } from './store.js';
import {
  dayString, dailyMissions, missionsDone, buySticker, currentStreak, MISSION_BONUS,
} from './rewards.js';
import { STICKERS } from './stickers.js';
import { play, speak } from './sound.js';
import { el, button, link, starsText, renderStats } from './ui.js';

const viewRoot = document.getElementById('view');
const VIEWS = { missions, learn, play: games, stickers, settings };

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

function section(title, sub) {
  const s = el('section', 'section');
  s.appendChild(el('h2', 'section-title', title));
  if (sub) s.appendChild(el('p', 'section-sub', sub));
  return s;
}

function drillCard(drill, state, extra) {
  const a = link('card drill-card', undefined, `drill.html?id=${encodeURIComponent(drill.id)}`);
  const stars = state.stars[`drill:${drill.id}`] || 0;
  a.append(
    el('span', 'card-icon', drill.icon),
    el('span', 'card-title', drill.title),
    el('span', 'card-meta', `${drill.grade}학년 · ${drill.area}`),
    el('span', stars ? 'card-stars' : 'card-stars empty', starsText(stars))
  );
  if (extra) a.appendChild(extra);
  return a;
}

function lessonCard(step, state) {
  const a = link('card lesson-card', undefined, `step.html?id=${encodeURIComponent(step.id)}`);
  const stars = state.stars[`lesson:${step.id}`] || 0;
  const done = isStepComplete(step, loadSolved(step.id));
  a.append(
    el('span', 'card-meta', `${step.grade}학년 · ${step.area || '수학'}`),
    el('span', 'card-title', step.title),
    el('span', 'card-desc', step.principle),
    el('span', stars ? 'card-stars' : 'card-stars empty', done || stars ? starsText(stars) : '아직 안 했어요')
  );
  return a;
}

async function missions(state, view) {
  const today = dayString();
  const grade = state.settings.grade;
  const ids = dailyMissions(today, DRILLS, grade);
  const done = missionsDone(state, today);
  const name = state.settings.name || '친구';

  const hello = el('div', 'hello');
  hello.append(el('div', 'mascot', '🦉'), el('div', 'hello-text', `안녕, ${name}! 오늘도 수학 놀이 해 볼까?`));
  view.appendChild(hello);

  const s = section('🎯 오늘의 미션', `${grade}학년 미션 · 별을 1개 이상 받으면 완료, 미션마다 🪙 ${MISSION_BONUS} 보너스`);
  const meter = el('div', 'meter big');
  const fill = el('div', 'meter-fill');
  fill.style.width = `${(done.length / ids.length) * 100}%`;
  meter.appendChild(fill);
  s.append(meter, el('p', 'section-sub', `${done.length} / ${ids.length} 완료${done.length >= ids.length ? ' 🎉 오늘 미션 끝!' : ''}`));
  const grid = el('div', 'card-grid');
  ids.forEach((id) => {
    const isDone = done.includes(id);
    grid.appendChild(drillCard(findDrill(id), state, el('span', isDone ? 'badge done' : 'badge', isDone ? '✓ 완료' : `🪙 +${MISSION_BONUS}`)));
  });
  s.appendChild(grid);
  view.appendChild(s);

  const streak = currentStreak(state.streak, today);
  view.appendChild(section('🔥 연속 학습', streak > 0 ? `${streak}일째 공부하고 있어요!` : '오늘 첫 게임이나 레슨을 마치면 연속 학습이 시작돼요.'));

  try {
    const { lessons } = await loadLessons();
    const notDone = (l) => !isStepComplete(l, loadSolved(l.id));
    const next = lessons.find((l) => l.grade === grade && notDone(l)) || lessons.find(notDone);
    if (next) {
      const ls = section('📖 이어서 배우기', '만화로 원리를 알아봐요');
      ls.appendChild(lessonCard(next, state));
      view.appendChild(ls);
    }
  } catch (e) {
    console.error(e);
  }
}

async function learn(state, view) {
  const s = section('📖 만화로 배우기', '이야기 속 질문에 답하며 원리를 스스로 찾아봐요');
  view.appendChild(s);
  try {
    const { lessons, failed } = await loadLessons();
    if (lessons.length === 0) throw new Error('no lessons');
    for (const grade of [1, 2, 3, 4, 5, 6]) {
      const list = lessons.filter((l) => l.grade === grade);
      if (list.length === 0) continue;
      const g = el('div', 'grade-group');
      g.appendChild(el('h3', 'grade-title', `${grade}학년`));
      const grid = el('div', 'card-grid');
      list.forEach((l) => grid.appendChild(lessonCard(l, state)));
      g.appendChild(grid);
      s.appendChild(g);
    }
    if (failed) s.appendChild(el('p', 'list-error small', '일부 단계를 불러오지 못했어요'));
  } catch (e) {
    console.error(e);
    s.appendChild(el('p', 'list-error', '단계 목록을 불러오지 못했어요'));
  }
}

function games(state, view) {
  const s = section('🎮 연습 게임', '10문제씩! 처음에 맞힐수록 별을 많이 받아요');
  const mine = state.settings.grade;
  for (const grade of [mine, ...[1, 2, 3].filter((g) => g !== mine)]) {
    const g = el('div', 'grade-group');
    g.appendChild(el('h3', 'grade-title', `${grade}학년${grade === mine ? ' (내 학년)' : ''}`));
    const grid = el('div', 'card-grid');
    DRILLS.filter((d) => d.grade === grade).forEach((d) => grid.appendChild(drillCard(d, state)));
    g.appendChild(grid);
    s.appendChild(g);
  }
  view.appendChild(s);
}

function stickers(state, view) {
  const s = section('⭐ 스티커북', `${state.stickers.length} / ${STICKERS.length}개 모았어요 · 게임으로 코인을 모아 스티커를 사요`);
  const grid = el('div', 'sticker-grid');
  STICKERS.forEach((st) => {
    const has = state.stickers.includes(st.id);
    const cell = el('div', has ? 'sticker owned' : 'sticker');
    cell.append(el('span', 'sticker-emoji', has ? st.emoji : '❔'), el('span', 'sticker-name', has ? st.name : '???'));
    if (!has) {
      const b = button(state.coins < st.price ? 'buy-btn poor' : 'buy-btn', `🪙 ${st.price}`, () => {
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
          b.textContent = '코인이 부족해요';
          setTimeout(() => { b.textContent = `🪙 ${st.price}`; }, 1200);
        }
      });
      cell.appendChild(b);
    }
    grid.appendChild(cell);
  });
  s.appendChild(grid);
  view.appendChild(s);
}

function settings(state, view) {
  const s = section('⚙️ 설정');
  const save = (patch) => updateState((cur) => ({ ...cur, settings: { ...cur.settings, ...patch } }));

  const nameRow = el('label', 'setting');
  nameRow.appendChild(el('span', 'setting-label', '이름'));
  const name = el('input', 'text-input');
  name.type = 'text';
  name.maxLength = 20;
  name.value = state.settings.name;
  name.placeholder = '이름을 적어 주세요';
  name.addEventListener('change', () => save({ name: name.value.trim() }));
  nameRow.appendChild(name);
  s.appendChild(nameRow);

  const gradeRow = el('div', 'setting');
  gradeRow.appendChild(el('span', 'setting-label', '학년'));
  const seg = el('div', 'segmented');
  [1, 2, 3].forEach((g) => {
    seg.appendChild(button(g === state.settings.grade ? 'seg on' : 'seg', `${g}학년`, () => { save({ grade: g }); render(); }));
  });
  gradeRow.appendChild(seg);
  s.appendChild(gradeRow);

  const toggle = (label, key, after) => {
    const row = el('div', 'setting');
    row.appendChild(el('span', 'setting-label', label));
    const on = state.settings[key];
    const b = button(on ? 'toggle on' : 'toggle', on ? '켜짐' : '꺼짐', () => {
      const next = save({ [key]: !on });
      if (after) after(next);
      render();
    });
    b.setAttribute('aria-pressed', String(on));
    row.appendChild(b);
    s.appendChild(row);
  };
  toggle('효과음', 'sound', (next) => play('right', next.settings.sound));
  toggle('문제 자동으로 읽어 주기', 'speech', (next) => speak('3 + 4 = ?', next.settings.speech));

  const totalStars = Object.values(state.stars).reduce((a, b) => a + b, 0);
  const stat = section('📊 나의 기록');
  stat.appendChild(el('p', 'section-sub', `게임과 레슨 ${state.plays}번 · 모은 별 ${totalStars}개 · 스티커 ${state.stickers.length}개`));

  const danger = section('🧹 처음부터 다시');
  danger.appendChild(button('choice danger', '모든 기록 지우기', () => {
    if (!globalThis.confirm('코인, 별, 스티커, 레슨 기록이 모두 지워져요. 지울까요?')) return;
    resetAll();
    render();
  }));

  view.append(s, stat, danger);
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

window.addEventListener('hashchange', render);
render();
