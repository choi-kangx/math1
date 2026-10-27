// 레슨 만화 장면을 데이터(art)로부터 SVG로 그린다.
// art = { bg, title?, cast: [{ who, side, mood }], groups: [...] }
// 그룹 종류: 물건 묶음 { obj, n, holder, cols, color, label }, 기호 { sep }, 세로 쌓기 { stack: [...] },
// 가로 줄 { row: [...] }, 사람들 { people, each, obj }, 피자 { pizza, filled, filled2 },
// 막대 { bar, filled, filled2 }, 숫자 카드 { tokens }, 탈것 { vehicle, label }
const NS = 'http://www.w3.org/2000/svg';
const W = 480;
const H = 300;
let uid = 0;

function E(tag, attrs = {}, ...children) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== undefined && v !== null) e.setAttribute(k, String(v));
  for (const c of children.flat()) if (c) e.appendChild(c);
  return e;
}
const G = (attrs, ...children) => E('g', attrs, ...children);
function T(x, y, text, attrs = {}) {
  const t = E('text', { x, y, 'text-anchor': 'middle', 'font-weight': 800, 'font-family': 'system-ui, "Malgun Gothic", sans-serif', ...attrs });
  t.textContent = text;
  return t;
}

// ---------- 그라디언트 ----------
function makeDefs(p) {
  const lin = (id, stops, x2 = 0, y2 = 1) => E('linearGradient', { id: p + id, x1: 0, y1: 0, x2, y2 },
    stops.map(([o, c]) => E('stop', { offset: o, 'stop-color': c })));
  const rad = (id, stops) => E('radialGradient', { id: p + id, cx: '35%', cy: '30%', r: '75%' },
    stops.map(([o, c]) => E('stop', { offset: o, 'stop-color': c })));
  return E('defs', {},
    lin('wall', [[0, '#f4f2ff'], [1, '#e7e3fb']]),
    lin('floor', [[0, '#d9d2ea'], [1, '#c4bbdb']]),
    lin('table', [[0, '#f1e3d3'], [1, '#e2cdb6']]),
    lin('sky', [[0, '#c9e4ff'], [1, '#f3f8ff']]),
    lin('grass', [[0, '#9fdcb4'], [1, '#79c79a']]),
    lin('board', [[0, '#2f3b52'], [1, '#232c3f']]),
    lin('classwall', [[0, '#f2f4f8'], [1, '#e3e7ef']]),
    rad('red', [[0, '#ff8a8a'], [0.6, '#e53935'], [1, '#a31515']]),
    rad('blue', [[0, '#9fd0ff'], [0.6, '#2f80ed'], [1, '#174c9c']]),
    rad('green', [[0, '#b8f5a8'], [0.6, '#3fb24a'], [1, '#1f7a2a']]),
    rad('yellow', [[0, '#fff3a6'], [0.6, '#f5c400'], [1, '#b88a00']]),
    rad('purple', [[0, '#e3c4ff'], [0.6, '#9b51e0'], [1, '#5b2394']]),
    rad('pink', [[0, '#ffd0e2'], [0.6, '#ff6fa5'], [1, '#c2185b']]),
    rad('orange', [[0, '#ffd59e'], [0.6, '#ff9330'], [1, '#c25e00']]),
    rad('apple', [[0, '#ff8f80'], [0.55, '#e8322b'], [1, '#9e1414']]),
    rad('dough', [[0, '#f6cf8f'], [1, '#c98a45']]),
    rad('skin', [[0, '#ffe6cf'], [1, '#f6c39b']]),
    E('filter', { id: p + 'shadow', x: '-20%', y: '-20%', width: '140%', height: '140%' },
      E('feDropShadow', { dx: 0, dy: 2, stdDeviation: 1.5, 'flood-color': '#2a1f5c', 'flood-opacity': 0.18 })));
}

