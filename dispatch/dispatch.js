"use strict";

const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

const DURATION = 90;
const MAX_CRACKS = 9;
const STORE_BEST = "dispatch_route_best_v1";

const LEADS = {
  shen: {
    name: "沈寂",
    short: "沈",
    color: "#f0c75e",
    mark: "契",
    avatar: "assets/leads/shen-ji.png",
    label: "董事会围猎",
    saved: "沈寂收回董事会密钥。",
    crack: "沈寂线索被董事会截走。",
    lines: {
      intro: "合同我来压住,你只管把线接稳。",
      level: "董事会开始收网了。",
      save: ["还不算太晚。", "这份证据,归我保管。"],
      danger: ["别让他们碰到核心。", "线断了,他们会立刻反咬。"],
      combo: "继续,我能把局面稳住。",
    },
  },
  yan: {
    name: "江驰野",
    short: "江",
    color: "#ff6b4a",
    mark: "刹",
    avatar: "assets/leads/jiang-chiye.jpg",
    label: "赛车场事故",
    saved: "江驰野压住最后一个弯道。",
    crack: "江驰野事故视频被剪成黑料。",
    lines: {
      intro: "给我一条干净路线,我能冲出去。",
      level: "赛道变窄了,别让他们逼停我。",
      save: ["漂亮,这个弯过了。", "听你的,我不抢线。"],
      danger: ["刹车线不对劲。", "再慢一步,他们就剪成事故了。"],
      combo: "节奏对了,继续压弯。",
    },
  },
  ye: {
    name: "叶渊",
    short: "叶",
    color: "#7fd6c2",
    mark: "码",
    avatar: "assets/leads/ye-yuan.jpg",
    label: "情报泄露",
    saved: "叶渊保住线人坐标。",
    crack: "叶渊关闭了共享定位。",
    lines: {
      intro: "我会给你留下暗号。",
      level: "第三条线接入,坐标别暴露。",
      save: ["暗号对上了。", "线人还活着,继续。"],
      danger: ["有人在反查坐标。", "再泄一次,我只能切断定位。"],
      combo: "很好,信息差回来了。",
    },
  },
  song: {
    name: "宋以衡",
    short: "宋",
    color: "#7da4ff",
    mark: "历",
    avatar: "assets/leads/song-yiheng.png",
    label: "实验室嫁祸",
    saved: "宋以衡锁住样本链。",
    crack: "宋以衡的病历被替换。",
    lines: {
      intro: "先从我的样本链开始。",
      level: "病历系统开始回流。",
      save: ["样本链闭合了。", "我还撑得住。"],
      danger: ["病历被动过。", "别让裂隙吞掉原始记录。"],
      combo: "证据连续,他们改不了了。",
    },
  },
};

const SIGNAL_TEXT = {
  shen: ["合同陷阱", "黑网回流", "席位冻结"],
  yan: ["刹车报警", "赛道遮挡", "油温爆点"],
  ye: ["暗号反破", "线人断联", "黑账坐标"],
  song: ["病历替换", "样本失温", "录音外泄"],
};

const LEAD_KEYS = Object.keys(LEADS);
const AVATARS = {};
for (const key of LEAD_KEYS) {
  const img = new Image();
  img.decoding = "async";
  img.src = LEADS[key].avatar;
  AVATARS[key] = img;
}

const LEVELS = [
  {
    start: 0,
    name: "第1幕 · 试航",
    rule: "2线慢速",
    leads: ["song", "yan"],
    interval: 3.8,
    maxSignals: 3,
    speed: 0.82,
    ttlBonus: 5,
    criticalRate: 0.06,
    rushEvery: 0,
    rushSize: 0,
    collision: false,
    focus: "song",
    tip: "宋以衡与江驰野线先入场。",
  },
  {
    start: 18,
    name: "第2幕 · 双线并行",
    rule: "3线入场",
    leads: ["song", "yan", "ye"],
    interval: 3.05,
    maxSignals: 5,
    speed: 0.96,
    ttlBonus: 3,
    criticalRate: 0.14,
    rushEvery: 0,
    rushSize: 0,
    collision: true,
    focus: "ye",
    tip: "叶渊线接入,航线碰撞开始计裂痕。",
  },
  {
    start: 36,
    name: "第3幕 · 四角合围",
    rule: "4线交叉",
    leads: LEAD_KEYS,
    interval: 2.45,
    maxSignals: 6,
    speed: 1.08,
    ttlBonus: 1.4,
    criticalRate: 0.2,
    rushEvery: 11,
    rushSize: 2,
    collision: true,
    focus: "shen",
    tip: "沈寂线入场,四个锚点全部启用。",
  },
  {
    start: 56,
    name: "第4幕 · 红色预警",
    rule: "急件增多",
    leads: LEAD_KEYS,
    interval: 1.95,
    maxSignals: 7,
    speed: 1.18,
    ttlBonus: 0,
    criticalRate: 0.34,
    rushEvery: 8.5,
    rushSize: 2,
    collision: true,
    focus: "yan",
    tip: "红色急件变多,优先处理快要失控的牌。",
  },
  {
    start: 74,
    name: "终幕 · 裂隙压迫",
    rule: "高压冲刺",
    leads: LEAD_KEYS,
    interval: 1.55,
    maxSignals: 8,
    speed: 1.32,
    ttlBonus: -1.2,
    criticalRate: 0.42,
    rushEvery: 6.2,
    rushSize: 3,
    collision: true,
    focus: "song",
    tip: "裂隙进入终幕,同时调度三张牌。",
  },
];
const FIELD_POINTS = [
  { x: 0.2, y: 0.18, r: 1.7, p: 0.2 },
  { x: 0.34, y: 0.24, r: 1.1, p: 1.6 },
  { x: 0.72, y: 0.17, r: 1.5, p: 2.4 },
  { x: 0.84, y: 0.34, r: 1.0, p: 3.2 },
  { x: 0.18, y: 0.56, r: 1.0, p: 4.1 },
  { x: 0.31, y: 0.78, r: 1.4, p: 5.4 },
  { x: 0.66, y: 0.76, r: 1.2, p: 0.8 },
  { x: 0.81, y: 0.62, r: 1.6, p: 2.9 },
  { x: 0.49, y: 0.34, r: 1.0, p: 4.8 },
  { x: 0.55, y: 0.66, r: 1.3, p: 3.9 },
];
const FIELD_LINKS = [[0, 1], [1, 8], [8, 2], [2, 3], [4, 9], [9, 6], [6, 7], [5, 9]];

const S = {
  running: false,
  paused: true,
  ended: false,
  sound: true,
  time: DURATION,
  score: 0,
  best: load(STORE_BEST, 0),
  cracks: 0,
  saves: 0,
  combo: 0,
  comboLead: null,
  spawnAcc: 0,
  nextId: 1,
  signals: [],
  sparks: [],
  dialogues: [],
  logs: [],
  drag: null,
  firstWave: true,
  levelIndex: 0,
  rushAcc: 0,
  anchors: {},
  w: 0,
  h: 0,
  lastTs: 0,
};

