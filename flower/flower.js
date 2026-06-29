"use strict";

const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const TAU = Math.PI * 2;

const TIERS = [
  { name: "三色堇", r: 17, score: 2, colors: ["#7d59aa", "#9b7aca", "#f3cf66"] },
  { name: "粉玫瑰", r: 24, score: 6, colors: ["#dc8190", "#f6bcc1", "#b86573"] },
  { name: "满天星", r: 34, score: 16, colors: ["#fffdf0", "#e5dfbf", "#9aa078"] },
  { name: "波斯菊", r: 44, score: 36, colors: ["#b8a1dc", "#dfc8ed", "#e3b749"] },
  { name: "蓝绣球", r: 58, score: 82, colors: ["#8fb0e4", "#b6a8de", "#5f8f63"] },
  { name: "康乃馨", r: 72, score: 188, colors: ["#f2c199", "#f6d3ae", "#b97964"] },
  { name: "向日葵", r: 90, score: 420, colors: ["#f3bf36", "#f8d76b", "#8f6430"] },
];

const BOUQUETS = [
  { name: "初恋小束", bonus: 90, req: [[1, 1], [2, 1]] },
  { name: "云边信笺", bonus: 130, req: [[2, 2], [3, 1]] },
  { name: "蓝白告白", bonus: 180, req: [[1, 1], [4, 1]] },
  { name: "午后花篮", bonus: 220, req: [[3, 1], [5, 1]] },
  { name: "晴日纪念", bonus: 320, req: [[4, 1], [6, 1]] },
];

const FLOWER_LANG = [
  { name: "告白花束", tiers: [1, 2], score: 70, color: "#e8899c", clearTiny: false },
  { name: "蓝白信笺", tiers: [2, 4], score: 110, color: "#89aee1", clearTiny: true },
  { name: "晴日花园", tiers: [3, 6], score: 180, color: "#e9b743", clearTiny: true },
];

const GOAL_BOUQUETS = 5;
const MAX_HINTS = 3;

const BAL = {
  gravity: 0.36,
  subSteps: 4,
  collideIters: 4,
  air: 0.992,
  rest: 0.08,
  wall: 0.2,
  floor: 0.16,
  friction: 0.93,
  mergeKiss: 1.02,
  overloadMs: 2100,
  dropCooldown: 250,
};

const S = {
  balls: [],
  particles: [],
  next: null,
  holding: null,
  score: 0,
  best: load("flower_best", 0),
  combo: 0,
  comboAt: 0,
  lastDrop: 0,
  over: 0,
  running: true,
  spray: 1,
  spade: 1,
  bouquets: 0,
  maxTier: 0,
  bestCombo: 0,
  orders: [],
};

let cv, cx, nextCv, nextCx, DPR = 1, CW = 0, CH = 0, SCALE = 1;
let FIELD = { L: 14, R: 320, TOP: 54, DROP: 25, BOT: 500 };
let ballId = 0;
let lastFrame = 0;
let toastTimer = null;

function load(k, d) {
  try {
    const v = localStorage.getItem(k);
    return v == null ? d : JSON.parse(v);
  } catch {
    return d;
  }
}

function save(k, v) {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch {}
}

