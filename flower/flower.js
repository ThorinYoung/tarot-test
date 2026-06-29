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
  { name: "晨间小束", bonus: 55, req: [[1, 1]] },
  { name: "白花试作", bonus: 70, req: [[2, 1]] },
];

const FLOWER_LANG = [
  { name: "告白花束", tiers: [1, 2], score: 70, color: "#e8899c", clearTiny: false },
  { name: "蓝白信笺", tiers: [2, 4], score: 110, color: "#89aee1", clearTiny: true },
  { name: "晴日花园", tiers: [3, 6], score: 180, color: "#e9b743", clearTiny: true },
];

const LEADS = [
  { id: "song", name: "宋以衡", img: "assets/song-yiheng.png", accent: "#8fa6bd", pos: "18% 30%" },
  { id: "jiang", name: "江驰野", img: "assets/jiang-chiye.jpg", accent: "#b84b46", pos: "19% 34%" },
  { id: "ye", name: "叶渊", img: "assets/ye-yuan.jpg", accent: "#4e75a6", pos: "19% 34%" },
  { id: "shen", name: "沈寂", img: "assets/shen-ji.png", accent: "#9a7a61", pos: "19% 32%" },
];

const SPECIAL_ORDERS = [
  {
    special: true,
    key: "song-night",
    leadId: "song",
    name: "宋以衡的夜班花束",
    tag: "问诊来信",
    line: "他想把值班室的灯光调得柔一点。",
    doneLine: "宋以衡收下花束，留给你一只备用喷壶。",
    bonus: 155,
    req: [[1, 1], [2, 1]],
    reward: { spray: 1, score: 30 },
    minLevel: 0,
  },
  {
    special: true,
    key: "jiang-finish",
    leadId: "jiang",
    name: "江驰野的终点花束",
    tag: "赛后邀约",
    line: "他把领奖台旁的位置空了出来。",
    doneLine: "江驰野朝你扬了扬下巴，接下来短时间得分更高。",
    bonus: 190,
    req: [[1, 2], [3, 1]],
    reward: { boost: 8000, score: 45 },
    minLevel: 1,
  },
  {
    special: true,
    key: "ye-midnight",
    leadId: "ye",
    name: "叶渊的夜蓝花礼",
    tag: "午夜短信",
    line: "他只发来一句：蓝色的就好。",
    doneLine: "叶渊把花放在窗边，顺手替你清开了小花。",
    bonus: 230,
    req: [[2, 1], [4, 1]],
    reward: { clearTiny: true, score: 60 },
    minLevel: 2,
  },
  {
    special: true,
    key: "shen-study",
    leadId: "shen",
    name: "沈寂的书房花礼",
    tag: "旧日便笺",
    line: "他在书页里夹了一张只写给你的纸条。",
    doneLine: "沈寂合上书，把修枝铲轻轻推到你手边。",
    bonus: 260,
    req: [[3, 1], [5, 1]],
    reward: { spade: 1, score: 70 },
    minLevel: 3,
  },
];

