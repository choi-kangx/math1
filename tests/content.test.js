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

// Every scene image, including the ones hints reuse, must exist and be an SVG.
for (const id of manifest.steps) {
  test(`step "${id}" scene images exist as SVG files`, () => {
    const step = readStep(id);
    const byId = new Map(step.scenes.map((s) => [s.id, s]));
    const images = new Set(step.scenes.map((s) => s.image));
    for (const p of step.practice ?? []) {
      const scene = byId.get(p.hintScene);
      assert.ok(scene, `${id}/${p.id}: hintScene "${p.hintScene}" not found`);
      images.add(scene.image);
    }
    assert.ok(images.size > 0, `${id}: no images to check`);
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
