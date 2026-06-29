"use strict";

const COLORS = {
  red: { name: "珊瑚", hex: "#ff6f7d", face: "><" },
  amber: { name: "蜜橙", hex: "#ffbd71", face: "⌣" },
  mint: { name: "薄荷", hex: "#43d7c4", face: "•ᴗ•" },
  blue: { name: "泪蓝", hex: "#68bbed", face: "T T" },
  violet: { name: "梦紫", hex: "#8278e8", face: "– –" },
  lime: { name: "青柠", hex: "#9ad96b", face: "?" },
  pink: { name: "桃粉", hex: "#ff86c8", face: "o.o" },
};

const PIECE_COLORS = {
  cream: "rgba(255, 243, 148, 0.68)",
  rose: "rgba(255, 145, 188, 0.64)",
  mint: "rgba(166, 247, 188, 0.62)",
  sky: "rgba(148, 215, 255, 0.64)",
  lilac: "rgba(185, 169, 255, 0.64)",
  peach: "rgba(255, 185, 134, 0.66)",
};

const COLOR_KEYS = Object.keys(COLORS);
const PIECE_COLOR_KEYS = Object.keys(PIECE_COLORS);
const BASE_SHAPES = ["orbit"];
const SPECIAL_SHAPES = [];
const SHAPES = [...BASE_SHAPES, ...SPECIAL_SHAPES];
const BEAD_SPOTS = [[31, 36], [53, 58], [73, 37], [37, 70], [64, 28], [79, 66]];
const SCREW_SPOTS = [[24, 25], [76, 73], [54, 18], [26, 74]];
const MOTIONS = ["fall", "spin", "swingL", "swingR", "dropSpin"];
const ENDLESS_START_LEVEL = 8;
const HARD_FAIL_START_LEVEL = 9;
const CENTER_PLAY_SCALE = 1.18;
const SHAPE_POLYGONS = {
  cloud: [[16, 47], [25, 26], [45, 18], [65, 23], [83, 41], [82, 65], [63, 82], [37, 79], [18, 63]],
  petal: [[18, 54], [30, 25], [57, 9], [84, 33], [77, 65], [52, 90], [27, 78]],
  drop: [[50, 8], [78, 25], [88, 55], [69, 84], [38, 89], [15, 65], [22, 33]],
  orbit: [[18, 48], [31, 24], [57, 18], [80, 35], [83, 62], [64, 82], [36, 79], [16, 61]],
  ribbon: [[12, 28], [40, 18], [61, 34], [88, 26], [75, 70], [50, 84], [25, 70]],
  moon: [[28, 10], [54, 8], [76, 23], [86, 49], [76, 75], [54, 91], [26, 88], [42, 69], [47, 50], [41, 31]],
  butterfly: [[50, 20], [65, 5], [90, 19], [84, 51], [67, 58], [83, 83], [55, 89], [50, 66], [45, 89], [17, 83], [33, 58], [16, 51], [10, 19], [35, 5]],
  fish: [[12, 50], [28, 31], [58, 20], [86, 34], [96, 50], [86, 66], [58, 80], [28, 69]],
  crown: [[9, 78], [15, 28], [35, 55], [50, 15], [65, 55], [85, 28], [91, 78], [67, 88], [33, 88]],
  gem: [[50, 8], [80, 24], [92, 51], [75, 80], [44, 91], [17, 72], [9, 42], [25, 16]],
  shell: [[18, 47], [27, 23], [49, 11], [73, 23], [87, 49], [80, 74], [55, 89], [29, 80]],
};
const SHAPE_AREA_SCALE = 0.012;
const PATTERN_THEMES = ["moon", "flower", "butterfly", "fish", "crown"];
const LEVEL_CACHE = new Map();