const stage = $("stage");
const ctx2 = stage.getContext("2d");
let toastTimer = null;
let audioCtx = null;

function load(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value == null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
}

function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function resizeStage() {
  const rect = stage.getBoundingClientRect();
  const dpr = Math.min(devicePixelRatio || 1, 2);
  S.w = Math.max(320, rect.width);
  S.h = Math.max(320, rect.height);
  stage.width = Math.round(S.w * dpr);
  stage.height = Math.round(S.h * dpr);
  ctx2.setTransform(dpr, 0, 0, dpr, 0, 0);
  placeAnchors();
}

function placeAnchors() {
  const pad = 54;
  S.anchors = {
    shen: { x: pad, y: pad },
    yan: { x: S.w - pad, y: pad },
    ye: { x: pad, y: S.h - pad },
    song: { x: S.w - pad, y: S.h - pad },
  };
}

function resetGame(intro = true) {
  S.running = true;
  S.paused = intro;
  S.ended = false;
  S.time = DURATION;
  S.score = 0;
  S.cracks = 0;
  S.saves = 0;
  S.combo = 0;
  S.comboLead = null;
  S.spawnAcc = 0;
  S.nextId = 1;
  S.signals = [];
  S.sparks = [];
  S.dialogues = [];
  S.drag = null;
  S.firstWave = true;
  S.levelIndex = 0;
  S.rushAcc = 0;
  S.logs = [];
  $("overlay").classList.remove("show");
  $("overlay").setAttribute("aria-hidden", "true");
  $("btnStart").textContent = intro ? "开始调度" : "调度中";
  $("stageHint").classList.toggle("hide", !intro);
  addLog("第1幕 · 试航: 先处理宋以衡与江驰野两条线。");
  addLog("后续会逐步解锁男主线、急件和同时波次。", true);
  if (!intro) {
    spawnOpeningWave();
  }
  renderStats();
}

function startGame() {
  if (!S.running || S.ended) {
    resetGame(false);
    return;
  }
  if (S.paused) {
    S.paused = false;
    $("btnStart").textContent = "调度中";
    $("stageHint").classList.add("hide");
    if (!S.signals.length) {
      spawnOpeningWave();
    }
    toast("第1幕 · 试航");
    tone(520, 0.08, "triangle", 0.045);
  }
}

function spawnOpeningWave() {
  if (!S.firstWave) return;
  S.firstWave = false;
  spawnSignal(0, "song", 3, { critical: false, ttlBonus: 6, speedFactor: 0.78 });
  spawnSignal(0.65, "yan", 0, { critical: false, ttlBonus: 6, speedFactor: 0.78 });
  addDialogue("song", LEADS.song.lines.intro, "info", 4.6);
  addDialogue("yan", LEADS.yan.lines.intro, "info", 4.2);
}

function spawnSignal(delay = 0, forcedLead = null, forcedEdge = null, opts = {}) {
  const level = currentLevel();
  const candidates = opts.leads || level.leads || LEAD_KEYS;
  const lead = forcedLead || candidates[Math.floor(Math.random() * candidates.length)];
  const edge = forcedEdge ?? Math.floor(Math.random() * 4);
  let x = 0;
  let y = 0;
  if (edge === 0) { x = Math.random() * S.w; y = -18; }
  if (edge === 1) { x = S.w + 18; y = Math.random() * S.h; }
  if (edge === 2) { x = Math.random() * S.w; y = S.h + 18; }
  if (edge === 3) { x = -18; y = Math.random() * S.h; }
  if (forcedLead === "song") { x = -18; y = S.h * 0.68; }
  if (forcedLead === "yan") { x = S.w * 0.72; y = -18; }
  const core = { x: S.w / 2 + (Math.random() - 0.5) * 60, y: S.h / 2 + (Math.random() - 0.5) * 60 };
  const angle = Math.atan2(core.y - y, core.x - x);
  const critical = opts.critical ?? Math.random() < (opts.criticalRate ?? level.criticalRate);
  const labelPool = SIGNAL_TEXT[lead];
  const speedFactor = opts.speedFactor ?? level.speed;
  const ttlBonus = opts.ttlBonus ?? level.ttlBonus ?? 0;
  S.signals.push({
    id: S.nextId++,
    lead,
    label: labelPool[Math.floor(Math.random() * labelPool.length)],
    x,
    y,
    vx: Math.cos(angle),
    vy: Math.sin(angle),
    speed: (critical ? 46 : 32) * speedFactor,
    radius: critical ? 13 : 11,
    age: 0,
    ttl: Math.max(7, (critical ? 11 : 16) + ttlBonus),
    route: null,
    routeIndex: 0,
    target: null,
    done: false,
    critical,
    bornDelay: delay,
    levelIndex: S.levelIndex,
    kind: opts.kind || "normal",
  });
}

function elapsedTime() {
  return DURATION - S.time;
}

function levelIndexForElapsed(elapsed) {
  let index = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    if (elapsed >= LEVELS[i].start) index = i;
  }
  return index;
}

function currentLevel() {
  return LEVELS[S.levelIndex] || LEVELS[0];
}

function updateLevelState() {
  const nextIndex = levelIndexForElapsed(elapsedTime());
  if (nextIndex === S.levelIndex) return;
  S.levelIndex = nextIndex;
  S.spawnAcc = 0;
  S.rushAcc = 0;
  const level = currentLevel();
  addLog(`${level.name}: ${level.tip}`);
  addDialogue(level.focus, LEADS[level.focus].lines.level, "level", 4.4);
  toast(level.rule);
  tone(440 + nextIndex * 60, 0.09, "triangle", 0.038);
  spawnLevelBeat(level);
}

function spawnLevelBeat(level) {
  if (activeSignalCount() >= tunedMaxSignals(level)) return;
  const edge = level.focus === "yan" ? 0 : level.focus === "song" ? 3 : level.focus === "ye" ? 2 : 1;
  spawnSignal(0.25, level.focus, edge, {
    critical: S.levelIndex >= 3,
    ttlBonus: (level.ttlBonus ?? 0) + 1,
    speedFactor: Math.max(0.86, level.speed - 0.04),
    kind: "level",
  });
}

function activeSignalCount() {
  return S.signals.filter((sig) => !sig.done).length;
}

function tunedMaxSignals(level) {
  const relief = S.cracks >= 5 ? 1 : 0;
  return Math.max(3, level.maxSignals - relief);
}

function tunedInterval(level) {
  if (S.cracks >= 5) return level.interval + 0.34;
  if (S.cracks >= 3) return level.interval + 0.18;
  return level.interval;
}