const LEVELS = [
  { name: "初恋花园", goalBouquets: 3, targetScore: 320, comboGoal: 2, maxTierGoal: 2, spawnTier1Rate: 0.22, spray: 1, spade: 1, overloadMs: 2400, orderPool: [5, 6, 0], orderStages: [[5, 5, 6], [5, 6, 0], [6, 0, 0]] },
  { name: "云边练习", goalBouquets: 4, targetScore: 560, comboGoal: 2, maxTierGoal: 3, spawnTier1Rate: 0.25, spray: 1, spade: 1, overloadMs: 2300, orderPool: [5, 6, 0, 1], orderStages: [[5, 6, 0], [6, 0, 1], [0, 1, 1]] },
  { name: "蓝白信笺", goalBouquets: 4, targetScore: 760, comboGoal: 3, maxTierGoal: 4, spawnTier1Rate: 0.28, spray: 1, spade: 1, overloadMs: 2200, orderPool: [0, 1, 2], orderStages: [[0, 0, 1], [0, 1, 2], [1, 2, 2]] },
  { name: "午后花篮", goalBouquets: 5, targetScore: 1050, comboGoal: 3, maxTierGoal: 4, spawnTier1Rate: 0.3, spray: 1, spade: 1, overloadMs: 2150, orderPool: [1, 2, 3], orderStages: [[1, 1, 2], [1, 2, 3], [2, 3, 3]] },
  { name: "晴日纪念", goalBouquets: 5, targetScore: 1350, comboGoal: 4, maxTierGoal: 5, spawnTier1Rate: 0.31, spray: 1, spade: 1, overloadMs: 2100, orderPool: [1, 2, 3, 4], orderStages: [[1, 2, 2], [2, 3, 4], [3, 4, 4]] },
  { name: "花架加急", goalBouquets: 6, targetScore: 1700, comboGoal: 4, maxTierGoal: 5, spawnTier1Rate: 0.33, spray: 1, spade: 0, overloadMs: 2050, orderPool: [1, 2, 3, 4], orderStages: [[1, 2, 3], [2, 3, 4], [3, 4, 4]] },
  { name: "蓝绣球日", goalBouquets: 6, targetScore: 2100, comboGoal: 4, maxTierGoal: 5, spawnTier1Rate: 0.34, spray: 2, spade: 1, overloadMs: 2000, orderPool: [2, 3, 4], orderStages: [[2, 2, 3], [2, 3, 4], [3, 4, 4]] },
  { name: "康乃馨约", goalBouquets: 6, targetScore: 2500, comboGoal: 5, maxTierGoal: 5, spawnTier1Rate: 0.35, spray: 1, spade: 1, overloadMs: 1950, orderPool: [2, 3, 4], orderStages: [[2, 3, 3], [2, 3, 4], [3, 4, 4]] },
  { name: "向阳花庭", goalBouquets: 7, targetScore: 3100, comboGoal: 5, maxTierGoal: 6, spawnTier1Rate: 0.36, spray: 2, spade: 1, overloadMs: 1900, orderPool: [2, 3, 4], orderStages: [[2, 3, 3], [3, 4, 4], [4, 4, 4]] },
  { name: "满园盛放", goalBouquets: 7, targetScore: 3800, comboGoal: 6, maxTierGoal: 6, spawnTier1Rate: 0.38, spray: 2, spade: 1, overloadMs: 1850, orderPool: [2, 3, 4], orderStages: [[2, 3, 4], [3, 4, 4], [4, 4, 4]] },
];
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
  levelIdx: clamp(Number(load("flower_level", 0)) || 0, 0, LEVELS.length - 1),
  unlocked: clamp(Number(load("flower_unlocked", 0)) || 0, 0, LEVELS.length - 1),
  lastStars: 0,
  spray: 1,
  spade: 1,
  sprayUsed: 0,
  spadeUsed: 0,
  bouquets: 0,
  specialDone: 0,
  scoreBoostUntil: 0,
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

function currentLevel() {
  S.levelIdx = clamp(Number(S.levelIdx) || 0, 0, LEVELS.length - 1);
  return LEVELS[S.levelIdx];
}

function orderStage() {
  const lv = currentLevel();
  const ratio = lv.goalBouquets ? S.bouquets / lv.goalBouquets : 0;
  if (ratio >= 0.66) return 2;
  if (ratio >= 0.33) return 1;
  return 0;
}

function levelRecipeIds(stage = orderStage()) {
  const lv = currentLevel();
  if (lv.orderStages && lv.orderStages.length) {
    return lv.orderStages[clamp(stage, 0, lv.orderStages.length - 1)] || lv.orderStages[0];
  }
  return lv.orderPool || BOUQUETS.map((_, i) => i);
}

function levelRecipes(stage = orderStage()) {
  const pool = levelRecipeIds(stage);
  return pool.map((idx) => BOUQUETS[idx]).filter(Boolean);
}

function shuffleCopy(items) {
  return items.slice().sort(() => Math.random() - 0.5);
}

function uniqueRecipes(recipes) {
  const seen = new Set();
  return recipes.filter((recipe) => {
    if (!recipe || seen.has(recipe.name)) return false;
    seen.add(recipe.name);
    return true;
  });
}

function leadById(id) {
  return LEADS.find((lead) => lead.id === id) || LEADS[0];
}

function availableSpecialOrders() {
  return SPECIAL_ORDERS.filter((order) => S.levelIdx >= order.minLevel);
}