function mulberry32(seed) {
  return function rnd() {
    seed |= 0;
    seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function pickFrom(list, rnd) {
  return list[Math.floor(rnd() * list.length) % list.length];
}

function jitter(v, amount, rnd, min, max) {
  return Math.max(min, Math.min(max, v + (rnd() - 0.5) * amount));
}

function shuffle(list, rnd) {
  const arr = list.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeAngle(deg) {
  return ((deg + 180) % 360 + 360) % 360 - 180;
}

function machineMetrics() {
  const rect = $("machine")?.getBoundingClientRect();
  const width = Math.max(rect?.width || 0, 1);
  const height = Math.max(rect?.height || 0, 1);
  return { width, height };
}

function pieceLocalVectorToPixels(piece, from, to) {
  const { width, height } = machineMetrics();
  return {
    x: (to.x - from.x) / 100 * piece.w / 100 * width,
    y: (to.y - from.y) / 100 * piece.h / 100 * height,
  };
}

function pixelsToMachinePercent(point) {
  const { width, height } = machineMetrics();
  return {
    x: point.x / width * 100,
    y: point.y / height * 100,
  };
}

function machinePercentToPixels(point) {
  const { width, height } = machineMetrics();
  return {
    x: point.x / 100 * width,
    y: point.y / 100 * height,
  };
}

function viewportPointToMachinePercent(point) {
  const rect = $("machine")?.getBoundingClientRect();
  const width = Math.max(rect?.width || 0, 1);
  const height = Math.max(rect?.height || 0, 1);
  return {
    x: (point.x - (rect?.left || 0)) / width * 100,
    y: (point.y - (rect?.top || 0)) / height * 100,
  };
}

function rotatePoint(point, deg) {
  const theta = deg * Math.PI / 180;
  return {
    x: point.x * Math.cos(theta) - point.y * Math.sin(theta),
    y: point.x * Math.sin(theta) + point.y * Math.cos(theta),
  };
}

function polygonMetrics(points) {
  let area2 = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    const cross = x1 * y2 - x2 * y1;
    area2 += cross;
    cx += (x1 + x2) * cross;
    cy += (y1 + y2) * cross;
  }
  if (Math.abs(area2) < 0.001) return { x: 50, y: 50, area: 1 };
  return {
    x: cx / (3 * area2),
    y: cy / (3 * area2),
    area: Math.abs(area2) / 2,
  };
}

function pointInPolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const crosses = (yi > point.y) !== (yj > point.y)
      && point.x < (xj - xi) * (point.y - yi) / ((yj - yi) || 0.0001) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

function countColor(list, color) {
  return list.reduce((sum, item) => sum + (item === color ? 1 : 0), 0);
}

function directTripleColor(colors) {
  for (const color of new Set(colors)) {
    if (countColor(colors, color) >= 3) return color;
  }
  return null;
}

function beadCaps(pieceCount, totalBeads, rnd, maxPerPiece = 5) {
  const caps = Array.from({ length: pieceCount }, () => 2);
  const safeTotal = clamp(totalBeads, pieceCount * 2, pieceCount * maxPerPiece);
  let left = Math.max(0, safeTotal - pieceCount * 2);
  while (left > 0) {
    let changed = false;
    for (const i of shuffle([...caps.keys()], rnd)) {
      if (left <= 0) break;
      if (caps[i] >= maxPerPiece) continue;
      caps[i] += 1;
      left -= 1;
      changed = true;
    }
    if (!changed) break;
  }
  return caps;
}

function trayCapacity(levelNo) {
  if (levelNo < ENDLESS_START_LEVEL) return Math.max(5, 8 - Math.floor(levelNo / 3));
  if (levelNo < HARD_FAIL_START_LEVEL) return 5;
  return Math.max(4, 5 - Math.floor((levelNo - HARD_FAIL_START_LEVEL) / 6));
}

function targetCopies(levelNo, rnd) {
  if (levelNo < HARD_FAIL_START_LEVEL) return 1 + (levelNo >= 8 && rnd() > 0.62 ? 1 : 0);
  const pressure = Math.floor((levelNo - HARD_FAIL_START_LEVEL) / 4);
  return 1 + Math.min(2, pressure) + (rnd() > 0.68 ? 1 : 0);
}

function distractorCountFor(levelNo, pieceCount, targetPoolSize, capacity, rnd) {
  const base = Math.floor(pieceCount * (levelNo >= HARD_FAIL_START_LEVEL ? 1.0 : 0.55));
  const extra = levelNo > 3 ? Math.floor(rnd() * 2) : 0;
  const hardExtra = levelNo >= HARD_FAIL_START_LEVEL
    ? Math.floor((levelNo - HARD_FAIL_START_LEVEL) / 2) + Math.floor(rnd() * 3)
    : 0;
  const failPressure = levelNo >= HARD_FAIL_START_LEVEL ? Math.max(1, capacity - 3) : 0;
  return Math.max(1, base + extra + hardExtra + failPressure - Math.floor(targetPoolSize / 12));
}

function distributeBeads(beadPool, caps, rnd) {
  const byPiece = caps.map(() => []);
  for (const color of shuffle(beadPool, rnd)) {
    const open = byPiece.map((_, i) => i).filter((i) => byPiece[i].length < caps[i]);
    const safe = open.filter((i) => countColor(byPiece[i], color) < 2);
    const options = shuffle(safe.length ? safe : open, rnd);
    options.sort((a, b) => {
      const colorBias = countColor(byPiece[a], color) - countColor(byPiece[b], color);
      if (colorBias !== 0) return colorBias;
      return byPiece[a].length - byPiece[b].length;
    });
    byPiece[options[0]].push(color);
  }
  return byPiece;
}

function softenDirectTriples(beadsByPiece) {
  for (let pass = 0; pass < 32; pass++) {
    let changed = false;
    for (let i = 0; i < beadsByPiece.length; i++) {
      const colors = beadsByPiece[i];
      const hot = directTripleColor(colors);
      if (!hot) continue;
      const hotIndex = colors.indexOf(hot);
      let fixed = false;
      for (let j = 0; j < beadsByPiece.length && !fixed; j++) {
        if (i === j) continue;
        const other = beadsByPiece[j];
        for (let k = 0; k < other.length; k++) {
          if (other[k] === hot) continue;
          [colors[hotIndex], other[k]] = [other[k], colors[hotIndex]];
          if (!directTripleColor(colors) && !directTripleColor(other)) {
            changed = true;
            fixed = true;
            break;
          }
          [colors[hotIndex], other[k]] = [other[k], colors[hotIndex]];
        }
      }
    }
    if (!changed) return;
  }
}

function generatedLayout(count, rnd, levelNo) {
  const base = [
    [38, 38, 42, 27, -16], [62, 43, 39, 29, 18], [46, 62, 45, 26, 8],
    [68, 64, 34, 30, -28], [29, 60, 34, 29, 25], [51, 35, 32, 30, -4],
  ];
  const overlap = clamp((levelNo - 3) / 9, 0, 1);
  return base.slice(0, count).map(([x, y, w, h, rot]) => ({
    x: jitter(x + (52 - x) * overlap * 0.55, 8 - overlap * 3, rnd, 24, 76),
    y: jitter(y + (51 - y) * overlap * 0.50, 8 - overlap * 3, rnd, 28, 70),
    w: jitter(w + overlap * 7, 8, rnd, 31, 54),
    h: jitter(h + overlap * 5, 6, rnd, 23, 39),
    rot: jitter(rot + (rnd() - 0.5) * overlap * 26, 16 + overlap * 10, rnd, -38, 38),
  }));
}

function chooseShape() {
  return "orbit";
}

function generateLevel(index) {
  const n = index + 1;
  const rnd = mulberry32(0xC0FFEE + n * 9973);
  const pieceCount = Math.min(6, 3 + Math.floor((n - 1) / 2));
  const targetCount = Math.min(4, 2 + Math.floor((n - 1) / 3));
  const capacity = trayCapacity(n);
  const hardMode = n >= HARD_FAIL_START_LEVEL;
  const maxBeadsPerPiece = hardMode ? 6 : 5;
  const targetColors = [];
  const offset = Math.floor(rnd() * COLOR_KEYS.length);
  while (targetColors.length < targetCount) {
    targetColors.push(COLOR_KEYS[(offset + targetColors.length * 2) % COLOR_KEYS.length]);
  }

  const targets = {};
  for (const c of targetColors) targets[c] = targetCopies(n, rnd);
  const maxTargetCopies = Math.floor((pieceCount * maxBeadsPerPiece) / 3);
  while (Object.values(targets).reduce((sum, count) => sum + count, 0) > maxTargetCopies) {
    const reducible = targetColors.filter((c) => targets[c] > 1);
    if (!reducible.length) break;
    targets[pickFrom(reducible, rnd)] -= 1;
  }
  const targetPool = Object.entries(targets).flatMap(([color, count]) => Array.from({ length: count * 3 }, () => color));
  const distractorColors = COLOR_KEYS.filter((c) => !targetColors.includes(c));
  const distractorCount = distractorCountFor(n, pieceCount, targetPool.length, capacity, rnd);
  let totalBeads = clamp(targetPool.length + distractorCount, pieceCount * 2, pieceCount * maxBeadsPerPiece);
  if (totalBeads === pieceCount * 3 && totalBeads < pieceCount * maxBeadsPerPiece) totalBeads += 1;
  const beadPool = shuffle([
    ...targetPool,
    ...Array.from({ length: Math.max(0, totalBeads - targetPool.length) }, () => pickFrom(distractorColors, rnd)),
  ], rnd);
  const beadsByPiece = distributeBeads(beadPool, beadCaps(pieceCount, beadPool.length, rnd, maxBeadsPerPiece), rnd);
  softenDirectTriples(beadsByPiece);

  const layout = generatedLayout(pieceCount, rnd, n);
  const names = ["月芽糖", "水母薄片", "橙光贝", "蓝泪羽", "桃心云", "青柠星", "珊瑚泡", "月弧片", "蝶翼片", "锦鱼片", "小皇冠", "梦紫扰流"];
  const pieces = layout.map((l, i) => {
    const colors = beadsByPiece[i];
    const screwCount = Math.min(4, 2 + (n > 2 && rnd() > 0.45 ? 1 : 0) + (n > 6 && rnd() > 0.65 ? 1 : 0));
    const spots = BEAD_SPOTS.slice().sort(() => rnd() - 0.5);
    const screwSpots = SCREW_SPOTS.slice().sort(() => rnd() - 0.5);
    const shape = chooseShape(n, i, rnd);
    return piece(`p${i + 1}`, names[(i + n) % names.length], shape,
      PIECE_COLOR_KEYS[(i + n) % PIECE_COLOR_KEYS.length], l.x, l.y, l.w, l.h, l.rot,
      spots.slice(0, colors.length).map(([x, y], bi) => bead(colors[bi], jitter(x, 7, rnd, 18, 82), jitter(y, 7, rnd, 18, 82))),
      screwSpots.slice(0, screwCount).map(([x, y], si) => screw(`p${i + 1}-${si + 1}`, jitter(x, 7, rnd, 16, 84), jitter(y, 7, rnd, 16, 84))),
      MOTIONS[(i + n + Math.floor(rnd() * MOTIONS.length)) % MOTIONS.length]);
  });

  return {
    name: `${String(n).padStart(2, "0")} ${n >= ENDLESS_START_LEVEL ? "无限关卡" : "生成关卡"} · ${pieceCount}片${hardMode ? "险局" : "拓扑"}`,
    capacity,
    endless: n >= ENDLESS_START_LEVEL,
    hardMode,
    pattern: PATTERN_THEMES[(n - 1) % PATTERN_THEMES.length],
    targets,
    pieces,
  };
}

function getLevel(index) {
  const safeIndex = Math.max(0, index);
  if (!LEVEL_CACHE.has(safeIndex)) LEVEL_CACHE.set(safeIndex, generateLevel(safeIndex));
  return LEVEL_CACHE.get(safeIndex);
}

function piece(id, name, shape, color, x, y, w, h, rot, beads, screws, motion = "fall") {
  return { id, name, shape, color, x, y, w, h, rot, beads, screws, motion };
}
function bead(color, x, y) { return { color, x, y }; }
function screw(id, x, y) { return { id, x, y }; }

const S = {
  level: 0,
  pieces: [],
  tray: [],
  done: {},
  moves: 0,
  busy: false,
  ended: false,
  nextScrew: null,
  sound: true,
};

const $ = (id) => document.getElementById(id);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let audioCtx = null;
function tone(freq, dur, type = "sine", vol = 0.06, when = 0) {
  if (!S.sound) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const t = audioCtx.currentTime + when;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.03);
  } catch {}
}

