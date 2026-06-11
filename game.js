/* ==========================================================
   星轨裁决 · 内部演示 v0.3
   规则依据:docs/04(§14 玩法深度版本路线 V1-V4)
   Ⅰ 剧情内简单版 / Ⅱ +双象牌 / Ⅲ +牌强化 / Ⅳ 完整版·逆位
   ========================================================== */
"use strict";

/* ---------------- 配置 ---------------- */

const SUITS = {
  wand:  { key: "wand",  name: "权杖", cls: "suit-wand",  glyph: "#glyph-wand",  color: "#ff6b4a" },
  coin:  { key: "coin",  name: "星币", cls: "suit-coin",  glyph: "#glyph-coin",  color: "#f0c75e" },
  sword: { key: "sword", name: "宝剑", cls: "suit-sword", glyph: "#glyph-sword", color: "#7fd6c2" },
  cup:   { key: "cup",   name: "圣杯", cls: "suit-cup",   glyph: "#glyph-cup",   color: "#6f9bff" },
};
const SUIT_KEYS = ["wand", "coin", "sword", "cup"];

const LEADS = {
  wand:  { name: "炎烈",   lines: ["烧起来了——就是这种感觉!", "跟上我的节奏,别眨眼。"] },
  coin:  { name: "沈寂",   lines: ["稳。这一手,值得入账。", "按计划进行,很好。"] },
  sword: { name: "叶渊",   lines: ["看吧,我就说你会选这张。", "情报无误——这就是最优解。"] },
  cup:   { name: "宋以衡", lines: ["别紧张,你做得比想象中好。", "嗯,这个选择很温柔,也很正确。"] },
};

const COMBOS = [
  { key: "radiantRun",  name: "辉连",     mult: 12, tier: 4, batch: "④", desc: "5 张同花色且星阶连续" },
  { key: "fullPhase",   name: "满相",     mult: 10, tier: 4, batch: "④", desc: "4 张同星阶" },
  { key: "tetra",       name: "四象共鸣", mult: 8,  tier: 4, batch: "④", desc: "四花色各 1 张" },
  { key: "glow5",       name: "同辉·五",  mult: 6,  tier: 3, batch: "③", desc: "5 张同花色" },
  { key: "run5",        name: "连星·五",  mult: 6,  tier: 3, batch: "③", desc: "5 张星阶连续" },
  { key: "triPhase",    name: "三相",     mult: 5,  tier: 3, batch: "③", desc: "3 张同星阶" },
  { key: "twinSeal",    name: "双对印",   mult: 4,  tier: 2, batch: "②", desc: "两组对印" },
  { key: "glow3",       name: "同辉·三",  mult: 3,  tier: 2, batch: "②", desc: "3 张同花色" },
  { key: "run3",        name: "连星·三",  mult: 3,  tier: 1, batch: "①", desc: "3 张星阶连续" },
  { key: "pairSeal",    name: "对印",     mult: 2,  tier: 1, batch: "①", desc: "2 张同星阶" },
  { key: "stray",       name: "散星",     mult: 1,  tier: 0, batch: "—", desc: "未成式,星阶直接计入" },
];
const COMBO_MAP = Object.fromEntries(COMBOS.map(c => [c.key, c]));
const GLOWS = ["glow3", "glow5", "radiantRun"];
const RUNS = ["run3", "run5", "radiantRun"];
const RANKS = ["pairSeal", "twinSeal", "triPhase", "fullPhase"];

/* 异象(大阿卡纳被动)— 正位 + 逆位(V4) */
const RELICS = [
  { key: "star",       name: "星辰",   icon: "#rg-star",
    desc: "圣杯印记 星阶 +2",
    rdesc: "圣杯印记 星阶 +4;但不含圣杯的组合 底分 -3" },
  { key: "sun",        name: "太阳",   icon: "#rg-sun",
    desc: "同辉系裁决式 倍率 +2",
    rdesc: "同辉系 倍率 +5;但其余组合 倍率 -1" },
  { key: "moon",       name: "月亮",   icon: "#rg-moon",
    desc: "每次重引后,下一手共鸣 ×1.5",
    rdesc: "每次重引使本层乘区永久 +0.25;但每层重引次数 -1" },
  { key: "strength",   name: "力量",   icon: "#rg-strength",
    desc: "权杖印记 星阶 +2",
    rdesc: "权杖印记 星阶 +4;但不含权杖的组合 底分 -3" },
  { key: "emperor",    name: "皇帝",   icon: "#rg-emperor",
    desc: "同阶系裁决式(对印/双对/三相/满相)倍率 +2",
    rdesc: "同阶系 倍率 +4;但连星系 倍率 -2" },
  { key: "hermit",     name: "隐者",   icon: "#rg-hermit",
    desc: "打出 ≤3 张时 倍率 +1",
    rdesc: "打出 ≤2 张时 倍率 +3;但打出 ≥4 张时 倍率 -1" },
  { key: "justice",    name: "正义",   icon: "#rg-justice",
    desc: "四象共鸣 倍率 +4",
    rdesc: "四象共鸣 倍率 +8;但双对印 倍率 -2" },
  { key: "temperance", name: "节制",   icon: "#rg-temperance",
    desc: "连星系裁决式 倍率 +2",
    rdesc: "连星系 倍率 +4;但同辉系 倍率 -2" },
  { key: "magician",   name: "魔术师", icon: "#rg-magician",
    desc: "散星不再寒酸:倍率至少 ×2",
    rdesc: "散星 倍率 ×3;但批次①(对印/连星·三)倍率 -1" },
  { key: "empress",    name: "女皇",   icon: "#rg-empress",
    desc: "每层第一次校准 共鸣 ×2",
    rdesc: "每层第一次校准 ×3;但最后一次校准 ×0.5" },
];
const RELIC_MAP = Object.fromEntries(RELICS.map(r => [r.key, r]));

/* 牌强化(V3) */
const ENHANCEMENTS = {
  starset:  { name: "镶星", desc: "打出时 星阶 +2",     color: "#8fc2ff" },
  gilded:   { name: "饰金", desc: "打出时 倍率 +1",     color: "#f0c75e" },
  resonant: { name: "共鸣", desc: "可视为任意花色",     color: "#c08dff" },
  echo:     { name: "回响", desc: "打出时 星阶计两次", color: "#7fd6c2" },
};

/* 双象牌(V2):4 种花色组合 × 4 星阶 */
const DUAL_PAIRS = [["wand", "coin"], ["sword", "cup"], ["wand", "cup"], ["coin", "sword"]];
const DUAL_RANKS = [2, 4, 6, 8];

const RULES = { handSize: 7, plays: 4, swaps: 3, maxPlay: 5, maxSwap: 3, arcanaUses: 1, revives: 1 };
const REV_CHANCE = 0.35;

function thresholdOf(layer) {
  return Math.round((100 * Math.pow(1.35, layer - 1)) / 5) * 5;
}
const LAYER_NAMES = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
function layerLabel(n) {
  return n <= 10 ? `裂隙 · 第${LAYER_NAMES[n - 1]}星层` : `裂隙 · 第${n}星层`;
}
const VER_NAMES = { 1: "Ⅰ", 2: "Ⅱ", 3: "Ⅲ", 4: "Ⅳ" };

/* ---------------- 工具 ---------------- */
const $ = (id) => document.getElementById(id);
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const wait = (ms) => new Promise(r => setTimeout(r, ms));