// ---------- 배경 ----------
function background(bg, p) {
  const url = (id) => `url(#${p}${id})`;
  if (bg === 'park') {
    return G({},
      E('rect', { width: W, height: H, fill: url('sky') }),
      E('circle', { cx: 420, cy: 48, r: 24, fill: '#ffd36e' }),
      E('circle', { cx: 420, cy: 48, r: 36, fill: '#ffd36e', opacity: 0.2 }),
      cloud(90, 50, 1), cloud(260, 34, 0.8),
      E('path', { d: `M0 230 Q120 190 240 222 T480 214 V${H} H0Z`, fill: '#bfe8cc' }),
      E('rect', { y: 238, width: W, height: H - 238, fill: url('grass') }),
      ...[40, 150, 330, 455].map((x) => E('path', { d: `M${x} 262 l4 -10 l4 10 l4 -8 l3 8`, stroke: '#5bb07f', 'stroke-width': 2, fill: 'none' })));
  }
  if (bg === 'class') {
    return G({},
      E('rect', { width: W, height: H, fill: url('classwall') }),
      E('rect', { x: 60, y: 22, width: 360, height: 168, rx: 12, fill: '#c9cfdc' }),
      E('rect', { x: 66, y: 28, width: 348, height: 156, rx: 9, fill: url('board') }),
      E('rect', { x: 150, y: 182, width: 70, height: 6, rx: 2, fill: '#f4f1e8' }),
      E('rect', { y: 246, width: W, height: H - 246, fill: url('floor') }));
  }
  // room: 벽, 창문, 탁자
  return G({},
    E('rect', { width: W, height: H, fill: url('wall') }),
    E('rect', { x: 28, y: 26, width: 88, height: 74, rx: 14, fill: '#d6ebff' }),
    E('circle', { cx: 92, cy: 52, r: 11, fill: '#fff', opacity: 0.8 }),
    E('path', { d: 'M28 86 Q60 70 116 84 V86 Q116 100 102 100 H42 Q28 100 28 86Z', fill: '#bfe3cf' }),
    E('rect', { x: 384, y: 30, width: 66, height: 52, rx: 10, fill: '#fff' }),
    E('circle', { cx: 404, cy: 58, r: 12, fill: '#ffb4a2' }),
    E('rect', { x: 416, y: 44, width: 22, height: 26, rx: 11, fill: '#b9b0ff' }),
    E('path', { d: 'M446 196 Q452 150 446 120 M446 150 Q462 140 466 126 M446 166 Q432 156 428 142', stroke: '#79c79a', 'stroke-width': 5, fill: 'none', 'stroke-linecap': 'round' }),
    E('path', { d: 'M434 196 h24 l-4 16 h-16z', fill: '#f4a28c' }),
    E('rect', { y: 250, width: W, height: H - 250, fill: url('floor') }),
    E('rect', { x: 20, y: 212, width: W - 40, height: 16, rx: 8, fill: url('table') }),
    E('rect', { x: 20, y: 226, width: W - 40, height: 4, rx: 2, fill: '#cdb59b', opacity: 0.6 }),
    E('rect', { x: 50, y: 228, width: 10, height: 56, rx: 5, fill: '#cdb59b' }),
    E('rect', { x: W - 60, y: 228, width: 10, height: 56, rx: 5, fill: '#cdb59b' }));
}
function cloud(x, y, s) {
  return G({ transform: `translate(${x} ${y}) scale(${s})`, fill: '#fff', opacity: 0.95 },
    E('ellipse', { cx: 0, cy: 0, rx: 30, ry: 14 }), E('circle', { cx: -14, cy: -8, r: 14 }), E('circle', { cx: 10, cy: -12, r: 17 }));
}