function spawnRush(level) {
  const space = tunedMaxSignals(level) - activeSignalCount();
  const count = Math.min(level.rushSize || 0, level.leads.length, Math.max(0, space));
  if (count <= 0) return;
  const offset = S.nextId % level.leads.length;
  for (let i = 0; i < count; i++) {
    const lead = level.leads[(offset + i) % level.leads.length];
    spawnSignal(i * 0.28, lead, (i * 2 + S.levelIndex) % 4, {
      critical: Math.random() < Math.min(0.72, level.criticalRate + 0.14),
      ttlBonus: (level.ttlBonus ?? 0) - 0.6,
      speedFactor: level.speed + 0.04,
      kind: "rush",
    });
  }
  addLog(`${level.name}: 同时吐出 ${count} 张危机牌。`, true);
}

function tick(dt) {
  if (!S.running || S.paused || S.ended) return;
  S.time = Math.max(0, S.time - dt);
  updateLevelState();
  S.spawnAcc += dt;
  S.rushAcc += dt;
  const level = currentLevel();
  const interval = tunedInterval(level);
  const maxSignals = tunedMaxSignals(level);
  if (S.spawnAcc >= interval && activeSignalCount() < maxSignals) {
    S.spawnAcc = 0;
    spawnSignal();
  }
  if (level.rushEvery && S.rushAcc >= level.rushEvery && activeSignalCount() <= maxSignals - 2) {
    S.rushAcc = 0;
    spawnRush(level);
  }

  for (const sig of S.signals) {
    if (sig.bornDelay > 0) {
      sig.bornDelay -= dt;
      continue;
    }
    if (!sig.route) sig.age += dt;
    moveSignal(sig, dt);
  }
  checkLeaks();
  checkCollisions();
  S.signals = S.signals.filter((sig) => !sig.done);
  S.sparks = S.sparks.filter((spark) => (spark.life -= dt) > 0);
  S.dialogues = S.dialogues.filter((item) => (item.life -= dt) > 0);
  if (S.time <= 0) endGame("time");
  renderStats();
}

function moveSignal(sig, dt) {
  if (sig.route && sig.routeIndex < sig.route.length) {
    const target = sig.route[sig.routeIndex];
    const dx = target.x - sig.x;
    const dy = target.y - sig.y;
    const d = Math.hypot(dx, dy);
    const step = (sig.speed + 130) * dt;
    if (d <= step) {
      sig.x = target.x;
      sig.y = target.y;
      sig.routeIndex++;
      if (sig.routeIndex >= sig.route.length) landSignal(sig);
    } else {
      sig.x += dx / d * step;
      sig.y += dy / d * step;
    }
  } else {
    sig.x += sig.vx * sig.speed * dt;
    sig.y += sig.vy * sig.speed * dt;
  }
}

function landSignal(sig) {
  if (sig.target === sig.lead) {
    const lead = LEADS[sig.lead];
    sig.done = true;
    S.saves++;
    S.combo = S.comboLead === sig.lead ? S.combo + 1 : 1;
    S.comboLead = sig.lead;
    S.score += sig.critical ? 95 : 60;
    if (S.combo >= 3) {
      S.score += 120;
      addLog(`${lead.name}连救三次: ${lead.saved}`);
      addDialogue(sig.lead, lead.lines.combo, "combo", 4.2);
      S.combo = 0;
    } else {
      addLog(`${lead.name}线稳定: ${sig.label}`);
      addDialogue(sig.lead, pickLine(lead.lines.save), "save", 3.6);
    }
    burst(sig.x, sig.y, lead.color, 10);
    tone(680, 0.06, "sine", 0.035);
    return;
  }
  crack(sig.lead, `${LEADS[sig.lead].name}信号被送错锚点`);
  sig.done = true;
}

function checkLeaks() {
  for (const sig of S.signals) {
    if (sig.done || sig.route || sig.bornDelay > 0) continue;
    if (sig.age >= sig.ttl) {
      crack(sig.lead, LEADS[sig.lead].crack);
      sig.done = true;
      burst(sig.x, sig.y, "#ff5d66", 12);
    }
  }
}

function checkCollisions() {
  if (!currentLevel().collision) return;
  for (let i = 0; i < S.signals.length; i++) {
    const a = S.signals[i];
    if (a.done || !a.route || a.bornDelay > 0) continue;
    for (let j = i + 1; j < S.signals.length; j++) {
      const b = S.signals[j];
      if (b.done || !b.route || b.bornDelay > 0) continue;
      if (dist(a, b) < a.radius + b.radius + 3) {
        a.done = true;
        b.done = true;
        crack(a.lead, `${LEADS[a.lead].name}与${LEADS[b.lead].name}航线相撞`);
        crack(b.lead, "二次冲突扩大");
        burst((a.x + b.x) / 2, (a.y + b.y) / 2, "#ff5d66", 18);
        tone(120, 0.12, "square", 0.04);
        return;
      }
    }
  }
}

function crack(lead, message) {
  S.cracks++;
  S.combo = 0;
  S.score = Math.max(0, S.score - 45);
  addLog(`裂痕 +1: ${message}`);
  addDialogue(lead, pickLine(LEADS[lead].lines.danger), "danger", 4.0);
  toast(`${LEADS[lead].name}线出现裂痕`);
  if (S.cracks >= MAX_CRACKS) endGame("fail");
}

function burst(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 30 + Math.random() * 70;
    S.sparks.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, color, life: 0.35 + Math.random() * 0.25 });
  }
}

function pickLine(lines) {
  return lines[Math.floor(Math.random() * lines.length)];
}

function addDialogue(lead, text, type = "info", life = 3.6) {
  const anchor = S.anchors[lead];
  if (!anchor || !text) return;
  const existing = S.dialogues.find((item) => item.lead === lead);
  const item = {
    lead,
    text,
    type,
    life,
    maxLife: life,
    x: anchor.x,
    y: anchor.y,
  };
  if (existing) Object.assign(existing, item);
  else S.dialogues.push(item);
  S.dialogues = S.dialogues.slice(-4);
}

function addLog(text, muted = false) {
  S.logs.unshift({ text, muted });
  S.logs = S.logs.slice(0, 4);
  $("logFeed").innerHTML = S.logs.map((item) => `<div class="log-line ${item.muted ? "muted" : ""}">${item.text}</div>`).join("");
}

function renderStats() {
  $("timeText").textContent = Math.ceil(S.time);
  $("saveText").textContent = S.saves;
  $("crackText").textContent = S.cracks;
  $("comboText").textContent = `连救 ${S.combo}`;
  renderLevel();
  publishDebug();
}

function renderLevel() {
  const level = currentLevel();
  const next = LEVELS[S.levelIndex + 1];
  const start = level.start;
  const end = next ? next.start : DURATION;
  const progress = clamp((elapsedTime() - start) / Math.max(1, end - start), 0, 1);
  $("levelName").textContent = level.name;
  $("levelRule").textContent = level.rule;
  $("levelMeter").style.width = `${Math.round(progress * 100)}%`;
}

