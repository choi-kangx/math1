// 별, 코인, 연속 출석, 오늘의 미션, 스티커 구매 규칙. 순수 함수만 둔다.
import { mulberry32, shuffle } from './generators.js';

export const MISSION_BONUS = 20;

export function starsFor(correct, total) {
  const r = total > 0 ? correct / total : 0;
  if (r >= 0.9) return 3;
  if (r >= 0.7) return 2;
  if (r >= 0.5) return 1;
  return 0;
}

export function lessonStars(mistakes) {
  if (mistakes === 0) return 3;
  if (mistakes <= 2) return 2;
  return 1;
}

export function coinsFor(correct, stars) {
  return correct + stars * 5;
}

export function dayString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function daysBetween(a, b) {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
}

export function nextStreak(streak, today) {
  if (!streak || !streak.last) return { last: today, count: 1 };
  const gap = daysBetween(streak.last, today);
  if (gap <= 0) return streak;
  if (gap === 1) return { last: today, count: streak.count + 1 };
  return { last: today, count: 1 };
}

// 지금 화면에 보여 줄 연속 출석 일수. 하루 이상 비면 0으로 본다.
export function currentStreak(streak, today) {
  if (!streak || !streak.last) return 0;
  return daysBetween(streak.last, today) <= 1 ? streak.count : 0;
}

export function recordResult(state, activityId, stars, coins, today) {
  const prev = state.stars[activityId] || 0;
  return {
    ...state,
    coins: state.coins + coins,
    stars: { ...state.stars, [activityId]: Math.max(prev, stars) },
    streak: nextStreak(state.streak, today),
    plays: state.plays + 1,
  };
}

export function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// 날짜와 학년이 같으면 항상 같은 미션 3개가 나온다.
export function dailyMissions(today, drills, grade, n = 3) {
  const pool = drills.filter((d) => d.grade <= grade);
  const preferred = pool.filter((d) => d.grade === grade);
  const rand = mulberry32(hashString(`${today}:${grade}`));
  const picked = shuffle(rand, preferred).slice(0, n);
  const rest = shuffle(rand, pool.filter((d) => !picked.includes(d)));
  return [...picked, ...rest].slice(0, n).map((d) => d.id);
}

export function missionsDone(state, today) {
  return state.missions && state.missions.date === today ? state.missions.done : [];
}

export function completeMission(state, today, drillId, bonus = MISSION_BONUS) {
  const done = missionsDone(state, today);
  if (done.includes(drillId)) return { state, awarded: 0 };
  return {
    state: { ...state, coins: state.coins + bonus, missions: { date: today, done: [...done, drillId] } },
    awarded: bonus,
  };
}

export function buySticker(state, sticker) {
  if (state.stickers.includes(sticker.id)) return { ok: false, reason: 'owned', state };
  if (state.coins < sticker.price) return { ok: false, reason: 'coins', state };
  return {
    ok: true,
    state: { ...state, coins: state.coins - sticker.price, stickers: [...state.stickers, sticker.id] },
  };
}
