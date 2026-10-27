import { loadManifest, loadStep } from './loader.js';
import { loadSolved } from './progress.js';
import { isStepComplete } from './engine.js';

const listEl = document.getElementById('step-list');

function showError() {
  listEl.textContent = '';
  const p = document.createElement('p');
  p.className = 'list-error';
  p.textContent = '단계 목록을 불러오지 못했어요';
  listEl.appendChild(p);
}

function makeCard(step) {
  const done = isStepComplete(step, loadSolved(step.id));
  const a = document.createElement('a');
  a.className = 'step-card';
  a.href = `step.html?id=${encodeURIComponent(step.id)}`;

  const grade = document.createElement('span');
  grade.className = 'step-grade';
  grade.textContent = `${step.grade}학년`;

  const title = document.createElement('span');
  title.className = 'step-title';
  title.textContent = step.title;

  const principle = document.createElement('span');
  principle.className = 'step-principle';
  principle.textContent = step.principle;

  const status = document.createElement('span');
  status.className = done ? 'step-status done' : 'step-status';
  status.textContent = done ? '완료' : '아직 안 했어요';

  a.append(grade, title, principle, status);
  return a;
}

async function init() {
  try {
    const ids = await loadManifest();
    const steps = await Promise.all(ids.map((id) => loadStep(id)));
    if (steps.length === 0) throw new Error('empty');
    listEl.textContent = '';
    steps.forEach((s) => listEl.appendChild(makeCard(s)));
  } catch {
    showError();
  }
}

init();