// ---------- 물건 (중심 0,0, 지름 약 26) ----------
const COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'pink', 'orange'];
function object(kind, p, i, color) {
  const url = (id) => `url(#${p}${id})`;
  switch (kind) {
    case 'marble': {
      const c = color || COLORS[i % COLORS.length];
      return G({}, E('circle', { r: 11, fill: url(c) }), E('ellipse', { cx: -4, cy: -5, rx: 3.5, ry: 2.5, fill: '#fff', opacity: 0.8 }));
    }
    case 'candy': {
      const c = color || ['pink', 'blue', 'yellow', 'purple', 'green'][i % 5];
      return G({},
        E('path', { d: 'M-19 -7 L-9 0 L-19 7Z', fill: url(c), stroke: '#00000033' }),
        E('path', { d: 'M19 -7 L9 0 L19 7Z', fill: url(c), stroke: '#00000033' }),
        E('ellipse', { rx: 11, ry: 9, fill: url(c), stroke: '#00000040' }),
        E('path', { d: 'M-4 -8 Q0 0 -4 8 M3 -8 Q7 0 3 8', stroke: '#ffffffaa', 'stroke-width': 2, fill: 'none' }));
    }
    case 'cookie':
      return G({},
        E('circle', { r: 12, fill: url('dough'), stroke: '#9a6232', 'stroke-width': 1.5 }),
        ...[[-5, -4], [4, -5], [-2, 5], [6, 3], [-7, 2]].map(([x, y]) => E('circle', { cx: x, cy: y, r: 2, fill: '#5a3420' })));
    case 'strawberry':
      return G({},
        E('path', { d: 'M0 13 C-12 4 -13 -6 -7 -9 C-3 -11 3 -11 7 -9 C13 -6 12 4 0 13Z', fill: url('apple'), stroke: '#9e1414', 'stroke-width': 1 }),
        E('path', { d: 'M-8 -9 L-3 -14 L0 -10 L3 -14 L8 -9 L0 -6Z', fill: '#3fa34d' }),
        ...[[-4, -3], [3, -4], [0, 2], [-5, 4], [5, 3], [0, 8]].map(([x, y]) => E('ellipse', { cx: x, cy: y, rx: 1, ry: 1.6, fill: '#ffe08a' })));
    case 'apple':
      return G({},
        E('path', { d: 'M0 -7 C7 -14 15 -7 13 3 C11 13 4 14 0 11 C-4 14 -11 13 -13 3 C-15 -7 -7 -14 0 -7Z', fill: url('apple'), stroke: '#8f1212', 'stroke-width': 1 }),
        E('path', { d: 'M0 -7 Q1 -12 3 -14', stroke: '#6b3e1f', 'stroke-width': 2, fill: 'none' }),
        E('ellipse', { cx: 6, cy: -12, rx: 5, ry: 2.5, fill: '#4caf50', transform: 'rotate(-25 6 -12)' }),
        E('ellipse', { cx: -6, cy: -2, rx: 3, ry: 4, fill: '#fff', opacity: 0.35 }));
    case 'donut':
      return G({},
        E('circle', { r: 12.5, fill: url('dough'), stroke: '#9a6232', 'stroke-width': 1 }),
        E('path', { d: 'M-11 -2 C-11 -10 11 -10 11 -2 C11 6 7 4 4 7 C0 10 -4 5 -7 7 C-10 8 -11 4 -11 -2Z', fill: color === 'choco' ? '#6d3d22' : '#ff8fb8' }),
        E('circle', { r: 4, fill: '#b9773d' }),
        ...[[-6, -5, 30], [5, -6, -20], [7, 1, 60], [-7, 2, -50], [0, -8, 0]].map(([x, y, a], k) =>
          E('rect', { x: x - 2, y: y - 0.8, width: 4, height: 1.6, rx: 0.8, fill: ['#fff', '#4fc3f7', '#ffeb3b', '#81c784', '#fff'][k], transform: `rotate(${a} ${x} ${y})` })));
    case 'ladybug':
      return G({},
        E('circle', { cy: -9, r: 5, fill: '#222' }),
        E('ellipse', { rx: 12, ry: 10, fill: url('red'), stroke: '#7a0d0d' }),
        E('line', { x1: 0, y1: -10, x2: 0, y2: 10, stroke: '#222', 'stroke-width': 1.5 }),
        ...[[-5, -3], [5, -3], [-6, 4], [6, 4]].map(([x, y]) => E('circle', { cx: x, cy: y, r: 2.2, fill: '#222' })));
    case 'choco':
      return G({},
        E('rect', { x: -12, y: -12, width: 24, height: 24, rx: 4, fill: '#7b4a2e', stroke: '#4e2c18', 'stroke-width': 1.5 }),
        E('rect', { x: -8, y: -8, width: 16, height: 16, rx: 2, fill: '#8f5a39' }),
        E('path', { d: 'M-8 -8 L-4 -4 M8 -8 L4 -4', stroke: '#b07a52', 'stroke-width': 1.5 }));
    default:
      return E('circle', { r: 10, fill: '#ccc' });
  }
}

// 흩어 놓기: 겹치지 않게 격자 위치를 조금씩 흔든다(항상 같은 모양).
function scatterPositions(n, w, h) {
  const cols = Math.ceil(Math.sqrt((n * w) / h));
  const rows = Math.ceil(n / cols);
  const cw = w / cols; const ch = h / rows;
  let s = 7;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const cells = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cells.push([c, r]);
  for (let i = cells.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [cells[i], cells[j]] = [cells[j], cells[i]]; }
  return cells.slice(0, n).map(([c, r]) => [c * cw + cw / 2 + (rnd() - 0.5) * cw * 0.35, r * ch + ch / 2 + (rnd() - 0.5) * ch * 0.35]);
}