function sfx(kind) {
  if (kind === "pin") {
    tone(190, 0.08, "triangle", 0.04);
    tone(460, 0.09, "triangle", 0.04, 0.05);
  } else if (kind === "release") {
    [520, 640, 780].forEach((f, i) => tone(f, 0.12, "sine", 0.045, i * 0.06));
  } else if (kind === "bead") {
    tone(540, 0.08, "sine", 0.035);
  } else if (kind === "match") {
    [620, 780, 1040].forEach((f, i) => tone(f, 0.12, "triangle", 0.06, i * 0.05));
  } else if (kind === "bad") {
    tone(150, 0.12, "square", 0.045);
  } else if (kind === "win") {
    [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.2, "sine", 0.06, i * 0.07));
  }
}

function setupBackdrop() {
  const cv = $("backdrop");
  const cx = cv.getContext("2d");
  let motes = [];
  function reset() {
    cv.width = innerWidth;
    cv.height = innerHeight;
    const keys = Object.keys(COLORS);
    motes = Array.from({ length: 58 }, () => ({
      x: Math.random() * cv.width,
      y: Math.random() * cv.height,
      r: 1.5 + Math.random() * 4,
      c: COLORS[keys[(Math.random() * keys.length) | 0]].hex,
      p: Math.random() * Math.PI * 2,
      s: 0.3 + Math.random() * 0.9,
    }));
  }
  reset();
  addEventListener("resize", reset);
  (function frame(t) {
    cx.clearRect(0, 0, cv.width, cv.height);
    for (const b of motes) {
      const y = b.y + Math.sin(t * 0.0006 * b.s + b.p) * 10;
      cx.globalAlpha = 0.12 + 0.20 * Math.sin(t * 0.0008 * b.s + b.p) ** 2;
      cx.fillStyle = b.c;
      cx.beginPath();
      cx.arc(b.x, y, b.r, 0, Math.PI * 2);
      cx.fill();
    }
    requestAnimationFrame(frame);
  })(0);
}

function currentLevel() { return getLevel(S.level); }

function clonePieces(level) {
  return level.pieces.map((p) => ({
    ...p,
    w: p.w * CENTER_PLAY_SCALE,
    h: p.h * CENTER_PLAY_SCALE,
    beads: p.beads.map((b) => ({ ...b })),
    screws: p.screws.map((s) => ({ ...s, removed: false })),
    physics: defaultPhysics(),
    lastAnchor: null,
    lastRemovedScrew: null,
    animToken: 0,
    anchorGlobals: {},
    released: false,
    releasing: false,
  }));
}

function defaultPhysics() {
  return {
    x: 0,
    y: 0,
    rot: 0,
    pivotX: 50,
    pivotY: 50,
    anchorX: null,
    anchorY: null,
    comX: 50,
    comY: 50,
    torque: 0,
    driftX: 0,
    releaseSpin: 0,
    wobble: 1,
    state: "stable",
  };
}

function pieceCenterOfMass(piece) {
  const polygon = SHAPE_POLYGONS[piece.shape] || SHAPE_POLYGONS.orbit;
  const body = polygonMetrics(polygon);
  return { x: body.x, y: body.y, mass: body.area * SHAPE_AREA_SCALE };
}

function localVectorToWorld(piece, from, to, extraRot = 0) {
  return pixelsToMachinePercent(rotatePoint(pieceLocalVectorToPixels(piece, from, to), piece.rot + extraRot));
}

function gravityTorque(piece, pivot, com, extraRot = 0) {
  return localVectorToWorld(piece, pivot, com, extraRot).x;
}

function baseAnchorGlobal(piece, pivot) {
  const rest = localVectorToWorld(piece, { x: 50, y: 50 }, pivot, 0);
  return {
    x: piece.x + rest.x,
    y: piece.y + rest.y,
  };
}

function centerShiftForPinnedRotation(piece, pivot, rotDelta = 0, anchorGlobal = null) {
  const anchor = anchorGlobal || baseAnchorGlobal(piece, pivot);
  const live = localVectorToWorld(piece, { x: 50, y: 50 }, pivot, rotDelta);
  return {
    x: anchor.x - piece.x - live.x,
    y: anchor.y - piece.y - live.y,
  };
}

function equilibriumRotationDelta(piece, pivot, com) {
  const { x: dx, y: dy } = pieceLocalVectorToPixels(piece, pivot, com);
  if (Math.hypot(dx, dy) < 0.001) return 0;
  const equilibrium = Math.atan2(dx, dy) * 180 / Math.PI;
  return normalizeAngle(equilibrium - piece.rot);
}

function averagePoint(points) {
  return {
    x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
    y: points.reduce((sum, p) => sum + p.y, 0) / points.length,
  };
}

function supportLineInfo(piece, anchors, com) {
  if (anchors.length !== 2) return null;
  const [a, b] = anchors;
  const { x: vx, y: vy } = pieceLocalVectorToPixels(piece, a, b);
  const { x: wx, y: wy } = pieceLocalVectorToPixels(piece, a, com);
  const len2 = vx * vx + vy * vy;
  if (len2 < 0.001) return null;
  const t = (wx * vx + wy * vy) / len2;
  return {
    t,
    outside: Math.max(-t, t - 1, 0),
    nearest: t < 0 ? a : (t > 1 ? b : null),
  };
}

