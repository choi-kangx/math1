const keyOf = (stepId) => `mathcartoon:solved:${stepId}`;

export function loadSolved(stepId) {
  try {
    const raw = globalThis.localStorage.getItem(keyOf(stepId));
    if (raw == null) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((v) => typeof v === 'string')) return parsed;
    return [];
  } catch {
    return [];
  }
}

export function saveSolved(stepId, solvedIds) {
  try {
    globalThis.localStorage.setItem(keyOf(stepId), JSON.stringify(solvedIds));
  } catch {
    // storage unavailable: progress is simply not persisted
  }
}