// ---------- 그룹 ----------
const STEP = 30;
function itemsGroup(spec, p) {
  const n = spec.n || 0;
  const holder = spec.holder || 'plate';
  const g = G({});
  if (holder === 'scatter') {
    const w = spec.w || 300; const h = spec.h || 140;
    scatterPositions(n, w - 24, h - 24).forEach(([x, y], i) => {
      g.appendChild(G({ transform: `translate(${x + 12} ${y + 12}) rotate(${(i * 37) % 40 - 20})` }, object(spec.obj, p, i, spec.color)));
    });
    return { node: g, w, h };
  }
  if (holder === 'string') {
    const w = n * 24 + 24; const h = 34;
    g.appendChild(E('path', { d: `M4 17 H${w - 4}`, stroke: '#8a5a2b', 'stroke-width': 2.5, 'stroke-linecap': 'round' }));
    g.appendChild(E('circle', { cx: 4, cy: 17, r: 3.5, fill: '#8a5a2b' }));
    g.appendChild(E('circle', { cx: w - 4, cy: 17, r: 3.5, fill: '#8a5a2b' }));
    for (let i = 0; i < n; i++) g.appendChild(G({ transform: `translate(${24 + i * 24} 17)` }, object(spec.obj, p, i, spec.color)));
    return { node: g, w, h };
  }
  const cols = Math.max(1, Math.min(n || 1, spec.cols || 5));
  const rows = Math.max(1, Math.ceil(n / cols));
  const innerW = cols * STEP; const innerH = rows * STEP;
  const pad = holder === 'none' ? 0 : 16;
  const w = Math.max(innerW + pad * 2, holder === 'none' ? 0 : 70);
  const baseH = holder === 'basket' || holder === 'box' || holder === 'bowl' ? 22 : holder === 'plate' || holder === 'leaf' ? 12 : 0;
  const h = innerH + baseH + (holder === 'none' ? 0 : 6);
  const ox = (w - innerW) / 2 + STEP / 2;
  const objs = G({});
  for (let i = 0; i < n; i++) {
    const c = i % cols; const r = Math.floor(i / cols);
    objs.appendChild(G({ transform: `translate(${ox + c * STEP} ${r * STEP + STEP / 2 + 2})` }, object(spec.obj, p, i, spec.color)));
  }
  const floorY = innerH + 4;
  if (holder === 'plate') {
    g.append(
      E('ellipse', { cx: w / 2, cy: floorY + 5, rx: w / 2, ry: 9, fill: '#fff', filter: `url(#${p}shadow)` }),
      E('ellipse', { cx: w / 2, cy: floorY + 4, rx: w / 2 - 12, ry: 5, fill: '#efedf8' }),
      objs);
  } else if (holder === 'leaf') {
    g.append(E('path', { d: `M2 ${floorY + 4} Q${w / 2} ${floorY - 10} ${w - 2} ${floorY + 4} Q${w / 2} ${floorY + 18} 2 ${floorY + 4}Z`, fill: '#7cc95a', stroke: '#3f8f32', 'stroke-width': 1.5 }),
      E('path', { d: `M6 ${floorY + 4} H${w - 6}`, stroke: '#3f8f32', 'stroke-width': 1 }), objs);
  } else if (holder === 'basket' || holder === 'bowl' || holder === 'box') {
    const top = floorY - 2; // 앞판은 물건 아래에 둔다(모든 물건이 보이게)
    const front = holder === 'basket'
      ? G({},
        E('path', { d: `M0 ${top} H${w} L${w - 10} ${h} H10Z`, fill: '#c98a45', stroke: '#8a5a2b', 'stroke-width': 2 }),
        ...[0.33, 0.66].map((t) => E('path', { d: `M${3 + t * 4} ${top + (h - top) * t} H${w - 3 - t * 4}`, stroke: '#a86d33', 'stroke-width': 2 })),
        ...[1, 2, 3, 4].map((k) => E('path', { d: `M${(w * k) / 5} ${top} L${(w * k) / 5 + (k - 2.5) * -2} ${h}`, stroke: '#a86d33', 'stroke-width': 1.5 })),
        E('rect', { x: -3, y: top - 5, width: w + 6, height: 8, rx: 4, fill: '#b3743a', stroke: '#8a5a2b' }))
      : holder === 'bowl'
        ? G({}, E('path', { d: `M0 ${top} H${w} Q${w - 6} ${h} ${w / 2} ${h} Q6 ${h} 0 ${top}Z`, fill: '#8fd3f4', stroke: '#3b8fc0', 'stroke-width': 2 }),
          E('path', { d: `M10 ${top + 8} H${w - 10}`, stroke: '#fff', 'stroke-width': 3, opacity: 0.6 }))
        : G({}, E('rect', { x: 0, y: top, width: w, height: h - top, rx: 3, fill: '#f2c48d', stroke: '#b07a3a', 'stroke-width': 2 }),
          E('path', { d: `M0 ${top} L-10 ${top - 12} M${w} ${top} L${w + 10} ${top - 12}`, stroke: '#b07a3a', 'stroke-width': 3 }),
          E('rect', { x: w / 2 - 14, y: top + 6, width: 28, height: 8, rx: 2, fill: '#fff', opacity: 0.6 }));
    g.append(objs, front);
  } else {
    g.appendChild(objs);
  }
  if (n === 0 && holder !== 'none') {
    g.appendChild(T(w / 2, floorY - 2, spec.empty || '?', { 'font-size': 26, fill: '#6d5efc' }));
  }
  return { node: g, w, h };
}