function rand(seed) {
  let t = seed + 0x6D2B79F5;
  return function next() {
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function radius(tier) {
  return TIERS[tier].r * SCALE;
}

function layout() {
  cv = $("game");
  cx = cv.getContext("2d");
  nextCv = $("nextCanvas");
  nextCx = nextCv.getContext("2d");
  const wrap = $("fieldWrap");
  CW = Math.max(300, wrap.clientWidth || innerWidth || 390);
  CH = Math.max(360, wrap.clientHeight || (innerHeight - 150) || 560);
  SCALE = clamp((CW - 22) / 430, 0.82, 1.02);
  DPR = Math.min(devicePixelRatio || 1, 2);
  cv.width = Math.round(CW * DPR);
  cv.height = Math.round(CH * DPR);
  cv.style.width = CW + "px";
  cv.style.height = CH + "px";
  cx.setTransform(DPR, 0, 0, DPR, 0, 0);
  FIELD.L = 12;
  FIELD.R = CW - 12;
  FIELD.TOP = Math.max(48, Math.min(64, CH * 0.11));
  FIELD.DROP = Math.max(24, FIELD.TOP - 30);
  FIELD.BOT = CH - 10;
  keepInside();
  drawNext();
}

function keepInside() {
  for (const b of S.balls) {
    b.r = radius(b.tier);
    b.x = clamp(b.x, FIELD.L + b.r, FIELD.R - b.r);
    b.y = Math.min(b.y, FIELD.BOT - b.r);
  }
}

function spawnTier() {
  return Math.random() < 0.28 ? 1 : 0;
}

function mkBall(tier, x, y, vy = 0) {
  const r = radius(tier);
  return {
    id: ++ballId,
    tier,
    r,
    x,
    y,
    vx: (Math.random() - 0.5) * 0.55,
    vy,
    angle: (Math.random() - 0.5) * 0.35,
    va: (Math.random() - 0.5) * 0.018,
    born: performance.now(),
    pop: 0,
    dead: false,
  };
}

function reset() {
  S.balls = [];
  S.particles = [];
  S.score = 0;
  S.combo = 0;
  S.comboAt = 0;
  S.over = 0;
  S.running = true;
  S.spray = 1;
  S.spade = 1;
  S.bouquets = 0;
  S.maxTier = 0;
  S.bestCombo = 0;
  S.orders = makeOrders();
  S.next = { tier: spawnTier() };
  S.holding = { tier: spawnTier(), x: (FIELD.L + FIELD.R) / 2 };
  $("overlay").classList.remove("show");
  $("overlay").setAttribute("aria-hidden", "true");
  updateHud();
  drawNext();
}

function makeOrders() {
  const pool = BOUQUETS.slice().sort(() => Math.random() - 0.5);
  return pool.slice(0, 3).map((recipe, i) => cloneOrder(recipe, i));
}

function cloneOrder(recipe, slot) {
  return {
    slot,
    name: recipe.name,
    bonus: recipe.bonus,
    req: recipe.req.map(([tier, count]) => ({ tier, count, got: 0 })),
    done: false,
  };
}

function refillOrder(slot) {
  const used = new Set(S.orders.filter((o) => !o.done).map((o) => o.name));
  const candidates = BOUQUETS.filter((b) => !used.has(b.name));
  const recipe = candidates[Math.floor(Math.random() * candidates.length)] || BOUQUETS[slot % BOUQUETS.length];
  S.orders[slot] = cloneOrder(recipe, slot);
  renderOrders();
}

function queueNext() {
  S.holding = { tier: S.next.tier, x: clamp(S.holding ? S.holding.x : CW / 2, FIELD.L, FIELD.R) };
  S.next = { tier: spawnTier() };
  drawNext();
}

function dropHolding() {
  if (!S.running || !S.holding) return;
  const now = performance.now();
  if (now - S.lastDrop < BAL.dropCooldown) return;
  S.lastDrop = now;
  const r = radius(S.holding.tier);
  const x = clamp(S.holding.x, FIELD.L + r, FIELD.R - r);
  S.balls.push(mkBall(S.holding.tier, x, FIELD.DROP, 1.2));
  queueNext();
}

function physics() {
  for (let s = 0; s < BAL.subSteps; s++) {
    for (const b of S.balls) {
      b.vy += BAL.gravity;
      b.vx *= BAL.air;
      b.vy *= BAL.air;
      b.x += b.vx / BAL.subSteps;
      b.y += b.vy / BAL.subSteps;
      b.angle += b.va;
    }

    for (const b of S.balls) {
      if (b.x - b.r < FIELD.L) {
        b.x = FIELD.L + b.r;
        b.vx = -b.vx * BAL.wall;
      }
      if (b.x + b.r > FIELD.R) {
        b.x = FIELD.R - b.r;
        b.vx = -b.vx * BAL.wall;
      }
      if (b.y + b.r > FIELD.BOT) {
        b.y = FIELD.BOT - b.r;
        b.vy = -b.vy * BAL.floor;
        b.vx *= BAL.friction;
        b.va *= 0.92;
      }
    }

    for (let iter = 0; iter < BAL.collideIters; iter++) {
      for (let i = 0; i < S.balls.length; i++) {
        const a = S.balls[i];
        for (let j = i + 1; j < S.balls.length; j++) {
          const b = S.balls[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const min = a.r + b.r;
          const d2 = dx * dx + dy * dy;
          if (d2 >= min * min || d2 < 0.0001) continue;
          const d = Math.sqrt(d2);
          const nx = dx / d;
          const ny = dy / d;
          const overlap = min - d;
          a.x -= nx * overlap * 0.5;
          a.y -= ny * overlap * 0.5;
          b.x += nx * overlap * 0.5;
          b.y += ny * overlap * 0.5;
          const rvx = b.vx - a.vx;
          const rvy = b.vy - a.vy;
          const vn = rvx * nx + rvy * ny;
          if (vn < 0) {
            const imp = -(1 + BAL.rest) * vn * 0.5;
            a.vx -= imp * nx;
            a.vy -= imp * ny;
            b.vx += imp * nx;
            b.vy += imp * ny;
          }
          const tangent = (rvx * -ny + rvy * nx) * 0.002;
          a.va += tangent;
          b.va -= tangent;
        }
      }
    }
  }
}

function detectMerge() {
  for (let i = 0; i < S.balls.length; i++) {
    const a = S.balls[i];
    if (a.dead) continue;
    for (let j = i + 1; j < S.balls.length; j++) {
      const b = S.balls[j];
      if (b.dead || a.tier !== b.tier) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const kiss = (a.r + b.r) * BAL.mergeKiss;
      if (dx * dx + dy * dy <= kiss * kiss) {
        merge(a, b);
        return true;
      }
    }
  }
  return false;
}

function merge(a, b) {
  const tier = a.tier;
  const nt = tier + 1;
  const x = (a.x + b.x) / 2;
  const y = (a.y + b.y) / 2;
  a.dead = true;
  b.dead = true;
  S.balls = S.balls.filter((it) => !it.dead);

  const now = performance.now();
  S.combo = now - S.comboAt < 1200 ? S.combo + 1 : 1;
  S.comboAt = now;
  S.bestCombo = Math.max(S.bestCombo, S.combo);
  const comboMul = 1 + Math.max(0, S.combo - 1) * 0.22;

  if (nt >= TIERS.length) {
    addScore(Math.round(900 * comboMul));
    burst(x, y, TIERS[tier].colors[0], 44, 2.8);
    toast("满园盛放");
    return;
  }

  const nb = mkBall(nt, x, y, -2.6);
  nb.pop = now;
  S.balls.push(nb);
  S.maxTier = Math.max(S.maxTier, nt);
  addScore(Math.round(TIERS[nt].score * comboMul));
  burst(x, y, TIERS[nt].colors[0], 18 + nt * 4, 1.7 + nt * 0.18);
  checkFlowerLanguage(nb);
  collectForOrder(nb);
  if (nt >= 4) toast(TIERS[nt].name);
}

function collectForOrder(ball) {
  for (const order of S.orders) {
    if (order.done) continue;
    const req = order.req.find((r) => r.tier === ball.tier && r.got < r.count);
    if (!req) continue;
    req.got++;
    S.balls = S.balls.filter((b) => b !== ball);
    renderOrders();
    animateHarvest(ball, order.slot, req.tier);
    burst(ball.x, ball.y, TIERS[ball.tier].colors[0], 24, 2);
    floatText(ball.x, ball.y, TIERS[ball.tier].name + " 入束", "order");
    addScore(12 + ball.tier * 8);
    const complete = order.req.every((r) => r.got >= r.count);
    if (complete) {
      order.done = true;
      S.bouquets++;
      addScore(order.bonus);
      S.spray += S.bouquets % 2 === 0 ? 1 : 0;
      S.spade += S.bouquets % 3 === 0 ? 1 : 0;
      burst(ball.x, ball.y - 18, "#d9aa58", 38, 2.6);
      floatText(ball.x, ball.y - 26, order.name + " +" + order.bonus, "order");
      toast("完成 " + order.name);
      if (S.bouquets >= GOAL_BOUQUETS) {
        setTimeout(roundClear, 820);
      } else {
        setTimeout(() => refillOrder(order.slot), 900);
      }
    }
    return true;
  }
  return false;
}

function animateHarvest(ball, slot, tier) {
  const host = $("garden");
  const rect = cv.getBoundingClientRect();
  const base = host.getBoundingClientRect();
  const target = document.querySelector(`.bouquet-card[data-slot="${slot}"] .bouquet-need[data-tier="${tier}"]`)
    || document.querySelector(`.bouquet-card[data-slot="${slot}"]`);
  if (!target) return;
  const tr = target.getBoundingClientRect();
  const fly = document.createElement("canvas");
  const dpr = Math.min(devicePixelRatio || 1, 2);
  fly.className = "fly-flower";
  fly.width = 36 * dpr;
  fly.height = 36 * dpr;
  fly.style.left = (rect.left - base.left + ball.x) + "px";
  fly.style.top = (rect.top - base.top + ball.y) + "px";
  host.appendChild(fly);
  const fcx = fly.getContext("2d");
  fcx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawFlower(fcx, { tier: ball.tier, r: 13, x: 18, y: 18, angle: ball.angle, id: 12000 + ball.tier, born: 0, pop: 0 }, false);
  requestAnimationFrame(() => {
    fly.style.left = (tr.left - base.left + tr.width / 2) + "px";
    fly.style.top = (tr.top - base.top + tr.height / 2) + "px";
    fly.classList.add("go");
  });
  const card = document.querySelector(`.bouquet-card[data-slot="${slot}"]`);
  setTimeout(() => {
    if (card) {
      card.classList.remove("target");
      void card.offsetWidth;
      card.classList.add("target");
    }
  }, 430);
  setTimeout(() => fly.remove(), 720);
}

function checkFlowerLanguage(seed) {
  for (const combo of FLOWER_LANG) {
    if (!combo.tiers.includes(seed.tier)) continue;
    const otherTier = combo.tiers[0] === seed.tier ? combo.tiers[1] : combo.tiers[0];
    let mate = null;
    let bestD = Infinity;
    for (const b of S.balls) {
      if (b === seed || b.tier !== otherTier) continue;
      const d = (b.x - seed.x) ** 2 + (b.y - seed.y) ** 2;
      const reach = seed.r + b.r + 46 * SCALE;
      if (d < reach * reach && d < bestD) {
        bestD = d;
        mate = b;
      }
    }
    if (!mate) continue;
    const x = (seed.x + mate.x) / 2;
    const y = (seed.y + mate.y) / 2;
    addScore(combo.score);
    burst(x, y, combo.color, 30, 2.4);
    floatText(x, y, combo.name + " +" + combo.score, "combo");
    toast(combo.name);
    if (combo.clearTiny) pruneTinyNear(x, y, 128 * SCALE);
    return true;
  }
  return false;
}

function pruneTinyNear(x, y, reach) {
  const removed = [];
  S.balls = S.balls.filter((b) => {
    if (b.tier > 1) return true;
    const d = Math.hypot(b.x - x, b.y - y);
    if (d > reach) return true;
    removed.push(b);
    return false;
  });
  for (const b of removed) burst(b.x, b.y, TIERS[b.tier].colors[0], 9, 1.4);
  if (removed.length) addScore(removed.length * 8);
}

function addScore(v) {
  S.score += v;
  if (S.score > S.best) {
    S.best = S.score;
    save("flower_best", S.best);
  }
  const box = $("scoreBox");
  box.classList.remove("bump");
  void box.offsetWidth;
  box.classList.add("bump");
  updateHud();
}

function updateHud() {
  $("scoreBox").textContent = S.score;
  $("bestScore").textContent = S.best;
  $("sprayCount").textContent = S.spray;
  $("spadeCount").textContent = S.spade;
  $("btnSpray").classList.toggle("disabled", S.spray <= 0);
  $("btnSpade").classList.toggle("disabled", S.spade <= 0);
  const tier = S.holding ? S.holding.tier : 0;
  $("tierName").textContent = TIERS[tier].name;
  $("bouquetCount").textContent = S.bouquets;
  renderOrders();
}

function renderOrders() {
  const host = $("bouquetOrders");
  if (!host || !S.orders) return;
  host.innerHTML = S.orders.map((order) => {
    const needs = order.req.map((r) => {
      const full = r.got >= r.count;
      const t = TIERS[r.tier];
      return `<span class="bouquet-need ${full ? "full" : ""}" data-tier="${r.tier}" title="${t.name} ${Math.min(r.got, r.count)}/${r.count}" style="--need-color:${t.colors[0]};--need-soft:${t.colors[1]}"><span class="need-flower"></span><span class="need-num">${Math.min(r.got, r.count)}/${r.count}</span>${full ? `<span class="need-check">✓</span>` : ""}</span>`;
    }).join("");
    return `<div class="bouquet-card ${order.done ? "done" : ""}" data-slot="${order.slot}"><span class="bouquet-name">${order.done ? "已包装" : order.name}</span><div class="bouquet-reqs">${needs}</div></div>`;
  }).join("");
}

function toast(msg) {
  const e = $("toast");
  e.textContent = msg;
  e.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => e.classList.remove("show"), 1200);
}

function burst(x, y, color, count, power) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * TAU;
    const sp = (0.4 + Math.random() * power) * SCALE;
    S.particles.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - Math.random() * 1.5,
      r: (2 + Math.random() * 4) * SCALE,
      life: 1,
      rot: Math.random() * TAU,
      vr: (Math.random() - 0.5) * 0.18,
      color,
    });
  }
}

