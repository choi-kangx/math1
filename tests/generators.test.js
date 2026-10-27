import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DRILLS, findDrill, makeRound, checkAnswer, mulberry32, recommendedLevel, clampLevel, gcd, lcm,
} from '../js/generators.js';

const SEEDS = Array.from({ length: 40 }, (_, i) => i * 7919 + 1);

function* allProblems(id) {
  const drills = id ? [findDrill(id)] : DRILLS;
  for (const d of drills) for (let level = 1; level <= d.levels.length; level++) for (const seed of SEEDS) {
    for (const p of makeRound(d, seed, 10, level)) yield { d, level, p };
  }
}

// 수식만 있는 문제(+, -, ×, ÷, 괄호, 소수)를 계산한다.
function evalExpr(s) {
  const js = s.replace(/×/g, '*').replace(/÷/g, '/').trim();
  if (!/^[\d\s+\-*/().]+$/.test(js)) throw new Error(`not an expression: ${s}`);
  return Function(`return (${js});`)();
}
const close = (a, b) => Math.abs(a - b) < 1e-6;

test('every drill has unique id, grade 1-6, labels, and three level names', () => {
  const ids = new Set();
  for (const d of DRILLS) {
    assert.ok(!ids.has(d.id), `duplicate drill id ${d.id}`);
    ids.add(d.id);
    assert.ok([1, 2, 3, 4, 5, 6].includes(d.grade), `${d.id} grade`);
    assert.ok(d.title && d.icon && d.area, `${d.id} labels`);
    assert.ok([3, 5].includes(d.levels.length), `${d.id} levels`);
    if (d.levelGrades) assert.equal(d.levelGrades.length, d.levels.length);
  }
  for (const g of [1, 2, 3, 4, 5, 6]) assert.ok(DRILLS.some((d) => d.grade === g), `no drill for grade ${g}`);
});

test('rounds are deterministic for a seed and level', () => {
  const d = findDrill('times');
  assert.deepEqual(makeRound(d, 42, 10, 3), makeRound(d, 42, 10, 3));
  assert.notDeepEqual(makeRound(d, 42, 10, 1), makeRound(d, 42, 10, 3));
  assert.equal(makeRound(d, 42).length, 10);
});

test('number problems: answer accepted, wrong and empty rejected; integers unless decimal', () => {
  for (const { d, level, p } of allProblems()) {
    if (p.kind !== 'number') continue;
    const where = `${d.id} L${level}: ${p.prompt}`;
    assert.ok(Number.isFinite(p.answer) && p.answer >= 0, where);
    if (!p.decimal) assert.ok(Number.isInteger(p.answer), where);
    assert.ok(checkAnswer(p, String(p.answer)), where);
    assert.ok(!checkAnswer(p, String(p.answer + 1)), where);
    assert.ok(!checkAnswer(p, ''), where);
    assert.ok(String(p.answer).replace('.', '').length <= 6, `${where} too many digits for keypad`);
  }
});

test('choice problems: answer is among 3-4 unique choices', () => {
  for (const { d, level, p } of allProblems()) {
    if (p.kind !== 'choice') continue;
    assert.ok(p.choices.includes(p.answer), `${d.id} L${level}: answer missing`);
    assert.equal(new Set(p.choices).size, p.choices.length, `${d.id} L${level}: duplicate choice`);
    assert.ok(p.choices.length >= 3);
  }
});

// 식으로 된 모든 문제를 다시 계산해 본다: "식 = ?" 와 "□가 있는 식".
test('every arithmetic prompt evaluates to its answer', () => {
  let checked = 0;
  for (const { d, level, p } of allProblems()) {
    if (p.kind !== 'number') continue;
    const where = `${d.id} L${level}: ${p.prompt}`;
    if (/^[\d\s+\-×÷().]+= \?$/.test(p.prompt)) {
      assert.ok(close(evalExpr(p.prompt.slice(0, -3)), p.answer), where);
      checked++;
    } else if (/^[\d\s+\-×÷().□]+=[\d\s+\-×÷().□]+$/.test(p.prompt)) {
      const [l, r] = p.prompt.replace('□', `(${p.answer})`).split('=');
      assert.ok(close(evalExpr(l), evalExpr(r)), where);
      checked++;
    }
  }
  assert.ok(checked > 5000, `only ${checked} expressions checked`);
});

