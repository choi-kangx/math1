import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { loadState, saveState, updateState, resetAll, normalize, defaultState } from '../js/store.js';

const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');

function fakeStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    key: (i) => [...map.keys()][i] ?? null,
    get length() { return map.size; },
    map,
  };
}

function install(value) {
  Object.defineProperty(globalThis, 'localStorage', { value, configurable: true, writable: true });
}

afterEach(() => {
  resetAll();
  if (original) Object.defineProperty(globalThis, 'localStorage', original);
  else delete globalThis.localStorage;
});

test('save and load round trip', () => {
  install(fakeStorage());
  const s = { ...defaultState(), coins: 42, stickers: ['cat'] };
  saveState(s);
  assert.equal(loadState().coins, 42);
  assert.deepEqual(loadState().stickers, ['cat']);
});

test('blocked storage falls back to memory without throwing', () => {
  install({
    getItem() { throw new Error('blocked'); },
    setItem() { throw new Error('blocked'); },
    removeItem() { throw new Error('blocked'); },
    key() { throw new Error('blocked'); },
    get length() { throw new Error('blocked'); },
  });
  assert.equal(loadState().coins, 0);
  updateState((s) => ({ ...s, coins: 7 }));
  assert.equal(loadState().coins, 7);
  assert.doesNotThrow(() => resetAll());
});

test('corrupt or hostile data is normalized', () => {
  const s = normalize({
    coins: -5, stars: { a: 9, b: 2 }, stickers: ['x', 3], streak: { last: 1 },
    settings: { sound: 'yes', speech: true, grade: 9, name: 'a'.repeat(50) },
  });
  assert.equal(s.coins, 0);
  assert.deepEqual(s.stars, { b: 2 });
  assert.deepEqual(s.stickers, ['x']);
  assert.equal(s.streak, null);
  assert.equal(s.settings.sound, true);
  assert.equal(s.settings.speech, true);
  assert.equal(s.settings.grade, 1);
  assert.equal(s.settings.name.length, 20);
  assert.deepEqual(normalize('nope'), defaultState());
});

test('resetAll clears app keys, including lesson progress, but not others', () => {
  const fake = fakeStorage();
  install(fake);
  saveState({ ...defaultState(), coins: 3 });
  fake.setItem('mathcartoon:solved:count-groups', '["p-1"]');
  fake.setItem('other-app', 'keep');
  resetAll();
  assert.equal(loadState().coins, 0);
  assert.equal(fake.getItem('mathcartoon:solved:count-groups'), null);
  assert.equal(fake.getItem('other-app'), 'keep');
});