function sepGroup(sym) {
  const g = G({}, E('circle', { cx: 16, cy: 16, r: 16, fill: '#6d5efc' }),
    T(16, 23.5, sym, { 'font-size': 20, fill: '#fff' }));
  return { node: g, w: 32, h: 32 };
}

// ---------- 인물 ----------
const KIDS = {
  girl: { hair: '#3b2a3f', shirt: '#ff8a7a', pigtails: true },
  boy: { hair: '#2a2433', shirt: '#6d8cff' },
  kid: { hair: '#5a3d32', shirt: '#4fc4a0' },
  kid2: { hair: '#1f1b2b', shirt: '#ffc15e', pigtails: true },
};
function kid(type, mood, p) {
  const k = KIDS[type] || KIDS.kid;
  const g = G({});
  // 몸
  g.append(
    E('path', { d: 'M-22 40 Q-22 8 0 8 Q22 8 22 40Z', fill: k.shirt }),
    E('rect', { x: -14, y: 38, width: 11, height: 18, rx: 5, fill: '#2f3b52' }),
    E('rect', { x: 3, y: 38, width: 11, height: 18, rx: 5, fill: '#2f3b52' }),
    E('ellipse', { cx: -9, cy: 57, rx: 8, ry: 4, fill: '#ffffff' }),
    E('ellipse', { cx: 9, cy: 57, rx: 8, ry: 4, fill: '#333' }));
  // 팔
  const up = mood === 'wow';
  g.append(
    E('path', { d: up ? 'M-20 16 L-32 -4' : 'M-20 16 L-27 34', stroke: k.shirt, 'stroke-width': 8, 'stroke-linecap': 'round' }),
    E('path', { d: up ? 'M20 16 L32 -4' : 'M20 16 L27 34', stroke: k.shirt, 'stroke-width': 8, 'stroke-linecap': 'round' }),
    E('circle', { cx: up ? -33 : -28, cy: up ? -6 : 36, r: 4.5, fill: '#f6c39b' }),
    E('circle', { cx: up ? 33 : 28, cy: up ? -6 : 36, r: 4.5, fill: '#f6c39b' }));
  // 머리
  if (k.pigtails) g.append(E('circle', { cx: -22, cy: -16, r: 8, fill: k.hair }), E('circle', { cx: 22, cy: -16, r: 8, fill: k.hair }));
  g.append(
    E('circle', { cy: -14, r: 21, fill: `url(#${p}skin)` }),
    E('path', { d: 'M-21 -16 Q-20 -38 0 -37 Q20 -38 21 -16 Q12 -26 0 -24 Q-10 -28 -21 -16Z', fill: k.hair }),
    E('ellipse', { cx: -7, cy: -14, rx: 2.6, ry: mood === 'wow' ? 3.6 : 3, fill: '#2b2b2b' }),
    E('ellipse', { cx: 7, cy: -14, rx: 2.6, ry: mood === 'wow' ? 3.6 : 3, fill: '#2b2b2b' }),
    E('circle', { cx: -6, cy: -15, r: 0.9, fill: '#fff' }), E('circle', { cx: 8, cy: -15, r: 0.9, fill: '#fff' }),
    E('ellipse', { cx: -12, cy: -6, rx: 3.5, ry: 2, fill: '#ff9aa2', opacity: 0.7 }),
    E('ellipse', { cx: 12, cy: -6, rx: 3.5, ry: 2, fill: '#ff9aa2', opacity: 0.7 }),
    mood === 'think'
      ? E('path', { d: 'M-4 -4 Q2 -6 5 -3', stroke: '#8a3b2b', 'stroke-width': 2, fill: 'none', 'stroke-linecap': 'round' })
      : mood === 'wow'
        ? E('ellipse', { cy: -3, rx: 3.5, ry: 4.5, fill: '#8a3b2b' })
        : E('path', { d: 'M-6 -5 Q0 1 6 -5', stroke: '#8a3b2b', 'stroke-width': 2, fill: 'none', 'stroke-linecap': 'round' }));
  return g;
}

