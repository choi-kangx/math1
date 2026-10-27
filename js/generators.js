// 연습 게임 문제 생성기. 화면과 무관한 순수 함수만 둔다.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const int = (rand, min, max) => min + Math.floor(rand() * (max - min + 1));

export function shuffle(rand, arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 정답을 포함한 서로 다른 보기 4개를 만든다. extra()는 임의의 오답 후보를 돌려준다.
function choiceSet(rand, answer, candidates, extra) {
  const set = new Set([answer]);
  for (const c of candidates) if (set.size < 4) set.add(c);
  let guard = 0;
  while (set.size < 4 && guard++ < 200) set.add(extra());
  return shuffle(rand, [...set]);
}

const EMOJI = ['🍎', '⭐', '🐟', '🌸', '🚗', '🍓', '⚽', '🐥'];

const clockLabel = (h, m) => (m === 0 ? `${h}시` : `${h}시 ${m}분`);
const fractionLabel = (n, d) => `${d}분의 ${n}`;

export const DRILLS = [
  {
    id: 'count', grade: 1, area: '수와 연산', icon: '🍎', title: '몇 개일까?',
    make(r) {
      const n = int(r, 3, 20);
      const emoji = EMOJI[int(r, 0, EMOJI.length - 1)];
      return { prompt: '모두 몇 개일까요?', kind: 'number', answer: n, visual: { type: 'objects', emoji, count: n } };
    },
  },
  {
    id: 'compare', grade: 1, area: '수와 연산', icon: '⚖️', title: '크기 비교',
    make(r) {
      const a = int(r, 1, 50);
      const b = r() < 0.15 ? a : int(r, 1, 50);
      const answer = a < b ? '<' : a > b ? '>' : '=';
      return {
        prompt: '○ 안에 알맞은 기호를 골라요', kind: 'choice', choices: ['<', '=', '>'], answer,
        visual: { type: 'compare', a, b }, speech: `${a}와 ${b}를 비교해요`,
      };
    },
  },
  {
    id: 'add10', grade: 1, area: '수와 연산', icon: '➕', title: '10까지 더하기',
    make(r) {
      const a = int(r, 0, 9);
      const b = int(r, 0, 10 - a);
      return { prompt: `${a} + ${b} = ?`, kind: 'number', answer: a + b };
    },
  },
  {
    id: 'sub10', grade: 1, area: '수와 연산', icon: '➖', title: '10까지 빼기',
    make(r) {
      const a = int(r, 1, 10);
      const b = int(r, 0, a);
      return { prompt: `${a} - ${b} = ?`, kind: 'number', answer: a - b };
    },
  },
  {
    id: 'make10', grade: 1, area: '수와 연산', icon: '🔟', title: '10 만들기',
    make(r) {
      const a = int(r, 1, 9);
      return { prompt: `${a} + □ = 10`, kind: 'number', answer: 10 - a, visual: { type: 'tenframe', filled: a } };
    },
  },
  {
    id: 'shape', grade: 1, area: '도형', icon: '🔺', title: '꼭짓점 세기',
    make(r) {
      const sides = int(r, 3, 6);
      return { prompt: '꼭짓점은 몇 개일까요?', kind: 'number', answer: sides, visual: { type: 'polygon', sides } };
    },
  },
  {
    id: 'addcarry', grade: 2, area: '수와 연산', icon: '🧺', title: '받아올림 덧셈',
    make(r) {
      let a; let b;
      do { a = int(r, 11, 89); b = int(r, 2, 9); } while (a % 10 + b < 10 || a + b >= 100);
      return { prompt: `${a} + ${b} = ?`, kind: 'number', answer: a + b };
    },
  },
  {
    id: 'subborrow', grade: 2, area: '수와 연산', icon: '🍪', title: '받아내림 뺄셈',
    make(r) {
      let a; let b;
      do { a = int(r, 20, 99); b = int(r, 2, 9); } while (a % 10 >= b);
      return { prompt: `${a} - ${b} = ?`, kind: 'number', answer: a - b };
    },
  },
  {
    id: 'times', grade: 2, area: '수와 연산', icon: '✖️', title: '곱셈구구',
    make(r) {
      const a = int(r, 2, 9);
      const b = int(r, 1, 9);
      return { prompt: `${a} × ${b} = ?`, kind: 'number', answer: a * b };
    },
  },
  {
    id: 'skip', grade: 2, area: '변화와 관계', icon: '🐸', title: '뛰어 세기',
    make(r) {
      const d = [2, 5, 10][int(r, 0, 2)];
      const s = d * int(r, 0, 5);
      const seq = [s, s + d, s + 2 * d, s + 3 * d];
      return { prompt: `${seq.join(', ')}, ?`, kind: 'number', answer: s + 4 * d, speech: `${seq.join(', ')}, 다음 수는?` };
    },
  },
  {
    id: 'clock', grade: 2, area: '측정', icon: '⏰', title: '시계 보기',
    make(r) {
      const h = int(r, 1, 12);
      const m = 5 * int(r, 0, 11);
      const answer = clockLabel(h, m);
      const swappedH = m === 0 ? 12 : m / 5;
      const choices = choiceSet(
        r,
        answer,
        [clockLabel((h % 12) + 1, m), clockLabel(h, (m + 30) % 60), clockLabel(swappedH, (h * 5) % 60)],
        () => clockLabel(int(r, 1, 12), 5 * int(r, 0, 11))
      );
      return { prompt: '시계가 가리키는 시각은?', kind: 'choice', choices, answer, visual: { type: 'clock', h, m } };
    },
  },
  {
    id: 'divide', grade: 3, area: '수와 연산', icon: '🍰', title: '나눗셈',
    make(r) {
      const b = int(r, 2, 9);
      const q = int(r, 1, 9);
      return { prompt: `${b * q} ÷ ${b} = ?`, kind: 'number', answer: q };
    },
  },
  {
    id: 'mul21', grade: 3, area: '수와 연산', icon: '🧮', title: '두 자리 곱셈',
    make(r) {
      const a = int(r, 11, 49);
      const b = int(r, 2, 9);
      return { prompt: `${a} × ${b} = ?`, kind: 'number', answer: a * b };
    },
  },
  {
    id: 'fraction', grade: 3, area: '수와 연산', icon: '🍕', title: '분수 읽기',
    make(r) {
      const d = int(r, 2, 8);
      const n = int(r, 1, d - 1);
      const answer = fractionLabel(n, d);
      const choices = choiceSet(
        r,
        answer,
        [fractionLabel(d - n, d), fractionLabel(n, d + 1), ...(d - 1 > n ? [fractionLabel(n, d - 1)] : [])],
        () => { const dd = int(r, 2, 8); return fractionLabel(int(r, 1, dd - 1), dd); }
      );
      return { prompt: '색칠한 부분은 전체의 얼마일까요?', kind: 'choice', choices, answer, visual: { type: 'pie', parts: d, filled: n } };
    },
  },
];

export function findDrill(id) {
  return DRILLS.find((d) => d.id === id) || null;
}

// 한 판(기본 10문제)을 만든다. 같은 문제가 한 판에 두 번 나오지 않도록 몇 번 다시 뽑는다.
export function makeRound(drill, seed, count = 10) {
  const rand = mulberry32(seed);
  const seen = new Set();
  const round = [];
  for (let i = 0; i < count; i++) {
    let p = drill.make(rand);
    for (let tries = 0; tries < 8 && seen.has(JSON.stringify(p)); tries++) p = drill.make(rand);
    seen.add(JSON.stringify(p));
    round.push(p);
  }
  return round;
}

export function checkAnswer(problem, value) {
  if (problem.kind === 'number') return value !== '' && Number(value) === problem.answer;
  return value === problem.answer;
}