function floatText(x, y, text, cls = "") {
  const host = $("garden");
  const e = document.createElement("div");
  const rect = cv.getBoundingClientRect();
  const base = host.getBoundingClientRect();
  e.className = "float-text" + (cls ? " " + cls : "");
  e.textContent = text;
  e.style.left = (rect.left - base.left + x) + "px";
  e.style.top = (rect.top - base.top + y) + "px";
  host.appendChild(e);
  setTimeout(() => e.remove(), 1050);
}

function updateParticles() {
  S.particles = S.particles.filter((p) => p.life > 0.02);
  for (const p of S.particles) {
    p.vy += 0.035;
    p.x += p.vx;
    p.y += p.vy;
    p.rot += p.vr;
    p.life *= 0.965;
  }
}

function drawBackground() {
  cx.clearRect(0, 0, CW, CH);
  const g = cx.createLinearGradient(0, 0, 0, CH);
  g.addColorStop(0, "rgba(255,255,250,0.52)");
  g.addColorStop(1, "rgba(255,244,226,0.36)");
  cx.fillStyle = g;
  cx.fillRect(0, 0, CW, CH);

  cx.save();
  cx.globalAlpha = 0.22;
  cx.strokeStyle = "#e3c3ac";
  cx.lineWidth = 1;
  cx.setLineDash([7, 7]);
  cx.beginPath();
  cx.moveTo(FIELD.L + 4, FIELD.TOP);
  cx.lineTo(FIELD.R - 4, FIELD.TOP);
  cx.stroke();
  cx.restore();
}