function applyPiecePhysics(piece) {
  const remaining = piece.screws.filter((s) => !s.removed);
  const removedCount = piece.screws.length - remaining.length;
  const com = pieceCenterOfMass(piece);
  const physics = defaultPhysics();
  physics.comX = com.x;
  physics.comY = com.y;

  if (remaining.length === 1) {
    const anchor = remaining[0];
    const anchorGlobal = piece.anchorGlobals?.[anchor.id] || baseAnchorGlobal(piece, anchor);
    const torque = gravityTorque(piece, anchor, com);
    const desired = equilibriumRotationDelta(piece, anchor, com);
    const fallRot = clamp(desired * 0.84, -52, 52);
    const centerShift = centerShiftForPinnedRotation(piece, anchor, fallRot, anchorGlobal);
    physics.pivotX = anchor.x;
    physics.pivotY = anchor.y;
    physics.anchorX = anchorGlobal.x;
    physics.anchorY = anchorGlobal.y;
    physics.rot = fallRot;
    physics.x = centerShift.x;
    physics.y = centerShift.y;
    physics.torque = torque;
    physics.driftX = clamp(torque * 1.05, -18, 18);
    physics.releaseSpin = clamp(physics.rot * 1.8 + torque * 5.2, -190, 190);
    physics.wobble = clamp(Math.abs(torque) * 0.10, 0.8, 2.8);
    physics.state = "loose";
    piece.lastAnchor = { x: anchor.x, y: anchor.y };
    piece.lastTorque = torque;
    piece.lastCom = { x: com.x, y: com.y };
  } else if (remaining.length > 1 && removedCount > 0) {
    const support = averagePoint(remaining);
    const line = supportLineInfo(piece, remaining, com);
    const pivot = line?.nearest || support;
    const anchorGlobal = line?.nearest
      ? (piece.anchorGlobals?.[pivot.id] || baseAnchorGlobal(piece, pivot))
      : baseAnchorGlobal(piece, pivot);
    const torque = gravityTorque(piece, pivot, com);
    physics.pivotX = pivot.x;
    physics.pivotY = pivot.y;
    physics.anchorX = anchorGlobal.x;
    physics.anchorY = anchorGlobal.y;
    physics.torque = torque;
    physics.wobble = clamp(Math.abs(torque) * 0.035, 0.35, 1.4);
    if (line?.nearest && line.outside > 0.10) {
      physics.rot = clamp(equilibriumRotationDelta(piece, pivot, com) * 0.12, -3.6, 3.6);
      const centerShift = centerShiftForPinnedRotation(piece, pivot, physics.rot, anchorGlobal);
      physics.x = centerShift.x;
      physics.y = centerShift.y;
    }
    physics.state = "held";
  } else if (remaining.length === 0 && removedCount > 0) {
    const prior = piece.physics || defaultPhysics();
    const pivot = piece.lastAnchor || piece.lastRemovedScrew || { x: 50, y: 50 };
    const torque = prior.torque || gravityTorque(piece, pivot, com, prior.rot || 0);
    const spinSign = Math.sign(torque || prior.rot || (com.x - pivot.x) || 1);
    physics.pivotX = pivot.x;
    physics.pivotY = pivot.y;
    physics.rot = prior.rot || clamp(equilibriumRotationDelta(piece, pivot, com) * 0.65, -38, 38);
    physics.x = prior.x || 0;
    physics.y = prior.y || 0;
    physics.torque = torque;
    physics.driftX = clamp((prior.driftX || torque * 0.95) + spinSign * 5, -22, 22);
    physics.releaseSpin = clamp((prior.releaseSpin || prior.rot * 2) + spinSign * (48 + Math.abs(torque) * 3.8), -220, 220);
    physics.wobble = prior.wobble || 1;
    physics.state = "free";
  }

  piece.physics = physics;
  if (remaining.length === 0) tuneReleaseMotion(piece);
}

function tuneReleaseMotion(piece) {
  const physics = piece.physics || defaultPhysics();
  const torque = physics.torque || piece.lastTorque || 0;
  if (Math.abs(torque) > 4.5) {
    piece.motion = torque < 0 ? "swingL" : "swingR";
  } else if (Math.abs(physics.releaseSpin || 0) > 120 || Math.abs(physics.rot || 0) > 18) {
    piece.motion = "dropSpin";
  } else {
    piece.motion = "fall";
  }
}

function piecePose(piece) {
  const physics = piece.physics || defaultPhysics();
  return {
    x: piece.x + (physics.x || 0),
    y: piece.y + (physics.y || 0),
    rot: piece.rot + (physics.rot || 0),
  };
}

function pieceLocalToGlobal(piece, local) {
  const pose = piecePose(piece);
  const rotated = rotatePoint(pieceLocalVectorToPixels(piece, { x: 50, y: 50 }, local), pose.rot);
  const offset = pixelsToMachinePercent(rotated);
  return {
    x: pose.x + offset.x,
    y: pose.y + offset.y,
  };
}

function clonePhysics(physics) {
  return { ...defaultPhysics(), ...(physics || {}) };
}

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

function physicsFrameForRot(piece, base, rot, animating) {
  const frame = clonePhysics(base);
  frame.rot = rot;
  frame.animating = animating;
  const pivot = { x: frame.pivotX, y: frame.pivotY };
  const anchor = frame.anchorX == null || frame.anchorY == null
    ? null
    : { x: frame.anchorX, y: frame.anchorY };
  const shift = centerShiftForPinnedRotation(piece, pivot, rot, anchor);
  frame.x = shift.x;
  frame.y = shift.y;
  return frame;
}

function pieceZ(index) {
  return 10 + index * 4;
}

function screwZ(index) {
  return pieceZ(index) + 2;
}

function updatePiecePoseElement(piece) {
  const el = document.querySelector(`[data-piece-id="${piece.id}"]`);
  if (!el) return;
  const physics = piece.physics || defaultPhysics();
  const liveRot = piece.rot + (physics.rot || 0);
  el.style.setProperty("--pose-x", `${piece.x + (physics.x || 0)}%`);
  el.style.setProperty("--pose-y", `${piece.y + (physics.y || 0)}%`);
  el.style.setProperty("--live-rot", `${liveRot}deg`);
  el.style.setProperty("--pivot-x", `${physics.pivotX ?? 50}%`);
  el.style.setProperty("--pivot-y", `${physics.pivotY ?? 50}%`);
  el.style.setProperty("--com-x", `${physics.comX ?? 50}%`);
  el.style.setProperty("--com-y", `${physics.comY ?? 50}%`);
}

function updateScrewPoseElements(piece) {
  for (const screw of piece.screws) {
    if (screw.removed) continue;
    const el = document.querySelector(`[data-screw-id="${screw.id}"]`);
    if (!el) continue;
    const pos = screwGlobalPosition(piece, screw);
    el.style.setProperty("--sx", `${pos.x}%`);
    el.style.setProperty("--sy", `${pos.y}%`);
  }
}