function endGame(kind) {
  if (S.ended) return;
  S.ended = true;
  S.paused = true;
  S.running = false;
  const final = S.score + S.saves * 25 + Math.max(0, DURATION - S.time) * 3 - S.cracks * 40;
  S.best = Math.max(S.best, Math.floor(final));
  save(STORE_BEST, S.best);
  const title = kind === "fail" ? "航线崩溃" : "调度结算";
  const note = kind === "fail"
    ? "裂痕过多,四条剧情线互相撞穿。下一局要先处理红色信号。"
    : `你稳定了 ${S.saves} 个危机信号,留下 ${S.cracks} 道剧情裂痕。`;
  $("modal").innerHTML = `
    <h2>${title}</h2>
    <p>${note}</p>
    <div class="modal-stats">
      <div class="modal-stat"><b>${S.saves}</b><span>稳定</span></div>
      <div class="modal-stat"><b>${S.cracks}</b><span>裂痕</span></div>
      <div class="modal-stat"><b>${Math.floor(final)}</b><span>结局值</span></div>
    </div>
    <button class="modal-btn" id="modalAgain">再调度一次</button>`;
  $("overlay").classList.add("show");
  $("overlay").setAttribute("aria-hidden", "false");
  $("modalAgain").onclick = () => resetGame(false);
}