function pickSpecialOrder() {
  const pool = availableSpecialOrders();
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

function hasActiveSpecialOrder() {
  return S.orders && S.orders.some((order) => order && !order.done && order.special);
}

function shouldSpawnSpecialOrder() {
  if (hasActiveSpecialOrder()) return false;
  if (S.specialDone <= 0 && S.bouquets <= 0) return true;
  const chance = clamp(0.18 + S.levelIdx * 0.015 + S.specialDone * 0.02, 0.18, 0.34);
  return Math.random() < chance;
}

function startLevel(idx = S.levelIdx) {
  S.levelIdx = clamp(Number(idx) || 0, 0, LEVELS.length - 1);
  S.unlocked = Math.max(S.unlocked, S.levelIdx);
  save("flower_level", S.levelIdx);
  save("flower_unlocked", S.unlocked);
  reset();
}

function savedStars(idx) {
  return clamp(Number(load("flower_level_star_" + idx, 0)) || 0, 0, 3);
}

function saveStars(idx, stars) {
  const best = Math.max(savedStars(idx), stars);
  save("flower_level_star_" + idx, best);
  return best;
}

function openLevelBook() {
  renderLevelBook();
  $("levelOverlay").classList.add("show");
  $("levelOverlay").setAttribute("aria-hidden", "false");
}

function closeLevelBook() {
  $("levelOverlay").classList.remove("show");
  $("levelOverlay").setAttribute("aria-hidden", "true");
}

function renderLevelBook() {
  const host = $("levelGrid");
  if (!host) return;
  const unlocked = Math.max(S.unlocked, S.levelIdx);
  host.innerHTML = LEVELS.map((lv, i) => {
    const locked = i > unlocked;
    const stars = savedStars(i);
    const current = i === S.levelIdx;
    const state = locked ? "未开放" : (stars ? starText(stars) : "☆☆☆");
    return `<button class="level-card ${current ? "current" : ""}" data-level="${i}" ${locked ? "disabled" : ""}>
      <span class="level-card-top"><span class="level-no">${i + 1}</span><span class="level-stars">${state}</span></span>
      <strong>${lv.name}</strong>
      <small>${lv.goalBouquets} 束 · ${lv.targetScore} 分</small>
    </button>`;
  }).join("");
  for (const btn of host.querySelectorAll(".level-card:not(:disabled)")) {
    btn.onclick = () => {
      closeLevelBook();
      startLevel(Number(btn.dataset.level));
    };
  }
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
  return Math.random() < currentLevel().spawnTier1Rate ? 1 : 0;
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
  const lv = currentLevel();
  S.balls = [];
  S.particles = [];
  S.score = 0;
  S.combo = 0;
  S.comboAt = 0;
  S.over = 0;
  S.running = true;
  S.spray = lv.spray;
  S.spade = lv.spade;
  S.sprayUsed = 0;
  S.spadeUsed = 0;
  S.bouquets = 0;
  S.specialDone = 0;
  S.scoreBoostUntil = 0;
  S.maxTier = 0;
  S.bestCombo = 0;
  S.lastStars = 0;
  S.orders = makeOrders();
  S.next = { tier: spawnTier() };
  S.holding = { tier: spawnTier(), x: (FIELD.L + FIELD.R) / 2 };
  $("overlay").classList.remove("show");
  $("overlay").setAttribute("aria-hidden", "true");
  $("btnNextLevel").hidden = true;
  $("btnAgain").textContent = "再开一局";
  updateHud();
  drawNext();
  const firstSpecial = S.orders.find((order) => order.special);
  if (firstSpecial) setTimeout(() => showLeadNote(firstSpecial, firstSpecial.line), 520);
}

function makeOrders() {
  const lv = currentLevel();
  const recipes = uniqueRecipes([
    ...levelRecipes(0),
    ...levelRecipes(1),
    ...levelRecipes(2),
    ...(lv.orderPool || []).map((idx) => BOUQUETS[idx]),
  ]);
  const pool = shuffleCopy(recipes);
  while (pool.length < 3) pool.push(recipes[pool.length % recipes.length] || BOUQUETS[0]);
  const orders = pool.slice(0, 3);
  const special = pickSpecialOrder();
  if (special) orders[2] = special;
  return orders.map((recipe, i) => cloneOrder(recipe, i));
}

function cloneOrder(recipe, slot, incoming = false) {
  const lead = recipe.leadId ? leadById(recipe.leadId) : null;
  return {
    slot,
    key: recipe.key || recipe.name,
    name: recipe.name,
    bonus: recipe.bonus,
    req: recipe.req.map(([tier, count]) => ({ tier, count, got: 0 })),
    done: false,
    incoming,
    special: !!recipe.special,
    leadId: recipe.leadId || "",
    leadName: lead ? lead.name : "",
    leadImg: lead ? lead.img : "",
    leadAccent: lead ? lead.accent : "",
    leadPos: lead ? lead.pos : "50% 50%",
    tag: recipe.tag || "",
    line: recipe.line || "",
    doneLine: recipe.doneLine || "",
    reward: recipe.reward ? { ...recipe.reward } : null,
  };
}

function refillOrder(slot) {
  const used = new Set(S.orders.filter((o) => !o.done).map((o) => o.name));
  const recipes = levelRecipes();
  const candidates = recipes.filter((b) => !used.has(b.name));
  const source = candidates.length ? candidates : recipes;
  const special = shouldSpawnSpecialOrder() ? pickSpecialOrder() : null;
  const recipe = special || source[Math.floor(Math.random() * source.length)] || BOUQUETS[slot % BOUQUETS.length];
  S.orders[slot] = cloneOrder(recipe, slot, true);
  renderOrders();
  if (S.orders[slot].special) {
    showLeadNote(S.orders[slot], S.orders[slot].line || "新的来信到了。");
  }
  setTimeout(() => {
    if (S.orders[slot]) S.orders[slot].incoming = false;
    renderOrders();
  }, 420);
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
      if (order.special) applySpecialReward(order, ball.x, ball.y);
      burst(ball.x, ball.y - 18, "#d9aa58", 38, 2.6);
      floatText(ball.x, ball.y - 26, order.name + " +" + order.bonus, "order");
      toast("完成 " + order.name);
      if (S.bouquets >= currentLevel().goalBouquets) {
        setTimeout(roundClear, 820);
      } else {
        setTimeout(() => refillOrder(order.slot), 900);
      }
    }
    return true;
  }
  return false;
}

