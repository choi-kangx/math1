import { validateStep } from './engine.js';

const DEFAULT_BASE = 'data/steps/';

export async function loadManifest(base = DEFAULT_BASE) {
  const res = await fetch(`${base}index.json`);
  if (!res.ok) throw new Error(`단계 목록을 불러오지 못했습니다 (HTTP ${res.status})`);
  const data = await res.json();
  if (!data || !Array.isArray(data.steps)) {
    throw new Error('단계 목록 형식이 올바르지 않습니다');
  }
  return data.steps;
}

export async function loadStep(id, base = DEFAULT_BASE) {
  const res = await fetch(`${base}${id}.json`);
  if (!res.ok) throw new Error(`단계 "${id}"를 불러오지 못했습니다 (HTTP ${res.status})`);
  const step = await res.json();
  const errors = validateStep(step);
  if (errors.length > 0) {
    throw new Error(`단계 "${id}"가 올바르지 않습니다: ${errors.join('; ')}`);
  }
  return step;
}