function drawLanguageHints() {
  const hints = [];
  for (const combo of FLOWER_LANG) {
    const aTier = combo.tiers[0], bTier = combo.tiers[1];
    for (const a of S.balls) {
      if (a.tier !== aTier) continue;
      for (const b of S.balls) {
        if (b.tier !== bTier) continue;
        const d = Math.hypot(b.x - a.x, b.y - a.y);
        const trigger = a.r + b.r + 46 * SCALE;
        const hintReach = trigger + 56 * SCALE;
        if (d <= trigger || d > hintReach) continue;
        hints.push({ a, b, combo, d, trigger });
      }
    }
  }
  hints.sort((p, q) => p.d - q.d);
  cx.save();
  for (const h of hints.slice(0, MAX_HINTS)) {
    const mx = (h.a.x + h.b.x) / 2;
    const my = (h.a.y + h.b.y) / 2;
    const pull = clamp(1 - (h.d - h.trigger) / (56 * SCALE), 0, 1);
    cx.globalAlpha = 0.22 + pull * 0.35;
    cx.strokeStyle = h.combo.color;
    cx.lineWidth = 1.8 + pull * 1.2;
    cx.setLineDash([5, 6]);
    cx.beginPath();
    cx.moveTo(h.a.x, h.a.y);
    cx.quadraticCurveTo(mx, my - 18 * SCALE, h.b.x, h.b.y);
    cx.stroke();
    cx.setLineDash([]);
    cx.globalAlpha = 0.72;
    cx.fillStyle = h.combo.color;
    cx.font = `${Math.round(12 * SCALE)}px "PingFang SC", sans-serif`;
    cx.textAlign = "center";
    cx.fillText(h.combo.name, mx, my - 22 * SCALE);
  }
  cx.restore();
}

