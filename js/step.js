import { loadManifest, loadStep } from './loader.js';
import { checkChoice } from './engine.js';
import { loadSolved, saveSolved } from './progress.js';
import { loadState, updateState } from './store.js';
import { lessonStars, coinsFor, recordResult, dayString } from './rewards.js';
import { play, speak } from './sound.js';
import { renderArt, owlAvatar } from './comic.js';
import { icon, starRow } from './icons.js';
import { el, button, link, renderStats, mountChrome } from './ui.js';

const root = document.getElementById('step-root');
const LOCK_MS = 450;
const LETTERS = ['A', 'B', 'C', 'D'];

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

function panel(scene) {
  const wrap = el('figure', 'comic');
  if (scene.art) wrap.appendChild(renderArt(scene.art));
  else if (scene.image) {
    const img = el('img', 'comic-img');
    img.src = scene.image;
    img.alt = '';
    wrap.appendChild(img);
  } else {
    const v = el('div', 'comic-text', scene.visual);
    v.setAttribute('aria-hidden', 'true');
    wrap.appendChild(v);
  }
  return wrap;
}

function bubble(text) {
  const b = el('div', 'bubble');
  const avatar = el('span', 'avatar');
  avatar.appendChild(owlAvatar());
  b.append(avatar, el('p', 'bubble-text', text));
  return b;
}

function questionRow(text, readFirst) {
  const row = el('div', 'question-row');
  const full = readFirst ? `${readFirst} ${text}` : text;
  const speakBtn = button('icon-btn', undefined, () => speak(full));
  speakBtn.setAttribute('aria-label', '읽어 주기');
  speakBtn.appendChild(icon('volume', 20));
  row.append(el('p', 'question', text), speakBtn);
  if (settings.speech) speak(full);
  return row;
}

function choiceList(choices, onPick) {
  const list = el('div', 'answer-list');
  choices.forEach((text, i) => {
    const b = button('answer', undefined, (e) => {
      if (locked) return;
      onPick(i, e.currentTarget);
    });
    b.append(el('span', 'answer-key', LETTERS[i]), el('span', 'answer-text', text));
    list.appendChild(b);
  });
  return list;
}

function showError() {
  root.textContent = '';
  root.append(el('p', 'notice error', '단계를 불러오지 못했어요'), link('btn', '목록으로 돌아가기', 'index.html#learn'));
}

function steps(label, done, total) {
  const wrap = el('div', 'play-bar');
  const meter = el('div', 'meter');
  const fill = el('div', 'meter-fill');
  fill.style.width = `${(done / total) * 100}%`;
  meter.appendChild(fill);
  wrap.append(el('span', 'play-count', label), meter);
  return wrap;
}

function renderScene(i) {
  const scene = step.scenes[i];
  root.textContent = '';
  const msg = el('p', 'feedback');
  msg.setAttribute('role', 'status');
  root.append(
    steps(`이야기 ${i + 1}/${step.scenes.length}`, i, step.scenes.length),
    panel(scene),
    bubble(scene.dialogue),
    questionRow(scene.question, scene.dialogue),
    choiceList(scene.choices, (idx, b) => {
      if (!checkChoice(scene, idx)) {
        play('wrong', settings.sound);
        b.classList.add('wrong');
        b.disabled = true;
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
  const card = el('div', 'problem-card');
  card.append(el('span', 'chip chip-primary', '확인 문제'), questionRow(item.prompt));
  root.append(
    steps(`문제 ${step.practice.indexOf(item) + 1}/${total}`, runSolved.length, total),
    card,
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
  const retry = button('btn btn-primary', undefined, () => {
    if (locked) return;
    renderPractice(item);
  });
  retry.append(icon('retry', 18), el('span', null, '다시 풀어 보기'));
  const head = el('p', 'notice');
  head.append(icon('bulb', 18), el('span', null, '힌트: 이 장면을 다시 떠올려 봐요'));
  root.appendChild(head);
  if (scene) root.append(panel(scene), bubble(scene.dialogue));
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
  const principle = el('div', 'principle');
  principle.append(icon('bulb', 20), el('p', null, step.principle));
  card.append(
    starRow(stars, 3, 44),
    el('h1', 'result-title', '레슨 완료!'),
    el('p', 'result-sub', `${step.title} · 코인 +${coins}`),
    principle
  );
  const actions = el('div', 'actions');
  const nextId = await nextLessonId();
  if (nextId) {
    const n = link('btn btn-primary', undefined, `step.html?id=${encodeURIComponent(nextId)}`);
    n.append(el('span', null, '다음 레슨'), icon('next', 18));
    actions.appendChild(n);
  }
  const again = button(nextId ? 'btn' : 'btn btn-primary', undefined, start);
  again.append(icon('retry', 18), el('span', null, '다시 하기'));
  actions.append(again, link('btn btn-ghost', '레슨 목록', 'index.html#learn'));
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
  mountChrome({ back: 'index.html#learn', title: '배우기' });
  renderStats(loadState());
  const id = new URLSearchParams(location.search).get('id');
  try {
    if (!id) throw new Error('no id');
    step = await loadStep(id);
    saved = loadSolved(step.id);
    document.title = `수학 놀이터 - ${step.title}`;
    const t = document.querySelector('.topbar-title');
    if (t) t.textContent = step.title;
    start();
  } catch (e) {
    console.error(e);
    showError();
  }
}

init();
