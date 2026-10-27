// 앱 전체 상태(코인, 별, 스티커, 출석, 미션, 설정)를 localStorage에 저장한다.
// 저장소가 막혀 있으면 메모리에만 두고 화면은 그대로 동작한다.
const KEY = 'mathplay:state';

export const DEFAULT_SETTINGS = { sound: true, speech: false, name: '', grade: 1 };

export function defaultState() {
  return { coins: 0, stars: {}, stickers: [], streak: null, plays: 0, missions: null, settings: { ...DEFAULT_SETTINGS } };
}

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const nonNegInt = (v) => (Number.isInteger(v) && v >= 0 ? v : 0);

export function normalize(raw) {
  const s = defaultState();
  if (!isObj(raw)) return s;
  s.coins = nonNegInt(raw.coins);
  s.plays = nonNegInt(raw.plays);
  if (isObj(raw.stars)) {
    for (const [k, v] of Object.entries(raw.stars)) if (Number.isInteger(v) && v >= 0 && v <= 3) s.stars[k] = v;
  }
  if (Array.isArray(raw.stickers)) s.stickers = raw.stickers.filter((v) => typeof v === 'string');
  if (isObj(raw.streak) && typeof raw.streak.last === 'string' && Number.isInteger(raw.streak.count)) {
    s.streak = { last: raw.streak.last, count: raw.streak.count };
  }
  if (isObj(raw.missions) && typeof raw.missions.date === 'string' && Array.isArray(raw.missions.done)) {
    s.missions = { date: raw.missions.date, done: raw.missions.done.filter((v) => typeof v === 'string') };
  }
  if (isObj(raw.settings)) {
    const r = raw.settings;
    if (typeof r.sound === 'boolean') s.settings.sound = r.sound;
    if (typeof r.speech === 'boolean') s.settings.speech = r.speech;
    if (typeof r.name === 'string') s.settings.name = r.name.slice(0, 20);
    if ([1, 2, 3].includes(r.grade)) s.settings.grade = r.grade;
  }
  return s;
}

let memory = null;

export function loadState() {
  try {
    const raw = globalThis.localStorage.getItem(KEY);
    if (raw != null) {
      memory = normalize(JSON.parse(raw));
      return memory;
    }
  } catch {
    // storage unavailable or corrupt: fall back to memory
  }
  return memory || defaultState();
}

export function saveState(state) {
  memory = state;
  try {
    globalThis.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // storage unavailable: keep the in-memory copy only
  }
}

export function updateState(fn) {
  const next = fn(loadState());
  saveState(next);
  return next;
}

export function resetAll() {
  memory = null;
  try {
    const ls = globalThis.localStorage;
    const keys = [];
    for (let i = 0; i < ls.length; i++) keys.push(ls.key(i));
    for (const k of keys) if (k === KEY || k.startsWith('mathcartoon:')) ls.removeItem(k);
  } catch {
    // nothing to clear
  }
}