function drawGuide() {
  if (!S.running || !S.holding) return;
  const tier = S.holding.tier;
  const r = radius(tier);
  const x = clamp(S.holding.x, FIELD.L + r, FIELD.R - r);
  cx.save();
  cx.globalAlpha = 0.38;
  cx.setLineDash([4, 8]);
  cx.lineWidth = 1;
  cx.strokeStyle = "rgba(126,102,93,0.36)";
  cx.beginPath();
  cx.moveTo(x, FIELD.DROP + r * 0.85);
  cx.lineTo(x, FIELD.BOT);
  cx.stroke();
  cx.globalAlpha = 0.82;
  drawFlower(cx, { tier, r, x, y: FIELD.DROP, angle: 0, id: 7000 + tier, born: 0, pop: 0 }, true);
  cx.restore();
}

function drawPetal(ctx, x, y, angle, len, wid, fill, stroke, alpha = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.globalAlpha *= alpha;
  ctx.beginPath();
  ctx.ellipse(len * 0.48, 0, len * 0.5, wid * 0.5, 0, 0, TAU);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = Math.max(0.8, wid * 0.06);
  ctx.stroke();
  ctx.restore();
}

function drawSmallFive(ctx, x, y, r, a, fill, stroke, center) {
  for (let i = 0; i < 5; i++) {
    drawPetal(ctx, x, y, a + i * TAU / 5, r * 1.45, r * 0.82, fill, stroke, 0.95);
  }
  ctx.beginPath();
  ctx.arc(x, y, r * 0.22, 0, TAU);
  ctx.fillStyle = center;
  ctx.fill();
}