function pointFromEvent(ev) {
  const rect = stage.getBoundingClientRect();
  return { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
}

function signalAt(pt) {
  let hit = null;
  for (const sig of S.signals) {
    if (sig.done || sig.bornDelay > 0) continue;
    if (dist(pt, sig) <= sig.radius + 12) hit = sig;
  }
  return hit;
}

function anchorAt(pt) {
  let best = null;
  let bestD = Infinity;
  for (const [key, anchor] of Object.entries(S.anchors)) {
    const d = dist(pt, anchor);
    if (d < bestD) {
      bestD = d;
      best = key;
    }
  }
  return bestD < 54 ? best : null;
}

stage.addEventListener("pointerdown", (ev) => {
  if (!S.running || S.paused || S.ended) {
    toast("先点开始调度");
    return;
  }
  const pt = pointFromEvent(ev);
  const sig = signalAt(pt);
  if (!sig) return;
  stage.setPointerCapture?.(ev.pointerId);
  S.drag = { id: sig.id, points: [{ x: sig.x, y: sig.y }, pt] };
});

stage.addEventListener("pointermove", (ev) => {
  if (!S.drag) return;
  const pt = pointFromEvent(ev);
  const last = S.drag.points[S.drag.points.length - 1];
  if (dist(pt, last) > 10) S.drag.points.push(pt);
});

stage.addEventListener("pointerup", (ev) => {
  if (!S.drag) return;
  const sig = S.signals.find((item) => item.id === S.drag.id);
  const pt = pointFromEvent(ev);
  const target = anchorAt(pt);
  if (sig && target) {
    const anchor = S.anchors[target];
    const route = S.drag.points.slice(1).concat([{ x: anchor.x, y: anchor.y }]);
    sig.route = simplifyRoute(route);
    sig.routeIndex = 0;
    sig.target = target;
    addLog(`航线锁定: ${sig.label} -> ${LEADS[target].name}`);
  } else {
    toast("把线拖到男主锚点才会锁定");
  }
  S.drag = null;
});

function simplifyRoute(route) {
  const out = [];
  for (const pt of route) {
    const last = out[out.length - 1];
    if (!last || dist(pt, last) > 14) out.push(pt);
  }
  return out;
}

function draw() {
  ctx2.clearRect(0, 0, S.w, S.h);
  drawBackdrop();
  drawCore();
  drawRoutes();
  drawAnchors();
  drawSignals();
  drawSparks();
  drawDialogues();
  requestAnimationFrame(draw);
}

function drawBackdrop() {
  const t = performance.now() * 0.001;
  const core = { x: S.w / 2, y: S.h / 2 };
  ctx2.save();
  ctx2.lineWidth = 1;

  ctx2.strokeStyle = "rgba(243,216,150,0.045)";
  for (let y = 36; y < S.h; y += 72) {
    ctx2.beginPath();
    ctx2.moveTo(18, y + Math.sin(t + y) * 2);
    ctx2.lineTo(S.w - 18, y + Math.cos(t + y) * 2);
    ctx2.stroke();
  }
  for (let x = 34; x < S.w; x += 76) {
    ctx2.beginPath();
    ctx2.moveTo(x + Math.cos(t + x) * 2, 18);
    ctx2.lineTo(x + Math.sin(t + x) * 2, S.h - 18);
    ctx2.stroke();
  }

  for (const [key, anchor] of Object.entries(S.anchors)) {
    const lead = LEADS[key];
    const cx = (anchor.x + core.x) / 2 + (anchor.x < core.x ? -16 : 16);
    const cy = (anchor.y + core.y) / 2 + (anchor.y < core.y ? -10 : 10);
    const grad = ctx2.createLinearGradient(anchor.x, anchor.y, core.x, core.y);
    grad.addColorStop(0, colorWithAlpha(lead.color, 0.2));
    grad.addColorStop(0.55, colorWithAlpha(lead.color, 0.06));
    grad.addColorStop(1, "rgba(255,93,102,0.11)");
    ctx2.strokeStyle = grad;
    ctx2.lineWidth = 1.2;
    ctx2.beginPath();
    ctx2.moveTo(anchor.x, anchor.y);
    ctx2.quadraticCurveTo(cx, cy, core.x, core.y);
    ctx2.stroke();
  }

  ctx2.strokeStyle = "rgba(243,216,150,0.1)";
  ctx2.lineWidth = 1;
  for (const [a, b] of FIELD_LINKS) {
    const p1 = FIELD_POINTS[a];
    const p2 = FIELD_POINTS[b];
    ctx2.beginPath();
    ctx2.moveTo(p1.x * S.w, p1.y * S.h);
    ctx2.lineTo(p2.x * S.w, p2.y * S.h);
    ctx2.stroke();
  }

  for (const p of FIELD_POINTS) {
    const x = p.x * S.w;
    const y = p.y * S.h;
    const alpha = 0.28 + Math.abs(Math.sin(t * 0.9 + p.p)) * 0.42;
    ctx2.fillStyle = `rgba(243,216,150,${alpha})`;
    ctx2.beginPath();
    ctx2.arc(x, y, p.r, 0, Math.PI * 2);
    ctx2.fill();
  }

  const inset = 21;
  const len = 24;
  ctx2.strokeStyle = "rgba(243,216,150,0.18)";
  ctx2.lineWidth = 1.3;
  ctx2.beginPath();
  ctx2.moveTo(inset, inset + len);
  ctx2.lineTo(inset, inset);
  ctx2.lineTo(inset + len, inset);
  ctx2.moveTo(S.w - inset - len, inset);
  ctx2.lineTo(S.w - inset, inset);
  ctx2.lineTo(S.w - inset, inset + len);
  ctx2.moveTo(inset, S.h - inset - len);
  ctx2.lineTo(inset, S.h - inset);
  ctx2.lineTo(inset + len, S.h - inset);
  ctx2.moveTo(S.w - inset - len, S.h - inset);
  ctx2.lineTo(S.w - inset, S.h - inset);
  ctx2.lineTo(S.w - inset, S.h - inset - len);
  ctx2.stroke();
  ctx2.restore();
}

function drawCore() {
  const x = S.w / 2;
  const y = S.h / 2;
  const t = performance.now() * 0.001;
  const danger = clamp(S.cracks / MAX_CRACKS, 0, 1);
  ctx2.save();
  ctx2.translate(x, y);

  const glow = ctx2.createRadialGradient(0, 0, 4, 0, 0, 118);
  glow.addColorStop(0, `rgba(255,93,102,${0.2 + danger * 0.24})`);
  glow.addColorStop(0.34, "rgba(243,216,150,0.09)");
  glow.addColorStop(1, "rgba(243,216,150,0)");
  ctx2.fillStyle = glow;
  ctx2.beginPath();
  ctx2.arc(0, 0, 118, 0, Math.PI * 2);
  ctx2.fill();

  ctx2.strokeStyle = "rgba(243,216,150,0.18)";
  ctx2.lineWidth = 1.1;
  for (let r = 34; r <= 94; r += 30) {
    ctx2.beginPath();
    ctx2.arc(0, 0, r + Math.sin(t * 1.2 + r) * 1.8, 0, Math.PI * 2);
    ctx2.stroke();
  }

  ctx2.save();
  ctx2.rotate(t * 0.22);
  ctx2.strokeStyle = "rgba(243,216,150,0.2)";
  ctx2.lineWidth = 1;
  ctx2.beginPath();
  for (let i = 0; i < 32; i++) {
    const a = i / 32 * Math.PI * 2;
    const inner = i % 4 === 0 ? 76 : 83;
    const outer = i % 4 === 0 ? 94 : 91;
    ctx2.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
    ctx2.lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
  }
  ctx2.stroke();
  ctx2.restore();

  ctx2.save();
  ctx2.rotate(-t * 0.18);
  ctx2.strokeStyle = "rgba(243,216,150,0.16)";
  ctx2.lineWidth = 1.2;
  ctx2.beginPath();
  ctx2.moveTo(0, -54);
  ctx2.lineTo(42, 0);
  ctx2.lineTo(0, 54);
  ctx2.lineTo(-42, 0);
  ctx2.closePath();
  ctx2.stroke();
  ctx2.restore();

  ctx2.fillStyle = "rgba(12,10,16,0.78)";
  ctx2.strokeStyle = "rgba(243,216,150,0.26)";
  ctx2.lineWidth = 1.4;
  ctx2.beginPath();
  ctx2.arc(0, 0, 27, 0, Math.PI * 2);
  ctx2.fill();
  ctx2.stroke();

  ctx2.shadowColor = "#ff5d66";
  ctx2.shadowBlur = 16 + danger * 12;
  ctx2.strokeStyle = `rgba(255,93,102,${0.68 + danger * 0.22})`;
  ctx2.lineWidth = 2.4;
  ctx2.beginPath();
  ctx2.moveTo(-2, -19);
  ctx2.lineTo(6, -10);
  ctx2.lineTo(-4, -1);
  ctx2.lineTo(7, 10);
  ctx2.lineTo(-2, 20);
  ctx2.stroke();
  ctx2.shadowBlur = 0;

  ctx2.fillStyle = "rgba(243,216,150,0.9)";
  ctx2.font = "700 10px serif";
  ctx2.textAlign = "center";
  ctx2.textBaseline = "middle";
  ctx2.fillText("命运", 0, -5);
  ctx2.fillStyle = danger > 0.35 ? "#ffb9be" : "rgba(243,216,150,0.76)";
  ctx2.font = "700 9px sans-serif";
  ctx2.fillText(`${S.cracks}/${MAX_CRACKS}`, 0, 12);
  ctx2.restore();
}

function drawAnchors() {
  const dragging = S.drag ? S.signals.find((item) => item.id === S.drag.id) : null;
  const hover = S.drag ? anchorAt(S.drag.points[S.drag.points.length - 1]) : null;
  for (const [key, anchor] of Object.entries(S.anchors)) {
    const lead = LEADS[key];
    const activeInLevel = currentLevel().leads.includes(key);
    const isMatch = dragging && dragging.lead === key;
    const isHover = hover === key;
    const isWrongHover = isHover && !isMatch;
    const labelBelow = anchor.y < S.h / 2;
    const pulse = 0.5 + Math.sin(performance.now() * 0.006) * 0.5;
    ctx2.save();
    ctx2.translate(anchor.x, anchor.y);

    ctx2.globalAlpha = isMatch ? 0.2 + pulse * 0.16 : activeInLevel ? 0.08 : 0.035;
    ctx2.fillStyle = isWrongHover ? "#ff5d66" : lead.color;
    ctx2.beginPath();
    ctx2.arc(0, 0, isMatch || isHover ? 48 + pulse * 5 : 42, 0, Math.PI * 2);
    ctx2.fill();
    ctx2.globalAlpha = activeInLevel || isHover ? 1 : 0.44;

    ctx2.save();
    ctx2.rotate(Math.PI / 4);
    ctx2.shadowColor = colorWithAlpha(isWrongHover ? "#ff5d66" : lead.color, isMatch || isHover ? 0.58 : 0.22);
    ctx2.shadowBlur = isMatch || isHover ? 18 : 10;
    ctx2.fillStyle = "rgba(13,11,17,0.88)";
    ctx2.strokeStyle = isWrongHover ? "#ff5d66" : colorWithAlpha(lead.color, 0.88);
    ctx2.lineWidth = 1.7;
    roundRect(ctx2, -27, -27, 54, 54, 7);
    ctx2.fill();
    ctx2.stroke();
    ctx2.restore();

    ctx2.shadowBlur = 0;
    ctx2.strokeStyle = colorWithAlpha(lead.color, 0.36);
    ctx2.lineWidth = 1;
    ctx2.beginPath();
    ctx2.arc(0, 0, 35, 0, Math.PI * 2);
    ctx2.stroke();

    ctx2.strokeStyle = colorWithAlpha(lead.color, 0.5);
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + Math.PI / 4;
      ctx2.beginPath();
      ctx2.moveTo(Math.cos(a) * 31, Math.sin(a) * 31);
      ctx2.lineTo(Math.cos(a) * 38, Math.sin(a) * 38);
      ctx2.stroke();
    }

    drawLeadAvatar(key, 0, 0, 41, lead.color, activeInLevel);
    ctx2.fillStyle = activeInLevel ? colorWithAlpha(lead.color, 0.92) : "rgba(243,236,223,0.46)";
    ctx2.beginPath();
    ctx2.arc(15, 15, 9, 0, Math.PI * 2);
    ctx2.fill();
    ctx2.fillStyle = "#151119";
    ctx2.font = "900 10px sans-serif";
    ctx2.textAlign = "center";
    ctx2.textBaseline = "middle";
    ctx2.fillText(lead.short, 15, 15);

    const badgeY = labelBelow ? 43 : -76;
    ctx2.fillStyle = "rgba(9,8,12,0.72)";
    ctx2.strokeStyle = "rgba(243,216,150,0.14)";
    ctx2.lineWidth = 1;
    roundRect(ctx2, -49, badgeY, 98, 35, 8);
    ctx2.fill();
    ctx2.stroke();
    ctx2.fillStyle = "rgba(243,236,223,0.94)";
    ctx2.font = "700 12px sans-serif";
    ctx2.fillText(lead.name, 0, badgeY + 13);
    ctx2.fillStyle = colorWithAlpha(lead.color, 0.9);
    ctx2.font = "10px sans-serif";
    ctx2.fillText(lead.label, 0, badgeY + 27);

    if (dragging && (isMatch || isHover)) {
      const text = isHover ? (isMatch ? "松手锁定" : "送错会裂") : "目标锚点";
      const tipY = labelBelow ? -46 : 38;
      ctx2.fillStyle = isWrongHover ? "rgba(96,20,30,0.9)" : "rgba(12,10,16,0.82)";
      ctx2.strokeStyle = isWrongHover ? "rgba(255,93,102,0.68)" : colorWithAlpha(lead.color, 0.54);
      roundRect(ctx2, -38, tipY - 11, 76, 22, 8);
      ctx2.fill();
      ctx2.stroke();
      ctx2.fillStyle = isWrongHover ? "#ffccd1" : lead.color;
      ctx2.font = "700 10px sans-serif";
      ctx2.fillText(text, 0, tipY);
    }
    ctx2.restore();
  }
}