test('carry and borrow drills really carry or borrow at every level', () => {
  for (const { level, p } of allProblems('addcarry')) {
    const [a, b] = p.prompt.match(/\d+/g).map(Number);
    assert.ok((a % 10) + (b % 10) >= 10, `L${level} ${p.prompt}`);
  }
  for (const { level, p } of allProblems('subborrow')) {
    const [a, b] = p.prompt.match(/\d+/g).map(Number);
    assert.ok(a % 10 < b % 10 && a > b, `L${level} ${p.prompt}`);
  }
});

test('harder levels use bigger numbers', () => {
  const maxAnswer = (id, level) => Math.max(...makeRound(findDrill(id), 7, 30, level).map((p) => p.answer));
  for (const id of ['add10', 'addcarry', 'subborrow', 'mul21', 'make10', 'decimal']) {
    assert.ok(maxAnswer(id, 3) > maxAnswer(id, 1), `${id}: level 3 should be harder`);
  }
});

test('visual-backed and word answers match an independent computation', () => {
  for (const { level, p } of allProblems('count')) {
    const v = p.visual;
    assert.equal(v.type === 'objects' ? v.count : v.tens * 10 + v.ones, p.answer, `L${level}`);
  }
  for (const { level, p } of allProblems('shape')) {
    const n = p.visual.sides;
    assert.equal(p.answer, [n, 2 * n, (n * (n - 3)) / 2][level - 1]);
  }
  for (const { level, p } of allProblems('area')) {
    const v = p.visual;
    assert.equal(p.answer, level === 1 ? 2 * (v.w + v.h) : level === 2 ? v.w * v.h : (v.b * v.h) / 2);
  }
  for (const { p } of allProblems('compare')) {
    const a = evalExpr(p.visual.a); const b = evalExpr(p.visual.b);
    assert.equal(p.answer, a < b ? '<' : a > b ? '>' : '=', `${p.visual.a} vs ${p.visual.b}`);
  }
  for (const { level, p } of allProblems('clock')) {
    if (level === 3) {
      const add = Number(p.prompt.match(/\d+/)[0]);
      const t = (p.visual.h * 60 + p.visual.m + add) % 720;
      const h = Math.floor(t / 60) || 12; const m = t % 60;
      assert.equal(p.answer, m === 0 ? `${h}시` : `${h}시 ${m}분`, p.prompt);
    } else {
      const { h, m } = p.visual;
      assert.equal(p.answer, m === 0 ? `${h}시` : `${h}시 ${m}분`);
    }
  }
  for (const { p, level } of allProblems('divide')) {
    if (level !== 3) continue;
    const [a, b] = p.prompt.match(/\d+/g).map(Number);
    assert.equal(p.answer, `몫 ${Math.floor(a / b)}, 나머지 ${a % b}`);
  }
  for (const { p, level } of allProblems('factors')) {
    const nums = p.prompt.match(/\d+/g).map(Number);
    if (level === 1) {
      let c = 0;
      for (let i = 1; i <= nums[0]; i++) if (nums[0] % i === 0) c++;
      assert.equal(p.answer, c);
    } else assert.equal(p.answer, level === 2 ? gcd(nums[0], nums[1]) : lcm(nums[0], nums[1]), p.prompt);
  }
  for (const { p, level } of allProblems('ratio')) {
    const n = p.prompt.match(/\d+/g).map(Number);
    if (level === 1) assert.equal(p.answer, (n[0] * n[1]) / 100);
    else if (level === 3) assert.equal(p.answer, (n[0] * (100 - n[1])) / 100);
    else {
      const [l, r] = p.prompt.replace('□', String(p.answer)).split('=').map((side) => side.split(':').map(Number));
      assert.equal(l[0] * r[1], l[1] * r[0], p.prompt);
    }
  }
  for (const { p } of allProblems('word')) assert.ok(p.answer > 0, p.prompt);
});

