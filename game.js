/* ==========================================================
   星轨裁决 · 内部演示 v0.5
   规则依据:docs/04(§14 玩法深度版本路线 V1-V4 + §14.1 宫廷牌)
   Ⅰ 剧情内简单版 / Ⅱ +宫廷牌·男主驰援 / Ⅲ +牌铭刻 / Ⅳ 完整版·逆位
   v0.5 经济与构筑层:星屑 / 星象集市 / 命运签 / 稀有度 / 剧情委托 / 天象
   v0.6 宫廷牌·男主驰援(取代双象牌——docs/04 §14.1 拍板)
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

/* 稀有度 */
const RARITY = {
  c: { key: "c", name: "凡象", color: "#9fb4d8", w: 60 },
  r: { key: "r", name: "秘象", color: "#f0c75e", w: 30 },
  l: { key: "l", name: "天启", color: "#d29bff", w: 10 },
};
const RELIC_PRICE = { c: 25, r: 45, l: 70 };
const ENH_PRICE   = { c: 18, r: 32, l: 55 };

/* 异象(大阿卡纳被动)— 正位 + 逆位(V4) */
const RELICS = [
  { key: "star",       name: "星辰",   icon: "#rg-star", rar: "c",
    desc: "圣杯印记 星阶 +2",
    rdesc: "圣杯印记 星阶 +4;但不含圣杯的组合 底分 -3" },
  { key: "sun",        name: "太阳",   icon: "#rg-sun", rar: "r",
    desc: "同辉系裁决式 倍率 +2",
    rdesc: "同辉系 倍率 +5;但其余组合 倍率 -1" },
  { key: "moon",       name: "月亮",   icon: "#rg-moon", rar: "r",
    desc: "每次重引后,下一手共鸣 ×1.5",
    rdesc: "每次重引使本层乘区永久 +0.25;但每层重引次数 -1" },
  { key: "strength",   name: "力量",   icon: "#rg-strength", rar: "c",
    desc: "权杖印记 星阶 +2",
    rdesc: "权杖印记 星阶 +4;但不含权杖的组合 底分 -3" },
  { key: "emperor",    name: "皇帝",   icon: "#rg-emperor", rar: "r",
    desc: "同阶系裁决式(对印/双对/三相/满相)倍率 +2",
    rdesc: "同阶系 倍率 +4;但连星系 倍率 -2" },
  { key: "hermit",     name: "隐者",   icon: "#rg-hermit", rar: "c",
    desc: "打出 ≤3 张时 倍率 +1",
    rdesc: "打出 ≤2 张时 倍率 +3;但打出 ≥4 张时 倍率 -1" },
  { key: "justice",    name: "正义",   icon: "#rg-justice", rar: "l",
    desc: "四象共鸣 倍率 +4",
    rdesc: "四象共鸣 倍率 +8;但双对印 倍率 -2" },
  { key: "temperance", name: "节制",   icon: "#rg-temperance", rar: "r",
    desc: "连星系裁决式 倍率 +2",
    rdesc: "连星系 倍率 +4;但同辉系 倍率 -2" },
  { key: "magician",   name: "魔术师", icon: "#rg-magician", rar: "c",
    desc: "散星不再寒酸:倍率至少 ×2",
    rdesc: "散星 倍率 ×3;但批次①(对印/连星·三)倍率 -1" },
  { key: "empress",    name: "女皇",   icon: "#rg-empress", rar: "r",
    desc: "每层第一次校准 共鸣 ×2",
    rdesc: "每层第一次校准 ×3;但最后一次校准 ×0.5" },
  /* v0.5 新增 */
  { key: "lovers",     name: "恋人",   icon: "#rg-lovers", rar: "l",
    desc: "恰好打出 2 张印记时 倍率 +6",
    rdesc: "恰好 2 张 倍率 +9;但打出 ≥4 张 倍率 -2" },
  { key: "world",      name: "世界",   icon: "#rg-world", rar: "l",
    desc: "每持有 1 个其他异象,倍率 +1",
    rdesc: "每持有 1 个其他异象 倍率 +2;但每层星屑报酬 -10" },
  { key: "death",      name: "死神",   icon: "#rg-death", rar: "r",
    desc: "每析灭(删除)1 张牌,全局底分永久 +2",
    rdesc: "每析灭 1 张 底分 +4;但集市析灭价格翻倍" },
  { key: "chariot",    name: "战车",   icon: "#rg-chariot", rar: "r",
    desc: "与上一手相同裁决式时 共鸣 ×1.5",
    rdesc: "相同裁决式 ×2;但不同时 ×0.9" },
  { key: "hierophant", name: "教皇",   icon: "#rg-hierophant", rar: "c",
    desc: "每打出 1 张铭刻牌,倍率 +1",
    rdesc: "铭刻牌 倍率 +2/张;但无铭刻牌的手 底分 -2" },
  { key: "hanged",     name: "倒吊人", icon: "#rg-hanged", rar: "c",
    desc: "每层第一次重引不消耗次数",
    rdesc: "每层前两次重引免费;但每层校准 -1" },
];
const RELIC_MAP = Object.fromEntries(RELICS.map(r => [r.key, r]));

/* 牌强化(V3)— v0.5 分稀有度 */
const ENHANCEMENTS = {
  starset:  { name: "镶星", desc: "打出时 星阶 +2",     color: "#8fc2ff", rar: "c" },
  gilded:   { name: "饰金", desc: "打出时 倍率 +1",     color: "#f0c75e", rar: "c" },
  resonant: { name: "共鸣", desc: "可视为任意花色",     color: "#c08dff", rar: "r" },
  echo:     { name: "回响", desc: "打出时 星阶计两次", color: "#7fd6c2", rar: "r" },
  radiant:  { name: "辉煌", desc: "打出时 星阶 +2 且 倍率 +2", color: "#ff9de2", rar: "l" },
};

/* 剧情委托(v0.5):每次远征由两位男主驻场,决定牌库偏向与专属祝福。
   正式版此处由当前剧情章节决定驻场组合 —— demo 用随机二选一模拟。 */
const COMMISSIONS = [
  { key: "blazeBlade", pair: ["wand", "sword"], title: "锋焰协奏", scene: "危楼天台 · 裂隙在两人头顶交错",
    perk: "权杖/宝剑的同辉系 倍率 +1",
    intro: [["wand", "这道裂隙归我们俩管——你负责选,我负责赢。"], ["sword", "情报显示今晚星轨偏锋……正好,我想看你出招。"]] },
  { key: "ledgerNight", pair: ["coin", "cup"], title: "深夜账房", scene: "事务所灯下 · 账册间浮起星屑",
    perk: "每层星屑报酬 +6",
    intro: [["coin", "委托费我已记在账上——这一次,我们亲自押送。"], ["cup", "夜里冷,我泡了茶。慢慢打,我们不赶时间。"]] },
  { key: "flameTide", pair: ["wand", "cup"], title: "焰与潮", scene: "海雾码头 · 裂隙倒映在潮面",
    perk: "每层重引 +1",
    intro: [["wand", "海风太吵了——还好,你的星轨够亮。"], ["cup", "别怕走错,潮水会把你送回正确的位置。"]] },
  { key: "coldGambit", pair: ["coin", "sword"], title: "冷局推演", scene: "星图议事厅 · 沙盘上裂隙缓缓张开",
    perk: "对印/双对印 倍率 +1",
    intro: [["sword", "我推演了十七种打法。但我更想看你的第十八种。"], ["coin", "风险已对冲。剩下的,交给你的直觉。"]] },
  { key: "giltPact", pair: ["wand", "coin"], title: "燃金之约", scene: "拍卖会后巷 · 火光与金粉齐飞",
    perk: "集市升阶 半价",
    intro: [["wand", "他出钱,我出火——你只管赢得漂亮。"], ["coin", "预算充足。今晚,星阶随你升。"]] },
  { key: "bladeMercy", pair: ["sword", "cup"], title: "刃上温柔", scene: "医院顶层 · 裂隙悬在静谧夜空",
    perk: "回响复活 +1 次",
    intro: [["sword", "我守外侧。有我在,你不会输第二次。"], ["cup", "就算溃散也没关系——我接得住你。"]] },
];