function applySpecialReward(order, x, y) {
  const reward = order.reward || {};
  S.specialDone++;
  if (reward.spray) S.spray += reward.spray;
  if (reward.spade) S.spade += reward.spade;
  if (reward.score) addScore(reward.score);
  if (reward.boost) {
    S.scoreBoostUntil = Math.max(S.scoreBoostUntil, performance.now() + reward.boost);
    floatText(x, y - 56, "心动加成", "combo");
  }
  if (reward.clearTiny) {
    pruneTinyNear(CW / 2, FIELD.BOT - 90 * SCALE, 180 * SCALE);
    floatText(CW / 2, FIELD.BOT - 122 * SCALE, "夜蓝清场", "combo");
  }
  showLeadNote(order, order.doneLine || (order.leadName + " 收下了花束。"));
  updateHud();
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
  const gain = S.scoreBoostUntil > performance.now() ? Math.round(v * 1.35) : v;
  S.score += gain;
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
  const lv = currentLevel();
  $("scoreBox").textContent = S.score;
  $("scoreBox").classList.toggle("boost", S.scoreBoostUntil > performance.now());
  $("bestScore").textContent = S.best;
  $("sprayCount").textContent = S.spray;
  $("spadeCount").textContent = S.spade;
  $("btnSpray").classList.toggle("disabled", S.spray <= 0);
  $("btnSpade").classList.toggle("disabled", S.spade <= 0);
  const tier = S.holding ? S.holding.tier : 0;
  $("tierName").textContent = TIERS[tier].name;
  $("levelTag").textContent = "第 " + (S.levelIdx + 1) + " 关";
  $("levelName").textContent = lv.name;
  $("bouquetCount").textContent = S.bouquets;
  $("bouquetGoal").textContent = lv.goalBouquets;
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
    const cls = ["bouquet-card", order.special ? "special" : "", order.done ? "done" : "", order.incoming ? "incoming" : ""].filter(Boolean).join(" ");
    if (order.special) {
      return `<div class="${cls}" data-slot="${order.slot}" style="--lead-accent:${order.leadAccent};--lead-pos:${order.leadPos}">
        <div class="lead-order-top">
          <img class="lead-avatar" src="${order.leadImg}" alt="">
          <span class="lead-order-copy"><em>${order.tag || "来信"}</em><strong>${order.done ? "已赴约" : order.leadName}</strong></span>
        </div>
        <span class="bouquet-name">${order.done ? order.name : order.name}</span>
        <div class="bouquet-reqs">${needs}</div>
      </div>`;
    }
    return `<div class="${cls}" data-slot="${order.slot}"><span class="bouquet-name">${order.done ? "已包装" : order.name}</span><div class="bouquet-reqs">${needs}</div></div>`;
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

function showLeadNote(order, text) {
  if (!order || !order.special) return;
  const host = $("garden");
  const prev = host.querySelector(".lead-note");
  if (prev) prev.remove();
  const note = document.createElement("div");
  note.className = "lead-note";
  note.style.setProperty("--lead-accent", order.leadAccent);
  note.style.setProperty("--lead-pos", order.leadPos);
  note.innerHTML = `<img src="${order.leadImg}" alt=""><span><em>${order.leadName}</em><strong>${text}</strong></span>`;
  host.appendChild(note);
  requestAnimationFrame(() => note.classList.add("show"));
  setTimeout(() => {
    note.classList.remove("show");
    setTimeout(() => note.remove(), 260);
  }, 2300);
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
  if (S.over > (currentLevel().overloadMs || BAL.overloadMs)) gameOver();
}

function gameOver() {
  if (!S.running) return;
  S.running = false;
  const lv = currentLevel();
  showResult("花园已满", "第 " + (S.levelIdx + 1) + " 关 · 完成花束 " + S.bouquets + "/" + lv.goalBouquets + " · 最高连锁 ×" + Math.max(1, S.bestCombo));
}

function roundClear() {
  if (!S.running) return;
  S.running = false;
  burst(CW / 2, FIELD.TOP + 48, "#d9aa58", 70, 3.2);
  const lv = currentLevel();
  const stars = calcStars();
  S.lastStars = stars;
  const bestStars = saveStars(S.levelIdx, stars);
  S.unlocked = Math.max(S.unlocked, Math.min(S.levelIdx + 1, LEVELS.length - 1));
  save("flower_unlocked", S.unlocked);
  showResult(
    "第 " + (S.levelIdx + 1) + " 关完成",
    starText(stars) + " · " + lv.name + " · 目标分 " + S.score + "/" + lv.targetScore
      + " · 最大花 " + TIERS[S.maxTier].name
      + " · 最高连锁 ×" + Math.max(1, S.bestCombo)
      + (S.specialDone ? " · 特殊委托 " + S.specialDone : "")
      + (bestStars > stars ? " · 历史 " + starText(bestStars) : ""),
    true
  );
}

function calcStars() {
  const lv = currentLevel();
  let stars = 1;
  if (S.score >= lv.targetScore) stars++;
  if (S.bestCombo >= lv.comboGoal || S.maxTier >= lv.maxTierGoal) stars++;
  return clamp(stars, 1, 3);
}

function starText(stars) {
  return "★".repeat(stars) + "☆".repeat(3 - stars);
}

function showResult(title, stats, cleared = false) {
  $("modalTitle").textContent = title;
  $("finalScore").textContent = S.score;
  $("modalStats").textContent = stats;
  $("btnAgain").textContent = cleared ? "重玩本关" : "再试一次";
  $("btnNextLevel").hidden = !(cleared && S.levelIdx < LEVELS.length - 1);
  $("overlay").classList.add("show");
  $("overlay").setAttribute("aria-hidden", "false");
}

function useSpray() {
  if (!S.running || S.spray <= 0) return;
  S.spray--;
  S.sprayUsed++;
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
  S.spadeUsed++;
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
  $("btnRestart").onclick = () => startLevel(S.levelIdx);
  $("btnAgain").onclick = () => startLevel(S.levelIdx);
  $("btnNextLevel").onclick = () => startLevel(S.levelIdx + 1);
  $("btnLevels").onclick = openLevelBook;
  $("btnLevelBook").onclick = openLevelBook;
  $("btnCloseLevels").onclick = closeLevelBook;
  $("levelOverlay").addEventListener("click", (e) => {
    if (e.target === $("levelOverlay")) closeLevelBook();
  });
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
  LEADS,
  SPECIAL_ORDERS,
  LEVELS,
  cloneOrder,
  mkBall,
  merge,
  renderOrders,
  updateHud,
  currentLevel,
  startLevel,
  calcStars,
  orderStage,
  levelRecipeIds,
  levelRecipes,
  pickSpecialOrder,
  showLeadNote,
  renderLevelBook,
  openLevelBook,
  get CW() { return CW; },
  get FIELD() { return FIELD; },
};

layout();
bindInput();
bindUI();
reset();
requestAnimationFrame(loop);