function drawRose(ctx, x, y, r, colors, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = colors[1];
  ctx.strokeStyle = colors[2];
  ctx.lineWidth = Math.max(1, r * 0.04);
  for (let ring = 0; ring < 4; ring++) {
    const count = 6 + ring * 2;
    const rr = r * (0.24 + ring * 0.15);
    for (let i = 0; i < count; i++) {
      const a = i * TAU / count + ring * 0.42;
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * rr, Math.sin(a) * rr, r * (0.22 - ring * 0.018), r * 0.11, a, 0, TAU);
      ctx.fillStyle = ring % 2 ? colors[0] : colors[1];
      ctx.fill();
      ctx.stroke();
    }
  }
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.13, 0, TAU);
  ctx.fillStyle = "#f7d3c8";
  ctx.fill();
  ctx.restore();
}

function drawBaby(ctx, b, colors) {
  const rng = rand(b.id * 41);
  const count = 22;
  for (let i = 0; i < count; i++) {
    const a = rng() * TAU;
    const d = Math.sqrt(rng()) * b.r * 0.66;
    const rr = b.r * (0.12 + rng() * 0.04);
    drawSmallFive(ctx, b.x + Math.cos(a) * d, b.y + Math.sin(a) * d, rr, rng() * TAU, colors[0], "#aaa88d", "#e6d994");
  }
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.r * 0.83, 0, TAU);
  ctx.strokeStyle = colors[2];
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function drawHydrangea(ctx, b, colors) {
  const rng = rand(b.id * 59);
  const leaves = [
    [-0.38, 0.56, -0.55],
    [0.42, 0.58, -2.55],
  ];
  for (const l of leaves) {
    drawPetal(ctx, b.x + b.r * l[0], b.y + b.r * l[1], l[2], b.r * 0.66, b.r * 0.3, "#6fa06b", "#4f7d55", 0.86);
  }
  for (let i = 0; i < 32; i++) {
    const a = rng() * TAU;
    const d = Math.sqrt(rng()) * b.r * 0.62;
    const rr = b.r * (0.105 + rng() * 0.025);
    const fill = rng() > 0.45 ? colors[0] : colors[1];
    drawSmallFive(ctx, b.x + Math.cos(a) * d, b.y + Math.sin(a) * d, rr, rng() * TAU, fill, "#6f6f9e", "#f4eab6");
  }
}

function drawCosmos(ctx, b, colors) {
  for (let i = 0; i < 8; i++) {
    const a = b.angle + i * TAU / 8;
    drawPetal(ctx, b.x, b.y, a, b.r * 1.05, b.r * 0.38, i % 2 ? colors[1] : colors[0], "#8f72a0", 0.94);
  }
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.r * 0.2, 0, TAU);
  ctx.fillStyle = colors[2];
  ctx.fill();
  ctx.strokeStyle = "#9c7830";
  ctx.lineWidth = 1.4;
  ctx.stroke();
}

function drawCarnation(ctx, b, colors) {
  const rng = rand(b.id * 67);
  for (let ring = 0; ring < 4; ring++) {
    const count = 12 + ring * 4;
    const rr = b.r * (0.18 + ring * 0.13);
    for (let i = 0; i < count; i++) {
      const a = b.angle + i * TAU / count + ring * 0.27;
      const wobble = 0.86 + rng() * 0.22;
      drawPetal(ctx, b.x + Math.cos(a) * rr * 0.18, b.y + Math.sin(a) * rr * 0.18, a, b.r * 0.52 * wobble, b.r * 0.22, ring % 2 ? colors[0] : colors[1], colors[2], 0.9);
    }
  }
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.r * 0.12, 0, TAU);
  ctx.fillStyle = "#f6d4b2";
  ctx.fill();
}