/* ---------------- 音效 ---------------- */
const sfx = (() => {
  let ctx = null, on = true;
  function ac() { if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)(); return ctx; }
  function tone(freq, t0, dur, type = "sine", vol = 0.15) {
    if (!on) return;
    try {
      const c = ac(), o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(0, c.currentTime + t0);
      g.gain.linearRampToValueAtTime(vol, c.currentTime + t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + t0 + dur);
      o.connect(g); g.connect(c.destination);
      o.start(c.currentTime + t0); o.stop(c.currentTime + t0 + dur + 0.05);
    } catch (e) {}
  }
  const PENTA = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
  /* 生成式环境乐:稀疏五声钟音 + 程序化混响(无持续嗡鸣) */
  let amb = null;
  function makeReverb(c, seconds = 3.2, decay = 3.2) {
    const rate = c.sampleRate, len = Math.floor(rate * seconds);
    const ir = c.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    const conv = c.createConvolver();
    conv.buffer = ir;
    return conv;
  }
  const AMB_SCALE = [220.0, 261.63, 293.66, 329.63, 392.0]; /* A 小调五声 */
  function ambNote() {
    if (!amb || !on) return;
    try {
      const c = ac(), t = c.currentTime;
      const f = AMB_SCALE[Math.floor(Math.random() * AMB_SCALE.length)]
        * [0.5, 1, 1, 2][Math.floor(Math.random() * 4)];
      const dur = 2.6 + Math.random() * 2.2;
      const ring = (freq, vol) => {
        const o = c.createOscillator(), g = c.createGain();
        o.type = "sine"; o.frequency.value = freq;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(vol, t + 0.7);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g); g.connect(amb.bus);
        o.start(t); o.stop(t + dur + 0.1);
      };
      ring(f, 0.05 + Math.random() * 0.03);
      if (Math.random() < 0.3) ring(f * 1.5, 0.024);  /* 偶发纯五度 */
    } catch (e) {}
    amb.timer = setTimeout(ambNote, 2200 + Math.random() * 3800);
  }
  /* 低音脉冲:游戏行进感的心跳 */
  let pulseN = 0;
  function ambPulse() {
    if (!amb || !on) return;
    try {
      const c = ac(), t = c.currentTime;
      const f = (pulseN++ % 2 === 0) ? 110 : 164.81;
      const o = c.createOscillator(), g = c.createGain();
      o.type = "triangle"; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.055, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
      o.connect(g); g.connect(amb.bus);
      o.start(t); o.stop(t + 0.5);
    } catch (e) {}
    amb.pulseTimer = setTimeout(ambPulse, 1150);
  }
  function startAmbient() {
    if (amb || !on) return;
    try {
      const c = ac();
      const master = c.createGain(); master.gain.value = 0.85;
      const bus = c.createGain();
      const wet = makeReverb(c);
      const wetG = c.createGain(); wetG.gain.value = 0.85;
      const dryG = c.createGain(); dryG.gain.value = 0.18;
      bus.connect(wet); wet.connect(wetG); wetG.connect(master);
      bus.connect(dryG); dryG.connect(master);
      master.connect(c.destination);
      amb = { bus, master, timer: null, pulseTimer: null };
      amb.timer = setTimeout(ambNote, 600);
      amb.pulseTimer = setTimeout(ambPulse, 300);
    } catch (e) {}
  }
  function stopAmbient() {
    if (!amb) return;
    try { clearTimeout(amb.timer); clearTimeout(amb.pulseTimer); amb.master.gain.value = 0; amb.master.disconnect(); } catch (e) {}
    amb = null;
  }
  /* 真 BGM 接入槽:demo 目录放 bgm.mp3 即自动启用(WebAudio 无缝循环 + 2.5s 淡入),
     无文件则回退生成式钟音。file:// 下 fetch 受限亦自动回退。 */
  const BGM_VOL = 0.45;
  let bgmBytes = null, bgmBuffer = null, bgm = null;
  fetch("bgm.mp3").then(r => (r.ok ? r.arrayBuffer() : null)).then(b => { bgmBytes = b; }).catch(() => {});
  function startBgm() {
    if (!bgmBuffer || bgm || !on) return;
    try {
      const c = ac();
      const src = c.createBufferSource();
      src.buffer = bgmBuffer; src.loop = true;
      const g = c.createGain(); g.gain.value = 0;
      src.connect(g); g.connect(c.destination);
      src.start();
      g.gain.linearRampToValueAtTime(BGM_VOL, c.currentTime + 2.5);
      bgm = { src, g };
    } catch (e) {}
  }
  function stopBgm() { if (!bgm) return; try { bgm.g.gain.value = 0; bgm.src.stop(); } catch (e) {} bgm = null; }
  function music(onNow) {
    if (!onNow) { stopBgm(); stopAmbient(); return; }
    if (bgmBuffer) { stopAmbient(); startBgm(); return; }
    if (bgmBytes) {
      const bytes = bgmBytes; bgmBytes = null;
      ac().decodeAudioData(bytes).then(b => {
        bgmBuffer = b;
        if (on) { stopAmbient(); startBgm(); }
      }).catch(() => { if (on) startAmbient(); });
      return;
    }
    startAmbient();
  }
  return {
    toggle() { on = !on; music(on); return on; },
    unlock() { try { ac().resume(); music(on); } catch (e) {} },
    select() { tone(PENTA[2], 0, 0.12, "triangle", 0.1); },
    deselect() { tone(PENTA[0], 0, 0.1, "triangle", 0.07); },
    deal(i = 0) { tone(440 + i * 40, 0, 0.06, "triangle", 0.05); },
    thud(i = 0) { tone(165 + i * 9, 0, 0.09, "sine", 0.14); tone(520, 0, 0.05, "triangle", 0.05); },
    swap() { tone(392, 0, 0.1, "sawtooth", 0.05); tone(523, 0.07, 0.12, "triangle", 0.08); },
    seam() { tone(660, 0, 0.18, "sine", 0.1); tone(990, 0.1, 0.25, "sine", 0.08); },
    play(tier) {
      const n = 2 + tier;
      for (let i = 0; i <= n; i++) tone(PENTA[Math.min(i, PENTA.length - 1)], i * 0.07, 0.3, "triangle", 0.12);
      if (tier >= 3) tone(PENTA[5] * 2, n * 0.07 + 0.1, 0.5, "sine", 0.1);
    },
    relic() { [2, 4, 5].forEach((p, i) => tone(PENTA[p], i * 0.09, 0.35, "triangle", 0.1)); },
    rev() { [5, 3, 1].forEach((p, i) => tone(PENTA[p] / 2, i * 0.1, 0.3, "sawtooth", 0.06)); },
    fail() { tone(196, 0, 0.4, "sawtooth", 0.08); tone(155.6, 0.15, 0.5, "sawtooth", 0.08); },
    clear() { [0, 2, 4, 5].forEach((p, i) => tone(PENTA[p], i * 0.1, 0.45, "triangle", 0.12)); },
    wheel() { for (let i = 0; i < 8; i++) tone(300 + i * 90, i * 0.09, 0.1, "square", 0.04); tone(1046, 0.78, 0.5, "sine", 0.12); },
  };
})();

/* ---------------- 背景星空 ---------------- */
(() => {
  const cv = $("starfield"), cx = cv.getContext("2d");
  let W, H, stars = [], shooting = null;
  function resize() {
    W = cv.width = innerWidth; H = cv.height = innerHeight;
    stars = Array.from({ length: Math.min(180, (W * H) / 6500) }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      r: Math.random() * 1.3 + 0.3, p: Math.random() * Math.PI * 2,
      s: 0.004 + Math.random() * 0.012, gold: Math.random() < 0.18,
    }));
  }
  function frame() {
    cx.clearRect(0, 0, W, H);
    for (const st of stars) {
      st.p += st.s;
      const a = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(st.p));
      cx.beginPath(); cx.arc(st.x, st.y, st.r, 0, 7);
      cx.fillStyle = st.gold ? `rgba(232,200,140,${a})` : `rgba(190,205,255,${a})`;
      cx.fill();
    }
    if (!shooting && Math.random() < 0.0025) {
      shooting = { x: Math.random() * W * 0.7 + W * 0.2, y: Math.random() * H * 0.25, vx: -4.5, vy: 2.2, life: 1 };
    }
    if (shooting) {
      shooting.life -= 0.02;
      shooting.x += shooting.vx; shooting.y += shooting.vy;
      const g = cx.createLinearGradient(shooting.x, shooting.y, shooting.x + 60, shooting.y - 30);
      g.addColorStop(0, `rgba(243,216,150,${shooting.life * 0.9})`);
      g.addColorStop(1, "rgba(243,216,150,0)");
      cx.strokeStyle = g; cx.lineWidth = 1.4;
      cx.beginPath(); cx.moveTo(shooting.x, shooting.y); cx.lineTo(shooting.x + 60, shooting.y - 30); cx.stroke();
      if (shooting.life <= 0) shooting = null;
    }
    requestAnimationFrame(frame);
  }
  addEventListener("resize", resize);
  resize(); frame();
})();

/* ---------------- 牌型判定(支持双象/共鸣的花色枚举) ---------------- */
function suitOptionsOf(card) {
  if (card.enh === "resonant") return SUIT_KEYS;
  if (card.suits) return card.suits;
  return [card.suit];
}

