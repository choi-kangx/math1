import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DRILLS, findDrill, makeRound, checkAnswer, mulberry32 } from '../js/generators.js';

const SEEDS = Array.from({ length: 30 }, (_, i) => i * 7919 + 1);

test('every drill has unique id, grade 1-3, title and icon', () => {
  const ids = new Set();
  for (const d of DRILLS) {
    assert.ok(!ids.has(d.id), `duplicate drill id ${d.id}`);
    ids.add(d.id);
    assert.ok([1, 2, 3].includes(d.grade), `${d.id} grade`);
    assert.ok(d.title && d.icon && d.area, `${d.id} labels`);
  }
});

test('rounds are deterministic for a seed', () => {
  const d = findDrill('times');
  assert.deepEqual(makeRound(d, 42), makeRound(d, 42));
  assert.equal(makeRound(d, 42).length, 10);
});

test('number problems: the stated answer is accepted', () => {
  for (const d of DRILLS) {
    for (const seed of SEEDS) {
      for (const p of makeRound(d, seed)) {
        if (p.kind !== 'number') continue;
        assert.ok(Number.isInteger(p.answer) && p.answer >= 0, `${d.id}: ${p.prompt} -> ${p.answer}`);
        assert.ok(checkAnswer(p, String(p.answer)));
        assert.ok(!checkAnswer(p, String(p.answer + 1)));
        assert.ok(!checkAnswer(p, ''));
      }
    }
  }
});

test('choice problems: answer is among 3-4 unique choices', () => {
  for (const d of DRILLS) {
    for (const seed of SEEDS) {
      for (const p of makeRound(d, seed)) {
        if (p.kind !== 'choice') continue;
        assert.ok(p.choices.includes(p.answer), `${d.id}: answer missing`);
        assert.equal(new Set(p.choices).size, p.choices.length, `${d.id}: duplicate choice`);
        assert.ok(p.choices.length >= 3);
      }
    }
  }
});

// 생성된 문제의 산수를 다시 계산해 본다.
test('arithmetic prompts evaluate to their answers', () => {
  const ops = { '+': (a, b) => a + b, '-': (a, b) => a - b, '×': (a, b) => a * b, '÷': (a, b) => a / b };
  for (const id of ['add10', 'sub10', 'addcarry', 'subborrow', 'times', 'divide', 'mul21']) {
    for (const seed of SEEDS) {
      for (const p of makeRound(findDrill(id), seed)) {
        const m = p.prompt.match(/^(\d+) ([+\-×÷]) (\d+) = \?$/);
        assert.ok(m, `${id}: unexpected prompt ${p.prompt}`);
        assert.equal(ops[m[2]](Number(m[1]), Number(m[3])), p.answer, p.prompt);
      }
    }
  }
});

test('carry and borrow drills really carry or borrow', () => {
  for (const seed of SEEDS) {
    for (const p of makeRound(findDrill('addcarry'), seed)) {
      const [a, b] = p.prompt.match(/\d+/g).map(Number);
      assert.ok((a % 10) + b >= 10 && a + b < 100, p.prompt);
    }
    for (const p of makeRound(findDrill('subborrow'), seed)) {
      const [a, b] = p.prompt.match(/\d+/g).map(Number);
      assert.ok(a % 10 < b, p.prompt);
    }
  }
});

test('visual-backed answers match their visuals', () => {
  for (const seed of SEEDS) {
    for (const p of makeRound(findDrill('count'), seed)) assert.equal(p.visual.count, p.answer);
    for (const p of makeRound(findDrill('make10'), seed)) assert.equal(p.visual.filled + p.answer, 10);
    for (const p of makeRound(findDrill('shape'), seed)) assert.equal(p.visual.sides, p.answer);
    for (const p of makeRound(findDrill('fraction'), seed)) {
      assert.equal(p.answer, `${p.visual.parts}분의 ${p.visual.filled}`);
      assert.ok(p.visual.filled < p.visual.parts);
    }
    for (const p of makeRound(findDrill('clock'), seed)) {
      const { h, m } = p.visual;
      assert.equal(p.answer, m === 0 ? `${h}시` : `${h}시 ${m}분`);
    }
    for (const p of makeRound(findDrill('compare'), seed)) {
      const { a, b } = p.visual;
      assert.equal(p.answer, a < b ? '<' : a > b ? '>' : '=');
    }
  }
});

test('mulberry32 stays in [0, 1)', () => {
  const r = mulberry32(1);
  for (let i = 0; i < 1000; i++) {
    const v = r();
    assert.ok(v >= 0 && v < 1);
  }
});

test('fraction choices are all proper fractions', () => {
  for (const seed of SEEDS) {
    for (const p of makeRound(findDrill('fraction'), seed)) {
      for (const c of p.choices) {
        const [d, n] = c.match(/\d+/g).map(Number);
        assert.ok(n < d, `${c} is not a proper fraction`);
      }
    }
  }
});
