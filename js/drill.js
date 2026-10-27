import { DRILLS, findDrill, makeRound, checkAnswer } from './generators.js';
import { loadState, updateState } from './store.js';
import {
  starsFor, coinsFor, recordResult, dayString, dailyMissions, completeMission,
} from './rewards.js';
import { renderVisual } from './visuals.js';
import { play, speak } from './sound.js';
import { el, button, link, starsText, renderStats } from './ui.js';

const ROUND_SIZE = 10;
const MAX_DIGITS = 4;
const root = document.getElementById('drill-root');

const drill = findDrill(new URLSearchParams(location.search).get('id'));
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

function elapsedText() {
  const s = Math.floor((Date.now() - startedAt) / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function start() {
  settings = loadState().settings;
  round = makeRound(drill, Math.floor(Math.random() * 2 ** 31), ROUND_SIZE);
  idx = 0;
  firstTry = 0;
  correct = 0;
  startedAt = Date.now();
  clearInterval(timerId);
  timerId = setInterval(() => {
    const t = document.getElementById('drill-timer');
    if (t) t.textContent = `⏱ ${elapsedText()}`;
  }, 1000);
  renderProblem();
}

function renderProblem() {
  const p = round[idx];
  tries = 0;
  input = '';
  busy = false;
  root.textContent = '';

  const bar = el('div', 'drill-bar');
  const meter = el('div', 'meter');
  const fill = el('div', 'meter-fill');
  fill.style.width = `${(idx / round.length) * 100}%`;
  meter.appendChild(fill);
  bar.append(el('span', 'drill-count', `${idx + 1} / ${round.length}`), meter, el('span', 'drill-timer', `⏱ ${elapsedText()}`));
  bar.lastChild.id = 'drill-timer';
  root.appendChild(bar);

  const visual = renderVisual(p.visual);
  if (visual) root.appendChild(visual);

  const q = el('div', 'question-row');
  q.append(
    el('p', p.prompt.length <= 16 ? 'question big' : 'question center', p.prompt),
    button('speak-btn', '🔊', () => speak(p.speech || p.prompt))
  );
  q.lastChild.setAttribute('aria-label', '문제 읽어 주기');
  root.appendChild(q);

  const feedback = el('p', 'feedback');
  feedback.id = 'feedback';
  feedback.setAttribute('role', 'status');

  if (p.kind === 'number') {
    const display = el('div', 'answer-display', '?');
    display.id = 'answer-display';
    root.append(display, keypad(), feedback);
  } else {
    const list = el('div', p.choices.length <= 3 ? 'choices row' : 'choices grid2');
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

function keypad() {
  const pad = el('div', 'keypad');
  for (const k of ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '확인']) {
    const cls = k === '확인' ? 'key ok' : k === '⌫' ? 'key erase' : 'key';
    const b = button(cls, k, () => press(k));
    if (k === '⌫') b.setAttribute('aria-label', '지우기');
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
  else if (input.length < MAX_DIGITS) input = input === '0' ? k : input + k;
  const d = document.getElementById('answer-display');
  if (d) d.textContent = input || '?';
}

function submit(value, choiceButton) {
  const p = round[idx];
  const fb = document.getElementById('feedback');
  if (checkAnswer(p, value)) {
    correct++;
    if (tries === 0) firstTry++;
    play('right', settings.sound);
    fb.textContent = tries === 0 ? '맞아요! 👏' : '맞아요! 잘 고쳤어요 👍';
    fb.className = 'feedback right';
    if (choiceButton) choiceButton.classList.add('right');
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
  if (tries < 2) {
    fb.textContent = '한 번 더 생각해 봐요!';
    fb.className = 'feedback wrong';
    input = '';
    const d = document.getElementById('answer-display');
    if (d) d.textContent = '?';
    return;
  }
  fb.textContent = `정답: ${p.answer}`;
  fb.className = 'feedback wrong';
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
    let next = recordResult(s, `drill:${drill.id}`, stars, coins, today);
    if (stars >= 1 && dailyMissions(today, DRILLS, next.settings.grade).includes(drill.id)) {
      const r = completeMission(next, today, drill.id);
      next = r.state;
      bonus = r.awarded;
    }
    return next;
  });
  renderStats(state);
  play('finish', settings.sound);

  root.textContent = '';
  const card = el('div', 'result-card');
  card.append(
    el('div', 'result-stars', starsText(stars)),
    el('h1', null, stars === 3 ? '최고예요!' : stars >= 1 ? '잘했어요!' : '조금만 더 연습해요!'),
    el('p', 'lead', `처음에 맞힌 문제 ${firstTry} / ${round.length} · 걸린 시간 ${time}`),
    el('p', 'reward', `🪙 +${coins}`)
  );
  if (bonus > 0) card.appendChild(el('p', 'reward bonus', `🎯 오늘의 미션 달성! 🪙 +${bonus}`));
  if (stars === 0) card.appendChild(el('p', 'hint-text', '문제를 5개 이상 처음에 맞히면 별을 받아요.'));
  const actions = el('div', 'actions');
  actions.append(button('choice primary', '다시 하기', start), link('choice', '홈으로', 'index.html#play'));
  card.appendChild(actions);
  root.appendChild(card);
}

document.addEventListener('keydown', (e) => {
  const p = round[idx];
  if (!p || p.kind !== 'number' || idx >= round.length) return;
  if (/^[0-9]$/.test(e.key)) press(e.key);
  else if (e.key === 'Backspace') press('⌫');
  else if (e.key === 'Enter') press('확인');
});

function init() {
  renderStats(loadState());
  if (!drill) {
    root.textContent = '';
    root.append(el('p', 'list-error', '게임을 찾지 못했어요'), link('back-link', '홈으로 돌아가기', 'index.html#play'));
    return;
  }
  document.title = `수학 놀이터 - ${drill.title}`;
  document.getElementById('drill-title').textContent = `${drill.icon} ${drill.title}`;
  start();
}

init();