function classify(cards, assign) {
  const n = cards.length;
  const ranks = cards.map(c => c.rank).sort((a, b) => a - b);
  const sameSuit = assign.every(s => s === assign[0]);
  const distinct = new Set(ranks).size === n;
  const consecutive = distinct && ranks[n - 1] - ranks[0] === n - 1;
  const rankCount = {};
  ranks.forEach(r => rankCount[r] = (rankCount[r] || 0) + 1);
  const counts = Object.values(rankCount).sort((a, b) => b - a);
  const suitSet = new Set(assign);

  if (n === 5 && sameSuit && consecutive) return "radiantRun";
  if (n === 4 && counts[0] === 4) return "fullPhase";
  if (n === 4 && suitSet.size === 4) return "tetra";
  if (n === 5 && sameSuit) return "glow5";
  if (n === 5 && consecutive) return "run5";
  if (n === 3 && counts[0] === 3) return "triPhase";
  if (n === 4 && counts[0] === 2 && counts[1] === 2) return "twinSeal";
  if (n === 3 && sameSuit) return "glow3";
  if (n === 3 && consecutive) return "run3";
  if (n === 2 && counts[0] === 2) return "pairSeal";
  return "stray";
}

function evaluate(cards) {
  const n = cards.length;
  if (n === 0) return null;
  const opts = cards.map(suitOptionsOf);
  let bestKey = "stray", bestAssign = opts.map(o => o[0]);
  const total = opts.reduce((p, o) => p * o.length, 1);
  if (total === 1) {
    bestKey = classify(cards, bestAssign);
  } else {
    /* 枚举花色归属,取倍率最高的判定 */
    const idx = new Array(n).fill(0);
    for (let it = 0; it < total; it++) {
      const assign = idx.map((v, i) => opts[i][v]);
      const key = classify(cards, assign);
      if (COMBO_MAP[key].mult > COMBO_MAP[bestKey].mult) { bestKey = key; bestAssign = assign; }
      for (let i = 0; i < n; i++) { idx[i]++; if (idx[i] < opts[i].length) break; idx[i] = 0; }
    }
  }
  const combo = COMBO_MAP[bestKey];
  return {
    key: bestKey, name: combo.name, mult: combo.mult, tier: combo.tier,
    base: cards.reduce((s, c) => s + c.rank, 0),
    assign: bestAssign,
    suit: bestAssign.every(s => s === bestAssign[0]) ? bestAssign[0] : null,
  };
}

/* ---------------- 计分管线:强化 + 异象(正/逆位) ---------------- */
function relicOf(key) { return S.relics.find(r => r.key === key) || null; }

function scoreWith(cards, ev, peek = false) {
  let base = ev.base, mult = ev.mult, post = 1;
  const notes = [];
  const minM = () => { if (mult < 1) mult = 1; };

  /* 牌强化(V3) */
  for (const c of cards) {
    if (c.enh === "starset") { base += 2; notes.push("镶星 +2"); }
    if (c.enh === "echo") { base += c.rank; notes.push(`回响 +${c.rank}`); }
    if (c.enh === "gilded") { mult += 1; notes.push("饰金 ×+1"); }
  }

  const cups = cards.filter((c, i) => ev.assign[i] === "cup").length;
  const wands = cards.filter((c, i) => ev.assign[i] === "wand").length;

  const star = relicOf("star");
  if (star) {
    if (!star.rev && cups > 0) { base += 2 * cups; notes.push(`星辰 +${2 * cups}`); }
    if (star.rev) {
      if (cups > 0) { base += 4 * cups; notes.push(`星辰·逆 +${4 * cups}`); }
      else { base = Math.max(1, base - 3); notes.push("星辰·逆 -3"); }
    }
  }
  const str = relicOf("strength");
  if (str) {
    if (!str.rev && wands > 0) { base += 2 * wands; notes.push(`力量 +${2 * wands}`); }
    if (str.rev) {
      if (wands > 0) { base += 4 * wands; notes.push(`力量·逆 +${4 * wands}`); }
      else { base = Math.max(1, base - 3); notes.push("力量·逆 -3"); }
    }
  }
  const sun = relicOf("sun");
  if (sun) {
    if (GLOWS.includes(ev.key)) { mult += sun.rev ? 5 : 2; notes.push(sun.rev ? "太阳·逆 ×+5" : "太阳 ×+2"); }
    else if (sun.rev && ev.key !== "stray") { mult -= 1; minM(); notes.push("太阳·逆 ×-1"); }
  }
  const tem = relicOf("temperance");
  if (tem) {
    if (RUNS.includes(ev.key)) { mult += tem.rev ? 4 : 2; notes.push(tem.rev ? "节制·逆 ×+4" : "节制 ×+2"); }
    else if (tem.rev && GLOWS.includes(ev.key)) { mult -= 2; minM(); notes.push("节制·逆 ×-2"); }
  }
  const emp = relicOf("emperor");
  if (emp) {
    if (RANKS.includes(ev.key)) { mult += emp.rev ? 4 : 2; notes.push(emp.rev ? "皇帝·逆 ×+4" : "皇帝 ×+2"); }
    else if (emp.rev && RUNS.includes(ev.key)) { mult -= 2; minM(); notes.push("皇帝·逆 ×-2"); }
  }
  const her = relicOf("hermit");
  if (her) {
    if (!her.rev && cards.length <= 3) { mult += 1; notes.push("隐者 ×+1"); }
    if (her.rev) {
      if (cards.length <= 2) { mult += 3; notes.push("隐者·逆 ×+3"); }
      else if (cards.length >= 4) { mult -= 1; minM(); notes.push("隐者·逆 ×-1"); }
    }
  }
  const jus = relicOf("justice");
  if (jus) {
    if (ev.key === "tetra") { mult += jus.rev ? 8 : 4; notes.push(jus.rev ? "正义·逆 ×+8" : "正义 ×+4"); }
    else if (jus.rev && ev.key === "twinSeal") { mult -= 2; minM(); notes.push("正义·逆 ×-2"); }
  }
  const mag = relicOf("magician");
  if (mag) {
    if (ev.key === "stray") {
      const target = mag.rev ? 3 : 2;
      if (mult < target) { mult = target; notes.push(mag.rev ? "魔术师·逆 ×3" : "魔术师 ×2"); }
    } else if (mag.rev && (ev.key === "pairSeal" || ev.key === "run3")) { mult -= 1; minM(); notes.push("魔术师·逆 ×-1"); }
  }
  const eps = relicOf("empress");
  if (eps) {
    if (S.playsUsed === 0) { post *= eps.rev ? 3 : 2; notes.push(eps.rev ? "女皇·逆 首手×3" : "女皇 首手×2"); }
    else if (eps.rev && S.plays === 1) { post *= 0.5; notes.push("女皇·逆 末手×0.5"); }
  }
  const moon = relicOf("moon");
  if (moon) {
    if (!moon.rev && S.moonCharge) { post *= 1.5; notes.push("月亮 ×1.5"); if (!peek) S.moonCharge = false; }
    if (moon.rev && S.moonStack > 0) { post *= 1 + S.moonStack; notes.push(`月亮·逆 ×${(1 + S.moonStack).toFixed(2)}`); }
  }

  return { base, mult, post, notes, score: Math.round(base * mult * post) };
}

function bestSubset(hand) {
  let best = null;
  const n = hand.length;
  for (let mask = 1; mask < (1 << n); mask++) {
    const idxs = [];
    for (let i = 0; i < n; i++) if (mask & (1 << i)) idxs.push(i);
    if (idxs.length < 2 || idxs.length > RULES.maxPlay) continue;
    const cards = idxs.map(i => hand[i]);
    const ev = evaluate(cards);
    if (ev.key === "stray") continue;
    const sc = scoreWith(cards, ev, true).score;
    if (!best || sc > best.score) best = { idxs, ev, score: sc };
  }
  return best;
}

/* ---------------- 游戏状态 ---------------- */
const S = {
  version: 1,
  layer: 1, threshold: 100,
  runDeck: [], deck: [], discard: [], hand: [],
  selected: new Set(),
  plays: 0, swaps: 0, arcana: 0, playsUsed: 0,
  layerScore: 0,
  revives: RULES.revives,
  relics: [], moonCharge: false, moonStack: 0,
  runScore: 0, bestPlay: null, lit: new Set(),
  guide: "strong",
  busy: false, started: false,
};