function updatePieceCoverageElements() {
  for (const [i, piece] of S.pieces.entries()) {
    const el = document.querySelector(`[data-piece-id="${piece.id}"]`);
    if (!el) continue;
    const covered = pieceCoveredByUpper(i);
    const baseAlpha = 0.84 + i * 0.035;
    el.classList.toggle("covered", covered);
    el.style.setProperty("--alpha", String(covered ? baseAlpha * 0.54 : baseAlpha));
  }
}

function playScrewPop(screwEl) {
  if (!screwEl) return;
  const rect = screwEl.getBoundingClientRect();
  const pop = document.createElement("span");
  pop.className = "screw screw-pop unscrewing";
  pop.style.left = `${rect.left + rect.width / 2}px`;
  pop.style.top = `${rect.top + rect.height / 2}px`;
  pop.style.width = `${rect.width}px`;
  pop.style.height = `${rect.height}px`;
  pop.style.setProperty("--pin", "rgba(255, 244, 198, 0.72)");
  document.body.appendChild(pop);
  setTimeout(() => pop.remove(), 560);
}

function visibleScrewGlobal(screw) {
  const el = document.querySelector(`[data-screw-id="${screw.id}"]`);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return viewportPointToMachinePercent({
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  });
}

function captureVisibleAnchorGlobals(piece, removedScrewId) {
  return Object.fromEntries(
    piece.screws
      .filter((s) => !s.removed && s.id !== removedScrewId)
      .map((s) => [s.id, visibleScrewGlobal(s) || pieceLocalToGlobal(piece, s)])
  );
}

function capturePieceAnimationPose(piece) {
  const current = clonePhysics(piece.physics);
  current.animating = false;
  piece.animToken = (piece.animToken || 0) + 1;
  piece.physics = current;
  updatePiecePoseElement(piece);
  return current;
}

function alignPhysicsToAnchor(piece, physics, anchorSource) {
  if (anchorSource.anchorX == null || anchorSource.anchorY == null) return physics;
  const frame = clonePhysics(physics);
  frame.pivotX = anchorSource.pivotX;
  frame.pivotY = anchorSource.pivotY;
  frame.anchorX = anchorSource.anchorX;
  frame.anchorY = anchorSource.anchorY;
  const pivot = { x: frame.pivotX, y: frame.pivotY };
  const anchor = { x: frame.anchorX, y: frame.anchorY };
  const shift = centerShiftForPinnedRotation(piece, pivot, frame.rot || 0, anchor);
  frame.x = shift.x;
  frame.y = shift.y;
  return frame;
}

function animatePiecePhysics(piece, before, after) {
  const target = clonePhysics(after);
  target.animating = false;
  const duration = target.state === "loose" ? 820 : (target.state === "held" ? 500 : 0);
  if (!duration) {
    piece.physics = target;
    renderPieces();
    renderScrews();
    return Promise.resolve();
  }

  const start = alignPhysicsToAnchor(piece, clonePhysics(before), target);
  start.animating = true;
  const startRot = start.rot || 0;
  const endRot = target.rot || 0;
  const amplitude = (target.state === "loose" ? 1.35 : 0.65) * (target.wobble || 1);
  const cycles = target.state === "loose" ? 2.15 : 1.45;

  return new Promise((resolve) => {
    const token = (piece.animToken || 0) + 1;
    piece.animToken = token;
    const el = document.querySelector(`[data-piece-id="${piece.id}"]`);
    el?.classList.remove("physics-stable", "physics-held", "physics-loose");
    el?.classList.add(`physics-${target.state}`, "physics-animating");
    piece.physics = start;
    updatePiecePoseElement(piece);
    updateScrewPoseElements(piece);
    const started = performance.now();
    let finished = false;
    let fallbackTimer = null;
    function finish() {
      if (finished) return;
      finished = true;
      if (fallbackTimer) clearTimeout(fallbackTimer);
      if (piece.animToken !== token) {
        resolve();
        return;
      }
      piece.physics = target;
      el?.classList.remove("physics-animating");
      updatePiecePoseElement(piece);
      updateScrewPoseElements(piece);
      updatePieceCoverageElements();
      renderScrews();
      resolve();
    }
    function frame(now) {
      if (finished) return;
      if (piece.animToken !== token) {
        finish();
        return;
      }
      const t = Math.min(1, (now - started) / duration);
      const eased = easeOutCubic(t);
      const ring = Math.sin(t * Math.PI * cycles) * (1 - t) * amplitude;
      const rot = startRot + (endRot - startRot) * eased + ring;
      piece.physics = physicsFrameForRot(piece, target, rot, t < 1);
      updatePiecePoseElement(piece);
      updateScrewPoseElements(piece);
      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        finish();
      }
    }
    fallbackTimer = setTimeout(finish, duration + 180);
    requestAnimationFrame(frame);
  });
}

function setInputLocked(locked) {
  S.busy = locked;
  $("app").classList.toggle("input-locked", locked);
  for (const id of ["btnPrev", "btnNext", "btnReset", "btnAdvance"]) {
    const btn = $(id);
    if (btn) btn.disabled = locked;
  }
  if (!locked) $("btnPrev").disabled = S.level <= 0;
}

function startLevel(idx) {
  S.level = Math.max(0, idx);
  const level = currentLevel();
  S.pieces = clonePieces(level);
  S.tray = [];
  S.done = Object.fromEntries(Object.keys(level.targets).map((key) => [key, 0]));
  S.moves = 0;
  setInputLocked(false);
  S.ended = false;
  S.nextScrew = null;
  $("btnAdvance").classList.remove("show");
  $("overlay").classList.remove("show");
  renderAll();
  setStatus("拆掉拼片上的所有钉子，释放豆子进拼豆盘");
}

function renderAll() {
  const level = currentLevel();
  $("levelName").textContent = level.name;
  $("modeChip").textContent = level.hardMode ? "险局" : (level.endless ? "无限" : "手动");
  $("modeChip").classList.toggle("auto", level.endless);
  $("moveNow").textContent = String(S.moves);
  $("trayMax").textContent = String(level.capacity);
  $("btnPrev").disabled = S.busy || S.level <= 0;
  $("btnNext").disabled = S.busy;
  $("btnReset").disabled = S.busy;
  renderGoals();
  renderPieces();
  renderScrews();
  renderTray();
  renderTrayPattern();
  updateProgressText();
}

function renderGoals() {
  const level = currentLevel();
  const goalList = $("goalList");
  goalList.innerHTML = "";
  for (const [color, need] of Object.entries(level.targets)) {
    const meta = COLORS[color];
    const done = S.done[color] || 0;
    const card = document.createElement("div");
    card.className = "goal-card" + (done >= need ? " done" : "");
    card.style.setProperty("--gc", meta.hex);
    card.innerHTML = `
      <div class="goal-name"><span class="goal-dot" style="--bc:${meta.hex}"></span><span>${meta.name}</span></div>
      <div class="goal-pips">${Array.from({ length: need }, (_, i) => `<span class="pip${i < done ? " on" : ""}"></span>`).join("")}</div>
    `;
    goalList.appendChild(card);
  }
}

