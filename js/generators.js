// 연습 게임 문제 생성기. 화면과 무관한 순수 함수만 둔다.
// 모든 게임은 make(rand, level)로 문제 하나를 만든다. level: 1 쉬움, 2 보통, 3 어려움.

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
const pick = (rand, arr) => arr[int(rand, 0, arr.length - 1)];

export function shuffle(rand, arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
export const lcm = (a, b) => (a / gcd(a, b)) * b;

export const LEVEL_NAMES = ['쉬움', '보통', '어려움', '도전', '최고 도전'];
export const LEVELS = LEVEL_NAMES.slice(0, 3).map((name, i) => ({ level: i + 1, name }));
export const levelsOf = (drill) => drill.levels.map((desc, i) => ({ level: i + 1, name: LEVEL_NAMES[i], desc }));

// 정답을 포함한 서로 다른 보기 4개를 만든다. extra()는 임의의 오답 후보를 돌려준다.
function choiceSet(rand, answer, candidates, extra) {
  const set = new Set([answer]);
  for (const c of candidates) if (set.size < 4 && c != null) set.add(c);
  let guard = 0;
  while (set.size < 4 && guard++ < 300) set.add(extra());
  return shuffle(rand, [...set]);
}

// 분수 보기: 값이 정답과 다르고 진분수인 후보만 쓴다.
const fl = (n, d) => `${d}분의 ${n}`;
function fractionChoices(rand, [an, ad], candidates) {
  const val = an / ad;
  const ok = ([n, d]) => n > 0 && d > 1 && n < d && Math.abs(n / d - val) > 1e-9;
  return choiceSet(
    rand,
    fl(an, ad),
    candidates.filter(ok).map(([n, d]) => fl(n, d)),
    () => {
      for (;;) {
        const d = int(rand, 2, 12);
        const n = int(rand, 1, d - 1);
        if (ok([n, d])) return fl(n, d);
      }
    }
  );
}

const EMOJI = ['🍎', '⭐', '🐟', '🌸', '🚗', '🍓', '⚽', '🐥'];
const clockLabel = (h, m) => (m === 0 ? `${h}시` : `${h}시 ${m}분`);
const dec = (x, places) => (x / 10 ** places).toFixed(places);

function clockChoices(rand, h, m) {
  const swappedH = m === 0 ? 12 : Math.max(1, Math.floor(m / 5));
  return choiceSet(
    rand,
    clockLabel(h, m),
    [clockLabel((h % 12) + 1, m), clockLabel(h, (m + 30) % 60), clockLabel(swappedH, (h * 5) % 60), clockLabel(h, (m + 5) % 60)],
    () => clockLabel(int(rand, 1, 12), 5 * int(rand, 0, 11))
  );
}

const num = (prompt, answer, extra = {}) => ({ prompt, kind: 'number', answer, ...extra });

export const DRILLS = [
  {
    id: 'count', grade: 1, area: '수와 연산', icon: '🍎', title: '몇 개일까?',
    levels: ['20까지 세기', '10개씩 묶음으로 세기', '묶음과 낱개 바꾸기'],
    make(r, level) {
      if (level === 1) {
        const n = int(r, 3, 20);
        return num('모두 몇 개일까요?', n, { visual: { type: 'objects', emoji: pick(r, EMOJI), count: n } });
      }
      if (level === 2) {
        const n = int(r, 21, 99);
        return num('모두 몇 개일까요?', n, { visual: { type: 'blocks', tens: Math.floor(n / 10), ones: n % 10 } });
      }
      const tens = int(r, 3, 12);
      const ones = int(r, 10, 19);
      return num(`10개씩 묶음 ${tens}개와 낱개 ${ones}개는 모두 몇 개일까요?`, tens * 10 + ones, { visual: { type: 'blocks', tens, ones } });
    },
  },
  {
    id: 'compare', grade: 1, area: '수와 연산', icon: '⚖️', title: '크기 비교',
    levels: ['50까지', '세 자리 수', '식끼리 비교'],
    make(r, level) {
      let a; let b; let va; let vb;
      if (level === 1) {
        va = int(r, 1, 50);
        vb = r() < 0.15 ? va : int(r, 1, 50);
        a = String(va); b = String(vb);
      } else if (level === 2) {
        va = int(r, 100, 999);
        if (r() < 0.1) vb = va;
        else if (r() < 0.6) vb = Math.floor(va / 100) * 100 + int(r, 0, 99); // 백의 자리가 같아 더 헷갈리게
        else vb = int(r, 100, 999);
        a = String(va); b = String(vb);
      } else {
        const x = int(r, 10, 60);
        const y = int(r, 5, 40);
        va = x + y;
        a = `${x} + ${y}`;
        vb = Math.max(1, va + int(r, -4, 4));
        if (r() < 0.5) {
          const q = int(r, 5, 30);
          b = `${vb + q} - ${q}`;
        } else b = String(vb);
      }
      return {
        prompt: '○ 안에 알맞은 기호를 골라요', kind: 'choice', choices: ['<', '=', '>'],
        answer: va < vb ? '<' : va > vb ? '>' : '=', visual: { type: 'compare', a, b }, speech: `${a}와 ${b}를 비교해요`,
      };
    },
  },
  {
    id: 'add10', grade: 1, area: '수와 연산', icon: '➕', title: '덧셈',
    levels: ['합이 10까지', '합이 20까지', '세 수의 덧셈', '두 자리 수 덧셈', '세 자리 수 덧셈'],
    levelGrades: [1, 1, 1, 2, 3],
    make(r, level) {
      if (level === 4) {
        const a = int(r, 12, 89); const b = int(r, 12, 89);
        return num(`${a} + ${b} = ?`, a + b);
      }
      if (level === 5) {
        let a; let b;
        do { a = int(r, 105, 899); b = int(r, 105, 899); } while (a + b >= 1000);
        return num(`${a} + ${b} = ?`, a + b);
      }
      if (level === 1) {
        const a = int(r, 0, 9);
        const b = int(r, 0, 10 - a);
        return num(`${a} + ${b} = ?`, a + b);
      }
      if (level === 2) {
        const a = int(r, 2, 9);
        const b = int(r, 11 - a, 9);
        return num(`${a} + ${b} = ?`, a + b);
      }
      const a = int(r, 2, 9); const b = int(r, 2, 9); const c = int(r, 2, 9);
      return num(`${a} + ${b} + ${c} = ?`, a + b + c);
    },
  },
  {
    id: 'sub10', grade: 1, area: '수와 연산', icon: '➖', title: '뺄셈',
    levels: ['10까지', '20까지 (받아내림)', '세 수의 뺄셈', '두 자리 수 뺄셈', '세 자리 수 뺄셈'],
    levelGrades: [1, 1, 1, 2, 3],
    make(r, level) {
      if (level === 4) {
        const a = int(r, 25, 99); const b = int(r, 11, a - 3);
        return num(`${a} - ${b} = ?`, a - b);
      }
      if (level === 5) {
        const a = int(r, 250, 999); const b = int(r, 101, a - 20);
        return num(`${a} - ${b} = ?`, a - b);
      }
      if (level === 1) {
        const a = int(r, 1, 10);
        const b = int(r, 0, a);
        return num(`${a} - ${b} = ?`, a - b);
      }
      if (level === 2) {
        const a = int(r, 11, 18);
        const b = int(r, a - 9, 9);
        return num(`${a} - ${b} = ?`, a - b);
      }
      const a = int(r, 12, 20);
      const b = int(r, 2, 9);
      const c = int(r, 1, Math.min(9, a - b));
      return num(`${a} - ${b} - ${c} = ?`, a - b - c);
    },
  },
  {
    id: 'make10', grade: 1, area: '수와 연산', icon: '🔟', title: '수 만들기',
    levels: ['10 만들기', '20 만들기', '100 만들기'],
    make(r, level) {
      if (level === 1) {
        const a = int(r, 1, 9);
        return num(`${a} + □ = 10`, 10 - a, { visual: { type: 'tenframe', filled: a } });
      }
      const target = level === 2 ? 20 : 100;
      const a = int(r, 1, target - 1);
      return r() < 0.5 ? num(`${a} + □ = ${target}`, target - a) : num(`□ + ${a} = ${target}`, target - a);
    },
  },
  {
    id: 'shape', grade: 1, area: '도형', icon: '🔺', title: '도형 탐구',
    levels: ['꼭짓점 세기', '꼭짓점과 변', '대각선의 수'],
    make(r, level) {
      if (level === 1) {
        const sides = int(r, 3, 6);
        return num('꼭짓점은 몇 개일까요?', sides, { visual: { type: 'polygon', sides } });
      }
      if (level === 2) {
        const sides = int(r, 3, 8);
        return num('꼭짓점과 변의 수를 모두 더하면 몇 개일까요?', sides * 2, { visual: { type: 'polygon', sides } });
      }
      const sides = int(r, 4, 8);
      return num('이 도형에 그을 수 있는 대각선은 모두 몇 개일까요?', (sides * (sides - 3)) / 2, { visual: { type: 'polygon', sides, diagonals: false } });
    },
  },
  {
    id: 'addcarry', grade: 2, area: '수와 연산', icon: '🧺', title: '받아올림 덧셈',
    levels: ['두 자리 + 한 자리', '두 자리 + 두 자리', '세 자리 + 세 자리'],
    make(r, level) {
      let a; let b;
      if (level === 1) {
        do { a = int(r, 11, 89); b = int(r, 2, 9); } while (a % 10 + b < 10 || a + b >= 100);
      } else if (level === 2) {
        do { a = int(r, 15, 89); b = int(r, 15, 89); } while (a % 10 + (b % 10) < 10);
      } else {
        do { a = int(r, 105, 899); b = int(r, 105, 899); }
        while (a % 10 + (b % 10) < 10 || Math.floor(a / 10) % 10 + (Math.floor(b / 10) % 10) + 1 < 10 || a + b >= 1000);
      }
      return num(`${a} + ${b} = ?`, a + b);
    },
  },
  {
    id: 'subborrow', grade: 2, area: '수와 연산', icon: '🍪', title: '받아내림 뺄셈',
    levels: ['두 자리 - 한 자리', '두 자리 - 두 자리', '세 자리 - 세 자리'],
    make(r, level) {
      let a; let b;
      if (level === 1) {
        do { a = int(r, 20, 99); b = int(r, 2, 9); } while (a % 10 >= b);
      } else if (level === 2) {
        do { a = int(r, 30, 99); b = int(r, 11, a - 1); } while (a % 10 >= b % 10);
      } else {
        do { a = int(r, 300, 999); b = int(r, 101, a - 1); }
        while (a % 10 >= b % 10 || Math.floor(a / 10) % 10 > Math.floor(b / 10) % 10);
      }
      return num(`${a} - ${b} = ?`, a - b);
    },
  },
  {
    id: 'times', grade: 2, area: '수와 연산', icon: '✖️', title: '곱셈구구',
    levels: ['구구단', '□ 안의 수 찾기', '12단까지 거꾸로'],
    make(r, level) {
      if (level === 1) {
        const a = int(r, 2, 9);
        const b = int(r, 1, 9);
        return num(`${a} × ${b} = ?`, a * b);
      }
      if (level === 2) {
        const a = int(r, 2, 9);
        const b = int(r, 2, 9);
        return num(`${a} × □ = ${a * b}`, b);
      }
      const a = int(r, 3, 12);
      const b = int(r, 3, 12);
      return r() < 0.5 ? num(`□ × ${b} = ${a * b}`, a) : num(`${a} × ${b} = ?`, a * b);
    },
  },
  {
    id: 'skip', grade: 2, area: '변화와 관계', icon: '🐸', title: '규칙 찾기',
    levels: ['2, 5, 10씩 뛰어 세기', '여러 수씩 뛰어 세기', '줄어들고 커지는 규칙'],
    make(r, level) {
      let seq; let next;
      if (level === 1) {
        const d = pick(r, [2, 5, 10]);
        const s = d * int(r, 0, 5);
        seq = [0, 1, 2, 3].map((i) => s + i * d);
        next = s + 4 * d;
      } else if (level === 2) {
        const d = pick(r, [3, 4, 6, 7, 8, 9]);
        const s = int(r, 1, 20);
        seq = [0, 1, 2, 3].map((i) => s + i * d);
        next = s + 4 * d;
      } else {
        const form = pick(r, ['down', 'double', 'grow']);
        if (form === 'down') {
          const d = int(r, 3, 9);
          const s = int(r, 60, 100);
          seq = [0, 1, 2, 3].map((i) => s - i * d);
          next = s - 4 * d;
        } else if (form === 'double') {
          const s = int(r, 1, 5);
          seq = [s, s * 2, s * 4, s * 8];
          next = s * 16;
        } else {
          const s = int(r, 1, 10); // 1, 2, 3, 4씩 늘어나는 차이
          seq = [s, s + 1, s + 3, s + 6];
          next = s + 10;
        }
      }
      return num(`${seq.join(', ')}, ?`, next, { speech: `${seq.join(', ')}, 다음 수는?` });
    },
  },
  {
    id: 'clock', grade: 2, area: '측정', icon: '⏰', title: '시계 보기',
    levels: ['5분 단위', '1분 단위', '몇 분 후의 시각'],
    make(r, level) {
      const h = int(r, 1, 12);
      if (level === 1) {
        const m = 5 * int(r, 0, 11);
        return { prompt: '시계가 가리키는 시각은?', kind: 'choice', choices: clockChoices(r, h, m), answer: clockLabel(h, m), visual: { type: 'clock', h, m } };
      }
      if (level === 2) {
        const m = int(r, 1, 59);
        const answer = clockLabel(h, m);
        const choices = choiceSet(
          r, answer,
          [clockLabel(h, (m + 5) % 60), clockLabel((h % 12) + 1, m), clockLabel(h === 1 ? 12 : h - 1, m), clockLabel(h, (m + 55) % 60)],
          () => clockLabel(int(r, 1, 12), int(r, 0, 59))
        );
        return { prompt: '시계가 가리키는 시각은?', kind: 'choice', choices, answer, visual: { type: 'clock', h, m } };
      }
      const m = 5 * int(r, 0, 11);
      const add = pick(r, [15, 25, 35, 40, 45, 50, 75, 90, 105]);
      const total = h * 60 + m + add;
      const nh = ((Math.floor(total / 60) - 1) % 12) + 1;
      const nm = total % 60;
      const answer = clockLabel(nh, nm);
      const choices = choiceSet(
        r, answer,
        [clockLabel(h, nm), clockLabel((nh % 12) + 1, nm), clockLabel(nh, (nm + 10) % 60)],
        () => clockLabel(int(r, 1, 12), 5 * int(r, 0, 11))
      );
      return { prompt: `이 시각에서 ${add}분이 지나면 몇 시 몇 분일까요?`, kind: 'choice', choices, answer, visual: { type: 'clock', h, m } };
    },
  },
  {
    id: 'divide', grade: 3, area: '수와 연산', icon: '🍰', title: '나눗셈',
    levels: ['곱셈구구 안에서', '두 자리 ÷ 한 자리', '나머지가 있는 나눗셈'],
    make(r, level) {
      const b = int(r, 2, 9);
      if (level === 1) {
        const q = int(r, 1, 9);
        return num(`${b * q} ÷ ${b} = ?`, q);
      }
      if (level === 2) {
        const q = int(r, 11, 30);
        return num(`${b * q} ÷ ${b} = ?`, q);
      }
      const q = int(r, 2, 12);
      const rem = int(r, 1, b - 1);
      const label = (qq, rr) => `몫 ${qq}, 나머지 ${rr}`;
      const answer = label(q, rem);
      const choices = choiceSet(r, answer, [label(q + 1, rem), label(q - 1, rem + b), label(q, rem - 1)], () => label(int(r, 1, 12), int(r, 0, 9)));
      return { prompt: `${b * q + rem} ÷ ${b}의 몫과 나머지는?`, kind: 'choice', choices, answer };
    },
  },
  {
    id: 'mul21', grade: 3, area: '수와 연산', icon: '🧮', title: '곱셈',
    levels: ['두 자리 × 한 자리', '세 자리 × 한 자리', '두 자리 × 두 자리'],
    make(r, level) {
      if (level === 1) {
        const a = int(r, 11, 49); const b = int(r, 2, 9);
        return num(`${a} × ${b} = ?`, a * b);
      }
      if (level === 2) {
        const a = int(r, 101, 999); const b = int(r, 2, 9);
        return num(`${a} × ${b} = ?`, a * b);
      }
      const a = int(r, 12, 99); const b = int(r, 12, 99);
      return num(`${a} × ${b} = ?`, a * b);
    },
  },
  {
    id: 'fraction', grade: 3, area: '수와 연산', icon: '🍕', title: '분수',
    levels: ['분수 읽기', '크기가 같은 분수', '분모가 같은 분수의 덧셈'],
    make(r, level) {
      if (level === 1) {
        const d = int(r, 2, 8);
        const n = int(r, 1, d - 1);
        const choices = fractionChoices(r, [n, d], [[d - n, d], [n, d + 1], [n, d - 1]]);
        return { prompt: '색칠한 부분은 전체의 얼마일까요?', kind: 'choice', choices, answer: fl(n, d), visual: { type: 'pie', parts: d, filled: n } };
      }
      if (level === 2) {
        const d = int(r, 2, 6);
        const n = int(r, 1, d - 1);
        const k = int(r, 2, 4);
        const choices = fractionChoices(r, [n * k, d * k], [[n + k, d + k], [n * k, d * k + 1], [n * k + 1, d * k], [n, d * k]]);
        return { prompt: `${fl(n, d)}와 크기가 같은 분수는?`, kind: 'choice', choices, answer: fl(n * k, d * k), visual: { type: 'pie', parts: d, filled: n } };
      }
      const d = int(r, 4, 12);
      const a = int(r, 1, d - 2);
      const b = int(r, 1, d - 1 - a);
      const choices = fractionChoices(r, [a + b, d], [[a + b, d + d], [a + b + 1, d], [a * b, d], [a + b - 1, d]]);
      return { prompt: `${fl(a, d)} + ${fl(b, d)} = ?`, kind: 'choice', choices, answer: fl(a + b, d) };
    },
  },
  {
    id: 'word', grade: 3, area: '문제 해결', icon: '📝', title: '문장제',
    levels: ['덧셈·뺄셈 이야기', '곱셈·나눗셈 이야기', '두 번 계산하는 이야기'],
    make(r, level) {
      const tasks = {
        1: [
          () => { const a = int(r, 25, 95); const b = int(r, 6, a - 5); return [`사과가 ${a}개 있었는데 ${b}개를 먹었어요. 남은 사과는 몇 개일까요?`, a - b]; },
          () => { const a = int(r, 15, 80); const b = int(r, 15, 80); return [`운동장에 남학생 ${a}명, 여학생 ${b}명이 있어요. 모두 몇 명일까요?`, a + b]; },
          () => { const s = int(r, 20, 70); const d = int(r, 6, 40); return [`줄넘기를 민지는 ${s + d}번, 준호는 ${s}번 했어요. 민지는 준호보다 몇 번 더 했을까요?`, d]; },
        ],
        2: [
          () => { const a = int(r, 6, 12); const b = int(r, 3, 9); return [`한 상자에 연필이 ${a}자루씩 들어 있어요. ${b}상자에는 연필이 모두 몇 자루일까요?`, a * b]; },
          () => { const b = int(r, 3, 9); const q = int(r, 4, 12); return [`쿠키 ${b * q}개를 ${b}명이 똑같이 나누어 먹으면 한 명이 몇 개씩 먹을까요?`, q]; },
          () => { const b = int(r, 3, 8); const q = int(r, 3, 9); return [`학생 ${b * q}명이 한 모둠에 ${b}명씩 앉으면 모둠은 몇 개가 될까요?`, q]; },
        ],
        3: [
          () => { const a = int(r, 8, 15); const b = int(r, 4, 9); const c = int(r, 5, a * b - 5); return [`색종이가 한 묶음에 ${a}장씩 ${b}묶음 있어요. 그중 ${c}장을 썼다면 남은 색종이는 몇 장일까요?`, a * b - c]; },
          () => { const a = int(r, 6, 15); const b = int(r, 3, 8); const c = int(r, 2, 9); return [`사탕을 한 봉지에 ${a}개씩 ${b}봉지 사고, 낱개로 ${c}개를 더 샀어요. 사탕은 모두 몇 개일까요?`, a * b + c]; },
          () => { const n = int(r, 3, 8); const p = 100 * int(r, 5, 20); const cost = 100 * int(r, 10, (n * p) / 100 - 1); return [`친구 ${n}명이 ${p}원씩 모아서 ${cost}원짜리 선물을 샀어요. 남은 돈은 얼마일까요?`, n * p - cost]; },
          () => { const b = int(r, 3, 6); const q = int(r, 5, 12); const c = int(r, 1, q - 1); return [`귤 ${b * q}개를 ${b}명이 똑같이 나누고, 그중 한 명이 동생에게 ${c}개를 주었어요. 그 사람에게 남은 귤은 몇 개일까요?`, q - c]; },
        ],
      };
      const [prompt, answer] = pick(r, tasks[level])();
      return num(prompt, answer);
    },
  },
  {
    id: 'add3', grade: 3, area: '수와 연산', icon: '🔢', title: '큰 수 덧셈·뺄셈',
    levels: ['세 자리 덧셈', '0이 있는 세 자리 뺄셈', '네 자리 덧셈·뺄셈'],
    make(r, level) {
      if (level === 1) {
        let a; let b;
        do { a = int(r, 120, 799); b = int(r, 120, 799); } while (a + b >= 1000 || a % 10 + (b % 10) < 10);
        return num(`${a} + ${b} = ?`, a + b);
      }
      if (level === 2) {
        const a = int(r, 2, 9) * 100 + int(r, 0, 8); // 가운데가 0인 수 (예: 503)
        let b;
        do { b = int(r, 101, a - 1); } while (b % 10 <= a % 10);
        return num(`${a} - ${b} = ?`, a - b);
      }
      const a = int(r, 1500, 9500);
      const b = int(r, 1100, 4999);
      if (r() < 0.5 && a > b) return num(`${a} - ${b} = ?`, a - b);
      return num(`${a} + ${b} = ?`, a + b);
    },
  },
  {
    id: 'mixed', grade: 4, area: '수와 연산', icon: '🧩', title: '혼합 계산',
    levels: ['곱셈 먼저', '괄호가 있는 식', '네 가지 계산이 섞인 식'],
    make(r, level) {
      if (level === 1) {
        const b = int(r, 2, 9); const c = int(r, 2, 9);
        if (r() < 0.5) { const a = int(r, 1, 30); return num(`${a} + ${b} × ${c} = ?`, a + b * c); }
        const a = int(r, b * c, b * c + 40);
        return num(`${a} - ${b} × ${c} = ?`, a - b * c);
      }
      if (level === 2) {
        const a = int(r, 2, 15); const b = int(r, 2, 15); const c = int(r, 2, 6);
        if (r() < 0.5) { const d = int(r, 1, Math.min(30, (a + b) * c - 1)); return num(`(${a} + ${b}) × ${c} - ${d} = ?`, (a + b) * c - d); }
        const big = Math.max(a, b) + int(r, 1, 9);
        return num(`${c} × (${big} - ${Math.min(a, b)}) = ?`, c * (big - Math.min(a, b)));
      }
      const a = int(r, 3, 12); const b = int(r, 3, 9); const d = int(r, 2, 9); const q = int(r, 2, 9); const e = int(r, 1, 20);
      return num(`${a} × ${b} - ${d * q} ÷ ${d} + ${e} = ?`, a * b - q + e);
    },
  },
  {
    id: 'bigmul', grade: 4, area: '수와 연산', icon: '🏗️', title: '큰 수의 곱셈·나눗셈',
    levels: ['두 자리 × 두 자리', '세 자리 × 두 자리', '세 자리 ÷ 두 자리'],
    make(r, level) {
      if (level === 1) { const a = int(r, 21, 99); const b = int(r, 21, 99); return num(`${a} × ${b} = ?`, a * b); }
      if (level === 2) { const a = int(r, 120, 999); const b = int(r, 12, 99); return num(`${a} × ${b} = ?`, a * b); }
      const b = int(r, 12, 45); const q = int(r, 6, 25);
      return num(`${b * q} ÷ ${b} = ?`, q);
    },
  },
  {
    id: 'area', grade: 4, area: '측정', icon: '📐', title: '둘레와 넓이',
    levels: ['직사각형의 둘레', '직사각형의 넓이', '삼각형의 넓이'],
    make(r, level) {
      if (level === 3) {
        const b = 2 * int(r, 2, 10); const h = int(r, 3, 15);
        return num('삼각형의 넓이는 몇 cm²일까요?', (b * h) / 2, { visual: { type: 'triangle', b, h } });
      }
      const w = int(r, 3, 20); const h = int(r, 2, 15);
      return level === 1
        ? num('직사각형의 둘레는 몇 cm일까요?', 2 * (w + h), { visual: { type: 'rect', w, h } })
        : num('직사각형의 넓이는 몇 cm²일까요?', w * h, { visual: { type: 'rect', w, h } });
    },
  },
  {
    id: 'factors', grade: 5, area: '수와 연산', icon: '🔍', title: '약수와 배수',
    levels: ['약수의 개수', '최대공약수', '최소공배수'],
    make(r, level) {
      if (level === 1) {
        const n = pick(r, [6, 8, 10, 12, 15, 16, 18, 20, 24, 28, 30, 36, 40, 42, 45, 48]);
        let count = 0;
        for (let i = 1; i <= n; i++) if (n % i === 0) count++;
        return num(`${n}의 약수는 모두 몇 개일까요?`, count);
      }
      if (level === 2) {
        let a; let b; let g;
        do {
          g = int(r, 2, 12);
          const x = int(r, 1, 9); const y = int(r, 2, 9);
          a = g * x; b = g * y;
        } while (a === b || gcd(a / g, b / g) !== 1);
        return num(`${a}와 ${b}의 최대공약수는 얼마일까요?`, g);
      }
      let a; let b;
      do { a = int(r, 3, 15); b = int(r, 3, 15); } while (a === b);
      return num(`${a}와 ${b}의 최소공배수는 얼마일까요?`, lcm(a, b));
    },
  },
  {
    id: 'fracop', grade: 5, area: '수와 연산', icon: '🥧', title: '분수의 계산',
    levels: ['분모가 같은 분수의 뺄셈', '분모가 다른 분수의 덧셈', '수의 분수만큼'],
    make(r, level) {
      if (level === 1) {
        const d = int(r, 4, 12); const a = int(r, 2, d - 1); const b = int(r, 1, a - 1);
        const choices = fractionChoices(r, [a - b, d], [[a - b, d - d + 1], [a - b + 1, d], [a + b, d], [a - b, d + 1]]);
        return { prompt: `${fl(a, d)} - ${fl(b, d)} = ?`, kind: 'choice', choices, answer: fl(a - b, d) };
      }
      if (level === 2) {
        let b; let d; let a; let c; let sn; let sd;
        do {
          b = int(r, 2, 6); d = int(r, 2, 8); a = int(r, 1, b - 1); c = int(r, 1, d - 1);
          sd = b * d; sn = a * d + c * b;
        } while (b === d || sn >= sd);
        const g = gcd(sn, sd);
        const [an, ad] = [sn / g, sd / g];
        const choices = fractionChoices(r, [an, ad], [[a + c, b + d], [a + c, b * d], [an + 1, ad], [an, ad + 1]]);
        return { prompt: `${fl(a, b)} + ${fl(c, d)} = ? (기약분수로)`, kind: 'choice', choices, answer: fl(an, ad) };
      }
      const d = int(r, 2, 8); const n = int(r, 1, d - 1); const k = int(r, 2, 12);
      return num(`${d * k}의 ${fl(n, d)}은 얼마일까요?`, n * k);
    },
  },
  {
    id: 'decimal', grade: 5, area: '수와 연산', icon: '🔸', title: '소수의 계산',
    levels: ['소수 한 자리 덧셈', '소수 두 자리 뺄셈', '소수의 곱셈·나눗셈'],
    make(r, level) {
      if (level === 1) {
        let a; let b;
        do { a = int(r, 11, 99); b = int(r, 11, 99); } while (a % 10 === 0 || b % 10 === 0);
        return num(`${dec(a, 1)} + ${dec(b, 1)} = ?`, (a + b) / 10, { decimal: true });
      }
      if (level === 2) {
        const a = int(r, 20, 99) * 10; const b = int(r, 101, a - 1);
        return num(`${dec(a, 2).replace(/0$/, '')} - ${dec(b, 2)} = ?`, (a - b) / 100, { decimal: true });
      }
      if (r() < 0.5) {
        const a = int(r, 11, 99); const k = int(r, 2, 9);
        return num(`${dec(a, 1)} × ${k} = ?`, (a * k) / 10, { decimal: true });
      }
      const q = int(r, 11, 99); const d = int(r, 2, 9);
      return num(`${dec(q * d, 1)} ÷ ${d} = ?`, q / 10, { decimal: true });
    },
  },
  {
    id: 'ratio', grade: 6, area: '변화와 관계', icon: '📊', title: '비와 비율',
    levels: ['백분율', '비례식', '할인된 가격'],
    make(r, level) {
      if (level === 1) {
        const base = 20 * int(r, 1, 10); const p = pick(r, [10, 20, 25, 50, 75]);
        return num(`${base}의 ${p}%는 얼마일까요?`, (base * p) / 100);
      }
      if (level === 2) {
        let a; let b;
        do { a = int(r, 1, 9); b = int(r, 2, 9); } while (a === b || gcd(a, b) !== 1);
        const k = int(r, 2, 9);
        return r() < 0.5 ? num(`${a} : ${b} = ${a * k} : □`, b * k) : num(`${a} : ${b} = □ : ${b * k}`, a * k);
      }
      const price = 1000 * int(r, 2, 30); const p = pick(r, [10, 20, 25, 30, 50]);
      return num(`${price}원짜리 물건을 ${p}% 할인하면 얼마일까요?`, (price * (100 - p)) / 100);
    },
  },
  {
    id: 'equation', grade: 6, area: '변화와 관계', icon: '❓', title: '□ 구하기',
    levels: ['덧셈·뺄셈', '곱셈·나눗셈', '두 번 계산하는 식'],
    make(r, level) {
      if (level === 1) {
        const x = int(r, 5, 99); const a = int(r, 5, 99);
        return r() < 0.5 ? num(`□ + ${a} = ${x + a}`, x) : num(`${x + a} - □ = ${a}`, x);
      }
      if (level === 2) {
        const x = int(r, 3, 15); const a = int(r, 3, 12);
        return r() < 0.5 ? num(`□ × ${a} = ${x * a}`, x) : num(`${x * a} ÷ □ = ${a}`, x);
      }
      const x = int(r, 2, 15); const a = int(r, 2, 9); const b = int(r, 1, 30);
      const form = int(r, 0, 2);
      if (form === 0) return num(`${a} × □ + ${b} = ${a * x + b}`, x);
      if (form === 1) return num(`(□ + ${b}) × ${a} = ${(x + b) * a}`, x);
      return num(`${a} × □ - ${Math.min(b, a * x)} = ${a * x - Math.min(b, a * x)}`, x);
    },
  },
];

export function findDrill(id) {
  return DRILLS.find((d) => d.id === id) || null;
}

export function clampLevel(level, max = 3) {
  const n = Number(level);
  return Number.isInteger(n) && n >= 1 && n <= max ? n : 1;
}

// 한 판(기본 10문제)을 만든다. 같은 문제가 한 판에 두 번 나오지 않도록 몇 번 다시 뽑는다.
export function makeRound(drill, seed, count = 10, level = 1) {
  const rand = mulberry32(seed);
  const lv = clampLevel(level, drill.levels.length);
  const seen = new Set();
  const round = [];
  for (let i = 0; i < count; i++) {
    let p = drill.make(rand, lv);
    for (let tries = 0; tries < 8 && seen.has(JSON.stringify(p)); tries++) p = drill.make(rand, lv);
    seen.add(JSON.stringify(p));
    round.push(p);
  }
  return round;
}

export function checkAnswer(problem, value) {
  if (problem.kind === 'number') {
    if (value === '' || value === '.' || !Number.isFinite(Number(value))) return false;
    return Math.abs(Number(value) - problem.answer) < 1e-6;
  }
  return value === problem.answer;
}

// 학년에 맞춰 추천하는 난이도: 내 학년보다 낮은 게임은 어려움, 같은 학년은 보통.
// 단계마다 맞는 학년(levelGrades)이 있으면 그것을 기준으로 고른다.
export function recommendedLevel(drill, grade) {
  const lg = drill.levelGrades || drill.levels.map(() => drill.grade);
  const same = lg.map((g, i) => (g === grade ? i + 1 : 0)).filter(Boolean);
  if (same.length) return same[Math.floor((same.length - 1) / 2)];
  let best = 1;
  lg.forEach((g, i) => { if (g <= grade) best = i + 1; });
  return best;
}