function buildRunDeck() {
  const d = [];
  for (const s of SUIT_KEYS) for (let r = 1; r <= 10; r++) d.push({ suit: s, rank: r, id: `${s}-${r}` });
  if (S.version >= 2) {
    DUAL_PAIRS.forEach((pair, pi) => {
      DUAL_RANKS.forEach(r => d.push({ suits: pair.slice(), rank: r, id: `dual-${pi}-${r}` }));
    });
  }
  return d;
}
function draw(count) {
  const out = [];
  for (let i = 0; i < count; i++) {
    if (S.deck.length === 0) { S.deck = shuffle(S.discard.splice(0)); }
    if (S.deck.length === 0) break;
    out.push(S.deck.pop());
  }
  return out;
}

/* ---------------- 裂隙渲染:序列帧引擎(city.mp4 → 61 帧) ---------------- */
const rift = (() => {
  /* cf_001..cf_039 = 映射段(裂隙最大→紫光熄灭,原视频帧 0-76),进入分数百分比映射;
     cf_040..cf_061 = 结算段(云涡散开·天光放亮,原帧 78-120),不进映射,过层时整段播放 */
  const TOTAL = 61, MAP_N = 39;
  const srcOf = i => `assets/city/cf_${String(i + 1).padStart(3, "0")}.jpg`;
  const imgs = [];
  let cur = 0, animId = 0;
  for (let i = 0; i < TOTAL; i++) { const im = new Image(); im.src = srcOf(i); imgs.push(im); }

  function show(i) {
    cur = Math.max(0, Math.min(TOTAL - 1, i));
    const f = $("riftFrame");
    if (f) f.src = imgs[cur].src;
    /* 裂隙辉光随闭合进度收缩变暗,进入结算段后熄灭 */
    const p = Math.min(1, cur / (MAP_N - 1));
    const g = $("riftGlow");
    if (g) {
      g.style.opacity = cur >= MAP_N ? "0" : String(0.15 + 0.6 * (1 - p));
      g.style.transform = `translate(-50%, -50%) scale(${(0.4 + 1.15 * (1 - p)).toFixed(2)})`;
    }
  }
  /* 区间播放:easeInOutQuad,首尾平缓过渡 */
  function animateTo(idx, done, frameMs = 46) {
    cancelAnimationFrame(animId);
    idx = Math.max(0, Math.min(TOTAL - 1, idx));
    const from = cur, span = idx - from;
    if (span === 0) { done && done(); return; }
    const dur = Math.min(1700, Math.max(280, Math.abs(span) * frameMs));
    const t0 = performance.now();
    const ease = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
    const step = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      show(from + Math.round(span * ease(p)));
      if (p < 1) animId = requestAnimationFrame(step);
      else done && done();
    };
    animId = requestAnimationFrame(step);
  }

  function build() { cancelAnimationFrame(animId); show(0); }       /* 每层:裂隙重新撕开 */
  function update(ratio) { animateTo(Math.round(Math.min(1, ratio) * (MAP_N - 1))); }
  function playSettle(done) { animateTo(TOTAL - 1, done, 56); }     /* 过层:结算段(天光放亮) */
  function reverseToZero(done) { animateTo(0, done, 34); }          /* 失败:倒放,裂隙重新撕开 */
  function progress() { return cur / (MAP_N - 1); }                 /* >1 = 已入结算段 */
  function tipPx() {
    const r = $("stage").getBoundingClientRect();
    return { x: r.width / 2, y: r.height * 0.21 };                  /* 光流目标:裂隙中心 */
  }
  return { build, update, tipPx, playSettle, reverseToZero, progress };
})();

/* ---------------- 渲染 ---------------- */
function cardEl(card, idx, n, animate = true, delayBase = 0) {
  const isDual = !!card.suits;
  const s1 = SUITS[isDual ? card.suits[0] : card.suit];
  const s2 = isDual ? SUITS[card.suits[1]] : null;
  const el = document.createElement("div");
  el.className = `card ${s1.cls}${isDual ? " dual" : ""}${animate ? " dealt" : ""}`;
  if (animate) el.style.animationDelay = `${Math.max(0, idx - delayBase) * 0.05}s`;
  if (isDual) { el.style.setProperty("--d1", s1.color); el.style.setProperty("--d2", s2.color); }
  const t = idx - (n - 1) / 2;
  el.style.setProperty("--rot", `${(t * 2).toFixed(1)}deg`);
  el.style.setProperty("--arc", `${(Math.abs(t) * 2.2).toFixed(1)}px`);
  el.innerHTML = `
    <div class="idx">
      <div class="rank">${card.rank}</div>
      <svg class="glyph-s" viewBox="0 0 48 48" fill="none"><use href="${s1.glyph}"/></svg>
      ${isDual ? `<svg class="glyph-s" style="color:${s2.color}" viewBox="0 0 48 48" fill="none"><use href="${s2.glyph}"/></svg>` : ""}
    </div>
    <svg class="glyph-w" ${isDual ? `style="color:${s2.color}"` : ""} viewBox="0 0 48 48" fill="none"><use href="${isDual ? s2.glyph : s1.glyph}"/></svg>
    ${card.enh ? `<span class="enh-badge" style="color:${ENHANCEMENTS[card.enh].color}" title="${ENHANCEMENTS[card.enh].name}">◆</span>` : ""}
    <span class="cframe"></span>`;
  el.addEventListener("click", () => onCardTap(idx));
  return el;
}

function renderHand(animFrom = 0) {
  const wrap = $("hand");
  wrap.innerHTML = "";
  S.hand.forEach((c, i) => wrap.appendChild(cardEl(c, i, S.hand.length, i >= animFrom, animFrom)));
  applySelection();
}

function applySelection() {
  const els = $("hand").children;
  const suggestion = (S.guide === "strong" && !S.busy) ? bestSubset(S.hand) : null;
  for (let i = 0; i < els.length; i++) {
    els[i].classList.toggle("selected", S.selected.has(i));
    const isSug = suggestion && suggestion.idxs.includes(i) && S.selected.size === 0;
    els[i].classList.toggle("suggested", !!isSug);
  }
  renderScoreBar(suggestion);
  const playDisabled = S.busy || S.selected.size === 0 || S.plays <= 0;
  $("btnPlay").disabled = playDisabled;
  $("btnPlay").classList.toggle("ready", !playDisabled);
  $("btnSwap").disabled = S.busy || S.selected.size === 0 || S.swaps <= 0;
}

/* ---- 计分条 ---- */
function bumpEl(el) { el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); }
function setBar(combo, base, mult, total, idle) {
  $("sbCombo").textContent = combo;
  $("sbBase").textContent = base;
  $("sbMult").textContent = mult;
  $("sbTotal").textContent = total;
  $("scoreBar").classList.toggle("idle", !!idle);
}
function renderScoreBar(suggestion) {
  const hint = $("hintLine");
  hint.classList.remove("notes");
  if (S.selected.size === 0) {
    setBar("—", 0, 0, 0, true);
    if (S.guide === "strong" && suggestion) {
      hint.innerHTML = `星轨指引:可凝聚 <span class="kw">${suggestion.ev.name}</span>(预计 ${suggestion.score})`;
    } else {
      hint.textContent = "点选下方印记,凝聚星轨缝合裂隙";
    }
    return;
  }
  const sel = [...S.selected].map(i => S.hand[i]);
  const ev = evaluate(sel);
  const sc = scoreWith(sel, ev, true);
  setBar(ev.name, sc.base, sc.mult, sc.score, false);
  let h = `已选 ${sel.length}/${RULES.maxPlay}`;
  if (sc.notes.length) h += ` · <span style="color:var(--gold)">✧ ${sc.notes.join(" · ")}</span>`;
  if (S.guide !== "weak") {
    const best = bestSubset(S.hand);
    if (best && best.score > sc.score) h += ` · <span style="color:var(--c-sword)">✦ 手牌中尚有更高组合</span>`;
  }
  hint.innerHTML = h;
}