function renderPieces() {
  const layer = $("pieceLayer");
  layer.innerHTML = "";
  for (const [i, p] of S.pieces.entries()) {
    const covered = pieceCoveredByUpper(i);
    const el = document.createElement("div");
    el.className = [
      "dream-piece",
      p.shape,
      covered ? "covered" : "",
      p.released ? "released" : "",
      p.physics?.state && !p.released ? `physics-${p.physics.state}` : "",
      p.physics?.animating ? "physics-animating" : "",
      p.releasing ? "releasing" : "",
      p.releasing ? `motion-${p.motion || "fall"}` : "",
      p.screws.some((s) => !s.removed && s.id === S.nextScrew) ? "hint" : "",
    ].filter(Boolean).join(" ");
    const physics = p.physics || defaultPhysics();
    const liveRot = p.rot + (physics.rot || 0);
    el.dataset.pieceId = p.id;
    el.style.setProperty("--x", `${p.x}%`);
    el.style.setProperty("--y", `${p.y}%`);
    el.style.setProperty("--pose-x", `${p.x + (physics.x || 0)}%`);
    el.style.setProperty("--pose-y", `${p.y + (physics.y || 0)}%`);
    el.style.setProperty("--w", `${p.w}%`);
    el.style.setProperty("--h", `${p.h}%`);
    el.style.setProperty("--rot", `${p.rot}deg`);
    el.style.setProperty("--live-rot", `${liveRot}deg`);
    el.style.setProperty("--pivot-x", `${physics.pivotX ?? 50}%`);
    el.style.setProperty("--pivot-y", `${physics.pivotY ?? 50}%`);
    el.style.setProperty("--com-x", `${physics.comX ?? 50}%`);
    el.style.setProperty("--com-y", `${physics.comY ?? 50}%`);
    el.style.setProperty("--drift-x", `${physics.driftX || 0}vw`);
    el.style.setProperty("--drift-mid", `${(physics.driftX || 0) * 0.35}vw`);
    el.style.setProperty("--release-spin", `${physics.releaseSpin || 0}deg`);
    el.style.setProperty("--wobble", `${physics.wobble || 1}deg`);
    el.style.setProperty("--pc", PIECE_COLORS[p.color]);
    el.style.setProperty("--z", String(pieceZ(i)));
    el.style.setProperty("--depth", String(8 + i * 4));
    const baseAlpha = 0.84 + i * 0.035;
    el.style.setProperty("--alpha", String(covered ? baseAlpha * 0.54 : baseAlpha));
    el.style.setProperty("--fall", `${38 + i * 9}vh`);
    const spin = (i % 2 ? -1 : 1) * (42 + i * 12);
    el.style.setProperty("--spin", `${spin}deg`);
    el.style.setProperty("--spin2", `${spin * 2.2}deg`);
    el.innerHTML = `<span class="piece-name">${p.name}</span>`;

    p.beads.forEach((b, i) => {
      const beadEl = document.createElement("span");
      beadEl.className = "bead";
      beadEl.dataset.beadIndex = String(i);
      beadEl.dataset.face = COLORS[b.color].face;
      beadEl.style.setProperty("--bc", COLORS[b.color].hex);
      beadEl.style.setProperty("--bx", `${b.x}%`);
      beadEl.style.setProperty("--by", `${b.y}%`);
      el.appendChild(beadEl);
    });

    layer.appendChild(el);
  }
  $("btnPrev").disabled = S.busy || S.level <= 0;
  $("btnNext").disabled = S.busy;
  $("btnReset").disabled = S.busy;
}

function screwGlobalPosition(piece, screw) {
  return pieceLocalToGlobal(piece, screw);
}

function pointInPiece(global, piece) {
  const pose = piecePose(piece);
  const delta = machinePercentToPixels({ x: global.x - pose.x, y: global.y - pose.y });
  const localDelta = rotatePoint(delta, -pose.rot);
  const { width, height } = machineMetrics();
  const pieceW = Math.max(piece.w / 100 * width, 1);
  const pieceH = Math.max(piece.h / 100 * height, 1);
  const local = {
    x: 50 + localDelta.x / pieceW * 100,
    y: 50 + localDelta.y / pieceH * 100,
  };
  return pointInPolygon(local, SHAPE_POLYGONS[piece.shape] || SHAPE_POLYGONS.orbit);
}

function screwBlocker(pieceIndex, screw) {
  const piece = S.pieces[pieceIndex];
  const global = screwGlobalPosition(piece, screw);
  for (let i = S.pieces.length - 1; i > pieceIndex; i--) {
    const upper = S.pieces[i];
    if (upper.released || upper.releasing) continue;
    if (pointInPiece(global, upper)) return upper;
  }
  return null;
}

function pieceCoveredByUpper(pieceIndex) {
  const piece = S.pieces[pieceIndex];
  if (!piece || piece.released || piece.releasing) return false;
  const com = pieceCenterOfMass(piece);
  const samples = [
    { x: 50, y: 50 },
    { x: com.x, y: com.y },
    ...piece.screws.filter((s) => !s.removed).map((s) => ({ x: s.x, y: s.y })),
    ...piece.beads.slice(0, 3).map((b) => ({ x: b.x, y: b.y })),
  ].map((local) => pieceLocalToGlobal(piece, local));

  for (let i = S.pieces.length - 1; i > pieceIndex; i--) {
    const upper = S.pieces[i];
    if (upper.released || upper.releasing) continue;
    if (samples.some((point) => pointInPiece(point, upper))) return true;
  }
  return false;
}

function renderScrews() {
  const layer = $("screwLayer");
  layer.innerHTML = "";
  for (const [i, p] of S.pieces.entries()) {
    if (p.released || p.releasing) continue;
    for (const s of p.screws) {
      if (s.removed) continue;
      const pos = screwGlobalPosition(p, s);
      const blocker = screwBlocker(i, s);
      const screwEl = document.createElement("button");
      screwEl.className = [
        "screw",
        blocker ? "blocked" : "",
        blocker ? "covered-screw" : "",
        s.id === S.nextScrew ? "next" : "",
      ].filter(Boolean).join(" ");
      screwEl.type = "button";
      screwEl.dataset.screwId = s.id;
      screwEl.dataset.pieceId = p.id;
      if (blocker) {
        screwEl.dataset.blockedBy = blocker.name;
        screwEl.dataset.blockedPieceId = blocker.id;
      }
      screwEl.style.setProperty("--sx", `${pos.x}%`);
      screwEl.style.setProperty("--sy", `${pos.y}%`);
      screwEl.style.setProperty("--pin", "rgba(255, 244, 198, 0.72)");
      screwEl.style.zIndex = String(screwZ(i));
      screwEl.disabled = S.busy || S.ended;
      screwEl.setAttribute("aria-label", blocker ? `${s.id} 被 ${blocker.name} 压住` : `拆钉 ${s.id}`);
      screwEl.addEventListener("pointerdown", onScrewPointerDown);
      screwEl.addEventListener("click", (event) => {
        if (event.detail === 0) onScrewTap(s.id);
      });
      layer.appendChild(screwEl);
    }
  }
}

function onScrewPointerDown(event) {
  if (event.button && event.button !== 0) return;
  event.preventDefault();
  onScrewTap(event.currentTarget.dataset.screwId);
}

function nearestScrewAt(clientX, clientY, radius = 30) {
  let best = null;
  for (const el of document.querySelectorAll(".screw:not(.screw-pop)")) {
    if (el.disabled) continue;
    const rect = el.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const d = Math.hypot(clientX - x, clientY - y);
    if (d > radius || (best && d >= best.d)) continue;
    best = { el, d };
  }
  return best?.el || null;
}