/* 天象(v0.5):每次远征随机一种,全程生效 */
const WEATHERS = [
  { key: "meteor", name: "流星雨", desc: "连星系裁决式 倍率 +1" },
  { key: "still",  name: "静夜",   desc: "每层重引 +1" },
  { key: "tide",   name: "引力潮", desc: "稳定阈值 +20%,但星屑报酬 ×1.5" },
  { key: "halo",   name: "月晕",   desc: "命运签 价格 -10" },
  { key: "wind",   name: "星尘风", desc: "每层开始时 +8 星屑" },
  { key: "dusk",   name: "薄暮",   desc: "每层第一次校准 共鸣 ×1.25" },
];

/* 宫廷牌·男主驰援(V2,docs/04 §14.1):不进牌库(数字库恒定),
   打出②批次以上裁决式时驻场男主送牌至驰援位(存 1,每层保底 1 次),点击发动。
   等级定机制族(侍从=即时资源/骑士=下一手/王后=本层持续/国王=爆发),花色定方向;等级随层深上浮 */
const COURT_RANKS = { page: "侍从", knight: "骑士", queen: "王后", king: "国王" };
const COURT_FX = {
  page: {
    wand:  { desc: "本层 校准 +1" },
    coin:  { desc: "+15 星屑" },
    sword: { desc: "本层 重引 +2" },
    cup:   { desc: "整手印记免费弃换" },
  },
  knight: {
    wand:  { desc: "下一手 倍率 +3" },
    coin:  { desc: "下一手 底分 +12" },
    sword: { desc: "下一手 每张印记 星阶 +1" },
    cup:   { desc: "下一手 共鸣 ×1.5" },
  },
  queen: {
    wand:  { desc: "本层 同辉系 倍率 +2" },
    coin:  { desc: "本层 每手 底分 +8" },
    sword: { desc: "本层 连星系 倍率 +2" },
    cup:   { desc: "本层 每手 共鸣 ×1.2" },
  },
  king: {
    wand:  { desc: "立即缝合 阈值 20% 的裂隙" },
    coin:  { desc: "+40 星屑" },
    sword: { desc: "下一手 共鸣 ×2" },
    cup:   { desc: "重引回满,且下一手 ×1.5" },
  },
};
const COURT_SEND = {
  wand:  "接住——这张牌,带着我的火气。",
  coin:  "追加投资。这张牌,记我账上。",
  sword: "我算到你会需要它。拿去。",
  cup:   "别逞强,这张牌替我陪你一会儿。",
};

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
    coin() { tone(987.77, 0, 0.07, "triangle", 0.1); tone(1318.5, 0.06, 0.16, "triangle", 0.12); },
    gachaRoll() { for (let i = 0; i < 6; i++) tone(440 + Math.random() * 500, i * 0.11, 0.08, "triangle", 0.05); },
    gachaHit(rar) {
      if (rar === "l") { [0, 2, 4, 5].forEach((p, i) => tone(PENTA[p] * 2, 0.05 + i * 0.09, 0.5, "triangle", 0.12)); tone(PENTA[5] * 2, 0.5, 0.8, "sine", 0.1); }
      else if (rar === "r") { [2, 4, 5].forEach((p, i) => tone(PENTA[p], i * 0.09, 0.4, "triangle", 0.11)); }
      else { tone(PENTA[2], 0, 0.2, "triangle", 0.1); tone(PENTA[3], 0.1, 0.3, "triangle", 0.09); }
    },
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
    if (c.enh === "radiant") { base += 2; mult += 2; notes.push("辉煌 +2 ×+2"); }
  }

  /* 剧情委托:驻场双主的花色印记 底分 +1/张 + 专属祝福 */
  if (S.commission) {
    const cm = S.commission;
    const pairN = cards.filter((c, i) => cm.pair.includes(ev.assign[i])).length;
    if (pairN > 0) { base += pairN; notes.push(`委托 +${pairN}`); }
    if (cm.key === "blazeBlade" && GLOWS.includes(ev.key) && cm.pair.includes(ev.suit)) { mult += 1; notes.push("锋焰 ×+1"); }
    if (cm.key === "coldGambit" && (ev.key === "pairSeal" || ev.key === "twinSeal")) { mult += 1; notes.push("冷局 ×+1"); }
  }

  /* 天象 */
  if (S.weather) {
    if (S.weather.key === "meteor" && RUNS.includes(ev.key)) { mult += 1; notes.push("流星雨 ×+1"); }
    if (S.weather.key === "dusk" && S.playsUsed === 0) { post *= 1.25; notes.push("薄暮 ×1.25"); }
  }

  /* 宫廷驰援(V2):骑士/国王=下一手 buff;王后=本层持续 */
  if (S.nextBuff) {
    const b = S.nextBuff;
    if (b.base) { base += b.base; notes.push(`驰援 +${b.base}`); }
    if (b.perCard) { base += b.perCard * cards.length; notes.push(`驰援 +${b.perCard}/张`); }
    if (b.mult) { mult += b.mult; notes.push(`驰援 ×+${b.mult}`); }
    if (b.post) { post *= b.post; notes.push(`驰援 ×${b.post}`); }
    if (!peek) S.nextBuff = null;
  }
  if (S.layerCourt) {
    const lb = S.layerCourt;
    if (lb.glowMult && GLOWS.includes(ev.key)) { mult += lb.glowMult; notes.push(`王后 ×+${lb.glowMult}`); }
    if (lb.runMult && RUNS.includes(ev.key)) { mult += lb.runMult; notes.push(`王后 ×+${lb.runMult}`); }
    if (lb.handBase) { base += lb.handBase; notes.push(`王后 +${lb.handBase}`); }
    if (lb.handPost) { post *= lb.handPost; notes.push(`王后 ×${lb.handPost}`); }
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
  /* v0.5 新增异象 */
  const lov = relicOf("lovers");
  if (lov) {
    if (cards.length === 2) { mult += lov.rev ? 9 : 6; notes.push(lov.rev ? "恋人·逆 ×+9" : "恋人 ×+6"); }
    else if (lov.rev && cards.length >= 4) { mult -= 2; minM(); notes.push("恋人·逆 ×-2"); }
  }
  const wld = relicOf("world");
  if (wld && S.relics.length > 1) {
    const n = (S.relics.length - 1) * (wld.rev ? 2 : 1);
    mult += n; notes.push(`${wld.rev ? "世界·逆" : "世界"} ×+${n}`);
  }
  const dth = relicOf("death");
  if (dth && S.purges > 0) {
    const n = S.purges * (dth.rev ? 4 : 2);
    base += n; notes.push(`${dth.rev ? "死神·逆" : "死神"} +${n}`);
  }
  const cha = relicOf("chariot");
  if (cha && S.lastComboKey) {
    if (ev.key === S.lastComboKey) { post *= cha.rev ? 2 : 1.5; notes.push(cha.rev ? "战车·逆 ×2" : "战车 ×1.5"); }
    else if (cha.rev) { post *= 0.9; notes.push("战车·逆 ×0.9"); }
  }
  const hie = relicOf("hierophant");
  if (hie) {
    const enhN = cards.filter(c => c.enh).length;
    if (enhN > 0) { mult += enhN * (hie.rev ? 2 : 1); notes.push(`教皇 ×+${enhN * (hie.rev ? 2 : 1)}`); }
    else if (hie.rev) { base = Math.max(1, base - 2); notes.push("教皇·逆 -2"); }
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
  /* v0.5 经济与构筑 */
  dust: 0, dustEarned: 0,
  commission: null, weather: null,
  gachaPity: 0, purges: 0, lastComboKey: null,
  freeSwapsUsed: 0,
  /* v0.6 宫廷驰援 */
  assist: null, assistGivenLayer: false,
  nextBuff: null, layerCourt: null,
};

function buildRunDeck() {
  /* 数字库恒定 40 张(§14.1:宫廷牌不进牌库,复杂度藏内容不藏规则) */
  const d = [];
  for (const s of SUIT_KEYS) for (let r = 1; r <= 10; r++) d.push({ suit: s, rank: r, id: `${s}-${r}` });
  /* 委托偏向:驻场双主的花色各额外混入 2 张(随机星阶) */
  if (S.commission) {
    S.commission.pair.forEach(s => {
      for (let i = 0; i < 2; i++) {
        const r = 1 + Math.floor(Math.random() * 10);
        d.push({ suit: s, rank: r, id: `cm-${s}-${i}` });
      }
    });
  }
  return d;
}

/* ---------------- 星屑经济 ---------------- */
function renderDust() { const el = $("dustHud"); if (el) el.textContent = `✦ ${S.dust}`; }
function gainDust(n, silent = false) {
  S.dust += n;
  if (n > 0) S.dustEarned += n;
  renderDust();
  if (!silent && n > 0) { bumpEl($("dustHud")); sfx.coin(); }
}
/* 过层报酬:基础 + 剩余行动折算 + 溢出奖励(天象/委托/异象修正) */
function rewardFor() {
  const parts = [];
  let n = 15; parts.push(["稳定裂隙", 15]);
  if (S.plays > 0)  { parts.push([`剩余校准 ×${S.plays}`, S.plays * 5]); n += S.plays * 5; }
  if (S.swaps > 0)  { parts.push([`剩余重引 ×${S.swaps}`, S.swaps * 3]); n += S.swaps * 3; }
  const over = Math.min(12, Math.floor((S.layerScore / S.threshold - 1) * 20));
  if (over > 0) { parts.push(["溢出共鸣", over]); n += over; }
  if (S.commission && S.commission.key === "ledgerNight") { parts.push(["深夜账房", 6]); n += 6; }
  if (S.weather && S.weather.key === "tide") { const b = Math.round(n * 0.5); parts.push(["引力潮 ×1.5", b]); n += b; }
  const wld = relicOf("world");
  if (wld && wld.rev) { parts.push(["世界·逆", -10]); n = Math.max(0, n - 10); }
  return { total: n, parts };
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
  S.busy = true;
  /* 倒吊人:每层第一次(逆位:前两次)重引免费 */
  const hng = relicOf("hanged");
  const freeQuota = hng ? (hng.rev ? 2 : 1) : 0;
  if (S.freeSwapsUsed < freeQuota) {
    S.freeSwapsUsed++;
    say(null, "「倒吊人」倒转因果——这次重引,不计次数。");
  } else {
    S.swaps--;
  }
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
  S.lastComboKey = ev.key;
  if (!S.bestPlay || sc.score > S.bestPlay.score) S.bestPlay = { score: sc.score, name: ev.name };
  if (ev.key !== "stray") S.lit.add(ev.key);
  countUpMeter(prev, S.layerScore);
  rift.update(S.layerScore / S.threshold);
  sfx.seam();
  floatText(`+${sc.score}`, ev.tier);
  leadReaction(ev);
  maybeCourtAssist(ev);
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
  const wLine = S.weather ? `<div class="li-weather">天象 · ${S.weather.name}:${S.weather.desc}</div>` : "";
  const cmLine = S.commission ? `<div class="li-weather" style="color:var(--gold)">委托「${S.commission.title}」· ${LEADS[S.commission.pair[0]].name} × ${LEADS[S.commission.pair[1]].name}</div>` : "";
  intro.innerHTML = `<div class="li-name">${layerLabel(S.layer)}</div><div class="li-goal">稳定阈值 ${S.threshold}</div>${cmLine}${wLine}`;
  $("stage").appendChild(intro);
  setTimeout(() => intro.remove(), 1900);
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
    /* 驻场双主亲自反馈;缺席的男主隔着星海回应(剧情感:他不在这一章) */
    if (S.commission && !S.commission.pair.includes(ev.suit)) {
      say(null, `远方的「${LEADS[ev.suit].name}」隔着星海应了一声——他的星轨为你微亮。`);
    } else {
      const lead = LEADS[ev.suit];
      say(ev.suit, lead.lines[Math.floor(Math.random() * lead.lines.length)]);
    }
  } else if (ev.key === "fullPhase") {
    say(null, "星盘震颤——四枚同阶印记,命运罕见地整齐。");
  }
}

