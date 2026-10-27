import { loadStep } from './loader.js';
import { checkChoice, isStepComplete } from './engine.js';
import { loadSolved, saveSolved } from './progress.js';

const root = document.getElementById('step-root');
const LOCK_MS = 450;

let step = null;
let solved = [];
let locked = false;

function el(tag, className, text) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

function lockFor(fn) {
  locked = true;
  setTimeout(() => {
    locked = false;
    fn();
  }, LOCK_MS);
}

function sceneBlock(scene) {
  const wrap = el('div', 'scene');
  const img = el('img', 'scene-img');
  img.src = scene.image;
  img.alt = scene.dialogue;
  wrap.append(img, el('p', 'dialogue', scene.dialogue));
  return wrap;
}

function choiceList(choices, onPick) {
  const list = el('div', 'choices');
  choices.forEach((text, i) => {
    const b = el('button', 'choice', text);
    b.type = 'button';
    b.addEventListener('click', () => {
      if (locked) return;
      onPick(i, b);
    });
    list.appendChild(b);
  });
  return list;
}

function showError() {
  root.textContent = '';
  root.append(
    el('p', 'list-error', '단계를 불러오지 못했어요'),
    Object.assign(el('a', 'back-link', '목록으로 돌아가기'), { href: 'index.html' })
  );
}

function renderScene(i) {
  const scene = step.scenes[i];
  root.textContent = '';
  const msg = el('p', 'feedback');
  msg.setAttribute('role', 'status');
  root.append(
    el('p', 'progress', `이야기 ${i + 1} / ${step.scenes.length}`),
    sceneBlock(scene),
    el('p', 'question', scene.question),
    choiceList(scene.choices, (idx) => {
      if (!checkChoice(scene, idx)) {
        msg.textContent = '다시 생각해 보자';
        msg.className = 'feedback wrong';
        return;
      }
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
  const item = step.practice.find((p) => !solved.includes(p.id));
  if (!item || isStepComplete(step, solved)) renderDone();
  else renderPractice(item);
}

function renderPractice(item) {
  root.textContent = '';
  const total = step.practice.length;
  const msg = el('p', 'feedback');
  msg.setAttribute('role', 'status');
  root.append(
    el('p', 'progress', `문제 ${step.practice.indexOf(item) + 1} / ${total}`),
    el('p', 'question', item.prompt),
    choiceList(item.choices, (idx) => {
      if (!checkChoice(item, idx)) {
        renderHint(item);
        return;
      }
      if (!solved.includes(item.id)) {
        solved = [...solved, item.id];
        saveSolved(step.id, solved);
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
  const retry = el('button', 'choice primary', '다시 풀어 보기');
  retry.type = 'button';
  retry.addEventListener('click', () => {
    if (locked) return;
    renderPractice(item);
  });
  root.append(
    el('p', 'feedback wrong', '다시 생각해 보자. 이 장면을 다시 봐요.'),
    sceneBlock(scene),
    retry
  );
  locked = true;
  setTimeout(() => { locked = false; }, 300);
}

function renderDone() {
  root.textContent = '';
  root.append(
    el('h1', null, '잘했어요!'),
    el('p', 'lead', `"${step.title}" 단계를 모두 마쳤어요.`),
    Object.assign(el('a', 'choice primary link-button', '목록으로 돌아가기'), { href: 'index.html' })
  );
}

async function init() {
  const id = new URLSearchParams(location.search).get('id');
  try {
    if (!id) throw new Error('no id');
    step = await loadStep(id);
    solved = loadSolved(step.id);
    document.title = `수학 만화 - ${step.title}`;
    renderScene(0);
  } catch {
    showError();
  }
}

init();