function onMachinePointerDown(event) {
  if (event.button && event.button !== 0) return;
  if (event.target.closest(".screw, button")) return;
  const screwEl = nearestScrewAt(event.clientX, event.clientY);
  if (!screwEl) return;
  event.preventDefault();
  onScrewTap(screwEl.dataset.screwId);
}

function renderTray() {
  const level = currentLevel();
  const tray = $("tray");
  tray.style.gridTemplateColumns = `repeat(${level.capacity}, minmax(0, 1fr))`;
  tray.innerHTML = "";
  for (let i = 0; i < level.capacity; i++) {
    const slot = document.createElement("div");
    slot.className = "tray-slot";
    slot.dataset.slot = String(i);
    const color = S.tray[i];
    if (color) {
      slot.innerHTML = `<span class="tray-bead" data-face="${COLORS[color].face}" style="--bc:${COLORS[color].hex}"></span>`;
    }
    tray.appendChild(slot);
  }
  $("trayNow").textContent = String(S.tray.length);
  $("trayState").textContent = `${S.tray.length}/${level.capacity}`;
  $("trayState").classList.toggle("danger", S.tray.length >= level.capacity - 1);
}

const PATTERN_LIBRARY = {
  moon: {
    points: [[24, 24], [38, 16], [57, 18], [72, 31], [77, 50], [69, 69], [52, 80], [34, 76], [45, 61], [51, 47], [44, 33]],
    links: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10], [10, 0]],
  },
  flower: {
    points: [[50, 18], [64, 32], [82, 42], [68, 57], [67, 78], [50, 68], [33, 78], [32, 57], [18, 42], [36, 32], [50, 45]],
    links: [[10, 0], [10, 1], [10, 2], [10, 3], [10, 4], [10, 5], [10, 6], [10, 7], [10, 8], [10, 9], [0, 1], [2, 3], [4, 5], [6, 7], [8, 9]],
  },
  butterfly: {
    points: [[50, 25], [36, 18], [18, 32], [28, 52], [18, 72], [39, 78], [50, 56], [61, 78], [82, 72], [72, 52], [82, 32], [64, 18]],
    links: [[0, 6], [6, 5], [5, 4], [4, 3], [3, 2], [2, 1], [1, 0], [6, 7], [7, 8], [8, 9], [9, 10], [10, 11], [11, 0], [3, 6], [9, 6]],
  },
  fish: {
    points: [[15, 50], [29, 34], [52, 26], [73, 32], [87, 50], [73, 68], [52, 74], [29, 66], [72, 50], [88, 35], [88, 65]],
    links: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 0], [4, 8], [8, 9], [8, 10], [9, 10]],
  },
  crown: {
    points: [[12, 74], [18, 28], [36, 56], [50, 18], [64, 56], [82, 28], [88, 74], [65, 82], [35, 82], [50, 63]],
    links: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 0], [2, 9], [4, 9], [7, 9], [8, 9]],
  },
};

function renderTrayPattern() {
  const pattern = $("trayPattern");
  pattern.innerHTML = "";
  const level = currentLevel();
  const targetColors = Object.keys(level.targets);
  const theme = PATTERN_LIBRARY[level.pattern] || PATTERN_LIBRARY.flower;
  pattern.dataset.theme = level.pattern || "flower";
  for (const [a, b] of theme.links) {
    const [x1, y1] = theme.points[a];
    const [x2, y2] = theme.points[b];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const link = document.createElement("span");
    link.className = "pattern-link";
    link.style.left = `${x1}%`;
    link.style.top = `${y1}%`;
    link.style.width = `${Math.hypot(dx, dy)}%`;
    link.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
    pattern.appendChild(link);
  }
  theme.points.forEach(([x, y], i) => {
    const color = targetColors[i % targetColors.length] || "mint";
    const node = document.createElement("span");
    node.className = `pattern-node n${i % 4}`;
    node.style.left = `${x}%`;
    node.style.top = `${y}%`;
    node.style.setProperty("--bc", COLORS[color].hex);
    pattern.appendChild(node);
  });
}

function updateProgressText() {
  const level = currentLevel();
  const need = Object.values(level.targets).reduce((a, b) => a + b, 0);
  const got = Object.entries(level.targets).reduce((sum, [color, target]) => sum + Math.min(S.done[color] || 0, target), 0);
  $("goalDone").textContent = `${got}/${need}`;
}

function setStatus(text) { $("statusText").textContent = text; }

async function onScrewTap(id) {
  if (S.busy || S.ended) return;
  const found = findScrew(id);
  if (!found) return;
  const pieceIndex = S.pieces.findIndex((p) => p.id === found.piece.id);
  const blocker = screwBlocker(pieceIndex, found.screw);
  if (blocker) {
    setStatus(`这颗钉子被「${blocker.name}」压住，先拆上层拼片`);
    sfx("bad");
    return;
  }
  await removeScrew(id);
}

function findScrew(id) {
  for (const piece of S.pieces) {
    const screw = piece.screws.find((s) => s.id === id);
    if (screw) return { piece, screw };
  }
  return null;
}

async function removeScrew(id) {
  const found = findScrew(id);
  if (!found || found.screw.removed || found.piece.released || found.piece.releasing) return;
  S.nextScrew = null;
  const screwEl = document.querySelector(`[data-screw-id="${id}"]`);
  playScrewPop(screwEl);
  sfx("pin");
  const liveAnchorGlobals = captureVisibleAnchorGlobals(found.piece, found.screw.id);
  const beforePhysics = capturePieceAnimationPose(found.piece);
  found.piece.anchorGlobals = liveAnchorGlobals;
  found.piece.lastRemovedScrew = { x: found.screw.x, y: found.screw.y };
  found.screw.removed = true;
  applyPiecePhysics(found.piece);
  const afterPhysics = clonePhysics(found.piece.physics);
  S.moves += 1;
  $("moveNow").textContent = String(S.moves);

  const remaining = found.piece.screws.filter((s) => !s.removed).length;
  if (remaining === 0) {
    found.piece.physics = {
      ...afterPhysics,
      x: beforePhysics.x || 0,
      y: beforePhysics.y || 0,
      rot: beforePhysics.rot || 0,
      animating: false,
    };
    renderPieces();
    renderScrews();
    await releasePiece(found.piece.id);
  } else {
    animatePiecePhysics(found.piece, beforePhysics, afterPhysics);
    renderScrews();
    setStatus(`${found.piece.name} 还剩 ${remaining} 颗钉子`);
  }
}

async function releasePiece(pieceId) {
  const piece = S.pieces.find((p) => p.id === pieceId);
  if (!piece || piece.released) return;
  piece.animToken = (piece.animToken || 0) + 1;
  piece.releasing = true;
  renderPieces();
  renderScrews();
  sfx("release");
  setStatus(`${piece.name}松开了，豆子落进拼豆盘`);
  const flights = piece.beads.map((b, i) => flyBead(piece.id, i, b.color));
  for (const b of piece.beads) {
    const ok = addBeadImmediate(b.color);
    if (!ok) {
      piece.released = true;
      piece.releasing = false;
      renderPieces();
      renderScrews();
      Promise.allSettled(flights).catch(() => {});
      endLose();
      return;
    }
  }
  wait(1120).then(() => {
    piece.released = true;
    piece.releasing = false;
    renderPieces();
    renderScrews();
  });
  Promise.allSettled(flights).catch(() => {});
  if (checkWin()) endWin();
}