/* ---------------- 宫廷牌 · 男主驰援(V2) ---------------- */
function courtRankFor(layer) {
  const pool = layer <= 2 ? ["page", "page", "knight"]
    : layer <= 4 ? ["page", "knight", "knight", "queen"]
    : layer <= 6 ? ["knight", "queen", "queen", "king"]
    : ["queen", "king"];
  return pool[Math.floor(Math.random() * pool.length)];
}

function renderAssist(arrive = false) {
  const slot = $("btnAssist");
  if (S.version < 2) { slot.style.display = "none"; return; }
  slot.style.display = "flex";
  if (!S.assist) {
    slot.className = "assist-slot";
    slot.style.color = "";
    slot.innerHTML = `<span class="as-empty">驰援</span>`;
    return;
  }
  const { rank, suit } = S.assist;
  slot.className = "assist-slot filled" + (arrive ? " arrive" : "");
  slot.style.color = SUITS[suit].color;
  slot.innerHTML = `<span class="as-rank">${COURT_RANKS[rank]}</span>
    <svg class="as-svg" viewBox="0 0 48 48" fill="none"><use href="${SUITS[suit].glyph}"/></svg>
    <span class="as-tag">${LEADS[suit].name}</span>`;
  if (arrive) setTimeout(() => slot.classList.remove("arrive"), 750);
}