function drawRoutes() {
  const t = performance.now() * 0.001;
  for (const sig of S.signals) {
    if (!sig.route || sig.done) continue;
    const lead = LEADS[sig.lead];
    const color = sig.target === sig.lead ? lead.color : "#ff5d66";
    const points = [{ x: sig.x, y: sig.y }].concat(sig.route.slice(sig.routeIndex));
    if (points.length < 2) continue;
    drawRouteStroke(points, color, sig.critical, false);

    const pulse = pathPoint(points, (t * 0.56 + sig.id * 0.13) % 1);
    if (pulse) {
      ctx2.save();
      ctx2.fillStyle = color;
      ctx2.shadowColor = color;
      ctx2.shadowBlur = 12;
      ctx2.beginPath();
      ctx2.arc(pulse.x, pulse.y, sig.critical ? 3.4 : 2.6, 0, Math.PI * 2);
      ctx2.fill();
      ctx2.restore();
    }
  }

  if (S.drag) {
    const sig = S.signals.find((item) => item.id === S.drag.id);
    const last = S.drag.points[S.drag.points.length - 1];
    const hover = anchorAt(last);
    if (sig) {
      const lead = LEADS[sig.lead];
      const color = hover && hover !== sig.lead ? "#ff5d66" : lead.color;
      drawRouteStroke(S.drag.points, color, true, true);

      ctx2.save();
      ctx2.fillStyle = color;
      ctx2.shadowColor = color;
      ctx2.shadowBlur = 12;
      ctx2.beginPath();
      ctx2.arc(last.x, last.y, 5.5, 0, Math.PI * 2);
      ctx2.fill();
      ctx2.shadowBlur = 0;

      const text = hover ? (hover === sig.lead ? "松手锁定" : "送错会裂") : `送到${lead.name}`;
      ctx2.font = "700 11px sans-serif";
      const chipW = Math.max(84, ctx2.measureText(text).width + 24);
      const chipX = clamp(last.x + 10, 8, S.w - chipW - 8);
      const chipY = clamp(last.y - 19, 8, S.h - 34);
      ctx2.fillStyle = hover && hover !== sig.lead ? "rgba(86,18,28,0.88)" : "rgba(12,10,16,0.82)";
      ctx2.strokeStyle = hover && hover !== sig.lead ? "rgba(255,93,102,0.64)" : colorWithAlpha(lead.color, 0.54);
      roundRect(ctx2, chipX, chipY, chipW, 26, 9);
      ctx2.fill();
      ctx2.stroke();
      ctx2.fillStyle = hover
        ? (hover === sig.lead ? lead.color : "#ffccd1")
        : "rgba(243,236,223,0.9)";
      ctx2.textAlign = "left";
      ctx2.textBaseline = "middle";
      ctx2.fillText(text, chipX + 12, chipY + 13);
      ctx2.restore();
    }
  }
}

function drawLeadAvatar(key, x, y, size, color, enabled = true) {
  const img = AVATARS[key];
  const half = size / 2;
  ctx2.save();
  ctx2.beginPath();
  ctx2.arc(x, y, half, 0, Math.PI * 2);
  ctx2.clip();
  if (img && img.complete && img.naturalWidth) {
    drawImageCover(img, x - half, y - half, size, size);
  } else {
    const fallback = ctx2.createRadialGradient(x - half * 0.3, y - half * 0.35, 2, x, y, half);
    fallback.addColorStop(0, "rgba(255,255,255,0.45)");
    fallback.addColorStop(0.28, color);
    fallback.addColorStop(1, colorWithAlpha(color, 0.58));
    ctx2.fillStyle = fallback;
    ctx2.fillRect(x - half, y - half, size, size);
  }
  if (!enabled) {
    ctx2.fillStyle = "rgba(5,5,8,0.52)";
    ctx2.fillRect(x - half, y - half, size, size);
  }
  ctx2.restore();

  ctx2.save();
  ctx2.strokeStyle = enabled ? colorWithAlpha(color, 0.92) : "rgba(243,236,223,0.34)";
  ctx2.lineWidth = 1.6;
  ctx2.beginPath();
  ctx2.arc(x, y, half + 1, 0, Math.PI * 2);
  ctx2.stroke();
  ctx2.restore();
}