function renderRelics() {
  const row = $("relicRow");
  row.innerHTML = "";
  S.relics.forEach(r => {
    const def = RELIC_MAP[r.key];
    const el = document.createElement("button");
    el.className = "relic" + (r.rev ? " rev" : "");
    el.innerHTML = `<svg viewBox="0 0 24 24"><use href="${def.icon}"/></svg>`;
    el.addEventListener("click", () => say(null, `「${def.name}${r.rev ? "·逆" : ""}」${r.rev ? def.rdesc : def.desc}`));
    row.appendChild(el);
  });
  const empties = Math.max(0, 3 - S.relics.length);
  for (let i = 0; i < empties; i++) {
    const e = document.createElement("div");
    e.className = "relic-empty";
    e.textContent = "?";
    row.appendChild(e);
  }
}

function renderCounters() {
  $("playsLeft").textContent = S.plays;
  $("playsLeft").classList.toggle("depleted", S.plays <= 1);
  $("swapsLeft").textContent = S.swaps;
  $("swapsLeft").classList.toggle("depleted", S.swaps <= 0);
  $("layerName").textContent = layerLabel(S.layer);
  $("verTag").textContent = VER_NAMES[S.version];
  $("meterGoal").textContent = S.threshold;
  const slot = $("btnArcana");
  slot.classList.toggle("used", S.arcana <= 0);
  $("arcanaUses").textContent = S.arcana;
  const danger = S.started && S.plays <= 1 && S.layerScore < S.threshold;
  $("stage").classList.toggle("danger", danger);
}