/* 到牌:打出②批次以上且裂隙未稳时,驻场男主送牌(每层保底 1 次,其后 35% 概率;存 1) */
function maybeCourtAssist(ev) {
  if (S.version < 2 || S.assist || ev.tier < 2) return;
  if (S.layerScore >= S.threshold) return;
  const guaranteed = !S.assistGivenLayer;
  if (!guaranteed && Math.random() > 0.35) return;
  S.assistGivenLayer = true;
  const pair = S.commission ? S.commission.pair : SUIT_KEYS;
  const suit = (ev.suit && pair.includes(ev.suit)) ? ev.suit : pair[Math.floor(Math.random() * pair.length)];
  const rank = courtRankFor(S.layer);
  S.assist = { rank, suit };
  renderAssist(true);
  sfx.relic();
  say(suit, `${COURT_SEND[suit]}<br><span style="color:var(--gold-bright)">【${SUITS[suit].name}${COURT_RANKS[rank]}】入驰援位——${COURT_FX[rank][suit].desc},点击发动。</span>`, 6500);
}

async function onAssist() {
  if (S.busy) return;
  if (!S.assist) {
    if (S.version >= 2) say(null, "驰援位空着——打出②批次以上的裁决式,驻场男主会送牌支援。");
    return;
  }
  const { rank, suit } = S.assist;
  const fx = COURT_FX[rank][suit];
  const name = `${SUITS[suit].name}${COURT_RANKS[rank]}`;
  S.assist = null;
  renderAssist();
  sfx.play(2);
  if (rank === "page") {
    if (suit === "wand") S.plays += 1;
    if (suit === "coin") gainDust(15);
    if (suit === "sword") S.swaps += 2;
    if (suit === "cup") {
      S.busy = true;
      [...$("hand").children].forEach(el => el.classList.add("swap-out"));
      await wait(280);
      const n = S.hand.length;
      S.discard.push(...S.hand.splice(0));
      S.hand = draw(n);
      S.selected.clear();
      S.busy = false;
      renderHand();
    }
  } else if (rank === "knight") {
    S.nextBuff = suit === "wand" ? { mult: 3 } : suit === "coin" ? { base: 12 }
      : suit === "sword" ? { perCard: 1 } : { post: 1.5 };
  } else if (rank === "queen") {
    S.layerCourt = suit === "wand" ? { glowMult: 2 } : suit === "coin" ? { handBase: 8 }
      : suit === "sword" ? { runMult: 2 } : { handPost: 1.2 };
  } else { /* king */
    if (suit === "wand") {
      const gain = Math.round(S.threshold * 0.2);
      const prev = S.layerScore;
      S.layerScore += gain;
      S.runScore += gain;
      countUpMeter(prev, S.layerScore);
      rift.update(S.layerScore / S.threshold);
      sfx.seam();
      floatText(`+${gain}`, 3);
      if (S.layerScore >= S.threshold) {
        S.busy = true;
        say(suit, `「看好了。」${LEADS[suit].name}亲手缝上了裂隙的最后一寸。`);
        sfx.clear();
        await sealCelebration();
        showLayerClear();
        renderCounters();
        return;
      }
    }
    if (suit === "coin") gainDust(40);
    if (suit === "sword") S.nextBuff = { post: 2 };
    if (suit === "cup") { S.swaps = Math.max(S.swaps, RULES.swaps); S.nextBuff = { post: 1.5 }; }
  }
  say(suit, `【${name}】发动——${fx.desc}。`);
  renderCounters(); applySelection();
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
  if (S.weather && S.weather.key === "tide") S.threshold = Math.round((S.threshold * 1.2) / 5) * 5;
  S.deck = shuffle([...S.runDeck]);
  S.discard = [];
  S.hand = draw(RULES.handSize);
  S.selected.clear();
  S.plays = RULES.plays;
  const hng = relicOf("hanged");
  if (hng && hng.rev) S.plays -= 1;
  const moon = relicOf("moon");
  S.swaps = RULES.swaps - (moon && moon.rev ? 1 : 0)
    + (S.weather && S.weather.key === "still" ? 1 : 0)
    + (S.commission && S.commission.key === "flameTide" ? 1 : 0);
  S.arcana = RULES.arcanaUses;
  S.layerScore = 0; S.playsUsed = 0; S.moonCharge = false; S.moonStack = 0;
  S.lastComboKey = null; S.freeSwapsUsed = 0;
  S.assistGivenLayer = false; S.layerCourt = null;   /* 驰援牌与"下一手"buff 跨层保留 */
  S.busy = false;
  if (S.weather && S.weather.key === "wind") gainDust(8, true);
  $("meterNow").textContent = "0";
  $("playedCards").innerHTML = "";
  $("constellation").innerHTML = "";
  $("comboBanner").className = "combo-banner";
  rift.build();
  renderHand(); renderCounters(); renderRelics(); renderDust(); renderAssist();
  layerIntro();
  /* 驻场男主在委托双主间逐层轮换 + 开场台词 */
  dutyLead = S.commission ? S.commission.pair[(S.layer - 1) % 2]
    : SUIT_KEYS[Math.floor(Math.random() * 4)];
  setTimeout(idleLine, 900);
}

/* ====== v0.5 过层流程:结算(星屑)→ 免费回赠 → 星象集市 → 下一层 ====== */
function nextLayer() { closeModal(); S.layer++; startLayer(); }

function rarBadge(rar) { return `<span class="rar-tag rar-${rar}">${RARITY[rar].name}</span>`; }
function rollRarity(weights) {
  const w = weights || { c: 55, r: 35, l: 10 };
  let roll = Math.random() * (w.c + w.r + w.l);
  if ((roll -= w.c) < 0) return "c";
  if ((roll -= w.r) < 0) return "r";
  return "l";
}
function unownedRelics(rar) {
  const pool = RELICS.filter(r => !S.relics.some(o => o.key === r.key));
  if (!rar) return pool;
  return pool.filter(r => r.rar === rar);
}
function spendDust(n) {
  if (S.dust < n) { say(null, `星屑不足——还差 ${n - S.dust} ✦。稳定更多裂隙吧。`); return false; }
  S.dust -= n; renderDust(); sfx.coin();
  return true;
}
function grantRelic(key, rev) {
  S.relics.push({ key, rev: !!rev });
  rev ? sfx.rev() : sfx.relic();
  renderRelics();
}

