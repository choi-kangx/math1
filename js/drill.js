import {
  DRILLS, findDrill, makeRound, checkAnswer, clampLevel, recommendedLevel, levelsOf,
} from './generators.js';
import { loadState, updateState } from './store.js';
import {
  starsFor, coinsFor, recordResult, dayString, dailyMissions, completeMission,
} from './rewards.js';
import { renderVisual } from './visuals.js';
import { play, speak } from './sound.js';
import { icon, starRow } from './icons.js';
import { el, button, link, gameTile, renderStats, mountChrome } from './ui.js';

const ROUND_SIZE = 10;
const MAX_DIGITS = 6;
const root = document.getElementById('drill-root');

const params = new URLSearchParams(location.search);
const drill = findDrill(params.get('id'));
let level = 1;
let settings = loadState().settings;

let round = [];
let idx = 0;
let firstTry = 0;
let correct = 0;
let tries = 0;
let input = '';
let busy = false;
let startedAt = 0;
let timerId = null;

const starKey = (lv) => `drill:${drill.id}:L${lv}`;

function elapsedText() {
  const s = Math.floor((Date.now() - startedAt) / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// 시작 화면: 단계를 고른다. 학년에 맞는 단계에 '추천' 표시를 한다.
function renderStart() {
  clearInterval(timerId);
  round = [];
  const state = loadState();
  const rec = recommendedLevel(drill, state.settings.grade);
  root.textContent = '';

  const hero = el('div', 'start-hero');
  hero.append(gameTile(drill, 'lg'), el('h1', 'start-title', drill.title), el('p', 'start-meta', `${drill.grade}학년 · ${drill.area} · 한 판 ${ROUND_SIZE}문제`));
  root.appendChild(hero);

  const list = el('div', 'level-list');
  levelsOf(drill).forEach(({ level: lv, name, desc }) => {
    const best = state.stars[starKey(lv)] ?? (lv === 1 ? state.stars[`drill:${drill.id}`] || 0 : 0);
    const b = button(lv === rec ? 'level-row rec' : 'level-row', undefined, () => start(lv));
    const num = el('span', 'level-num', String(lv));
    const body = el('span', 'level-body');
    const top = el('span', 'level-top');
    top.append(el('span', 'level-name', name));
    if (lv === rec) top.append(el('span', 'chip chip-primary', '추천'));
    body.append(top, el('span', 'level-desc', desc));
    b.append(num, body, starRow(best, 3, 14), icon('next', 18, 'icon level-go'));
    list.appendChild(b);
  });
  root.appendChild(list);
}

function start(lv = level) {
  level = clampLevel(lv, drill.levels.length);
  settings = loadState().settings;
  round = makeRound(drill, Math.floor(Math.random() * 2 ** 31), ROUND_SIZE, level);
  idx = 0;
  firstTry = 0;
  correct = 0;
  startedAt = Date.now();
  clearInterval(timerId);
  timerId = setInterval(() => {
    const t = document.getElementById('drill-timer');
    if (t) t.lastChild.textContent = elapsedText();
  }, 1000);
  renderProblem();
}

function renderProblem() {
  const p = round[idx];
  tries = 0;
  input = '';
  busy = false;
  root.textContent = '';

  const bar = el('div', 'play-bar');
  const meter = el('div', 'meter');
  const fill = el('div', 'meter-fill');
  fill.style.width = `${(idx / round.length) * 100}%`;
  meter.appendChild(fill);
  const timer = el('span', 'pill');
  timer.id = 'drill-timer';
  timer.append(icon('timer', 15), el('span', null, elapsedText()));
  bar.append(el('span', 'play-count', `Lv.${level} · ${idx + 1}/${round.length}`), meter, timer);
  root.appendChild(bar);

  const card = el('div', 'problem-card');
  const visual = renderVisual(p.visual);
  if (visual) card.appendChild(visual);
  const q = el('div', 'question-row');
  const isMath = /^[\d\s+\-×÷().□:=?,]+$/.test(p.prompt);
  const speakBtn = button('icon-btn', undefined, () => speak(p.speech || p.prompt));
  speakBtn.setAttribute('aria-label', '문제 읽어 주기');
  speakBtn.appendChild(icon('volume', 20));
  q.append(el('p', isMath ? 'question math' : 'question', p.prompt), speakBtn);
  card.appendChild(q);
  root.appendChild(card);

  const feedback = el('p', 'feedback');
  feedback.id = 'feedback';
  feedback.setAttribute('role', 'status');

  if (p.kind === 'number') {
    const display = el('div', 'answer-display', '?');
    display.id = 'answer-display';
    root.append(display, feedback, keypad(p.decimal));
  } else {
    const list = el('div', p.choices.length <= 3 && p.choices.every((c) => c.length <= 2) ? 'choices row' : 'choices grid2');
    p.choices.forEach((c) => {
      list.appendChild(button('choice', c, (e) => {
        if (busy || e.currentTarget.disabled) return;
        submit(c, e.currentTarget);
      }));
    });
    root.append(list, feedback);
  }
  if (settings.speech) speak(p.speech || p.prompt);
}

function keypad(decimal) {
  const pad = el('div', 'keypad');
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', decimal ? '.' : '⌫', '0', decimal ? '⌫' : '확인'];
  if (decimal) keys.push('확인');
  for (const k of keys) {
    let cls = k === '확인' ? 'key ok' : k === '⌫' ? 'key soft' : 'key';
    if (decimal && k === '확인') cls += ' wide';
    const b = button(cls, k === '⌫' ? undefined : k, () => press(k));
    if (k === '⌫') {
      b.setAttribute('aria-label', '지우기');
      b.appendChild(icon('erase', 22));
    }
    pad.appendChild(b);
  }
  return pad;
}

function press(k) {
  if (busy) return;
  if (k === '확인') {
    if (input !== '') submit(input);
    return;
  }
  if (k === '⌫') input = input.slice(0, -1);
  else if (k === '.') {
    if (!round[idx].decimal || input.includes('.')) return;
    input = input === '' ? '0.' : `${input}.`;
  } else if (input.replace('.', '').length < MAX_DIGITS) input = input === '0' ? k : input + k;
  const d = document.getElementById('answer-display');
  if (d) {
    d.textContent = input || '?';
    d.classList.toggle('filled', input !== '');
  }
}

function submit(value, choiceButton) {
  const p = round[idx];
  const fb = document.getElementById('feedback');
  const display = document.getElementById('answer-display');
  if (checkAnswer(p, value)) {
    correct++;
    if (tries === 0) firstTry++;
    play('right', settings.sound);
    fb.textContent = tries === 0 ? '정답이에요!' : '맞아요, 잘 고쳤어요!';
    fb.className = 'feedback right';
    if (choiceButton) choiceButton.classList.add('right');
    if (display) display.classList.add('right');
    busy = true;
    setTimeout(next, 700);
    return;
  }
  tries++;
  play('wrong', settings.sound);
  if (choiceButton) {
    choiceButton.classList.add('wrong');
    choiceButton.disabled = true;
  }
  if (display) {
    display.classList.remove('wrong');
    void display.offsetWidth; // 흔들림 애니메이션 다시 시작
    display.classList.add('wrong');
  }
  if (tries < 2) {
    fb.textContent = '한 번 더 생각해 봐요';
    fb.className = 'feedback wrong';
    input = '';
    if (display) { display.textContent = '?'; display.classList.remove('filled'); }
    return;
  }
  fb.textContent = `정답은 ${p.answer}`;
  fb.className = 'feedback wrong';
  if (display) display.textContent = String(p.answer);
  busy = true;
  setTimeout(next, 1600);
}

function next() {
  idx++;
  if (idx >= round.length) finish();
  else renderProblem();
}

function finish() {
  clearInterval(timerId);
  const time = elapsedText();
  const stars = starsFor(firstTry, round.length);
  const coins = coinsFor(correct, stars);
  const today = dayString();
  let bonus = 0;
  const state = updateState((s) => {
    let nextState = recordResult(s, starKey(level), stars, coins, today);
    if (stars >= 1 && dailyMissions(today, DRILLS, nextState.settings.grade).includes(drill.id)) {
      const r = completeMission(nextState, today, drill.id);
      nextState = r.state;
      bonus = r.awarded;
    }
    return nextState;
  });
  renderStats(state);
  play('finish', settings.sound);

  root.textContent = '';
  const card = el('div', 'result-card');
  card.append(
    starRow(stars, 3, 44),
    el('h1', 'result-title', stars === 3 ? '완벽해요!' : stars >= 1 ? '잘했어요!' : '조금만 더 연습해요'),
    el('p', 'result-sub', `${drill.title} · Lv.${level} ${levelsOf(drill)[level - 1].name}`)
  );
  const stats = el('div', 'stat-grid');
  for (const [label, value] of [['처음에 맞힘', `${firstTry}/${round.length}`], ['걸린 시간', time], ['코인', `+${coins + bonus}`]]) {
    const c = el('div', 'stat');
    c.append(el('span', 'stat-value', value), el('span', 'stat-label', label));
    stats.appendChild(c);
  }
  card.appendChild(stats);
  if (bonus > 0) card.appendChild(el('p', 'notice success', `오늘의 미션 완료! 보너스 코인 ${bonus}개`));
  if (stars === 0) card.appendChild(el('p', 'notice', '처음에 5문제 이상 맞히면 별을 받아요'));

  const actions = el('div', 'actions');
  const canLevelUp = stars >= 2 && level < drill.levels.length;
  if (canLevelUp) {
    const up = button('btn btn-primary', undefined, () => start(level + 1));
    up.append(el('span', null, `Lv.${level + 1} 도전하기`), icon('next', 18));
    actions.appendChild(up);
  }
  const again = button(canLevelUp ? 'btn' : 'btn btn-primary', undefined, () => start(level));
  again.append(icon('retry', 18), el('span', null, '다시 하기'));
  actions.append(again, button('btn', '단계 고르기', renderStart), link('btn btn-ghost', '게임 목록', 'index.html#play'));
  card.appendChild(actions);
  root.appendChild(card);
}

document.addEventListener('keydown', (e) => {
  const p = round[idx];
  if (!p || p.kind !== 'number' || idx >= round.length) return;
  if (/^[0-9.]$/.test(e.key)) press(e.key);
  else if (e.key === 'Backspace') press('⌫');
  else if (e.key === 'Enter') press('확인');
});

function init() {
  mountChrome({ back: 'index.html#play', title: drill ? drill.title : '연습 게임' });
  renderStats(loadState());
  if (!drill) {
    root.textContent = '';
    root.append(el('p', 'notice error', '게임을 찾지 못했어요'), link('btn', '게임 목록으로', 'index.html#play'));
    return;
  }
  document.title = `수학 놀이터 - ${drill.title}`;
  if (params.has('level')) start(params.get('level'));
  else renderStart();
}

init();