function drawImageCover(img, x, y, w, h) {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (img.naturalWidth - sw) / 2;
  const sy = (img.naturalHeight - sh) / 2;
  ctx2.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function drawSignals() {
  const now = performance.now() * 0.001;
  for (const sig of S.signals) {
    if (sig.done || sig.bornDelay > 0) continue;
    const lead = LEADS[sig.lead];
    const urgency = clamp(sig.age / sig.ttl, 0, 1);
    const dir = movementVector(sig);
    const w = sig.critical ? 92 : 86;
    const h = 48;
    ctx2.save();
    ctx2.translate(sig.x, sig.y);

    const tail = ctx2.createLinearGradient(-dir.x * 58, -dir.y * 58, 0, 0);
    tail.addColorStop(0, colorWithAlpha(lead.color, 0));
    tail.addColorStop(1, colorWithAlpha(lead.color, sig.critical ? 0.36 : 0.22));
    ctx2.strokeStyle = tail;
    ctx2.lineWidth = sig.critical ? 13 : 10;
    ctx2.lineCap = "round";
    ctx2.beginPath();
    ctx2.moveTo(-dir.x * 56, -dir.y * 56);
    ctx2.lineTo(-dir.x * 12, -dir.y * 12);
    ctx2.stroke();

    if (sig.critical) {
      ctx2.strokeStyle = `rgba(255,93,102,${0.48 + Math.sin(now * 8) * 0.14})`;
      ctx2.lineWidth = 2;
      ctx2.beginPath();
      ctx2.arc(0, 0, 32 + Math.sin(now * 9) * 2, 0, Math.PI * 2);
      ctx2.stroke();
    }

    ctx2.shadowColor = colorWithAlpha(urgency > 0.72 ? "#ff5d66" : lead.color, 0.36);
    ctx2.shadowBlur = sig.critical ? 18 : 11;
    ctx2.fillStyle = "rgba(12,10,16,0.94)";
    ctx2.strokeStyle = urgency > 0.72 ? "#ff5d66" : colorWithAlpha(lead.color, 0.88);
    ctx2.lineWidth = 1.8;
    roundRect(ctx2, -w / 2, -h / 2, w, h, 10);
    ctx2.fill();
    ctx2.stroke();
    ctx2.shadowBlur = 0;

    ctx2.fillStyle = "rgba(255,255,255,0.045)";
    roundRect(ctx2, -w / 2 + 1, -h / 2 + 1, w - 2, 20, 9);
    ctx2.fill();

    ctx2.fillStyle = colorWithAlpha(lead.color, 0.16);
    roundRect(ctx2, -w / 2 + 6, -h / 2 + 6, 27, h - 12, 8);
    ctx2.fill();

    ctx2.fillStyle = "rgba(255,255,255,0.12)";
    roundRect(ctx2, -w / 2 + 12, h / 2 - 8, w - 24, 4, 2);
    ctx2.fill();
    ctx2.fillStyle = urgency > 0.72 ? "#ff5d66" : lead.color;
    roundRect(ctx2, -w / 2 + 12, h / 2 - 8, (w - 24) * (1 - urgency), 4, 2);
    ctx2.fill();

    drawLeadAvatar(sig.lead, -w / 2 + 19, -3, 27, lead.color, true);
    ctx2.fillStyle = colorWithAlpha(lead.color, 0.94);
    ctx2.beginPath();
    ctx2.arc(-w / 2 + 28, 7, 6.8, 0, Math.PI * 2);
    ctx2.fill();
    ctx2.fillStyle = "#151119";
    ctx2.font = "900 8px sans-serif";
    ctx2.textAlign = "center";
    ctx2.textBaseline = "middle";
    ctx2.fillText(lead.mark, -w / 2 + 28, 7);

    ctx2.fillStyle = "rgba(243,236,223,0.96)";
    ctx2.font = "700 11px sans-serif";
    ctx2.textAlign = "left";
    ctx2.fillText(sig.label, -w / 2 + 39, -7, 45);
    ctx2.fillStyle = sig.critical ? "#ffccd1" : colorWithAlpha(lead.color, 0.9);
    ctx2.font = "10px sans-serif";
    ctx2.fillText(lead.name, -w / 2 + 39, 9, 45);

    if (sig.critical) {
      ctx2.fillStyle = "rgba(255,93,102,0.92)";
      ctx2.beginPath();
      ctx2.moveTo(w / 2 - 25, -h / 2);
      ctx2.lineTo(w / 2, -h / 2);
      ctx2.lineTo(w / 2, -h / 2 + 25);
      ctx2.closePath();
      ctx2.fill();
      ctx2.fillStyle = "#25080d";
      ctx2.font = "900 10px sans-serif";
      ctx2.textAlign = "center";
      ctx2.fillText("急", w / 2 - 10, -h / 2 + 11);
    }
    ctx2.restore();
  }
}

function drawRouteStroke(points, color, emphatic = false, dashed = false) {
  if (points.length < 2) return;
  ctx2.save();
  ctx2.lineCap = "round";
  ctx2.lineJoin = "round";
  ctx2.strokeStyle = color;
  ctx2.globalAlpha = dashed ? 0.18 : 0.16;
  ctx2.lineWidth = emphatic ? 13 : 10;
  drawPolyline(points);
  ctx2.stroke();

  ctx2.globalAlpha = dashed ? 0.82 : 0.88;
  ctx2.lineWidth = emphatic ? 3.2 : 2.4;
  if (dashed) ctx2.setLineDash([10, 8]);
  drawPolyline(points);
  ctx2.stroke();

  ctx2.globalAlpha = dashed ? 0.28 : 0.18;
  ctx2.lineWidth = 1;
  ctx2.setLineDash([2, 11]);
  drawPolyline(points);
  ctx2.stroke();
  ctx2.restore();
}

function drawPolyline(points) {
  ctx2.beginPath();
  points.forEach((pt, i) => {
    if (i === 0) ctx2.moveTo(pt.x, pt.y);
    else ctx2.lineTo(pt.x, pt.y);
  });
}

function pathPoint(points, progress) {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += dist(points[i - 1], points[i]);
  if (total <= 0) return null;
  let target = total * progress;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const len = dist(a, b);
    if (target <= len) {
      const k = len ? target / len : 0;
      return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
    }
    target -= len;
  }
  return points[points.length - 1];
}

function movementVector(sig) {
  if (sig.route && sig.routeIndex < sig.route.length) {
    const target = sig.route[sig.routeIndex];
    const dx = target.x - sig.x;
    const dy = target.y - sig.y;
    const d = Math.hypot(dx, dy);
    if (d > 0.1) return { x: dx / d, y: dy / d };
  }
  const d = Math.hypot(sig.vx, sig.vy) || 1;
  return { x: sig.vx / d, y: sig.vy / d };
}

