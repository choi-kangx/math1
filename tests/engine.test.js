import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateStep, checkChoice, isStepComplete } from '../js/engine.js';

const makeStep = () => ({
  id: 'step-1',
  grade: 1,
  title: '더하기',
  principle: '합치면 늘어난다',
  scenes: [
    { id: 's1', image: 'a.svg', choices: ['a', 'b'], answer: 0 },
    { id: 's2', visual: '🍎', choices: ['a', 'b'], answer: 1 },
  ],
  practice: [
    { id: 'p1', choices: ['1', '2', '3'], answer: 1, hintScene: 's1' },
    { id: 'p2', choices: ['4', '5'], answer: 0, hintScene: 's2' },
  ],
});

test('valid step yields no errors', () => {
  assert.deepEqual(validateStep(makeStep()), []);
});

test('hintScene pointing to missing scene is reported with its id', () => {
  const s = makeStep();
  s.practice[0].hintScene = 'nope';
  const errs = validateStep(s);
  assert.ok(errs.length > 0);
  assert.ok(errs.some((e) => e.includes('nope')));
});

test('answer >= choices.length is an error', () => {
  const s = makeStep();
  s.practice[0].answer = 3;
  assert.ok(validateStep(s).length > 0);
});

test('duplicate practice id is an error', () => {
  const s = makeStep();
  s.practice[1].id = 'p1';
  assert.ok(validateStep(s).length > 0);
});

test('duplicate scene id is an error', () => {
  const s = makeStep();
  s.scenes[1].id = 's1';
  assert.ok(validateStep(s).length > 0);
});

test('missing fields and bad grade are errors', () => {
  assert.ok(validateStep({}).length > 0);
  const s = makeStep();
  s.grade = 7;
  assert.ok(validateStep(s).length > 0);
});

test('checkChoice', () => {
  assert.equal(checkChoice({ answer: 1 }, 1), true);
  assert.equal(checkChoice({ answer: 1 }, 0), false);
});

test('isStepComplete only when all practice ids solved', () => {
  const s = makeStep();
  assert.equal(isStepComplete(s, ['p1']), false);
  assert.equal(isStepComplete(s, ['p1', 'p2']), true);
});

test('scene with out-of-range answer is reported with its scene id', () => {
  const s = makeStep();
  s.scenes[1].answer = 2;
  const errs = validateStep(s);
  assert.ok(errs.some((e) => e.includes('s2')));
});

test('scene without choices array is reported', () => {
  const s = makeStep();
  delete s.scenes[0].choices;
  const errs = validateStep(s);
  assert.ok(errs.some((e) => e.includes('s1')));
});

test('valid scenes pass', () => {
  assert.deepEqual(validateStep(makeStep()), []);
});

test('a scene without image or visual is an error', () => {
  const s = makeStep();
  delete s.scenes[0].image;
  assert.ok(validateStep(s).some((e) => e.includes('s1') && e.includes('image or visual')));
});

test('grades 4 to 6 are allowed for later expansion', () => {
  const s = makeStep();
  s.grade = 6;
  assert.deepEqual(validateStep(s), []);
});

import { validateArt } from '../js/engine.js';

test('validateArt accepts a well-formed scene and rejects unknown parts', () => {
  const good = {
    bg: 'room', cast: [{ who: 'owl', side: 'left' }],
    groups: [{ obj: 'apple', n: 3, holder: 'plate' }, { sep: '+' }, { stack: [{ obj: 'marble', n: 10, holder: 'string' }] },
      { people: 3, each: 2, obj: 'donut' }, { pizza: 8, filled: 3 }, { tokens: ['1'] }, { vehicle: 'bus' }],
  };
  assert.deepEqual(validateArt(good), []);
  assert.ok(validateArt({ groups: [{ obj: 'dragon', n: 1 }] }).some((e) => e.includes('dragon')));
  assert.ok(validateArt({ groups: [{ obj: 'apple', n: 1, holder: 'tray' }] }).some((e) => e.includes('tray')));
  assert.ok(validateArt({ groups: [{ pizza: 4, filled: 3, filled2: 2 }] }).some((e) => e.includes('exceed')));
  assert.ok(validateArt({ bg: 'moon', groups: [{ sep: '+' }] }).some((e) => e.includes('moon')));
  assert.ok(validateArt({ groups: [] }).length > 0);
});

test('a scene with invalid art fails step validation', () => {
  const s = makeStep();
  s.scenes[0].art = { groups: [{ obj: 'dragon', n: 1 }] };
  assert.ok(validateStep(s).some((e) => e.includes('s1') && e.includes('dragon')));
});
