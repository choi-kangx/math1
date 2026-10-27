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
  const wrap = div('visual compare');
  wrap.append(div('cmp-num', String(a)), div('cmp-slot', '○'), div('cmp-num', String(b)));
  return wrap;
}

function tenframe({ filled }) {
  const s = svgRoot(260, 110, `10칸 중 ${filled}칸이 차 있어요`);
  for (let i = 0; i < 10; i++) {
    const x = 5 + (i % 5) * 50;
    const y = 5 + Math.floor(i / 5) * 50;
    s.appendChild(svgEl('rect', { x, y, width: 50, height: 50, fill: '#fff', stroke: '#c58b00', 'stroke-width': 3 }));
    if (i < filled) s.appendChild(svgEl('circle', { cx: x + 25, cy: y + 25, r: 16, fill: '#ef6c57' }));
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
  s.appendChild(svgEl('polygon', { points: pts.join(' '), fill: '#9ad0f5', stroke: '#1f6fa8', 'stroke-width': 4, 'stroke-linejoin': 'round' }));
  return s;
}

function clock({ h, m }) {
  const s = svgRoot(220, 220, '시계');
  s.appendChild(svgEl('circle', { cx: 110, cy: 110, r: 100, fill: '#fff', stroke: '#444', 'stroke-width': 5 }));
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
  hand(((h % 12) + m / 60) * 30, 50, 8, '#d0342c');
  hand(m * 6, 75, 5, '#1f4fa8');
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
      fill: i < filled ? '#f6a13a' : '#fff', stroke: '#8a5a00', 'stroke-width': 3,
    }));
  }
  return s;
}

const RENDERERS = { objects, compare, tenframe, polygon, clock, pie };

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
