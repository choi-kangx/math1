import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { loadSolved, saveSolved } from '../js/progress.js';

const realStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
afterEach(() => {
  if (realStorage) Object.defineProperty(globalThis, 'localStorage', realStorage);
  else delete globalThis.localStorage;
});

const stubStorage = (overrides = {}) => {
  const data = new Map();
  const storage = {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    ...overrides,
  };
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true, writable: true });
  return data;
};

test('saved ids round-trip under the documented key', () => {
  const data = stubStorage();
  saveSolved('step-1', ['p1', 'p2']);
  assert.ok(data.has('mathcartoon:solved:step-1'));
  assert.deepEqual(loadSolved('step-1'), ['p1', 'p2']);
});

test('loadSolved returns [] when nothing saved', () => {
  stubStorage();
  assert.deepEqual(loadSolved('nope'), []);
});

test('getItem throwing: loadSolved returns [], saveSolved does not throw', () => {
  stubStorage({
    getItem: () => { throw new Error('blocked'); },
    setItem: () => { throw new Error('blocked'); },
  });
  assert.deepEqual(loadSolved('step-1'), []);
  assert.doesNotThrow(() => saveSolved('step-1', ['p1']));
});

test('localStorage access itself throwing is handled', () => {
  Object.defineProperty(globalThis, 'localStorage', {
    get() { throw new Error('SecurityError'); },
    configurable: true,
  });
  assert.deepEqual(loadSolved('step-1'), []);
  assert.doesNotThrow(() => saveSolved('step-1', ['p1']));
});

test('non-JSON stored value yields []', () => {
  const data = stubStorage();
  data.set('mathcartoon:solved:step-1', '{not json');
  assert.deepEqual(loadSolved('step-1'), []);
});

test('valid JSON that is not a string array yields []', () => {
  const data = stubStorage();
  data.set('mathcartoon:solved:step-1', '{"a":1}');
  assert.deepEqual(loadSolved('step-1'), []);
  data.set('mathcartoon:solved:step-1', '[1,2]');
  assert.deepEqual(loadSolved('step-1'), []);
});
