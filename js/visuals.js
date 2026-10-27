// 연습 문제 그림(구체물, 10칸 상자, 도형, 시계, 분수 원, 크기 비교)을 DOM으로 만든다.
const NS = 'http://www.w3.org/2000/svg';

function svgEl(tag, attrs = {}) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  return e;
}

function svgRoot(w, h, label) {
  const s = svgEl('svg', { viewBox: `0 0 ${w} ${h}`, class: 'visual-svg', role: 'img', 'aria-label': label });
  return s;
}

function div(className, text) {
  const d = document.createElement('div');
  d.className = className;
  if (text !== undefined) d.textContent = text;
  return d;
}

// 10개씩 한 줄, 5개마다 살짝 띄워 세기 쉽게 놓는다.
function objects({ emoji, count }) {
  const wrap = div('visual objects');
  wrap.setAttribute('role', 'img');
  wrap.setAttribute('aria-label', `${emoji} 여러 개`);
  for (let row = 0; row < Math.ceil(count / 10); row++) {
    const line = div('objects-row');
    for (let i = row * 10; i < Math.min(count, row * 10 + 10); i++) {
      const span = document.createElement('span');
      span.className = i % 10 === 5 ? 'obj gap' : 'obj';
      span.textContent = emoji;
      line.appendChild(span);
    }
    wrap.appendChild(line);
  }
  return wrap;
}

function compare({ a, b }) {
  const wrap = div(String(a).length > 3 || String(b).length > 3 ? 'visual compare long' : 'visual compare');
  wrap.append(div('cmp-num', String(a)), div('cmp-slot', '○'), div('cmp-num', String(b)));
  return wrap;
}

function tenframe({ filled }) {
  const s = svgRoot(260, 110, `10칸 중 ${filled}칸이 차 있어요`);
  for (let i = 0; i < 10; i++) {
    const x = 5 + (i % 5) * 50;
    const y = 5 + Math.floor(i / 5) * 50;
    s.appendChild(svgEl('rect', { x, y, width: 50, height: 50, fill: '#fff', stroke: '#c9c3f7', 'stroke-width': 3 }));
    if (i < filled) s.appendChild(svgEl('circle', { cx: x + 25, cy: y + 25, r: 16, fill: '#6d5efc' }));
  }
  return s;
}

function polygon({ sides }) {
  const s = svgRoot(200, 200, '도형');
  const pts = [];
  for (let i = 0; i < sides; i++) {
    const a = (Math.PI * 2 * i) / sides - Math.PI / 2;
    pts.push(`${(100 + 80 * Math.cos(a)).toFixed(1)},${(105 + 80 * Math.sin(a)).toFixed(1)}`);
  }
  s.appendChild(svgEl('polygon', { points: pts.join(' '), fill: '#d6d0ff', stroke: '#6d5efc', 'stroke-width': 4, 'stroke-linejoin': 'round' }));
  return s;
}

function clock({ h, m }) {
  const s = svgRoot(220, 220, '시계');
  s.appendChild(svgEl('circle', { cx: 110, cy: 110, r: 100, fill: '#fff', stroke: '#2b2f3d', 'stroke-width': 5 }));
  for (let n = 1; n <= 12; n++) {
    const a = (Math.PI * 2 * n) / 12 - Math.PI / 2;
    const t = svgEl('text', {
      x: (110 + 78 * Math.cos(a)).toFixed(1), y: (110 + 78 * Math.sin(a) + 7).toFixed(1),
      'text-anchor': 'middle', 'font-size': 20, 'font-weight': 700, fill: '#333',
    });
    t.textContent = String(n);
    s.appendChild(t);
  }
  for (let i = 0; i < 60; i++) {
    const a = (Math.PI * 2 * i) / 60;
    const inner = i % 5 === 0 ? 90 : 95;
    s.appendChild(svgEl('line', {
      x1: (110 + inner * Math.sin(a)).toFixed(1), y1: (110 - inner * Math.cos(a)).toFixed(1),
      x2: (110 + 99 * Math.sin(a)).toFixed(1), y2: (110 - 99 * Math.cos(a)).toFixed(1),
      stroke: '#777', 'stroke-width': i % 5 === 0 ? 2 : 1,
    }));
  }
  const hand = (deg, len, width, color) => {
    const a = (deg * Math.PI) / 180;
    s.appendChild(svgEl('line', {
      x1: 110, y1: 110, x2: (110 + len * Math.sin(a)).toFixed(1), y2: (110 - len * Math.cos(a)).toFixed(1),
      stroke: color, 'stroke-width': width, 'stroke-linecap': 'round',
    }));
  };
  hand(((h % 12) + m / 60) * 30, 50, 8, '#ff7a59');
  hand(m * 6, 75, 5, '#6d5efc');
  s.appendChild(svgEl('circle', { cx: 110, cy: 110, r: 6, fill: '#333' }));
  return s;
}

