import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { loadManifest, loadStep } from '../js/loader.js';

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

const stubFetch = (response) => {
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(url);
    return response;
  };
  return calls;
};

test('loadManifest returns the steps array', async () => {
  const calls = stubFetch({ ok: true, json: async () => ({ steps: ['a', 'b'] }) });
  assert.deepEqual(await loadManifest(), ['a', 'b']);
  assert.equal(calls[0], 'data/steps/index.json');
});

test('loadStep throws an error containing the id on HTTP failure', async () => {
  stubFetch({ ok: false, status: 404, json: async () => ({}) });
  await assert.rejects(loadStep('x'), /x/);
});

test('loadStep throws on a step that fails validation', async () => {
  stubFetch({ ok: true, json: async () => ({ id: 'bad' }) });
  await assert.rejects(loadStep('bad'), /bad/);
});

test('loadStep returns a valid step', async () => {
  const step = {
    id: 'ok', grade: 1, title: 't', principle: 'p',
    scenes: [{ id: 's1', choices: ['a', 'b'], answer: 0 }],
    practice: [{ id: 'p1', choices: ['1', '2'], answer: 0, hintScene: 's1' }],
  };
  const calls = stubFetch({ ok: true, json: async () => step });
  assert.deepEqual(await loadStep('ok'), step);
  assert.equal(calls[0], 'data/steps/ok.json');
});