function drawSunflower(ctx, b, colors) {
  for (let i = 0; i < 28; i++) {
    const a = b.angle + i * TAU / 28;
    drawPetal(ctx, b.x, b.y, a, b.r * 0.92, b.r * 0.2, i % 2 ? colors[0] : colors[1], "#a56d22", 0.96);
  }
  const cg = ctx.createRadialGradient(b.x - b.r * 0.08, b.y - b.r * 0.1, b.r * 0.08, b.x, b.y, b.r * 0.42);
  cg.addColorStop(0, "#b98a44");
  cg.addColorStop(1, colors[2]);
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.r * 0.42, 0, TAU);
  ctx.fillStyle = cg;
  ctx.fill();
  ctx.strokeStyle = "#765027";
  ctx.lineWidth = Math.max(1.2, b.r * 0.035);
  ctx.stroke();
  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = "#593a22";
  for (let i = 0; i < 60; i++) {
    const rng = rand(b.id * 11 + i);
    const a = rng() * TAU;
    const d = Math.sqrt(rng()) * b.r * 0.34;
    ctx.beginPath();
    ctx.arc(b.x + Math.cos(a) * d, b.y + Math.sin(a) * d, Math.max(1, b.r * 0.018), 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawViolet(ctx, b, colors) {
  for (let i = 0; i < 5; i++) {
    const a = b.angle - Math.PI / 2 + i * TAU / 5;
    const fill = i === 2 ? "#7150a2" : colors[i % 2];
    drawPetal(ctx, b.x, b.y, a, b.r * 0.92, b.r * 0.5, fill, "#59447b", 0.95);
  }
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.r * 0.13, 0, TAU);
  ctx.fillStyle = colors[2];
  ctx.fill();
}

function drawFlower(ctx, b, ghost = false) {
  const t = TIERS[b.tier];
  const now = performance.now();
  let scale = 1;
  if (b.born && now - b.born < 180) scale *= 0.62 + (now - b.born) / 180 * 0.38;
  if (b.pop && now - b.pop < 260) scale *= 1 + Math.sin((now - b.pop) / 260 * Math.PI) * 0.25;
  const d = { ...b, r: b.r * scale };

  ctx.save();
  if (ghost) ctx.globalAlpha *= 0.72;
  ctx.shadowColor = "rgba(121, 82, 64, 0.16)";
  ctx.shadowBlur = d.r * 0.18;
  ctx.shadowOffsetY = d.r * 0.08;
  ctx.beginPath();
  ctx.arc(d.x, d.y, d.r * 0.9, 0, TAU);
  ctx.fillStyle = "rgba(255,245,233,0.08)";
  ctx.fill();
  ctx.shadowColor = "transparent";

  if (b.tier === 0) drawViolet(ctx, d, t.colors);
  else if (b.tier === 1) drawRose(ctx, d.x, d.y, d.r, t.colors, d.angle);
  else if (b.tier === 2) drawBaby(ctx, d, t.colors);
  else if (b.tier === 3) drawCosmos(ctx, d, t.colors);
  else if (b.tier === 4) drawHydrangea(ctx, d, t.colors);
  else if (b.tier === 5) drawCarnation(ctx, d, t.colors);
  else drawSunflower(ctx, d, t.colors);
  ctx.restore();
}

function drawParticles() {
  for (const p of S.particles) {
    cx.save();
    cx.globalAlpha = p.life;
    cx.translate(p.x, p.y);
    cx.rotate(p.rot);
    cx.beginPath();
    cx.ellipse(0, 0, p.r * 1.5, p.r * 0.72, 0, 0, TAU);
    cx.fillStyle = p.color;
    cx.fill();
    cx.restore();
  }
}

function render() {
  drawBackground();
  drawGuide();
  drawLanguageHints();
  S.balls.sort((a, b) => a.y - b.y);
  for (const b of S.balls) drawFlower(cx, b);
  drawParticles();
}

function drawNext() {
  if (!nextCx || !S.next) return;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  nextCv.width = 74 * dpr;
  nextCv.height = 74 * dpr;
  nextCx.setTransform(dpr, 0, 0, dpr, 0, 0);
  nextCx.clearRect(0, 0, 74, 74);
  const tier = S.next.tier;
  const r = Math.min(28, TIERS[tier].r * 1.2);
  drawFlower(nextCx, { tier, r, x: 37, y: 37, angle: -0.08, id: 9000 + tier, born: 0, pop: 0 }, false);
}

function checkOverload(dt) {
  const over = S.balls.some((b) => b.y - b.r < FIELD.TOP && Math.abs(b.vy) < 0.9);
  S.over = over ? S.over + dt : Math.max(0, S.over - dt * 2.4);
  if (S.over > BAL.overloadMs) gameOver();
}

function gameOver() {
  if (!S.running) return;
  S.running = false;
  showResult("花园已满", "完成花束 " + S.bouquets + "/" + GOAL_BOUQUETS);
}

function roundClear() {
  if (!S.running) return;
  S.running = false;
  burst(CW / 2, FIELD.TOP + 48, "#d9aa58", 70, 3.2);
  showResult("今日花束完成", "最大花 " + TIERS[S.maxTier].name + " · 最高连锁 ×" + Math.max(1, S.bestCombo));
}

function showResult(title, stats) {
  $("modalTitle").textContent = title;
  $("finalScore").textContent = S.score;
  $("modalStats").textContent = stats;
  $("overlay").classList.add("show");
  $("overlay").setAttribute("aria-hidden", "false");
}

function useSpray() {
  if (!S.running || S.spray <= 0) return;
  S.spray--;
  for (const a of S.balls) {
    let best = null;
    let bestD = Infinity;
    for (const b of S.balls) {
      if (a === b || a.tier !== b.tier) continue;
      const d = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
      if (d < bestD) { best = b; bestD = d; }
    }
    if (best) {
      const dx = best.x - a.x;
      const dy = best.y - a.y;
      const m = Math.hypot(dx, dy) || 1;
      a.vx += dx / m * 3.1;
      a.vy += dy / m * 1.8 + 0.7;
    } else {
      a.vy += 1.2;
    }
  }
  burst(CW * 0.72, FIELD.TOP + 12, "#9fc6d6", 18, 1.1);
  floatText(CW * 0.72, FIELD.TOP + 14, "同阶吸引", "combo");
  toast("春雨牵引");
  updateHud();
}

function useSpade() {
  if (!S.running || S.spade <= 0 || !S.balls.length) return;
  S.spade--;
  let target = S.balls[0];
  for (const b of S.balls) {
    if (b.y - b.r < target.y - target.r) target = b;
  }
  S.balls = S.balls.filter((b) => b !== target);
  burst(target.x, target.y, TIERS[target.tier].colors[0], 20, 1.8);
  toast("修枝");
  updateHud();
}

function pointerX(e) {
  const rect = cv.getBoundingClientRect();
  return (e.clientX || (e.touches && e.touches[0].clientX) || rect.left + rect.width / 2) - rect.left;
}

function bindInput() {
  let down = false;
  cv.addEventListener("pointerdown", (e) => {
    down = true;
    cv.setPointerCapture(e.pointerId);
    if (S.holding) S.holding.x = clamp(pointerX(e), FIELD.L, FIELD.R);
  });
  cv.addEventListener("pointermove", (e) => {
    if (S.holding) S.holding.x = clamp(pointerX(e), FIELD.L, FIELD.R);
  });
  cv.addEventListener("pointerup", (e) => {
    if (S.holding) S.holding.x = clamp(pointerX(e), FIELD.L, FIELD.R);
    if (down) dropHolding();
    down = false;
  });
  cv.addEventListener("pointercancel", () => { down = false; });
}

function bindUI() {
  $("btnRestart").onclick = reset;
  $("btnAgain").onclick = reset;
  $("btnSpray").onclick = useSpray;
  $("btnSpade").onclick = useSpade;
  addEventListener("resize", layout);
}

function loop(t) {
  requestAnimationFrame(loop);
  const dt = Math.min(34, t - (lastFrame || t));
  lastFrame = t;
  if (S.running) {
    physics();
    let guard = 0;
    while (detectMerge() && guard++ < 8) {}
    checkOverload(dt);
  }
  updateParticles();
  render();
}

window.__flowerDebug = {
  S,
  TIERS,
  BOUQUETS,
  cloneOrder,
  mkBall,
  merge,
  renderOrders,
  updateHud,
  get CW() { return CW; },
  get FIELD() { return FIELD; },
};

layout();
bindInput();
bindUI();
reset();
requestAnimationFrame(loop);
