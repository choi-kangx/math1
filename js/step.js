import { loadManifest, loadStep } from './loader.js';
import { checkChoice } from './engine.js';
import { loadSolved, saveSolved } from './progress.js';
import { loadState, updateState } from './store.js';
import { lessonStars, coinsFor, recordResult, dayString } from './rewards.js';
import { play, speak } from './sound.js';
import { el, button, link, starsText, renderStats } from './ui.js';

const root = document.getElementById('step-root');
const LOCK_MS = 450;

let step = null;
let saved = [];     // 저장된 푼 문제 (목록의 완료 표시용)
let runSolved = []; // 이번 판에서 푼 문제. 끝낸 레슨도 처음부터 다시 풀 수 있다.
let mistakes = 0;
let locked = false;
let settings = loadState().settings;

function lockFor(fn) {
  locked = true;
  setTimeout(() => {
    locked = false;
    fn();
  }, LOCK_MS);
}

function sceneBlock(scene) {
  const wrap = el('div', 'scene');
  if (scene.image) {
    const img = el('img', 'scene-img');
    img.src = scene.image;
    img.alt = '';
    wrap.appendChild(img);
  } else {
    const v = el('div', 'scene-visual', scene.visual);
    v.setAttribute('aria-hidden', 'true');
    wrap.appendChild(v);
  }
  wrap.appendChild(el('p', 'dialogue', scene.dialogue));
  return wrap;
}

function questionRow(text, readFirst) {
  const row = el('div', 'question-row');
  const speakBtn = button('speak-btn', '🔊', () => speak(readFirst ? `${readFirst} ${text}` : text));
  speakBtn.setAttribute('aria-label', '읽어 주기');
  row.append(el('p', 'question', text), speakBtn);
  if (settings.speech) speak(readFirst ? `${readFirst} ${text}` : text);
  return row;
}

function choiceList(choices, onPick) {
  const list = el('div', 'choices');
  choices.forEach((text, i) => {
    list.appendChild(button('choice', text, (e) => {
      if (locked) return;
      onPick(i, e.currentTarget);
    }));
  });
  return list;
}

function showError() {
  root.textContent = '';
  root.append(el('p', 'list-error', '단계를 불러오지 못했어요'), link('back-link', '목록으로 돌아가기', 'index.html#learn'));
}

function progressBar(label, done, total) {
  const wrap = el('div', 'drill-bar');
  const meter = el('div', 'meter');
  const fill = el('div', 'meter-fill');
  fill.style.width = `${(done / total) * 100}%`;
  meter.appendChild(fill);
  wrap.append(el('span', 'drill-count', label), meter);
  return wrap;
}

function renderScene(i) {
  const scene = step.scenes[i];
  root.textContent = '';
  const msg = el('p', 'feedback');
  msg.setAttribute('role', 'status');
  root.append(
    progressBar(`이야기 ${i + 1} / ${step.scenes.length}`, i, step.scenes.length),
    sceneBlock(scene),
    questionRow(scene.question, scene.dialogue),
    choiceList(scene.choices, (idx, b) => {
      if (!checkChoice(scene, idx)) {
        play('wrong', settings.sound);
        b.classList.add('wrong');
        msg.textContent = '다시 생각해 보자';
        msg.className = 'feedback wrong';
        return;
      }
      play('right', settings.sound);
      b.classList.add('right');
      msg.textContent = '맞아요!';
      msg.className = 'feedback right';
      lockFor(() => {
        if (i + 1 < step.scenes.length) renderScene(i + 1);
        else renderNextPractice();
      });
    }),
    msg
  );
}

function renderNextPractice() {
  const item = step.practice.find((p) => !runSolved.includes(p.id));
  if (!item) renderDone();
  else renderPractice(item);
}

function renderPractice(item) {
  root.textContent = '';
  const total = step.practice.length;
  const msg = el('p', 'feedback');
  msg.setAttribute('role', 'status');
  root.append(
    progressBar(`문제 ${step.practice.indexOf(item) + 1} / ${total}`, runSolved.length, total),
    questionRow(item.prompt),
    choiceList(item.choices, (idx, b) => {
      if (!checkChoice(item, idx)) {
        mistakes++;
        play('wrong', settings.sound);
        renderHint(item);
        return;
      }
      play('right', settings.sound);
      b.classList.add('right');
      runSolved = [...runSolved, item.id];
      if (!saved.includes(item.id)) {
        saved = [...saved, item.id];
        saveSolved(step.id, saved);
      }
      msg.textContent = '맞아요!';
      msg.className = 'feedback right';
      lockFor(renderNextPractice);
    }),
    msg
  );
}

function renderHint(item) {
  const scene = step.scenes.find((s) => s.id === item.hintScene);
  root.textContent = '';
  const retry = button('choice primary', '다시 풀어 보기', () => {
    if (locked) return;
    renderPractice(item);
  });
  root.append(el('p', 'feedback wrong', '다시 생각해 보자. 이 장면을 다시 봐요.'));
  if (scene) root.appendChild(sceneBlock(scene));
  root.appendChild(retry);
  locked = true;
  setTimeout(() => { locked = false; }, 300);
}

async function nextLessonId() {
  try {
    const ids = await loadManifest();
    const i = ids.indexOf(step.id);
    return i >= 0 && i + 1 < ids.length ? ids[i + 1] : null;
  } catch {
    return null;
  }
}

async function renderDone() {
  const stars = lessonStars(mistakes);
  const coins = coinsFor(step.practice.length, stars);
  const state = updateState((s) => recordResult(s, `lesson:${step.id}`, stars, coins, dayString()));
  renderStats(state);
  play('finish', settings.sound);

  root.textContent = '';
  const card = el('div', 'result-card');
  card.append(
    el('div', 'result-stars', starsText(stars)),
    el('h1', null, '잘했어요!'),
    el('p', 'lead', `"${step.title}" 단계를 모두 마쳤어요.`),
    el('p', 'principle-box', `💡 ${step.principle}`),
    el('p', 'reward', `🪙 +${coins}`)
  );
  const actions = el('div', 'actions');
  const nextId = await nextLessonId();
  if (nextId) actions.appendChild(link('choice primary', '다음 단계로 →', `step.html?id=${encodeURIComponent(nextId)}`));
  actions.append(button('choice', '다시 하기', start), link('choice', '목록으로', 'index.html#learn'));
  card.appendChild(actions);
  root.appendChild(card);
}

function start() {
  settings = loadState().settings;
  runSolved = [];
  mistakes = 0;
  renderScene(0);
}

async function init() {
  renderStats(loadState());
  const id = new URLSearchParams(location.search).get('id');
  try {
    if (!id) throw new Error('no id');
    step = await loadStep(id);
    saved = loadSolved(step.id);
    document.title = `수학 놀이터 - ${step.title}`;
    const t = document.getElementById('step-title');
    if (t) t.textContent = `📖 ${step.title}`;
    start();
  } catch (e) {
    console.error(e);
    showError();
  }
}

init();