function colorWithAlpha(hex, alpha) {
  const clean = hex.replace("#", "");
  const full = clean.length === 3
    ? clean.split("").map((ch) => ch + ch).join("")
    : clean;
  const value = parseInt(full, 16);
  const r = value >> 16 & 255;
  const g = value >> 8 & 255;
  const b = value & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

function drawSparks() {
  for (const sp of S.sparks) {
    sp.x += sp.vx * 0.016;
    sp.y += sp.vy * 0.016;
    ctx2.globalAlpha = clamp(sp.life * 2.5, 0, 1);
    ctx2.fillStyle = sp.color;
    ctx2.beginPath();
    ctx2.arc(sp.x, sp.y, 2.4, 0, Math.PI * 2);
    ctx2.fill();
    ctx2.globalAlpha = 1;
  }
}

function drawDialogues() {
  for (const item of S.dialogues) {
    const lead = LEADS[item.lead];
    const anchor = S.anchors[item.lead];
    if (!lead || !anchor) continue;
    const fade = Math.min(1, item.life / 0.35, (item.maxLife - item.life) / 0.28);
    const maxText = 138;
    ctx2.save();
    ctx2.font = "700 11px sans-serif";
    const lines = wrapText(item.text, maxText, 2);
    const bubbleW = 178;
    const bubbleH = 42 + Math.max(0, lines.length - 1) * 14;
    const rightSide = anchor.x > S.w / 2;
    const lowerSide = anchor.y > S.h / 2;
    const x = clamp(rightSide ? anchor.x - bubbleW - 34 : anchor.x + 34, 8, S.w - bubbleW - 8);
    const y = clamp(lowerSide ? anchor.y - bubbleH - 42 : anchor.y + 42, 8, S.h - bubbleH - 8);
    const tailX = clamp(anchor.x, x + 16, x + bubbleW - 16);
    const tailY = lowerSide ? y + bubbleH : y;
    ctx2.globalAlpha = fade;
    ctx2.shadowColor = colorWithAlpha(lead.color, item.type === "danger" ? 0.36 : 0.22);
    ctx2.shadowBlur = item.type === "danger" ? 16 : 10;
    ctx2.fillStyle = item.type === "danger" ? "rgba(68,16,24,0.88)" : "rgba(10,9,13,0.86)";
    ctx2.strokeStyle = item.type === "danger" ? "rgba(255,93,102,0.68)" : colorWithAlpha(lead.color, 0.58);
    ctx2.lineWidth = 1;
    roundRect(ctx2, x, y, bubbleW, bubbleH, 10);
    ctx2.fill();
    ctx2.stroke();

    ctx2.beginPath();
    ctx2.moveTo(tailX - 7, tailY);
    ctx2.lineTo(anchor.x, anchor.y);
    ctx2.lineTo(tailX + 7, tailY);
    ctx2.closePath();
    ctx2.fill();
    ctx2.stroke();
    ctx2.shadowBlur = 0;

    drawLeadAvatar(item.lead, x + 20, y + 21, 27, lead.color, true);
    ctx2.fillStyle = colorWithAlpha(lead.color, 0.95);
    ctx2.font = "700 10px sans-serif";
    ctx2.textAlign = "left";
    ctx2.textBaseline = "alphabetic";
    ctx2.fillText(lead.name, x + 41, y + 15);
    ctx2.fillStyle = item.type === "danger" ? "#ffccd1" : "rgba(243,236,223,0.95)";
    ctx2.font = "700 11px sans-serif";
    lines.forEach((line, i) => ctx2.fillText(line, x + 41, y + 31 + i * 14));
    ctx2.restore();
  }
}

function wrapText(text, maxWidth, maxLines) {
  const lines = [];
  let line = "";
  for (const ch of text) {
    const next = line + ch;
    if (ctx2.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = ch;
      if (lines.length >= maxLines) break;
    } else {
      line = next;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (lines.length === maxLines && lines.join("").length < text.length) {
    lines[maxLines - 1] = lines[maxLines - 1].replace(/.$/, "...");
  }
  return lines;
}

function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

function loop(ts) {
  const dt = Math.min(0.05, (ts - S.lastTs) / 1000 || 0);
  S.lastTs = ts;
  tick(dt);
  requestAnimationFrame(loop);
}

function toast(message) {
  const el = $("toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 1500);
}

function ctx() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; }
  }
  return audioCtx;
}

function tone(freq, dur, type = "sine", vol = 0.04) {
  if (!S.sound) return;
  const c = ctx();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, c.currentTime);
  g.gain.exponentialRampToValueAtTime(vol, c.currentTime + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  o.connect(g).connect(c.destination);
  o.start();
  o.stop(c.currentTime + dur + 0.02);
}

function drawSky() {
  const cv = $("sky");
  const c = cv.getContext("2d");
  let stars = [];
  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = Math.round(innerWidth * dpr);
    cv.height = Math.round(innerHeight * dpr);
    cv.style.width = innerWidth + "px";
    cv.style.height = innerHeight + "px";
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = Array.from({ length: 90 }, () => ({
      x: Math.random() * innerWidth,
      y: Math.random() * innerHeight,
      r: Math.random() * 1.4 + 0.35,
      p: Math.random() * Math.PI * 2,
    }));
  }
  function frame(t) {
    c.clearRect(0, 0, innerWidth, innerHeight);
    for (const s of stars) {
      const a = 0.18 + Math.abs(Math.sin(t * 0.0008 + s.p)) * 0.42;
      c.fillStyle = `rgba(243,216,150,${a})`;
      c.beginPath();
      c.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      c.fill();
    }
    requestAnimationFrame(frame);
  }
  addEventListener("resize", resize);
  resize();
  requestAnimationFrame(frame);
}

function debugState() {
  const level = currentLevel();
  return {
    running: S.running,
    paused: S.paused,
    ended: S.ended,
    time: S.time,
    elapsed: elapsedTime(),
    levelIndex: S.levelIndex,
    levelName: level.name,
    levelRule: level.rule,
    activeLeads: level.leads,
    spawnInterval: tunedInterval(level),
    maxSignals: tunedMaxSignals(level),
    saves: S.saves,
    cracks: S.cracks,
    score: S.score,
    anchors: S.anchors,
    dialogues: S.dialogues.map((item) => ({
      lead: item.lead,
      text: item.text,
      type: item.type,
      life: item.life,
    })),
    signals: S.signals.map((sig) => ({
      id: sig.id,
      lead: sig.lead,
      x: sig.x,
      y: sig.y,
      target: sig.target,
      hasRoute: !!sig.route,
      done: sig.done,
      bornDelay: sig.bornDelay,
      age: sig.age,
      ttl: sig.ttl,
      speed: sig.speed,
      critical: sig.critical,
      kind: sig.kind,
      levelIndex: sig.levelIndex,
    })),
  };
}

function publishDebug() {
  stage.dataset.debug = JSON.stringify(debugState());
}

window.__dispatchDebug = debugState;

$("btnStart").onclick = startGame;
$("btnRestart").onclick = () => resetGame(true);
$("btnSound").onclick = () => {
  S.sound = !S.sound;
  $("btnSound").classList.toggle("off", !S.sound);
};

addEventListener("resize", resizeStage);
resizeStage();
drawSky();
resetGame(true);
requestAnimationFrame(loop);
requestAnimationFrame(draw);
