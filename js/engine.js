const isNonEmptyString = (v) => typeof v === 'string' && v.length > 0;

export function validateStep(step) {
  const errors = [];
  if (!step || typeof step !== 'object') return ['step must be an object'];

  if (!isNonEmptyString(step.id)) errors.push('id is required');
  if (![1, 2, 3].includes(step.grade)) errors.push('grade must be 1, 2 or 3');
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

export function checkChoice(item, choiceIndex) {
  return item.answer === choiceIndex;
}

export function isStepComplete(step, solvedIds) {
  return step.practice.every((p) => solvedIds.includes(p.id));
}