function pie({ parts, filled }) {
  const s = svgRoot(200, 200, `원을 ${parts}조각으로 나눴어요`);
  const cx = 100; const cy = 100; const r = 85;
  const pt = (deg) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return `${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`;
  };
  for (let i = 0; i < parts; i++) {
    const a0 = (360 * i) / parts;
    const a1 = (360 * (i + 1)) / parts;
    const large = a1 - a0 > 180 ? 1 : 0;
    s.appendChild(svgEl('path', {
      d: `M ${cx} ${cy} L ${pt(a0)} A ${r} ${r} 0 ${large} 1 ${pt(a1)} Z`,
      fill: i < filled ? '#ffb020' : '#fff', stroke: '#d9a03a', 'stroke-width': 3,
    }));
  }
  return s;
}

// 10개짜리 막대와 낱개 블록.
function blocks({ tens, ones }) {
  const cell = 13;
  const onesCols = Math.ceil(ones / 5);
  const w = tens * (cell + 6) + (ones ? 14 + onesCols * (cell + 4) : 0) + 4;
  const s = svgRoot(Math.max(w, 60), 10 * cell + 10, '10개짜리 막대와 낱개');
  for (let t = 0; t < tens; t++) {
    for (let i = 0; i < 10; i++) {
      s.appendChild(svgEl('rect', { x: 4 + t * (cell + 6), y: 5 + i * cell, width: cell, height: cell, fill: '#9d8dff', stroke: '#5b4af0', 'stroke-width': 1.5 }));
    }
  }
  const ox = 4 + tens * (cell + 6) + 14;
  for (let i = 0; i < ones; i++) {
    s.appendChild(svgEl('rect', {
      x: ox + Math.floor(i / 5) * (cell + 4), y: 5 + (i % 5) * (cell + 4), width: cell, height: cell,
      fill: '#ffc14d', stroke: '#d68a00', 'stroke-width': 1.5,
    }));
  }
  s.style.maxWidth = `${Math.min(680, Math.max(w, 60) * 1.6)}px`;
  return s;
}

function label(s, x, y, text, anchor = 'middle') {
  const t = svgEl('text', { x, y, 'text-anchor': anchor, 'font-size': 16, 'font-weight': 700, fill: '#333' });
  t.textContent = text;
  s.appendChild(t);
}

function rect({ w, h }) {
  const s = svgRoot(300, 210, `가로 ${w}cm, 세로 ${h}cm인 직사각형`);
  const k = Math.min(200 / w, 140 / h);
  const rw = w * k; const rh = h * k;
  const x = (260 - rw) / 2; const y = 20 + (150 - rh) / 2;
  s.appendChild(svgEl('rect', { x, y, width: rw, height: rh, fill: '#d9f5ec', stroke: '#12b886', 'stroke-width': 3 }));
  label(s, x + rw / 2, y + rh + 22, `${w} cm`);
  label(s, x + rw + 8, y + rh / 2 + 6, `${h} cm`, 'start');
  return s;
}

function triangle({ b, h }) {
  const s = svgRoot(300, 220, `밑변 ${b}cm, 높이 ${h}cm인 삼각형`);
  const k = Math.min(200 / b, 150 / h);
  const bw = b * k; const th = h * k;
  const x0 = (260 - bw) / 2; const yb = 20 + th + (160 - th) / 2;
  const ax = x0 + bw * 0.35;
  s.appendChild(svgEl('polygon', { points: `${x0},${yb} ${x0 + bw},${yb} ${ax},${yb - th}`, fill: '#ffe7d1', stroke: '#ff8a3d', 'stroke-width': 3, 'stroke-linejoin': 'round' }));
  s.appendChild(svgEl('line', { x1: ax, y1: yb - th, x2: ax, y2: yb, stroke: '#555', 'stroke-width': 2, 'stroke-dasharray': '5 4' }));
  label(s, x0 + bw / 2, yb + 22, `밑변 ${b} cm`);
  label(s, ax + 6, yb - 10, `높이 ${h} cm`, 'start');
  return s;
}

const RENDERERS = { objects, compare, tenframe, polygon, clock, pie, blocks, rect, triangle };

export function renderVisual(visual) {
  const fn = visual && RENDERERS[visual.type];
  if (!fn) return null;
  const node = fn(visual);
  if (node instanceof SVGElement) {
    const box = div('visual');
    box.appendChild(node);
    return box;
  }
  return node;
}