// 분수 보기는 모두 진분수이고, 정답과 값이 같은 오답은 없다.
const fracVal = (label) => { const [d, n] = label.match(/\d+/g).map(Number); return { n, d, v: n / d }; };
test('fraction choices are proper and only one has the answer value', () => {
  for (const id of ['fraction', 'fracop']) {
    for (const { level, p } of allProblems(id)) {
      if (p.kind !== 'choice') continue;
      const ans = fracVal(p.answer).v;
      for (const c of p.choices) {
        const f = fracVal(c);
        assert.ok(f.n < f.d, `${id} L${level}: ${c} not proper`);
        if (c !== p.answer) assert.ok(Math.abs(f.v - ans) > 1e-9, `${id} L${level}: ${c} equals answer ${p.answer}`);
      }
    }
  }
  // 정답 값을 따로 계산한다.
  for (const { level, p } of allProblems('fraction')) {
    if (level === 1) assert.equal(p.answer, `${p.visual.parts}분의 ${p.visual.filled}`);
    if (level === 2) assert.ok(close(fracVal(p.answer).v, p.visual.filled / p.visual.parts));
    if (level === 3) {
      const [d1, n1, , n2] = p.prompt.match(/\d+/g).map(Number);
      assert.ok(close(fracVal(p.answer).v, (n1 + n2) / d1));
    }
  }
  for (const { level, p } of allProblems('fracop')) {
    const n = p.prompt.match(/\d+/g).map(Number);
    if (level === 1) assert.ok(close(fracVal(p.answer).v, (n[1] - n[3]) / n[0]));
    if (level === 2) {
      const f = fracVal(p.answer);
      assert.ok(close(f.v, n[1] / n[0] + n[3] / n[2]), p.prompt);
      assert.equal(gcd(f.n, f.d), 1, `${p.answer} not reduced`);
    }
    if (level === 3) assert.equal(p.answer, (n[0] * n[2]) / n[1]);
  }
});

test('addition and subtraction reach three-digit numbers at level 5', () => {
  for (const id of ['add10', 'sub10']) {
    for (const p of makeRound(findDrill(id), 11, 30, 5)) {
      const nums = p.prompt.match(/\d+/g).map(Number);
      assert.ok(nums.every((n) => n >= 100 && n <= 999), `${id}: ${p.prompt}`);
    }
    for (const p of makeRound(findDrill(id), 11, 30, 4)) {
      const nums = p.prompt.match(/\d+/g).map(Number);
      assert.ok(nums.every((n) => n >= 10 && n <= 99), `${id}: ${p.prompt}`);
    }
  }
});

test('decimal answers accept trailing zeros', () => {
  const p = { kind: 'number', answer: 3.8, decimal: true };
  assert.ok(checkAnswer(p, '3.80'));
  assert.ok(checkAnswer(p, '3.8'));
  assert.ok(!checkAnswer(p, '.'));
  assert.ok(!checkAnswer(p, '38'));
});

test('recommended level and level clamping', () => {
  const d = findDrill('times'); // grade 2
  assert.equal(recommendedLevel(d, 1), 1);
  assert.equal(recommendedLevel(d, 2), 2);
  assert.equal(recommendedLevel(d, 5), 3);
  assert.equal(clampLevel('3'), 3);
  assert.equal(clampLevel('9'), 1);
  assert.equal(clampLevel(5, 5), 5);
  const add = findDrill('add10'); // levels for grades 1,1,1,2,3
  assert.equal(recommendedLevel(add, 1), 2);
  assert.equal(recommendedLevel(add, 2), 4);
  assert.equal(recommendedLevel(add, 3), 5);
  assert.equal(recommendedLevel(add, 6), 5);
});

test('mulberry32 stays in [0, 1)', () => {
  const r = mulberry32(1);
  for (let i = 0; i < 1000; i++) {
    const v = r();
    assert.ok(v >= 0 && v < 1);
  }
});