function owl(mood) {
  const g = G({});
  g.append(
    E('path', { d: 'M-20 -34 L-16 -52 L-4 -40Z M20 -34 L16 -52 L4 -40Z', fill: '#5a4ae0' }),
    E('ellipse', { cy: 0, rx: 32, ry: 42, fill: '#7c6cf6' }),
    E('ellipse', { cy: 12, rx: 20, ry: 26, fill: '#ece9ff' }),
    ...[[-8, 6], [8, 6], [0, 16], [-8, 24], [8, 24]].map(([x, y]) => E('path', { d: `M${x - 4} ${y} Q${x} ${y + 4} ${x + 4} ${y}`, stroke: '#c7c0ff', 'stroke-width': 1.5, fill: 'none' })),
    E('ellipse', { cx: -30, cy: 6, rx: 9, ry: 22, fill: '#6455e6', transform: mood === 'wow' ? 'rotate(35 -30 6)' : 'rotate(12 -30 6)' }),
    E('ellipse', { cx: 30, cy: 6, rx: 9, ry: 22, fill: '#6455e6', transform: mood === 'wow' ? 'rotate(-35 30 6)' : 'rotate(-12 30 6)' }),
    E('circle', { cx: -12, cy: -20, r: 13, fill: '#fff' }),
    E('circle', { cx: 12, cy: -20, r: 13, fill: '#fff' }),
    E('circle', { cx: mood === 'think' ? -9 : -12, cy: mood === 'think' ? -23 : -19, r: 6, fill: '#2b2b2b' }),
    E('circle', { cx: mood === 'think' ? 15 : 12, cy: mood === 'think' ? -23 : -19, r: 6, fill: '#2b2b2b' }),
    E('circle', { cx: -10, cy: -22, r: 2, fill: '#fff' }), E('circle', { cx: 14, cy: -22, r: 2, fill: '#fff' }),
    E('path', { d: 'M-6 -8 L6 -8 L0 2Z', fill: '#ffa94d' }),
    E('path', { d: 'M-14 40 l-4 6 M-10 40 l0 7 M-6 40 l4 6 M6 40 l-4 6 M10 40 l0 7 M14 40 l4 6', stroke: '#ffa94d', 'stroke-width': 3, 'stroke-linecap': 'round' }));
  return g;
}

// 말풍선 옆에 쓰는 작은 부엉이 얼굴
export function owlAvatar() {
  const svg = E('svg', { viewBox: '-38 -56 76 76', class: 'owl-avatar', 'aria-hidden': 'true' });
  svg.appendChild(owl('happy'));
  return svg;
}

function thought(x, y, text) {
  return G({},
    E('circle', { cx: x - 22, cy: y + 34, r: 4, fill: '#fff' }),
    E('circle', { cx: x - 12, cy: y + 22, r: 7, fill: '#fff' }),
    E('ellipse', { cx: x + 8, cy: y, rx: 22, ry: 18, fill: '#fff' }),
    T(x + 8, y + 8, text, { 'font-size': 22, fill: '#6d5efc' }));
}

function castMember(member, p) {
  const left = member.side !== 'right';
  const x = left ? 62 : W - 62;
  if (member.who === 'owl') {
    const g = G({ transform: `translate(${x} ${246 - 4}) scale(${left ? 1 : -1} 1)` }, owl(member.mood));
    const out = G({}, g);
    if (member.mood === 'think') out.appendChild(thought(x + (left ? 40 : -40), 150, '?'));
    if (member.mood === 'wow') out.appendChild(T(x + (left ? 42 : -42), 176, '!', { 'font-size': 30, fill: '#6d5efc' }));
    return out;
  }
  const out = G({ transform: `translate(${x} 232)` }, kid(member.who, member.mood, p));
  if (member.mood === 'think') return G({}, out, thought(x + (left ? 40 : -40), 150, '?'));
  return out;
}

