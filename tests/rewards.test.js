import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  starsFor, lessonStars, coinsFor, nextStreak, currentStreak, recordResult,
  dailyMissions, completeMission, missionsDone, buySticker, daysBetween, MISSION_BONUS,
} from '../js/rewards.js';
import { DRILLS } from '../js/generators.js';
import { defaultState } from '../js/store.js';

test('stars by accuracy', () => {
  assert.equal(starsFor(10, 10), 3);
  assert.equal(starsFor(9, 10), 3);
  assert.equal(starsFor(7, 10), 2);
  assert.equal(starsFor(5, 10), 1);
  assert.equal(starsFor(4, 10), 0);
  assert.equal(starsFor(0, 0), 0);
});

test('lesson stars by mistakes', () => {
  assert.equal(lessonStars(0), 3);
  assert.equal(lessonStars(2), 2);
  assert.equal(lessonStars(5), 1);
});

test('coins', () => {
  assert.equal(coinsFor(8, 2), 18);
});

test('streak continues, holds, and resets', () => {
  assert.equal(daysBetween('2026-10-27', '2026-10-28'), 1);
  assert.deepEqual(nextStreak(null, '2026-10-27'), { last: '2026-10-27', count: 1 });
  assert.deepEqual(nextStreak({ last: '2026-10-27', count: 3 }, '2026-10-27'), { last: '2026-10-27', count: 3 });
  assert.deepEqual(nextStreak({ last: '2026-10-27', count: 3 }, '2026-10-28'), { last: '2026-10-28', count: 4 });
  assert.deepEqual(nextStreak({ last: '2026-10-25', count: 3 }, '2026-10-28'), { last: '2026-10-28', count: 1 });
  assert.equal(currentStreak({ last: '2026-10-27', count: 3 }, '2026-10-28'), 3);
  assert.equal(currentStreak({ last: '2026-10-25', count: 3 }, '2026-10-28'), 0);
  // month boundary
  assert.deepEqual(nextStreak({ last: '2026-10-31', count: 1 }, '2026-11-01'), { last: '2026-11-01', count: 2 });
});

test('recordResult keeps the best stars and adds coins', () => {
  let s = defaultState();
  s = recordResult(s, 'drill:times', 2, 10, '2026-10-27');
  s = recordResult(s, 'drill:times', 1, 5, '2026-10-27');
  assert.equal(s.stars['drill:times'], 2);
  assert.equal(s.coins, 15);
  assert.equal(s.plays, 2);
  assert.equal(s.streak.count, 1);
});

test('daily missions are stable per day and grade, and fit the grade', () => {
  const a = dailyMissions('2026-10-27', DRILLS, 1);
  assert.deepEqual(a, dailyMissions('2026-10-27', DRILLS, 1));
  assert.equal(a.length, 3);
  assert.equal(new Set(a).size, 3);
  for (const id of a) assert.equal(DRILLS.find((d) => d.id === id).grade, 1);
  for (const id of dailyMissions('2026-10-27', DRILLS, 3)) assert.ok(DRILLS.find((d) => d.id === id).grade <= 3);
});

test('a mission pays its bonus once per day', () => {
  let s = defaultState();
  let r = completeMission(s, '2026-10-27', 'times');
  assert.equal(r.awarded, MISSION_BONUS);
  s = r.state;
  r = completeMission(s, '2026-10-27', 'times');
  assert.equal(r.awarded, 0);
  assert.deepEqual(missionsDone(s, '2026-10-27'), ['times']);
  assert.deepEqual(missionsDone(s, '2026-10-28'), []);
  assert.equal(completeMission(s, '2026-10-28', 'times').awarded, MISSION_BONUS);
});

test('buying stickers', () => {
  const sticker = { id: 'cat', price: 30 };
  let s = { ...defaultState(), coins: 20 };
  assert.equal(buySticker(s, sticker).reason, 'coins');
  s = { ...s, coins: 35 };
  const r = buySticker(s, sticker);
  assert.ok(r.ok);
  assert.equal(r.state.coins, 5);
  assert.deepEqual(r.state.stickers, ['cat']);
  assert.equal(buySticker(r.state, sticker).reason, 'owned');
});