async function flyBead(pieceId, beadIndex, color) {
  const beadEl = document.querySelector(`[data-piece-id="${pieceId}"] [data-bead-index="${beadIndex}"]`);
  const tray = $("tray");
  const src = beadEl?.getBoundingClientRect();
  const dst = tray.getBoundingClientRect();
  if (!src || !dst) return wait(120);
  const bead = document.createElement("span");
  bead.className = "flying-bead";
  bead.dataset.face = COLORS[color].face;
  bead.style.setProperty("--bc", COLORS[color].hex);
  const startX = src.left + src.width / 2;
  const startY = src.top + src.height / 2;
  const targetX = dst.left + dst.width * (0.16 + Math.random() * 0.68);
  const targetY = dst.top + dst.height / 2;
  document.body.appendChild(bead);
  const beadSize = bead.getBoundingClientRect().width || 38;
  bead.style.left = `${startX - beadSize / 2}px`;
  bead.style.top = `${startY - beadSize / 2}px`;
  await wait(20);
  bead.style.left = `${targetX - beadSize / 2}px`;
  bead.style.top = `${targetY - beadSize / 2}px`;
  bead.style.transform = "scale(1.12)";
  await wait(530);
  bead.remove();
}

async function addBead(color) {
  const level = currentLevel();
  const existing = S.tray.filter((item) => item === color).length;
  if (S.tray.length >= level.capacity) {
    if (existing >= 2) {
      await completeTriple(color, true);
      return true;
    }
    return false;
  }

  S.tray.push(color);
  renderTray();
  hotLastSlot();
  sfx("bead");

  if (S.tray.filter((item) => item === color).length >= 3) {
    await wait(150);
    await completeTriple(color, false);
  } else if (S.tray.length >= level.capacity) {
    return false;
  }
  return true;
}

function addBeadImmediate(color) {
  const level = currentLevel();
  const existing = S.tray.filter((item) => item === color).length;
  if (S.tray.length >= level.capacity) {
    if (existing >= 2) {
      completeTripleImmediate(color, true);
      return true;
    }
    return false;
  }

  S.tray.push(color);
  renderTray();
  hotLastSlot();
  sfx("bead");

  if (S.tray.filter((item) => item === color).length >= 3) {
    completeTripleImmediate(color, false);
  } else if (S.tray.length >= level.capacity) {
    return false;
  }
  return true;
}

function hotLastSlot() {
  const slot = document.querySelector(`[data-slot="${Math.max(0, S.tray.length - 1)}"]`);
  if (!slot) return;
  slot.classList.remove("hot");
  void slot.offsetWidth;
  slot.classList.add("hot");
}

async function completeTriple(color, usesIncoming) {
  markMatchingSlots(color, usesIncoming ? 2 : 3);
  await wait(260);
  let left = usesIncoming ? 2 : 3;
  S.tray = S.tray.filter((item) => {
    if (item === color && left > 0) {
      left -= 1;
      return false;
    }
    return true;
  });
  const level = currentLevel();
  if (Object.prototype.hasOwnProperty.call(level.targets, color)) {
    S.done[color] = (S.done[color] || 0) + 1;
  }
  renderGoals();
  renderTray();
  updateProgressText();
  burst(color);
  sfx("match");
  setStatus(`${COLORS[color].name}三颗拼成一片`);
  await wait(240);
}

function completeTripleImmediate(color, usesIncoming) {
  let left = usesIncoming ? 2 : 3;
  S.tray = S.tray.filter((item) => {
    if (item === color && left > 0) {
      left -= 1;
      return false;
    }
    return true;
  });
  const level = currentLevel();
  if (Object.prototype.hasOwnProperty.call(level.targets, color)) {
    S.done[color] = (S.done[color] || 0) + 1;
  }
  renderGoals();
  renderTray();
  updateProgressText();
  burst(color);
  sfx("match");
  setStatus(`${COLORS[color].name}三颗拼成一片`);
}

function markMatchingSlots(color, count) {
  let left = count;
  for (let i = 0; i < S.tray.length && left > 0; i++) {
    if (S.tray[i] !== color) continue;
    const slot = document.querySelector(`[data-slot="${i}"]`);
    slot?.classList.add("matching");
    left -= 1;
  }
}

function burst(color) {
  const tray = $("tray").getBoundingClientRect();
  const x = tray.left + tray.width / 2;
  const y = tray.top + tray.height / 2;
  for (let i = 0; i < 18; i++) {
    const sp = document.createElement("span");
    sp.className = "spark";
    sp.style.setProperty("--bc", COLORS[color].hex);
    const a = Math.random() * Math.PI * 2;
    const d = 34 + Math.random() * 58;
    sp.style.setProperty("--sx", `${Math.cos(a) * d}px`);
    sp.style.setProperty("--sy", `${Math.sin(a) * d}px`);
    sp.style.left = `${x - 5}px`;
    sp.style.top = `${y - 5}px`;
    document.body.appendChild(sp);
    setTimeout(() => sp.remove(), 760);
  }
}

function checkWin() {
  const level = currentLevel();
  return Object.entries(level.targets).every(([color, need]) => (S.done[color] || 0) >= need);
}

function endWin() {
  if (S.ended) return;
  S.ended = true;
  setInputLocked(false);
  renderAll();
  sfx("win");
  setStatus("完成");
  $("btnAdvance").classList.add("show");
  setTimeout(() => showResult(true), 450);
}

function endLose() {
  if (S.ended) return;
  S.ended = true;
  setInputLocked(false);
  renderAll();
  sfx("bad");
  setStatus("拼豆盘满了");
  showResult(false);
}

function showResult(win) {
  const level = currentLevel();
  const title = win ? "完成" : "失败";
  const text = win
    ? `${level.name} · 拆了 ${S.moves} 颗钉子`
    : "拼豆盘被占满了，换一个拆片顺序再试。";
  $("modal").innerHTML = `
    <h2>${title}</h2>
    <p>${text}</p>
    <div class="modal-actions">
      <button type="button" id="modalRetry">重开</button>
      <button type="button" class="primary" id="modalNext">${win ? "下一关" : "再试"}</button>
    </div>
  `;
  $("overlay").classList.add("show");
  $("modalRetry").onclick = () => startLevel(S.level);
  $("modalNext").onclick = () => startLevel(win ? S.level + 1 : S.level);
}

function closeModal() {
  $("overlay").classList.remove("show");
}

function bindUI() {
  $("btnPrev").addEventListener("click", () => startLevel(S.level - 1));
  $("btnNext").addEventListener("click", () => startLevel(S.level + 1));
  $("btnReset").addEventListener("click", () => startLevel(S.level));
  $("btnAdvance").addEventListener("click", () => startLevel(S.level + 1));
  $("machine").addEventListener("pointerdown", onMachinePointerDown);
  $("overlay").addEventListener("click", (event) => {
    if (event.target === $("overlay")) closeModal();
  });
}

setupBackdrop();
bindUI();
startLevel(0);