function peopleGroup(spec, p) {
  const n = spec.people;
  const each = spec.each || 0;
  const types = ['girl', 'boy', 'kid2', 'kid'];
  const cellW = Math.max(64, each ? Math.min(each, 4) * 22 + 16 : 64);
  const g = G({});
  for (let i = 0; i < n; i++) {
    const cx = i * cellW + cellW / 2;
    g.appendChild(G({ transform: `translate(${cx} 60) scale(0.78)` }, kid(types[i % types.length], spec.mood || 'happy', p)));
    if (each) {
      const cols = Math.min(each, 4);
      for (let k = 0; k < each; k++) {
        const c = k % cols; const r = Math.floor(k / cols);
        g.appendChild(G({ transform: `translate(${cx - ((cols - 1) * 22) / 2 + c * 22} ${118 + r * 22}) scale(0.78)` }, object(spec.obj, p, k, spec.color)));
      }
    }
  }
  const rows = each ? Math.ceil(each / 4) : 0;
  return { node: g, w: n * cellW, h: 108 + rows * 22 };
}

function pizzaGroup(spec) {
  const r = 70; const n = spec.pizza;
  const g = G({ transform: `translate(${r + 6} ${r + 6})` });
  g.appendChild(E('circle', { r: r + 5, fill: '#e3a857', stroke: '#b07a3a', 'stroke-width': 2 }));
  const pt = (deg) => { const a = ((deg - 90) * Math.PI) / 180; return `${(r * Math.cos(a)).toFixed(2)} ${(r * Math.sin(a)).toFixed(2)}`; };
  for (let i = 0; i < n; i++) {
    const a0 = (360 * i) / n; const a1 = (360 * (i + 1)) / n;
    const eaten = i < (spec.filled || 0) ? 'a' : i < (spec.filled || 0) + (spec.filled2 || 0) ? 'b' : '';
    g.appendChild(E('path', {
      d: `M0 0 L${pt(a0)} A${r} ${r} 0 0 1 ${pt(a1)}Z`,
      fill: eaten === 'a' ? '#ffd166' : eaten === 'b' ? '#9ad0f5' : '#ffeccc', stroke: '#c9813a', 'stroke-width': 2,
    }));
    if (!eaten) {
      const mid = ((a0 + a1) / 2 - 90) * (Math.PI / 180);
      g.appendChild(E('circle', { cx: (r * 0.6 * Math.cos(mid)).toFixed(1), cy: (r * 0.6 * Math.sin(mid)).toFixed(1), r: 6, fill: '#d84b3c' }));
    }
  }
  return { node: g, w: 2 * r + 12, h: 2 * r + 12 };
}

function barGroup(spec) {
  const cw = 28; const n = spec.bar;
  const g = G({});
  for (let i = 0; i < n; i++) {
    const fill = i < (spec.filled || 0) ? '#ffd166' : i < (spec.filled || 0) + (spec.filled2 || 0) ? '#9ad0f5' : '#fff';
    g.appendChild(E('rect', { x: i * cw, y: 0, width: cw, height: 44, fill, stroke: '#8a5a2b', 'stroke-width': 2 }));
  }
  return { node: g, w: n * cw, h: 44 };
}

function tokensGroup(spec) {
  const g = G({});
  spec.tokens.forEach((t, i) => {
    g.append(E('rect', { x: i * 52, y: 0, width: 44, height: 50, rx: 8, fill: '#fffbe6', stroke: '#c98a45', 'stroke-width': 2 }),
      T(i * 52 + 22, 34, t, { 'font-size': 24, fill: '#3b2400' }));
  });
  return { node: g, w: spec.tokens.length * 52 - 8, h: 50 };
}

function vehicleGroup(spec) {
  const tram = spec.vehicle === 'tram';
  const body = tram ? '#4caf50' : '#ffb300';
  const g = G({},
    tram ? E('path', { d: 'M60 -12 L60 0 M50 -12 H70', stroke: '#555', 'stroke-width': 2 }) : null,
    E('rect', { x: 0, y: 0, width: 120, height: 56, rx: 12, fill: body, stroke: '#00000040', 'stroke-width': 2 }),
    ...[12, 42, 72].map((x) => E('rect', { x, y: 10, width: 24, height: 18, rx: 3, fill: '#d6f0ff', stroke: '#fff', 'stroke-width': 2 })),
    E('rect', { x: 100, y: 10, width: 14, height: 34, rx: 3, fill: '#d6f0ff', stroke: '#fff', 'stroke-width': 2 }),
    E('circle', { cx: 28, cy: 58, r: 10, fill: '#333' }), E('circle', { cx: 92, cy: 58, r: 10, fill: '#333' }),
    E('circle', { cx: 28, cy: 58, r: 4, fill: '#aaa' }), E('circle', { cx: 92, cy: 58, r: 4, fill: '#aaa' }));
  return { node: g, w: 124, h: 70 };
}

