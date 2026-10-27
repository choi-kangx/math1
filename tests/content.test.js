import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateStep } from '../js/engine.js';

const readJson = (path) =>
  JSON.parse(readFileSync(new URL(`../data/steps/${path}`, import.meta.url), 'utf8'));
const readStep = (id) => readJson(`${id}.json`);

test('count-groups step is valid', () => {
  assert.deepEqual(validateStep(readStep('count-groups')), []);
});

const manifest = readJson('index.json');
for (const id of manifest.steps) {
  test(`manifest step "${id}" has a valid file`, () => {
    assert.deepEqual(validateStep(readStep(id)), []);
  });
}

test('manifest lists every lesson once and is not empty', () => {
  assert.ok(manifest.steps.length >= 5);
  assert.equal(new Set(manifest.steps).size, manifest.steps.length);
  for (const id of ['count-groups', 'carry-addition']) assert.ok(manifest.steps.includes(id));
});

// 모든 장면은 그림 파일이나 그림 글자 중 하나를 가진다. 그림 파일은 실제로 있어야 한다.
for (const id of manifest.steps) {
  test(`step "${id}" scene pictures exist`, () => {
    const step = readStep(id);
    const byId = new Map(step.scenes.map((s) => [s.id, s]));
    for (const p of step.practice ?? []) {
      assert.ok(byId.get(p.hintScene), `${id}/${p.id}: hintScene "${p.hintScene}" not found`);
    }
    for (const s of step.scenes) {
      assert.ok(s.art, `${id}/${s.id}: every lesson scene should be drawn with art`);
    }
    const images = new Set(step.scenes.filter((s) => s.image).map((s) => s.image));
    for (const image of images) {
      let svg;
      try {
        svg = readFileSync(new URL(`../${image}`, import.meta.url), 'utf8');
      } catch {
        assert.fail(`${id}: missing image file ${image}`);
      }
      assert.ok(svg.trimStart().startsWith('<svg'), `${image} must start with <svg`);
    }
  });
}
