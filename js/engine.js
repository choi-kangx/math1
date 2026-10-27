const isNonEmptyString = (v) => typeof v === 'string' && v.length > 0;

export function validateStep(step) {
  const errors = [];
  if (!step || typeof step !== 'object') return ['step must be an object'];

  if (!isNonEmptyString(step.id)) errors.push('id is required');
  if (![1, 2, 3, 4, 5, 6].includes(step.grade)) errors.push('grade must be 1 to 6');
  if (!isNonEmptyString(step.title)) errors.push('title is required');
  if (!isNonEmptyString(step.principle)) errors.push('principle is required');
  if (!Array.isArray(step.scenes)) errors.push('scenes is required');
  if (!Array.isArray(step.practice)) errors.push('practice is required');

  const sceneIds = new Set();
  if (Array.isArray(step.scenes)) {
    for (const scene of step.scenes) {
      const id = scene && scene.id;
      if (sceneIds.has(id)) errors.push(`duplicate scene id: ${id}`);
      sceneIds.add(id);

      const art = scene && scene.art;
      if (art !== undefined) {
        for (const e of validateArt(art)) errors.push(`scene ${id}: ${e}`);
      } else if (!isNonEmptyString(scene && scene.image) && !isNonEmptyString(scene && scene.visual)) {
        errors.push(`scene ${id}: image or visual is required`);
      }

      const choices = scene && scene.choices;
      const answer = scene && scene.answer;
      if (!Array.isArray(choices)) {
        errors.push(`scene ${id}: choices array is required`);
      } else if (!Number.isInteger(answer) || answer < 0 || answer >= choices.length) {
        errors.push(`scene ${id}: answer out of range of choices`);
      }
    }
  }

  if (Array.isArray(step.practice)) {
    const practiceIds = new Set();
    for (const item of step.practice) {
      const id = item && item.id;
      if (practiceIds.has(id)) errors.push(`duplicate practice id: ${id}`);
      practiceIds.add(id);

      const choices = item && item.choices;
      const answer = item && item.answer;
      if (
        !Array.isArray(choices) ||
        !Number.isInteger(answer) ||
        answer < 0 ||
        answer >= choices.length
      ) {
        errors.push(`practice ${id}: answer out of range of choices`);
      }

      if (Array.isArray(step.scenes) && !sceneIds.has(item && item.hintScene)) {
        errors.push(`practice ${id}: hintScene not found: ${item && item.hintScene}`);
      }
    }
  }

  return errors;
}

// 만화 장면 데이터(art)의 모양을 검사한다. 그리는 쪽은 js/comic.js.
export const ART_OBJECTS = ['marble', 'candy', 'cookie', 'strawberry', 'apple', 'donut', 'ladybug', 'choco'];
export const ART_HOLDERS = ['plate', 'basket', 'bowl', 'box', 'leaf', 'string', 'scatter', 'none'];
const ART_BGS = ['room', 'park', 'class'];
const ART_WHO = ['owl', 'girl', 'boy', 'kid', 'kid2'];

function validateGroup(g, path, errors) {
  if (!g || typeof g !== 'object') { errors.push(`${path}: group must be an object`); return; }
  if (g.sep !== undefined) return;
  if (g.stack || g.row) {
    const list = g.stack || g.row;
    if (!Array.isArray(list) || list.length === 0) errors.push(`${path}: stack/row must be a non-empty array`);
    else list.forEach((c, i) => validateGroup(c, `${path}.${i}`, errors));
    return;
  }
  if (g.people !== undefined) {
    if (!Number.isInteger(g.people) || g.people < 1) errors.push(`${path}: people must be a positive integer`);
    if (g.each && !ART_OBJECTS.includes(g.obj)) errors.push(`${path}: unknown obj ${g.obj}`);
    return;
  }
  if (g.pizza !== undefined || g.bar !== undefined) {
    const n = g.pizza ?? g.bar;
    if (!Number.isInteger(n) || n < 2) errors.push(`${path}: pizza/bar needs 2 or more parts`);
    if ((g.filled || 0) + (g.filled2 || 0) > n) errors.push(`${path}: filled parts exceed total`);
    return;
  }
  if (g.tokens !== undefined) { if (!Array.isArray(g.tokens)) errors.push(`${path}: tokens must be an array`); return; }
  if (g.vehicle !== undefined) { if (!['bus', 'tram'].includes(g.vehicle)) errors.push(`${path}: unknown vehicle`); return; }
  if (!ART_OBJECTS.includes(g.obj)) errors.push(`${path}: unknown obj ${g.obj}`);
  if (g.holder !== undefined && !ART_HOLDERS.includes(g.holder)) errors.push(`${path}: unknown holder ${g.holder}`);
  if (!Number.isInteger(g.n) || g.n < 0) errors.push(`${path}: n must be a non-negative integer`);
}

export function validateArt(art) {
  const errors = [];
  if (!art || typeof art !== 'object') return ['art must be an object'];
  if (art.bg !== undefined && !ART_BGS.includes(art.bg)) errors.push(`unknown bg ${art.bg}`);
  for (const c of art.cast || []) if (!ART_WHO.includes(c.who)) errors.push(`unknown cast ${c.who}`);
  if (!Array.isArray(art.groups) || art.groups.length === 0) errors.push('art.groups must be a non-empty array');
  else art.groups.forEach((g, i) => validateGroup(g, `groups.${i}`, errors));
  return errors;
}

export function checkChoice(item, choiceIndex) {
  return item.answer === choiceIndex;
}

export function isStepComplete(step, solvedIds) {
  return step.practice.every((p) => solvedIds.includes(p.id));
}