function build(spec, p) {
  let res;
  if (spec.sep) res = sepGroup(spec.sep);
  else if (spec.stack || spec.row) {
    const parts = (spec.stack || spec.row).map((s) => build(s, p));
    const g = G({});
    const vertical = Boolean(spec.stack);
    const gap = spec.gap ?? 10;
    const W2 = vertical ? Math.max(...parts.map((q) => q.w)) : parts.reduce((a, q) => a + q.w, 0) + gap * (parts.length - 1);
    const H2 = vertical ? parts.reduce((a, q) => a + q.h, 0) + gap * (parts.length - 1) : Math.max(...parts.map((q) => q.h));
    let off = 0;
    for (const q of parts) {
      const x = vertical ? (W2 - q.w) / 2 : off;
      const y = vertical ? off : (H2 - q.h) / 2;
      g.appendChild(G({ transform: `translate(${x} ${y})` }, q.node));
      off += (vertical ? q.h : q.w) + gap;
    }
    res = { node: g, w: W2, h: H2 };
  } else if (spec.people) res = peopleGroup(spec, p);
  else if (spec.pizza) res = pizzaGroup(spec);
  else if (spec.bar) res = barGroup(spec);
  else if (spec.tokens) res = tokensGroup(spec);
  else if (spec.vehicle) res = vehicleGroup(spec);
  else res = itemsGroup(spec, p);
  if (spec.label) {
    const g = G({}, res.node,
      E('rect', { x: res.w / 2 - 34, y: res.h + 6, width: 68, height: 22, rx: 11, fill: '#efedff' }),
      T(res.w / 2, res.h + 22, spec.label, { 'font-size': 13, fill: '#4b3fd1' }));
    res = { node: g, w: Math.max(res.w, 68), h: res.h + 30 };
  }
  return res;
}

export function renderArt(art) {
  const p = `cm${++uid}-`;
  const svg = E('svg', { viewBox: `0 0 ${W} ${H}`, class: 'comic-svg', role: 'img', 'aria-hidden': 'true' });
  svg.appendChild(makeDefs(p));
  svg.appendChild(background(art.bg || 'room', p));

  const cast = art.cast || [];
  const onBoard = art.bg === 'class';
  const left = onBoard ? 84 : cast.some((c) => c.side !== 'right') ? 120 : 20;
  const right = onBoard ? W - 84 : cast.some((c) => c.side === 'right') ? W - 120 : W - 20;
  const top = art.title ? 52 : art.bg === 'class' ? 40 : 18;
  const bottom = (art.bg || 'room') === 'room' ? 214 : art.bg === 'class' ? 168 : 250;

  const parts = (art.groups || []).map((s) => build(s, p));
  const gap = 14;
  const totalW = parts.reduce((a, q) => a + q.w, 0) + gap * Math.max(0, parts.length - 1);
  const maxH = Math.max(1, ...parts.map((q) => q.h));
  const scale = Math.min(1.35, (right - left) / Math.max(totalW, 1), (bottom - top) / maxH);
  const content = G({ transform: `translate(${(left + right) / 2 - (totalW * scale) / 2} ${bottom - maxH * scale}) scale(${scale})` });
  let x = 0;
  for (const q of parts) {
    // 바닥(탁자)에 맞춰 놓는다. 기호는 가운데에 띄운다.
    const y = q.h <= 34 ? (maxH - q.h) / 2 : maxH - q.h;
    content.appendChild(G({ transform: `translate(${x} ${y})` }, q.node));
    x += q.w + gap;
  }
  svg.appendChild(content);
  cast.forEach((c) => svg.appendChild(castMember(c, p)));

  if (art.title) {
    const tw = Math.max(120, art.title.length * 17 + 40);
    svg.append(
      E('rect', { x: W / 2 - tw / 2, y: 10, width: tw, height: 32, rx: 16, fill: '#fff', filter: `url(#${p}shadow)` }),
      T(W / 2, 32, art.title, { 'font-size': 16, fill: '#2b2350' }));
  }
  return svg;
}