/* 过层结算:星级 + 星屑报酬明细 + 免费回赠三选一 */
function showLayerClear() {
  const ratio = S.layerScore / S.threshold;
  const stars = ratio >= 2 ? 3 : ratio >= 1.5 ? 2 : 1;
  const reward = rewardFor();
  gainDust(reward.total, true);
  sfx.coin();

  /* 免费回赠(凡象/秘象池;天启只在集市与命运签出现) */
  const offer = [];
  const freePool = shuffle(unownedRelics().filter(r => r.rar !== "l"));
  if (freePool[0]) offer.push({ type: "relic", key: freePool[0].key, rev: S.version >= 4 && Math.random() < REV_CHANCE });
  if (S.version >= 3) {
    const ek = shuffle(Object.keys(ENHANCEMENTS).filter(k => ENHANCEMENTS[k].rar !== "l"))[0];
    offer.push({ type: "enh", ekey: ek });
  } else if (freePool[1]) {
    offer.push({ type: "relic", key: freePool[1].key, rev: S.version >= 4 && Math.random() < REV_CHANCE });
  }
  offer.push({ type: "dust", n: 25 });

  const offerHtml = offer.map((o, i) => {
    if (o.type === "relic") {
      const def = RELIC_MAP[o.key];
      return `<button class="relic-pick rl-${def.rar}${o.rev ? " reversed" : ""}" data-i="${i}">
        <span class="rp-icon"><svg viewBox="0 0 24 24"><use href="${def.icon}"/></svg></span>
        <span><span class="rp-name">${def.name}${o.rev ? "·逆" : ""}</span>${rarBadge(def.rar)}<div class="rp-desc">${o.rev ? def.rdesc : def.desc}</div></span>
      </button>`;
    }
    if (o.type === "enh") {
      const e = ENHANCEMENTS[o.ekey];
      return `<button class="relic-pick enh rl-${e.rar}" data-i="${i}">
        <span class="rp-icon" style="color:${e.color};border-color:${e.color}">◆</span>
        <span><span class="rp-name" style="color:${e.color}">铭刻 · ${e.name}</span>${rarBadge(e.rar)}<div class="rp-desc">${e.desc} —— 从牌库抽 5 张,铭刻其一</div></span>
      </button>`;
    }
    return `<button class="relic-pick" data-i="${i}">
      <span class="rp-icon">✦</span>
      <span><span class="rp-name">星屑袋</span><div class="rp-desc">+${o.n} 星屑,留着去集市挥霍</div></span>
    </button>`;
  }).join("");

  const rewardHtml = reward.parts.map(([k, v]) =>
    `<div style="display:flex;justify-content:space-between;font-size:12px;color:var(--ink-dim);padding:1px 8px"><span>${k}</span><span style="color:var(--gold-bright)">${v > 0 ? "+" : ""}${v} ✦</span></div>`).join("");

  openModal(`
    <h2>裂隙稳定</h2>
    <div class="sub">${layerLabel(S.layer)} · 共鸣 ${S.layerScore}/${S.threshold}</div>
    <div class="stars">${[0, 1, 2].map(i => `<span class="star-pop" style="animation-delay:${0.15 + i * 0.18}s">${i < stars ? "★" : "☆"}</span>`).join("")}</div>
    <div style="margin:8px 0;border:1px solid rgba(216,180,106,0.2);border-radius:10px;padding:7px 4px">
      ${rewardHtml}
      <div style="display:flex;justify-content:space-between;font-family:var(--serif);font-size:14px;padding:4px 8px 1px;border-top:1px solid rgba(216,180,106,0.18);margin-top:4px"><span>星屑报酬</span><span style="color:var(--gold-bright)">+${reward.total} ✦</span></div>
    </div>
    <p class="dim" style="margin-top:6px">裂隙深处传来回赠——选取其一:</p>${offerHtml}
    <button class="btn-ghost" id="mSkip">不取,前往星象集市</button>
  `);
  [...document.querySelectorAll(".relic-pick")].forEach(btn => {
    btn.addEventListener("click", () => {
      const o = offer[+btn.dataset.i];
      if (o.type === "relic") {
        grantRelic(o.key, o.rev);
        const def = RELIC_MAP[o.key];
        say(null, `收下「${def.name}${o.rev ? "·逆" : ""}」——${o.rev ? def.rdesc : def.desc}`);
        showShop();
      } else if (o.type === "enh") {
        showEnhancePick(o.ekey, showShop);
      } else {
        gainDust(o.n);
        showShop();
      }
    });
  });
  $("mSkip").onclick = showShop;
}