function countUpMeter(from, to, dur = 700) {
  const el = $("meterNow");
  const t0 = performance.now();
  function tick(t) {
    const p = Math.min(1, (t - t0) / dur);
    el.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

/* ---------------- 交互 ---------------- */
function onCardTap(idx) {
  if (S.busy) return;
  sfx.unlock();
  if (S.selected.has(idx)) { S.selected.delete(idx); sfx.deselect(); }
  else {
    if (S.selected.size >= RULES.maxPlay) {
      say(null, `星轨已满——一次校准最多打出 ${RULES.maxPlay} 张印记。`);
      return;
    }
    S.selected.add(idx); sfx.select();
  }
  applySelection();
}

async function onSwap() {
  if (S.busy || S.selected.size === 0 || S.swaps <= 0) return;
  if (S.selected.size > RULES.maxSwap) {
    say(null, `重引受限——一次最多弃换 ${RULES.maxSwap} 张,请减少选择。`);
    return;
  }
  S.busy = true; S.swaps--;
  sfx.swap();
  const idxs = [...S.selected].sort((a, b) => b - a);
  const els = $("hand").children;
  [...S.selected].forEach(i => els[i] && els[i].classList.add("swap-out"));
  await wait(270);
  for (const i of idxs) S.discard.push(S.hand.splice(i, 1)[0]);
  const got = draw(idxs.length);
  S.hand.push(...got);
  S.selected.clear();
  const moon = relicOf("moon");
  if (moon && !moon.rev) { S.moonCharge = true; say(null, "「月亮」潮汐充能——下一手共鸣 ×1.5。"); }
  if (moon && moon.rev) { S.moonStack += 0.25; say(null, `「月亮·逆」本层乘区 ×${(1 + S.moonStack).toFixed(2)}。`); }
  S.busy = false;
  renderHand(S.hand.length - got.length); renderCounters();
}

async function onPlay() {
  if (S.busy || S.selected.size === 0 || S.plays <= 0) return;
  S.busy = true;
  applySelection();
  const idxs = [...S.selected].sort((a, b) => a - b);
  const cards = idxs.map(i => S.hand[i]);
  const ev = evaluate(cards);
  const sc = scoreWith(cards, ev);
  S.plays--; S.playsUsed++;

  [...S.selected].sort((a, b) => b - a).forEach(i => { S.discard.push(S.hand.splice(i, 1)[0]); });
  S.selected.clear();
  renderHand(); renderCounters();

  await animatePlay(cards, ev, sc);

  const prev = S.layerScore;
  S.layerScore += sc.score;
  S.runScore += sc.score;
  if (!S.bestPlay || sc.score > S.bestPlay.score) S.bestPlay = { score: sc.score, name: ev.name };
  if (ev.key !== "stray") S.lit.add(ev.key);
  countUpMeter(prev, S.layerScore);
  rift.update(S.layerScore / S.threshold);
  sfx.seam();
  floatText(`+${sc.score}`, ev.tier);
  leadReaction(ev);
  renderCounters();

  await wait(1000);
  clearStage();

  if (S.layerScore >= S.threshold) {
    sfx.clear();
    await sealCelebration();
    showLayerClear();
  } else if (S.plays <= 0) {
    sfx.fail();
    await breakdownShow();
    showFail();
  } else {
    const got = draw(RULES.handSize - S.hand.length);
    S.hand.push(...got);
    S.busy = false;
    renderHand(S.hand.length - got.length); renderCounters();
  }
}

async function animatePlay(cards, ev, sc) {
  const stage = $("stage");
  const pc = $("playedCards");
  const cons = $("constellation");
  pc.innerHTML = ""; cons.innerHTML = "";
  const rect = stage.getBoundingClientRect();
  const n = cards.length;
  const pitch = 54;
  const y = rect.height - 86;
  const x0 = rect.width / 2 - ((n - 1) * pitch) / 2;
  const positions = cards.map((_, i) => ({ x: x0 + i * pitch, y }));

  setBar(ev.name, 0, 0, 0, false);
  const hint = $("hintLine");
  hint.classList.add("notes");
  hint.innerHTML = sc.notes.length ? `✧ ${sc.notes.join(" · ")}` : "";
  let baseSoFar = 0;
  cards.forEach((c, i) => {
    const isDual = !!c.suits;
    const s1 = SUITS[isDual ? c.suits[0] : c.suit];
    const el = document.createElement("div");
    el.className = `pcard ${s1.cls}`;
    el.style.left = `${positions[i].x - 23}px`;
    el.style.top = `${positions[i].y - 33}px`;
    el.innerHTML = `<svg viewBox="0 0 48 48" fill="none"><use href="${s1.glyph}"/></svg>
                    <div class="pcard-rank">${c.rank}</div>`;
    pc.appendChild(el);
    setTimeout(() => {
      el.classList.add("in");
      sfx.thud(i);
      impactRing(positions[i].x, positions[i].y - 33);
      baseSoFar += c.rank;
      $("sbBase").textContent = baseSoFar;
      bumpEl($("sbBase"));
    }, i * 160);
  });
  await wait(n * 160 + 240);

  if (sc.base !== baseSoFar) {
    $("sbBase").textContent = sc.base;
    bumpEl($("sbBase"));
    sfx.select();
    await wait(260);
  }

  if (n >= 2) {
    for (let i = 0; i < n - 1; i++) {
      const a = positions[i], b = positions[i + 1];
      const ln = document.createElementNS("http://www.w3.org/2000/svg", "line");
      ln.setAttribute("x1", a.x); ln.setAttribute("y1", a.y - 40);
      ln.setAttribute("x2", a.x); ln.setAttribute("y2", a.y - 40);
      cons.appendChild(ln);
      requestAnimationFrame(() => {
        ln.style.transition = "all 0.24s ease";
        ln.setAttribute("x2", b.x); ln.setAttribute("y2", b.y - 40);
      });
      await wait(110);
    }
  }

  $("sbMult").textContent = sc.mult;
  if (ev.tier >= 3) {
    const m = $("sbMult");
    m.classList.remove("mega"); void m.offsetWidth; m.classList.add("mega");
  } else bumpEl($("sbMult"));
  sfx.seam();
  await wait(300);

  $("sbTotal").textContent = sc.score;
  if (ev.tier >= 3) {
    const t = $("sbTotal");
    t.classList.remove("mega"); void t.offsetWidth; t.classList.add("mega");
  } else bumpEl($("sbTotal"));
  if (ev.tier >= 4) {
    const st = $("stage");
    st.classList.add("shake-hard");
    setTimeout(() => st.classList.remove("shake-hard"), 450);
  }
  const banner = $("comboBanner");
  banner.className = "combo-banner show" + (ev.tier >= 3 ? " tier-high" : "");
  banner.innerHTML = `<div class="combo-name">${ev.name}</div>
    ${sc.notes.length ? `<div class="combo-relic-note">✦ ${sc.notes.join(" · ")}</div>` : ""}`;
  sfx.play(ev.tier);
  if (ev.tier >= 3) flash();
  await wait(650);

  const newRatio = Math.min(1, (S.layerScore + sc.score) / S.threshold);
  const tip = rift.tipPx(newRatio);
  const cx = rect.width / 2, cy = y - 40;
  const sparkN = Math.min(6, 2 + ev.tier);
  for (let i = 0; i < sparkN; i++) {
    const sp = document.createElement("div");
    sp.className = "spark";
    sp.style.left = `${cx + (Math.random() * 40 - 20)}px`;
    sp.style.top = `${cy + (Math.random() * 16 - 8)}px`;
    stage.appendChild(sp);
    setTimeout(() => { sp.style.left = `${tip.x}px`; sp.style.top = `${tip.y}px`; sp.style.opacity = "0"; }, 30 + i * 70);
    setTimeout(() => { sp.remove(); burstAt(tip.x, tip.y, 2, 22); }, 620 + i * 70);
  }
  await wait(420);
}

function clearStage() {
  [...$("playedCards").children].forEach(el => el.classList.add("spent"));
  setTimeout(() => { $("playedCards").innerHTML = ""; }, 480);
  $("constellation").innerHTML = "";
  $("comboBanner").className = "combo-banner";
}

function floatText(text, tier) {
  const el = document.createElement("div");
  el.className = "float-text";
  el.textContent = text;
  el.style.color = tier >= 3 ? "#f3d896" : "#e9e4d6";
  el.style.fontSize = `${17 + tier * 4}px`;
  const m = $("stageMeter").getBoundingClientRect();
  el.style.left = `${m.left}px`;
  el.style.top = `${m.bottom + 4}px`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1100);
}

function flash(red = false) {
  let f = document.querySelector(".flash");
  if (!f) { f = document.createElement("div"); f.className = "flash"; document.body.appendChild(f); }
  f.classList.toggle("red", red);
  f.classList.remove("go"); void f.offsetWidth; f.classList.add("go");
}

/* 失败演出:帧序列倒放(裂隙反向撕开)+ 红屏脉动 */
async function breakdownShow() {
  const stage = $("stage");
  stage.classList.add("collapse");
  flash(true);
  stage.classList.add("shake-hard");
  setTimeout(() => stage.classList.remove("shake-hard"), 450);
  await new Promise(res => rift.reverseToZero(res));
  await wait(260);
  stage.classList.remove("collapse");
}

/* 爆点粒子(舞台坐标) */
function burstAt(x, y, n = 4, spread = 34, cls = "tip-burst") {
  const stage = $("stage");
  for (let i = 0; i < n; i++) {
    const b = document.createElement("div");
    b.className = cls;
    b.style.left = `${x}px`; b.style.top = `${y}px`;
    const a = Math.random() * Math.PI * 2, d = spread * (0.5 + Math.random());
    b.style.setProperty("--bx", `${Math.cos(a) * d}px`);
    b.style.setProperty("--by", `${Math.sin(a) * d}px`);
    stage.appendChild(b);
    setTimeout(() => b.remove(), 850);
  }
}

/* 落牌冲击环 */
function impactRing(x, y) {
  const r = document.createElement("div");
  r.className = "impact-ring";
  r.style.left = `${x}px`; r.style.top = `${y}px`;
  $("stage").appendChild(r);
  setTimeout(() => r.remove(), 500);
}

/* 封缝庆祝:盖章 + 金粒喷发 */
async function sealCelebration() {
  const stage = $("stage");
  const rect = stage.getBoundingClientRect();
  rift.playSettle();                      /* 结算段:云涡散开,天光放亮(与盖章并行) */
  const st = document.createElement("div");
  st.className = "seal-stamp";
  st.innerHTML = "<span>裂 隙 稳 定</span>";
  stage.appendChild(st);
  flash();
  for (let i = 0; i < 16; i++) {
    setTimeout(() => burstAt(
      rect.width / 2 + (Math.random() * 70 - 35),
      rect.height * 0.22 + Math.random() * rect.height * 0.55,
      2, 60, "gold-burst"), i * 45);
  }
  await wait(1300);
  st.remove();
}

/* 层名进场 */
function layerIntro() {
  const intro = document.createElement("div");
  intro.className = "layer-intro";
  intro.innerHTML = `<div class="li-name">${layerLabel(S.layer)}</div><div class="li-goal">稳定阈值 ${S.threshold}</div>`;
  $("stage").appendChild(intro);
  setTimeout(() => intro.remove(), 1700);
}

/* ====== 男主对话位:say() 系统 ====== */
const LEAD_IDLE = {
  wand:  ["裂隙在低鸣。跟紧我,别走丢。", "出牌干脆点——犹豫才会输。"],
  coin:  ["按你的节奏来,我看着账。", "每一张印记,都该花在刀刃上。"],
  sword: ["我已经看过牌堆了……开玩笑的。", "想好再出,我讨厌返工。"],
  cup:   ["慢慢来,裂隙又不会跑。", "你刚才那一手,比你以为的漂亮。"],
};
let dutyLead = "cup";
let sayTimer = null;
function say(suit, text, hold = 4500) {
  const av = $("leadAvatar"), glyph = $("leadGlyph"), name = $("lbName");
  if (suit && SUITS[suit]) {
    av.style.color = SUITS[suit].color;
    glyph.setAttribute("href", SUITS[suit].glyph);
    name.textContent = LEADS[suit].name;
    name.style.color = SUITS[suit].color;
  } else {
    av.style.color = "#d8b46a";
    glyph.setAttribute("href", "#glyph-octa");
    name.textContent = "✦ 星盘";
    name.style.color = "#f3d896";
  }
  $("lbText").innerHTML = text;
  const b = document.querySelector(".lead-bubble");
  b.classList.remove("bubble-on"); void b.offsetWidth; b.classList.add("bubble-on");
  clearTimeout(sayTimer);
  if (hold) sayTimer = setTimeout(idleLine, hold);
}
function idleLine() {
  const lines = LEAD_IDLE[dutyLead];
  say(dutyLead, lines[Math.floor(Math.random() * lines.length)], 0);
}

function leadReaction(ev) {
  if (ev.key === "tetra") {
    say(null, "四象共鸣——四道星轨,同时为你亮起。");
  } else if (ev.suit && GLOWS.includes(ev.key)) {
    const lead = LEADS[ev.suit];
    say(ev.suit, lead.lines[Math.floor(Math.random() * lead.lines.length)]);
  } else if (ev.key === "fullPhase") {
    say(null, "星盘震颤——四枚同阶印记,命运罕见地整齐。");
  }
}

/* ---------------- 金手指:命运之轮 ---------------- */
async function onArcana() {
  if (S.busy || S.arcana <= 0) return;
  S.busy = true; S.arcana--;
  const slot = $("btnArcana");
  slot.classList.add("spinning");
  sfx.wheel();
  [...$("hand").children].forEach(el => el.classList.add("swap-out"));

  await wait(650);
  S.discard.push(...S.hand.splice(0));
  S.deck = shuffle([...S.deck, ...S.discard]);
  S.discard = [];
  const bySuit = {};
  S.deck.forEach(c => { const k = suitOptionsOf(c)[0]; (bySuit[k] = bySuit[k] || []).push(c); });
  let rigged = [];
  const richSuit = SUIT_KEYS.filter(k => (bySuit[k] || []).length >= 3)
    .sort((a, b) => bySuit[b].length - bySuit[a].length)[0];
  if (richSuit) rigged = bySuit[richSuit].slice(0, 3);
  rigged.forEach(c => S.deck.splice(S.deck.indexOf(c), 1));
  S.hand = shuffle([...rigged, ...draw(RULES.handSize - rigged.length)]);
  S.selected.clear();

  await wait(450);
  slot.classList.remove("spinning");
  say(null, "命运之轮重转——这一手,是它欠你的。");
  S.busy = false;
  renderHand(); renderCounters();
}

/* ---------------- 层级流转 ---------------- */
function startLayer() {
  S.threshold = thresholdOf(S.layer);
  S.deck = shuffle([...S.runDeck]);
  S.discard = [];
  S.hand = draw(RULES.handSize);
  S.selected.clear();
  S.plays = RULES.plays;
  const moon = relicOf("moon");
  S.swaps = RULES.swaps - (moon && moon.rev ? 1 : 0);
  S.arcana = RULES.arcanaUses;
  S.layerScore = 0; S.playsUsed = 0; S.moonCharge = false; S.moonStack = 0;
  S.busy = false;
  $("meterNow").textContent = "0";
  $("playedCards").innerHTML = "";
  $("constellation").innerHTML = "";
  $("comboBanner").className = "combo-banner";
  rift.build();
  renderHand(); renderCounters(); renderRelics();
  layerIntro();
  /* 驻场男主轮换 + 开场台词 */
  dutyLead = SUIT_KEYS[Math.floor(Math.random() * 4)];
  setTimeout(idleLine, 900);
}

/* 过层奖励:V1/V2 = 3 异象;V3+ = 2 异象 + 1 牌强化;V4 异象可逆位 */
function showLayerClear() {
  const ratio = S.layerScore / S.threshold;
  const stars = ratio >= 2 ? 3 : ratio >= 1.5 ? 2 : 1;
  const pool = RELICS.filter(r => !S.relics.some(o => o.key === r.key));
  const relicN = S.version >= 3 ? 2 : 3;
  const offer = shuffle(pool.slice()).slice(0, relicN).map(r => ({
    type: "relic", key: r.key,
    rev: S.version >= 4 && Math.random() < REV_CHANCE,
  }));
  if (S.version >= 3) {
    const ekeys = shuffle(Object.keys(ENHANCEMENTS)).slice(0, 1);
    ekeys.forEach(k => offer.push({ type: "enh", ekey: k }));
  }
  const offerHtml = offer.map((o, i) => {
    if (o.type === "relic") {
      const def = RELIC_MAP[o.key];
      return `<button class="relic-pick${o.rev ? " reversed" : ""}" data-i="${i}">
        <span class="rp-icon"><svg viewBox="0 0 24 24"><use href="${def.icon}"/></svg></span>
        <span><span class="rp-name">${def.name}${o.rev ? "·逆" : ""}</span><div class="rp-desc">${o.rev ? def.rdesc : def.desc}</div></span>
      </button>`;
    }
    const e = ENHANCEMENTS[o.ekey];
    return `<button class="relic-pick enh" data-i="${i}">
      <span class="rp-icon" style="color:${e.color};border-color:${e.color}">◆</span>
      <span><span class="rp-name" style="color:${e.color}">牌强化 · ${e.name}</span><div class="rp-desc">${e.desc} —— 从牌库抽 5 张,铭刻其一</div></span>
    </button>`;
  }).join("");
  openModal(`
    <h2>裂隙稳定</h2>
    <div class="sub">${layerLabel(S.layer)} · 共鸣 ${S.layerScore}/${S.threshold}</div>
    <div class="stars">${[0, 1, 2].map(i => `<span class="star-pop" style="animation-delay:${0.15 + i * 0.18}s">${i < stars ? "★" : "☆"}</span>`).join("")}</div>
    ${offer.length ? `<p class="dim" style="margin-top:6px">裂隙深处传来回赠——选取其一:</p>${offerHtml}` : `<p class="dim">回赠已全部收集。</p>`}
    <button class="btn-ghost" id="mSkip">不取,直接深入下一层</button>
  `);
  [...document.querySelectorAll(".relic-pick")].forEach(btn => {
    btn.addEventListener("click", () => {
      const o = offer[+btn.dataset.i];
      if (o.type === "relic") {
        S.relics.push({ key: o.key, rev: o.rev });
        o.rev ? sfx.rev() : sfx.relic();
        const def = RELIC_MAP[o.key];
        closeModal(); S.layer++; startLayer();
        say(null, `收下「${def.name}${o.rev ? "·逆" : ""}」——${o.rev ? def.rdesc : def.desc}`);
      } else {
        showEnhancePick(o.ekey);
      }
    });
  });
  $("mSkip").onclick = () => { closeModal(); S.layer++; startLayer(); };
}

/* 牌强化:从牌库抽 5 张选 1 铭刻 */
function showEnhancePick(ekey) {
  const e = ENHANCEMENTS[ekey];
  const candidates = shuffle(S.runDeck.filter(c => !c.enh)).slice(0, 5);
  const cardsHtml = candidates.map((c, i) => {
    const isDual = !!c.suits;
    const s1 = SUITS[isDual ? c.suits[0] : c.suit];
    return `<button class="mini-card ${s1.cls}" data-i="${i}">
      <span class="mc-rank">${c.rank}</span>
      <svg viewBox="0 0 48 48" fill="none"><use href="${s1.glyph}"/></svg>
      ${isDual ? `<svg style="color:${SUITS[c.suits[1]].color}" viewBox="0 0 48 48" fill="none"><use href="${SUITS[c.suits[1]].glyph}"/></svg>` : ""}
    </button>`;
  }).join("");
  openModal(`
    <h2>铭刻 · ${e.name}</h2>
    <div class="sub" style="color:${e.color}">${e.desc}(本次远征内永久生效)</div>
    <div class="mini-grid">${cardsHtml}</div>
    <button class="btn-ghost" id="mCancel">放弃铭刻,直接深入</button>
  `);
  [...document.querySelectorAll(".mini-card")].forEach(btn => {
    btn.addEventListener("click", () => {
      const c = candidates[+btn.dataset.i];
      c.enh = ekey;
      sfx.relic();
      closeModal(); S.layer++; startLayer();
      say(null, `铭刻成功——${SUITS[suitOptionsOf(c)[0]].name} ${c.rank} 已获得「${e.name}」。`);
    });
  });
  $("mCancel").onclick = () => { closeModal(); S.layer++; startLayer(); };
}

function showFail() {
  if (S.revives > 0) {
    openModal(`
      <h2>星轨溃散</h2>
      <div class="sub">${layerLabel(S.layer)} · 稳定度未达成</div>
      <p>共鸣 <b class="kw">${S.layerScore}</b> / ${S.threshold}</p>
      <p class="dim">一道熟悉的回响穿过裂隙而来——</p>
      <button class="btn-main" id="mRevive">回响复活(本次远征限 1 次)</button>
      <p class="dim" style="margin-top:8px">内部演示:正式版此处为「男主救场 / 广告 / 分享」复活位</p>
      <button class="btn-ghost" id="mSettle">结束远征,结算</button>
    `);
    $("mRevive").onclick = () => { S.revives--; closeModal(); startLayer(); };
    $("mSettle").onclick = () => { closeModal(); showSettle(); };
  } else {
    showSettle();
  }
}

function showSettle() {
  const cleared = S.layer - 1;
  openModal(`
    <h2>远征结算</h2>
    <div class="sub">星轨裁决 · 内部演示 v0.4 · 版本${VER_NAMES[S.version]}</div>
    <div class="stat-grid">
      <div class="stat"><div class="v" data-cv="${cleared}">0</div><div class="k">稳定星层</div></div>
      <div class="stat"><div class="v" data-cv="${S.runScore}">0</div><div class="k">总共鸣</div></div>
      <div class="stat"><div class="v" data-cv="${S.bestPlay ? S.bestPlay.score : 0}">0</div><div class="k">最高单手${S.bestPlay ? " · " + S.bestPlay.name : ""}</div></div>
      <div class="stat"><div class="v" data-cv="${S.relics.length}">0</div><div class="k">收集异象</div></div>
    </div>
    <p class="dim">数值未调优 · 用于内部手感与接受度测试(docs/05)</p>
    <button class="btn-main" id="mRestart">再 次 远 征</button>
    <button class="btn-ghost" id="mTitle">返回版本选择</button>
  `);
  document.querySelectorAll(".stat .v[data-cv]").forEach((el, i) => {
    const to = +el.dataset.cv, t0 = performance.now() + i * 120;
    const tick = (t) => {
      if (t < t0) { requestAnimationFrame(tick); return; }
      const p = Math.min(1, (t - t0) / 650);
      el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  $("mRestart").onclick = () => { closeModal(); newRun(); };
  $("mTitle").onclick = () => { closeModal(); showTitle(); };
}

function newRun() {
  S.layer = 1; S.revives = RULES.revives;
  S.runScore = 0; S.bestPlay = null; S.lit = new Set();
  S.relics = []; S.moonCharge = false; S.moonStack = 0;
  S.runDeck = buildRunDeck();
  S.started = true;
  startLayer();
}

/* ---------------- 模态 ---------------- */
function openModal(html) {
  $("modal").innerHTML = html;
  $("overlay").classList.add("show");
}
function closeModal() { $("overlay").classList.remove("show"); }

function showCodexModal() {
  const rows = COMBOS.filter(c => c.key !== "stray").map(c => `
    <tr class="${S.lit.has(c.key) ? "lit" : ""}">
      <td class="cx-name">${c.batch} ${c.name}</td>
      <td class="cx-desc">${c.desc}</td>
      <td class="cx-mult">×${c.mult}</td>
    </tr>`).join("");
  const relicRows = S.relics.length
    ? S.relics.map(r => {
        const def = RELIC_MAP[r.key];
        return `<tr><td class="cx-name">${r.rev ? "☾" : "✧"} ${def.name}${r.rev ? "·逆" : ""}</td><td class="cx-desc" colspan="2">${r.rev ? def.rdesc : def.desc}</td></tr>`;
      }).join("")
    : `<tr><td class="cx-desc" colspan="3">尚未收集异象——稳定裂隙后三选一。</td></tr>`;
  const extras = [];
  if (S.version >= 2) extras.push("双象牌:同时属于两个花色,判定自动取最优归属。");
  if (S.version >= 3) extras.push("牌强化:◆ 标记的印记带永久铭刻(镶星/饰金/共鸣/回响)。");
  if (S.version >= 4) extras.push("逆位异象(紫):更强,但伴随代价。");
  openModal(`
    <h2>裁决式图鉴</h2>
    <div class="sub">✦ = 本次远征已点亮 · ①-④ 为剧情解锁批次 · 版本${VER_NAMES[S.version]}</div>
    <table class="codex-table">${rows}</table>
    <p class="dim" style="margin-top:10px">—— 已持有异象 ——</p>
    <table class="codex-table">${relicRows}</table>
    ${extras.length ? `<p class="dim" style="margin-top:8px">${extras.join("<br>")}</p>` : ""}
    <p class="dim">散星(未成式)×1:任意印记的星阶仍会计入。</p>
    <button class="btn-main" id="mClose">回 到 裂 隙</button>
  `);
  $("mClose").onclick = closeModal;
}

function showGuideModal() {
  const cur = S.guide;
  openModal(`
    <h2>星轨指引</h2>
    <div class="sub">对应 docs/04 §3 三级引导,内测可自由切换</div>
    <button class="btn-main" id="gStrong" style="${cur === "strong" ? "" : "opacity:0.55"}">强引导 · 自动推荐最优组合</button>
    <button class="btn-main" id="gMid" style="margin-top:10px;${cur === "mid" ? "" : "opacity:0.55"}">中引导 · 仅提示存在更高组合</button>
    <button class="btn-main" id="gWeak" style="margin-top:10px;${cur === "weak" ? "" : "opacity:0.55"}">弱引导 · 只显示当前牌型</button>
  `);
  const set = (g) => { S.guide = g; closeModal(); applySelection(); };
  $("gStrong").onclick = () => set("strong");
  $("gMid").onclick = () => set("mid");
  $("gWeak").onclick = () => set("weak");
}

/* ---------------- 教学与标题 ---------------- */
function showTutorial(page = 0) {
  const pages = [
    `<h2>星轨裁决</h2>
     <div class="sub">内部演示 · 竖屏体验最佳</div>
     <p>一道<span class="kw">裂隙</span>正撕开城市的夜空。<br>打出印记、凝聚星轨,<br>你会亲眼看见它被金线一寸寸<span class="kw">缝合</span>。</p>
     <p>每层裂隙限 <span class="kw">4 次校准</span>。<br>缝不完,它就会吞掉这一层。</p>
     <button class="btn-main" id="tNext">下一页</button>`,
    `<h2>凝聚星轨</h2>
     <div class="sub">组合越华丽,缝合越长</div>
     <p><span class="kw">对印</span>:两张同星阶 ×2<br>
        <span class="kw">连星</span>:星阶连续 ×3 起<br>
        <span class="kw">同辉</span>:同一花色 ×3 起<br>
        <span class="kw">四象共鸣</span>:<span class="kw-w">权杖</span>·<span class="kw-c">星币</span>·<span class="kw-s">宝剑</span>·<span class="kw-u">圣杯</span>各一 ×8</p>
     <p class="dim">不确定怎么打?星轨会为你标出推荐(右上「导」可切换)。</p>
     <button class="btn-main" id="tNext">下一页</button>`,
    `<h2>命运站在你这边</h2>
     <div class="sub">法则与异象</div>
     <p>左下<span class="kw">命运之轮</span>:每层一次,命运重转,必有一手好牌。</p>
     <p>每稳定一层裂隙,可从裂隙的回赠中<span class="kw">三选一</span>——异象会持续改写你的星轨,越深入,越强大。</p>
     <button class="btn-main" id="tNext">开 始 远 征</button>`,
  ];
  openModal(pages[page]);
  $("tNext").onclick = () => {
    if (page < pages.length - 1) showTutorial(page + 1);
    else { closeModal(); S.version = 1; newRun(); }
  };
}

function showTitle() {
  openModal(`
    <svg class="title-octa" viewBox="0 0 48 48"><use href="#glyph-octa"/></svg>
    <h2>星轨裁决</h2>
    <div class="sub">STARLIGHT VERDICT · 内部演示 v0.4</div>
    <p style="margin:14px 0 10px">巨大的裂隙悬在暮星城上空。<br>选择本次远征的玩法深度:</p>
    <button class="btn-main" id="v1">Ⅰ · 剧情内简单版(首测推荐)</button>
    <button class="btn-main btn-second" id="v2">Ⅱ · + 双象牌(4×4 双花色)</button>
    <button class="btn-main btn-second" id="v3">Ⅲ · + 通关牌强化(铭刻)</button>
    <button class="btn-main btn-second" id="v4">Ⅳ · 完整版 · 异象逆位(硬核)</button>
    <button class="btn-ghost" id="tStart">先看教学(以版本Ⅰ开始)</button>
    <p class="dim" style="margin-top:12px">版本逐级叠加 · 对应 docs/04 §14 路线<br>数值未调优 · 男主反馈为文案演示</p>
  `);
  const start = (v) => { S.version = v; closeModal(); newRun(); };
  $("v1").onclick = () => start(1);
  $("v2").onclick = () => start(2);
  $("v3").onclick = () => start(3);
  $("v4").onclick = () => start(4);
  $("tStart").onclick = () => showTutorial(0);
}

/* ---------------- 绑定 ---------------- */
$("btnPlay").addEventListener("click", onPlay);
$("btnSwap").addEventListener("click", onSwap);
$("btnArcana").addEventListener("click", onArcana);
$("btnHelp").addEventListener("click", () => { if (!S.busy) showCodexModal(); });
$("btnGuide").addEventListener("click", () => { if (!S.busy) showGuideModal(); });
$("btnSound").addEventListener("click", function () {
  this.classList.toggle("off", !sfx.toggle());
});
document.body.addEventListener("pointerdown", () => sfx.unlock(), { once: true });

/* 裂隙粒子:从裂隙处洒落碎屑,密度/范围随闭合进度衰减;闭合后只偶发金色平静粒 */
setInterval(() => {
  if (document.hidden) return;
  const stage = $("stage");
  if (!stage || $("overlay").classList.contains("show")) return;
  const p = Math.min(1, rift.progress());
  if (p >= 1 && Math.random() < 0.8) return;
  const r = stage.getBoundingClientRect();
  const e = document.createElement("div");
  e.className = "ember";
  const spread = 0.07 + 0.2 * (1 - p);
  e.style.color = p >= 1 ? "rgba(243,216,150,0.85)"
    : (Math.random() < 0.6 ? "rgba(186,134,255,0.9)" : "rgba(255,91,110,0.8)");
  e.style.left = `${r.width * (0.5 + (Math.random() * 2 - 1) * spread)}px`;
  e.style.top = `${r.height * (0.10 + Math.random() * 0.18)}px`;
  e.style.setProperty("--dx", `${Math.random() * 40 - 20}px`);
  e.style.setProperty("--dy", `${70 + Math.random() * 90}px`);
  e.style.setProperty("--dur", `${2.2 + Math.random() * 1.4}s`);
  stage.appendChild(e);
  setTimeout(() => e.remove(), 3800);
}, 300);

/* 启动 */
rift.build();
showTitle();