/* 牌强化:从牌库抽 5 张选 1 铭刻(next = 后续去向) */
function showEnhancePick(ekey, next) {
  next = next || nextLayer;
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
    <h2>铭刻 · ${e.name} ${rarBadge(e.rar)}</h2>
    <div class="sub" style="color:${e.color}">${e.desc}(本次远征内永久生效)</div>
    <div class="mini-grid">${cardsHtml}</div>
    <button class="btn-ghost" id="mCancel">放弃铭刻</button>
  `);
  [...document.querySelectorAll(".mini-card")].forEach(btn => {
    btn.addEventListener("click", () => {
      const c = candidates[+btn.dataset.i];
      c.enh = ekey;
      sfx.relic();
      say(null, `铭刻成功——${SUITS[suitOptionsOf(c)[0]].name} ${c.rank} 已获得「${e.name}」。`);
      next();
    });
  });
  $("mCancel").onclick = next;
}

/* ====== 星象集市 ====== */
let shopState = null;
function genRelicOffer(exclude) {
  const owned = new Set([...(exclude || []), ...S.relics.map(r => r.key)]);
  let rar = rollRarity(RARITY ? { c: RARITY.c.w, r: RARITY.r.w, l: RARITY.l.w } : null);
  let pool = RELICS.filter(r => !owned.has(r.key) && r.rar === rar);
  if (!pool.length) pool = RELICS.filter(r => !owned.has(r.key));
  if (!pool.length) return null;
  const def = pool[Math.floor(Math.random() * pool.length)];
  return {
    type: "relic", key: def.key, rar: def.rar,
    rev: S.version >= 4 && Math.random() < REV_CHANCE,
    price: RELIC_PRICE[def.rar], sold: false,
  };
}
function genEnhOffer() {
  const keys = Object.keys(ENHANCEMENTS);
  const rar = rollRarity({ c: 50, r: 38, l: 12 });
  let pool = keys.filter(k => ENHANCEMENTS[k].rar === rar);
  if (!pool.length) pool = keys;
  const ekey = pool[Math.floor(Math.random() * pool.length)];
  return { type: "enh", ekey, rar: ENHANCEMENTS[ekey].rar, price: ENH_PRICE[ENHANCEMENTS[ekey].rar], sold: false };
}
function rollShop() {
  const r1 = genRelicOffer([]);
  const r2 = genRelicOffer(r1 ? [r1.key] : []);
  shopState = {
    relics: [r1, r2].filter(Boolean),
    enhs: S.version >= 3 ? [genEnhOffer()] : [],
    rerollCost: 8,
    upgradeUsed: false, purgeUsed: false,
  };
}

function shopPrices() {
  const dth = relicOf("death");
  return {
    upgrade: S.commission && S.commission.key === "giltPact" ? 6 : 12,
    purge: dth && dth.rev ? 36 : 18,
    gacha: S.weather && S.weather.key === "halo" ? 20 : 30,
  };
}

function showShop() {
  if (!shopState) rollShop();
  const P = shopPrices();
  const itemHtml = (o, i, kind) => {
    if (o.type === "relic") {
      const def = RELIC_MAP[o.key];
      return `<button class="shop-item rl-${def.rar}${o.rev ? " rev-item" : ""}${o.sold ? " sold" : ""}${S.dust < o.price ? " cant" : ""}" data-k="${kind}" data-i="${i}">
        <span class="si-icon"><svg viewBox="0 0 24 24"><use href="${def.icon}"/></svg></span>
        <span class="si-body"><span class="si-name">${def.name}${o.rev ? "·逆" : ""}</span>${rarBadge(def.rar)}<div class="si-desc">${o.rev ? def.rdesc : def.desc}</div></span>
        <span class="si-price">${o.sold ? "已售" : o.price + " ✦"}</span>
      </button>`;
    }
    const e = ENHANCEMENTS[o.ekey];
    return `<button class="shop-item rl-${e.rar}${o.sold ? " sold" : ""}${S.dust < o.price ? " cant" : ""}" data-k="${kind}" data-i="${i}">
      <span class="si-icon" style="color:${e.color};border-color:${e.color}">◆</span>
      <span class="si-body"><span class="si-name" style="color:${e.color}">铭刻卷 · ${e.name}</span>${rarBadge(e.rar)}<div class="si-desc">${e.desc} —— 购入后挑 1 张牌铭刻</div></span>
      <span class="si-price">${o.sold ? "已售" : o.price + " ✦"}</span>
    </button>`;
  };
  const pityLeft = 3 - (S.gachaPity % 3);
  openModal(`
    <div class="shop-head"><h2 style="margin:0">星象集市</h2><span class="shop-dust">✦ ${S.dust}</span></div>
    <div class="sub" style="margin-bottom:2px">${layerLabel(S.layer)}与下一层之间 · 行商「时雨」憩于此</div>
    <div class="shop-sec">异 象</div>
    ${shopState.relics.length ? shopState.relics.map((o, i) => itemHtml(o, i, "relic")).join("") : `<p class="dim">异象已被你收集殆尽。</p>`}
    ${shopState.enhs.length ? `<div class="shop-sec">铭 刻</div>` + shopState.enhs.map((o, i) => itemHtml(o, i, "enh")).join("") : ""}
    <div class="shop-sec">牌 库 雕 琢</div>
    <button class="shop-item${shopState.upgradeUsed ? " sold" : ""}${S.dust < P.upgrade ? " cant" : ""}" id="shopUpgrade">
      <span class="si-icon">↟</span>
      <span class="si-body"><span class="si-name">升阶</span><div class="si-desc">选 1 张牌,星阶 +1(上限 10)</div></span>
      <span class="si-price">${shopState.upgradeUsed ? "已用" : P.upgrade + " ✦"}</span>
    </button>
    <button class="shop-item${shopState.purgeUsed ? " sold" : ""}${S.dust < P.purge ? " cant" : ""}" id="shopPurge">
      <span class="si-icon">✂</span>
      <span class="si-body"><span class="si-name">析灭</span><div class="si-desc">删除 1 张牌——牌库越纯,星轨越准</div></span>
      <span class="si-price">${shopState.purgeUsed ? "已用" : P.purge + " ✦"}</span>
    </button>
    <div class="shop-sec">命 运 签</div>
    <button class="shop-item gacha-item${S.dust < P.gacha ? " cant" : ""}" id="shopGacha">
      <span class="si-icon">✦</span>
      <span class="si-body"><span class="si-name" style="color:#d29bff">抽一签</span><div class="si-desc">异象 / 铭刻卷 / 星屑,听凭命运 · <span class="rar-l">天启</span>仅在此处现身</div><div class="gacha-pity">${pityLeft === 3 ? "保底已就绪:本签必出秘象以上" : `再抽 ${pityLeft} 签必出秘象以上`}</div></span>
      <span class="si-price">${P.gacha} ✦</span>
    </button>
    <div class="shop-foot">
      <button class="btn-ghost" id="shopReroll" ${S.dust < shopState.rerollCost ? "disabled style='opacity:0.4'" : ""}>重置货品 ${shopState.rerollCost} ✦</button>
      <button class="btn-main" id="shopNext">深入下一层 →</button>
    </div>
  `);
  [...document.querySelectorAll(".shop-item[data-k]")].forEach(btn => {
    btn.addEventListener("click", () => {
      const kind = btn.dataset.k, i = +btn.dataset.i;
      const o = kind === "relic" ? shopState.relics[i] : shopState.enhs[i];
      if (o.sold || !spendDust(o.price)) { showShop(); return; }
      o.sold = true;
      if (o.type === "relic") {
        grantRelic(o.key, o.rev);
        const def = RELIC_MAP[o.key];
        say(null, `「${def.name}${o.rev ? "·逆" : ""}」已入星盘。时雨:这件,识货。`);
        showShop();
      } else {
        showEnhancePick(o.ekey, showShop);
      }
    });
  });
  $("shopUpgrade").onclick = () => {
    if (shopState.upgradeUsed) return;
    if (S.dust < P.upgrade) { spendDust(P.upgrade); showShop(); return; }
    showCardService("upgrade", P.upgrade);
  };
  $("shopPurge").onclick = () => {
    if (shopState.purgeUsed) return;
    if (S.dust < P.purge) { spendDust(P.purge); showShop(); return; }
    showCardService("purge", P.purge);
  };
  $("shopGacha").onclick = () => {
    if (!spendDust(P.gacha)) { showShop(); return; }
    showGacha();
  };
  $("shopReroll").onclick = () => {
    if (!spendDust(shopState.rerollCost)) { showShop(); return; }
    /* 只刷新货品,服务使用状态与价格阶梯保留 */
    const keep = { rerollCost: shopState.rerollCost + 5, upgradeUsed: shopState.upgradeUsed, purgeUsed: shopState.purgeUsed };
    rollShop();
    Object.assign(shopState, keep);
    showShop();
  };
  $("shopNext").onclick = () => { shopState = null; nextLayer(); };
}

/* 牌库雕琢:升阶 / 析灭 */
function showCardService(mode, price) {
  const isUp = mode === "upgrade";
  const pool = shuffle(S.runDeck.filter(c => (isUp ? c.rank < 10 : true))).slice(0, 8);
  const cardsHtml = pool.map((c, i) => {
    const isDual = !!c.suits;
    const s1 = SUITS[isDual ? c.suits[0] : c.suit];
    return `<button class="mini-card ${s1.cls}" data-i="${i}">
      <span class="mc-rank">${c.rank}</span>
      <svg viewBox="0 0 48 48" fill="none"><use href="${s1.glyph}"/></svg>
      ${c.enh ? `<span style="color:${ENHANCEMENTS[c.enh].color};font-size:10px">◆</span>` : ""}
    </button>`;
  }).join("");
  openModal(`
    <h2>${isUp ? "升阶" : "析灭"}</h2>
    <div class="sub">${isUp ? "选 1 张牌,星阶 +1" : "选 1 张牌,从牌库永久删除"}(${price} ✦)</div>
    <div class="mini-grid">${cardsHtml}</div>
    <button class="btn-ghost" id="mCancel">算了,回集市</button>
  `);
  [...document.querySelectorAll(".mini-card")].forEach(btn => {
    btn.addEventListener("click", () => {
      if (!spendDust(price)) { showShop(); return; }
      const c = pool[+btn.dataset.i];
      const sName = SUITS[suitOptionsOf(c)[0]].name;
      if (isUp) {
        c.rank += 1;
        shopState.upgradeUsed = true;
        sfx.relic();
        say(null, `${sName} ${c.rank - 1} 升阶为 ${c.rank}——星辉更盛了。`);
      } else {
        S.runDeck.splice(S.runDeck.indexOf(c), 1);
        S.purges++;
        shopState.purgeUsed = true;
        sfx.swap();
        const dth = relicOf("death");
        say(null, dth ? `${sName} ${c.rank} 归于星尘。「死神」记下了这次蜕变。` : `${sName} ${c.rank} 归于星尘——牌库更纯粹了。`);
      }
      showShop();
    });
  });
  $("mCancel").onclick = showShop;
}

/* 命运签:翻牌揭示 + 三签保底秘象 */
function showGacha() {
  S.gachaPity++;
  const pity = S.gachaPity % 3 === 0;
  let rar = rollRarity({ c: 55, r: 33, l: 12 });
  if (pity && rar === "c") rar = "r";
  /* 出货类型 */
  let kind = Math.random();
  const canEnh = S.version >= 3;
  let result;
  if (kind < 0.2) {
    result = { type: "dust", n: 40 + (rar === "l" ? 30 : rar === "r" ? 15 : 0) };
  } else if (canEnh && kind < 0.45) {
    const keys = Object.keys(ENHANCEMENTS).filter(k => ENHANCEMENTS[k].rar === rar);
    const ekey = keys.length ? keys[Math.floor(Math.random() * keys.length)] : "starset";
    result = { type: "enh", ekey, rar: ENHANCEMENTS[ekey].rar };
  } else {
    let pool = unownedRelics(rar);
    if (!pool.length) pool = unownedRelics();
    if (!pool.length) result = { type: "dust", n: 60 };
    else {
      const def = pool[Math.floor(Math.random() * pool.length)];
      result = { type: "relic", key: def.key, rar: def.rar, rev: S.version >= 4 && Math.random() < REV_CHANCE };
    }
  }
  const finalRar = result.rar || (result.n >= 60 ? "r" : "c");
  openModal(`
    <h2>命运签</h2>
    <div class="sub">行商时雨摇响签筒——</div>
    <div class="gacha-stage">
      <div class="gacha-card" id="gachaCard">
        <div class="gacha-face gacha-back"><svg viewBox="0 0 48 48"><use href="#glyph-octa"/></svg></div>
        <div class="gacha-face gacha-front rar-bg-${finalRar}" id="gachaFront"></div>
      </div>
    </div>
    <div id="gachaResultLine" class="dim" style="min-height:20px"></div>
    <button class="btn-main" id="gachaTake" style="visibility:hidden">收 下</button>
  `);
  sfx.gachaRoll();
  const front = $("gachaFront");
  if (result.type === "relic") {
    const def = RELIC_MAP[result.key];
    front.innerHTML = `<div class="gf-icon" style="color:${RARITY[def.rar].color}"><svg viewBox="0 0 24 24" style="${result.rev ? "transform:rotate(180deg)" : ""}"><use href="${def.icon}"/></svg></div>
      <div class="gf-name" style="color:${RARITY[def.rar].color}">${def.name}${result.rev ? "·逆" : ""}</div>
      <div class="gf-desc">${result.rev ? def.rdesc : def.desc}</div>`;
  } else if (result.type === "enh") {
    const e = ENHANCEMENTS[result.ekey];
    front.innerHTML = `<div class="gf-icon" style="color:${e.color}">◆</div>
      <div class="gf-name" style="color:${e.color}">铭刻卷 · ${e.name}</div>
      <div class="gf-desc">${e.desc}</div>`;
  } else {
    front.innerHTML = `<div class="gf-icon" style="color:var(--gold-bright)">✦</div>
      <div class="gf-name" style="color:var(--gold-bright)">星屑雨</div>
      <div class="gf-desc">+${result.n} 星屑,命运的找零</div>`;
  }
  setTimeout(() => {
    $("gachaCard").classList.add("flip");
    sfx.gachaHit(finalRar);
    if (finalRar !== "c") { S.gachaPity = 0; }
    const line = $("gachaResultLine");
    line.innerHTML = finalRar === "l"
      ? `<span class="rar-l">天启降临——连时雨都屏住了呼吸。</span>`
      : finalRar === "r" ? `<span class="rar-r">秘象浮现,这签不亏。</span>` : "凡象一枚。命运在攒大的。";
    $("gachaTake").style.visibility = "visible";
  }, 950);
  $("gachaTake").onclick = () => {
    if (result.type === "relic") {
      grantRelic(result.key, result.rev);
      showShop();
    } else if (result.type === "enh") {
      showEnhancePick(result.ekey, showShop);
    } else {
      gainDust(result.n);
      showShop();
    }
  };
}

function showFail() {
  if (S.revives > 0) {
    openModal(`
      <h2>星轨溃散</h2>
      <div class="sub">${layerLabel(S.layer)} · 稳定度未达成</div>
      <p>共鸣 <b class="kw">${S.layerScore}</b> / ${S.threshold}</p>
      <p class="dim">一道熟悉的回响穿过裂隙而来——</p>
      <button class="btn-main" id="mRevive">回响复活(剩 ${S.revives} 次)</button>
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
  const isNewBest = recordBest();
  const cm = S.commission;
  openModal(`
    <h2>远征结算</h2>
    <div class="sub">${cm ? `委托「${cm.title}」· ` : ""}天象「${S.weather ? S.weather.name : "—"}」· 版本${VER_NAMES[S.version]}</div>
    ${isNewBest ? `<p style="color:var(--gold-bright);font-family:var(--serif);letter-spacing:0.2em;margin:2px 0 0">✦ 新纪录 ✦</p>` : ""}
    <div class="stat-grid">
      <div class="stat"><div class="v" data-cv="${cleared}">0</div><div class="k">稳定星层</div></div>
      <div class="stat"><div class="v" data-cv="${S.runScore}">0</div><div class="k">总共鸣</div></div>
      <div class="stat"><div class="v" data-cv="${S.bestPlay ? S.bestPlay.score : 0}">0</div><div class="k">最高单手${S.bestPlay ? " · " + S.bestPlay.name : ""}</div></div>
      <div class="stat"><div class="v" data-cv="${S.relics.length}">0</div><div class="k">收集异象</div></div>
      <div class="stat"><div class="v" data-cv="${S.dustEarned}">0</div><div class="k">星屑总入账</div></div>
      <div class="stat"><div class="v" data-cv="${S.purges}">0</div><div class="k">析灭牌数</div></div>
    </div>
    <p class="dim">数值未调优 · 用于内部手感与接受度测试(docs/05)</p>
    <button class="btn-main" id="mRestart">再 次 远 征(换一份委托)</button>
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
  $("mRestart").onclick = () => { closeModal(); showCommissionPick(S.version); };
  $("mTitle").onclick = () => { closeModal(); showTitle(); };
}

function newRun() {
  S.layer = 1; S.revives = RULES.revives;
  S.runScore = 0; S.bestPlay = null; S.lit = new Set();
  S.relics = []; S.moonCharge = false; S.moonStack = 0;
  /* v0.5 */
  S.dust = 30; S.dustEarned = 0;
  S.gachaPity = 0; S.purges = 0; S.lastComboKey = null;
  S.assist = null; S.nextBuff = null; S.layerCourt = null;
  shopState = null;
  S.weather = WEATHERS[Math.floor(Math.random() * WEATHERS.length)];
  if (S.commission && S.commission.key === "bladeMercy") S.revives += 1;
  S.runDeck = buildRunDeck();
  S.started = true;
  startLayer();
  /* 委托开场:驻场双主登场对白 */
  if (S.commission) {
    const [a, b] = S.commission.intro;
    setTimeout(() => say(a[0], a[1], 0), 1100);
    setTimeout(() => say(b[0], b[1]), 4300);
  }
}

/* ====== 剧情委托选择(v0.5):每次远征随机两份委托二选一 ======
   正式版:驻场组合由当前剧情章节决定 —— 玩到谁的篇章,谁来陪打 */
function showCommissionPick(version) {
  const picks = shuffle(COMMISSIONS.slice()).slice(0, 2);
  const html = picks.map((cm, i) => {
    const [a, b] = cm.pair;
    return `<button class="comm-pick" data-i="${i}">
      <div class="comm-top">
        <div class="comm-avs">
          <span class="ca" style="color:${SUITS[a].color}"><svg viewBox="0 0 48 48" fill="none"><use href="${SUITS[a].glyph}"/></svg></span>
          <span class="ca" style="color:${SUITS[b].color}"><svg viewBox="0 0 48 48" fill="none"><use href="${SUITS[b].glyph}"/></svg></span>
        </div>
        <span>
          <div class="comm-title">${cm.title}</div>
          <div class="comm-scene">${cm.scene}</div>
        </span>
      </div>
      <div class="comm-perk">驻场:<span style="color:${SUITS[a].color}">${LEADS[a].name}</span> × <span style="color:${SUITS[b].color}">${LEADS[b].name}</span><br>
      祝福:<span class="kw">两人花色 底分 +1/张</span> · <span class="kw">${cm.perk}</span><br>
      <span style="color:var(--ink-dim);font-size:11px">牌库额外混入两人花色各 2 张</span></div>
    </button>`;
  }).join("");
  openModal(`
    <h2>命运委托</h2>
    <div class="sub">本夜裂隙告示 · 版本${VER_NAMES[version]} · 选择与谁同行</div>
    ${html}
    <p class="dim" style="margin-top:4px">正式版中,驻场组合由你正在推进的剧情章节决定——<br>玩到谁的篇章,谁来陪你裁决。</p>
    <button class="btn-ghost" id="mBack">返回版本选择</button>
  `);
  [...document.querySelectorAll(".comm-pick")].forEach(btn => {
    btn.addEventListener("click", () => {
      S.commission = picks[+btn.dataset.i];
      S.version = version;
      closeModal();
      newRun();
    });
  });
  $("mBack").onclick = () => { closeModal(); showTitle(); };
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
        return `<tr><td class="cx-name" style="color:${RARITY[def.rar].color}">${r.rev ? "☾" : "✧"} ${def.name}${r.rev ? "·逆" : ""}</td><td class="cx-desc" colspan="2">${r.rev ? def.rdesc : def.desc}</td></tr>`;
      }).join("")
    : `<tr><td class="cx-desc" colspan="3">尚未收集异象——过层回赠 / 星象集市 / 命运签均可获取。</td></tr>`;
  const ctx = [];
  if (S.commission) ctx.push(`委托「${S.commission.title}」:${LEADS[S.commission.pair[0]].name} × ${LEADS[S.commission.pair[1]].name} —— 两人花色 底分 +1/张;${S.commission.perk}。`);
  if (S.weather) ctx.push(`天象「${S.weather.name}」:${S.weather.desc}。`);
  const extras = [];
  if (S.version >= 2) extras.push("宫廷牌·男主驰援:打出②批次以上,驻场男主送宫廷牌至左下驰援位(存 1,每层保底 1 次),点击发动;等级随层深上浮(侍从→骑士→王后→国王)。");
  if (S.version >= 3) extras.push("牌铭刻:◆ 标记的印记带永久铭刻(镶星/饰金/共鸣/回响/辉煌)。");
  if (S.version >= 4) extras.push("逆位异象(紫):更强,但伴随代价。");
  extras.push(`稀有度:<span class="rar-c">凡象</span> / <span class="rar-r">秘象</span> / <span class="rar-l">天启</span>——天启只在集市与命运签出现。`);
  openModal(`
    <h2>裁决式图鉴</h2>
    <div class="sub">✦ = 本次远征已点亮 · ①-④ 为剧情解锁批次 · 版本${VER_NAMES[S.version]}</div>
    ${ctx.length ? `<p class="dim" style="text-align:left;margin-bottom:8px">${ctx.join("<br>")}</p>` : ""}
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
     <div class="sub">法则、异象与星屑</div>
     <p>左下<span class="kw">命运之轮</span>:每层一次,命运重转,必有一手好牌。</p>
     <p>每稳定一层裂隙,可获<span class="kw">星屑 ✦</span>与免费回赠,并进入<span class="kw">星象集市</span>——购买异象、铭刻、升阶析灭,或抽一支<span class="kw">命运签</span>。</p>
     <p class="dim">远征由两位男主驻场同行——玩到谁的篇章,谁来陪你裁决。</p>
     <button class="btn-main" id="tNext">开 始 远 征</button>`,
  ];
  openModal(pages[page]);
  $("tNext").onclick = () => {
    if (page < pages.length - 1) showTutorial(page + 1);
    else { closeModal(); showCommissionPick(1); }
  };
}

function bestOf(v) {
  try {
    const b = JSON.parse(localStorage.getItem(`sv_best_${v}`) || "null");
    return b && b.layer > 0 ? `<span class="best-tag">最深 ${b.layer} 层 · ${b.score}</span>` : "";
  } catch (e) { return ""; }
}
function recordBest() {
  try {
    const cleared = S.layer - 1;
    const old = JSON.parse(localStorage.getItem(`sv_best_${S.version}`) || "null");
    if (!old || cleared > old.layer || (cleared === old.layer && S.runScore > old.score)) {
      localStorage.setItem(`sv_best_${S.version}`, JSON.stringify({ layer: cleared, score: S.runScore }));
      return cleared > 0;
    }
  } catch (e) {}
  return false;
}

function showTitle() {
  openModal(`
    <svg class="title-octa" viewBox="0 0 48 48"><use href="#glyph-octa"/></svg>
    <h2>星轨裁决</h2>
    <div class="sub">STARLIGHT VERDICT · 内部演示 v0.5</div>
    <p style="margin:14px 0 10px">巨大的裂隙悬在暮星城上空。<br>选择本次远征的玩法深度:</p>
    <button class="btn-main" id="v1">Ⅰ · 剧情内简单版(首测推荐)${bestOf(1)}</button>
    <button class="btn-main btn-second" id="v2">Ⅱ · + 宫廷牌·男主驰援${bestOf(2)}</button>
    <button class="btn-main btn-second" id="v3">Ⅲ · + 牌铭刻与铭刻卷${bestOf(3)}</button>
    <button class="btn-main btn-second" id="v4">Ⅳ · 完整版 · 异象逆位(硬核)${bestOf(4)}</button>
    <button class="btn-ghost" id="tStart">先看教学(以版本Ⅰ开始)</button>
    <p class="dim" style="margin-top:12px">版本逐级叠加 · 对应 docs/04 §14 路线<br>数值未调优 · 男主反馈为文案演示</p>
  `);
  const start = (v) => showCommissionPick(v);
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
$("btnAssist").addEventListener("click", onAssist);
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
