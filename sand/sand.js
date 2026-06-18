/* ============================================================
   星沙 v2 · 主动投放沙子物理消除(消除方案,docs/10 §6)
   玩法(老大拍板 A):你点屏幕决定下一团星沙从哪倒下 → 元胞自动机流体下落堆积
   → 同色连通凑够一片【自动溃散】成星光缝合裂隙 → 塌落连锁"消不停" → 过载男主救场。
   ~1 万粒细沙 + 流体流淌。同色才消;花色=男主。台词占位,数值待内测。零依赖可玩。
   ============================================================ */
"use strict";

/* ===================== 配置 ===================== */
const SUITS = {
  wand:  { name: "权杖", color: "#ff4d2e", rgb: [255, 77, 46], glyph: "#glyph-wand" },   /* 火红 */
  coin:  { name: "星币", color: "#ffd21f", rgb: [255, 210, 31], glyph: "#glyph-coin" },  /* 金黄 */
  sword: { name: "宝剑", color: "#15d683", rgb: [21, 214, 131], glyph: "#glyph-sword" }, /* 翡翠绿 */
  cup:   { name: "圣杯", color: "#4a7bff", rgb: [74, 123, 255], glyph: "#glyph-cup" },   /* 宝蓝 */
};
const SUIT_KEYS = ["wand", "coin", "sword", "cup"];
const SUIT_IDX = { wand: 1, coin: 2, sword: 3, cup: 4 };
const IDX_SUIT = [null, "wand", "coin", "sword", "cup"];

const LEADS = {
  wand: { name: "炎烈", glyph: "#glyph-wand", color: "#ff4d2e",
    lines: { start: ["今天的沙,看着就欠烧。", "跟上我的节奏,别眨眼。"], clear: ["散得漂亮!", "就是这一片!"], chain: ["连着来,别停!", "这股势头我喜欢!"], big: ["满屏都烧亮了——这才像话!", "看见没,你把我点燃了。"], low: ["沙要漫上来了——稳住。", "越挤越要沉住气。"], rescue: ["谁准你放弃的?手给我。", "塌不了,有我。"], win: ["赢了!刚才那下是不是很帅?", "干脆利落。"] } },
  coin: { name: "沈寂", glyph: "#glyph-coin", color: "#ffd21f",
    lines: { start: ["按计划进行,很好。", "每一粒沙都别浪费。"], clear: ["入账。", "稳,继续。"], chain: ["连锁收益,可观。", "复利的美。"], big: ["这一片,值一整座城的安眠。", "收益超预期。"], low: ["余量告急,冷静核算。", "越到最后越别乱。"], rescue: ["亏损止得住,手伸出来。", "追加预算,别浪费。"], win: ["结算完成,超预期。", "记进年报。"] } },
  sword: { name: "叶渊", glyph: "#glyph-sword", color: "#15d683",
    lines: { start: ["情报核对完毕,开始吧。", "别紧张,照我说的做。"], clear: ["最优解。", "我就说你会倒这儿。"], chain: ["连起来了,你总比我预测的好。", "漂亮,这步我没算到。"], big: ["整片溃散——教科书级别。", "我就说你做得到。"], low: ["空间告急,我替你算。", "收线,信你的直觉。"], rescue: ["想都别想输,抓紧我。", "预案启动,够你翻盘。"], win: ["完美收束,误差为零。", "看吧。"] } },
  cup: { name: "宋以衡", glyph: "#glyph-cup", color: "#4a7bff",
    lines: { start: ["别紧张,我陪你。", "今晚的星沙,很适合你。"], clear: ["唤回来一点了……", "很温柔,也很正确。"], chain: ["星光都在偏爱你。", "这个节奏,很舒服。"], big: ["你看,他的星河……整片亮起来了。", "一整片,都被你唤回来了。"], low: ["深呼吸,我陪你。", "你已经很好了。"], rescue: ["我在,手给我。", "靠着我,慢慢来。"], win: ["辛苦了……今天也想被你夸夸。", "回去喝杯热的。"] } },
};
const SYS = { name: "AI 灵宝", glyph: "#glyph-octa", color: "#d8b46a" };

const LAWS = [
  { key: "lovers", name: "恋人", icon: "#glyph-cup", rar: "l", desc: "圣杯星沙溃散缝合 ×1.5" },
  { key: "sun", name: "太阳", icon: "#glyph-octa", rar: "r", desc: "每次溃散额外 +8 缝合" },
  { key: "temperance", name: "节制", icon: "#glyph-octa", rar: "r", desc: "连击窗口延长,倍率更高" },
  { key: "wheel", name: "命运之轮", icon: "#glyph-wheel", rar: "r", desc: "命运之轮每层 +1 次" },
  { key: "world", name: "世界", icon: "#glyph-octa", rar: "l", desc: "每持有 1 条法则,缝合 +5%" },
  { key: "empress", name: "女皇", icon: "#glyph-octa", rar: "r", desc: "每层第一次溃散 ×2 缝合" },
  { key: "star", name: "星辰", icon: "#glyph-octa", rar: "c", desc: "大片溃散额外 +24" },
  { key: "strength", name: "力量", icon: "#glyph-wand", rar: "c", desc: "权杖沙团更频繁" },
];
const LAW_MAP = Object.fromEntries(LAWS.map(l => [l.key, l]));
const RAR_COLOR = { c: "#9fb4d8", r: "#f0c75e", l: "#d29bff" };

const COMMISSIONS = [
  { key: "cold", title: "冷局推演", pair: ["sword", "coin"], intro: [["sword", "叶渊×沈寂,双驻场。情报与账目都不会出错。"], ["coin", "效率优先,别让推演落空。"]] },
  { key: "tide", title: "焰与潮", pair: ["wand", "cup"], intro: [["wand", "火力我来,温柔他来——你只管赢。"], ["cup", "放心往前,后面有我。"]] },
  { key: "gold", title: "燃金之约", pair: ["wand", "coin"], intro: [["wand", "烧出来的每一分,都让他记账上!"], ["coin", "可以,燃烧也是投资。"]] },
  { key: "soft", title: "刃上温柔", pair: ["sword", "cup"], intro: [["sword", "锋利的给裂隙,柔软的给你。"], ["cup", "他嘴硬,但今晚都站你这边。"]] },
];

const STORY = [
  { id: "S1", name: "序章 · 电梯惊停", elevator: "alarm", goal: 60, guided: true,
    tip: "把<b>同色</b>沙从屏幕<b>最左连到最右</b>,整条贯通才溃散",
    pre: [
      ["sys", "警告——无尽电梯检测到裂隙湍流,下行暂停。检测到星盘共鸣者:苏星轮。"],
      ["sword", "别慌。裂隙把星魂磨成了沙,堆满了盘底——四种颜色都散在里头,本身不会动。"],
      ["sword", "记住一条:把<同一种颜色>的沙,从屏幕<最左边>一路连到<最右边>——整条贯通,它才溃散成星光,缝住裂隙。"],
      ["sword", "点屏幕倒沙,往缺口填、把同色连成一线。我看着你。"]],
    post: [["sword", "……贯通了,漂亮。整条溃散的样子,比情报里写的好看。"], ["sword", "到了处理室,我教你怎么连着贯通、溃不停。"]] },
  { id: "S2", name: "第一夜 · 处理室初开", elevator: "calm", goal: 120,
    tip: "贯通一条 → 上方塌落 → 再连成新贯通,<b>连锁溃散</b>",
    pre: [
      ["sword", "盘底四色都有——只有<同色>从最左连到最右,那一整条才溃散。"],
      ["sword", "诀窍是『溃不停』:贯通溃散后上面的沙塌下来,又能连成新一条,连着贯通,缝合翻倍。"],
      ["sword", "卡住了用左下『命运之轮』,它欠你一手好的。"]],
    post: [["sword", "看吧,连锁一起,根本停不下来。"]] },
  { id: "S3", name: "第二夜 · 星象低语", elevator: "calm", goal: 200,
    tip: "溃散谁的颜色,就唤回谁的一段记忆",
    pre: [
      ["cup", "听,星核穹顶在响。每溃散一大片他的星沙,就唤回他一段记忆。"],
      ["cup", "过层时能选一枚『星象法则』,大阿卡纳的碎片,会改写规则。"],
      ["cup", "选你喜欢的,它陪着你。"]],
    post: [["cup", "嗯,这一片,很温柔,也很正确。"]] },
  { id: "S4", name: "第三夜 · 双人委托", elevator: "calm", goal: 300,
    tip: "驻场双主的花色沙团更频繁,贯通他们的色",
    commission: ["cold", "tide"],
    pre: [["sys", "叮——事务所第一张正式委托抵达!裂隙强度上升,两位先生同时驻场。"], ["sys", "请选择本次委托的搭档组合。"]],
    post: [["sys", "委托完成!事务所与裂隙处理室全面开放。"], ["sys", "「无尽夜」已解锁——想缝多久,就缝多久。"]] },
];

/* ===================== 数值 ===================== */
const GW = 88, GH = 124;       /* ~1 万粒细沙 */
const CLEAR_MIN = 16;          /* (保留)横贯消除不用数量门槛,仅供旧引用 */
const BIG_CLEAR = 260;         /* 大片横贯("点亮"):一次溃散 ≥ 此粒数 = 唤回整段记忆 */
const PHYS_MS = 15;            /* 物理步长(短=流动顺) */
const SUBSTEP = 2;             /* 每次物理跑几遍(流体更顺) */
const POUR_MS = 9;             /* 倾倒滴速(一团沙倒下的快慢) */
const BLOB_MIN = 70, BLOB_MAX = 120;   /* 一团沙的粒数 */
const POUR_W = 7;             /* 倒沙散布半宽:沙散在落点±7列,倒成宽堆而非单柱 */
const CLEAR_SCAN_MS = 100;     /* 自动溃散扫描间隔 */
const COMBO_WIN = 2200;
const WARN_ROW = 16;           /* 警戒线行 */
const OVERLOAD_MS = 3200;
const endlessGoal = (n) => Math.round((120 * Math.pow(1.3, n - 1)) / 5) * 5;

/* ===================== 状态 ===================== */
const S = {
  mode: "story", stageIdx: 0, endlessLayer: 1,
  grid: new Uint8Array(GW * GH), shade: new Float32Array(GW * GH),
  seam: 0, goal: 120, layer: 1,
  laws: [], commission: null, wheelUses: 1,
  running: false, paused: true, guided: false, story: false,
  combo: 0, comboT: 0, overloadT: 0, ascendThisLayer: 0, rescues: 1,
  seamTotal: 0, maxCombo: 0, litLeads: {}, dust: 0, curTip: "",
  curBlob: null, nextBlobs: [], pourQueue: [], clearAcc: 0, eyeNext: false,
  sound: load("xs_sound", true),
};
let cv, cx, cssW = 0, cssH = 0, cellPx = 0, dpr = 1;
const $ = (id) => document.getElementById(id);
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const pick = (a) => a[Math.floor(Math.random() * a.length)];
function load(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } }
function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
const storyDone = () => load("xs_story", 0);
function idx(r, c) { return r * GW + c; }

/* ===================== 音效 ===================== */
let AC = null, bgm = null;
function ac() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch {} } return AC; }
function tone(f, dur, type = "sine", vol = 0.1, when = 0) {
  if (!S.sound) return; const c = ac(); if (!c) return;
  const t = c.currentTime + when, o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.05);
}
const PENTA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5];
const sfx = {
  pour() { tone(160, 0.12, "triangle", 0.05); tone(240, 0.1, "sine", 0.04, 0.05); },
  clear(size, combo) { const n = Math.min(5, 1 + Math.floor(size / 16)); for (let i = 0; i <= n; i++) tone(PENTA[Math.min(i + combo, 5)], 0.18, "triangle", 0.08, i * 0.04); },
  big() { [0, 2, 4, 5].forEach((p, i) => tone(PENTA[p] * 1.5, 0.4, "sine", 0.1, i * 0.08)); tone(PENTA[5] * 2, 0.5, "sine", 0.09, 0.3); },
  wheel() { for (let i = 0; i < 8; i++) tone(300 + i * 90, 0.1, "square", 0.04, i * 0.06); tone(1046, 0.5, "sine", 0.1, 0.5); },
  coin() { tone(987, 0.07, "triangle", 0.09); tone(1318, 0.16, "triangle", 0.1, 0.06); },
  win() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.4, "sine", 0.1, i * 0.12)); },
  fail() { [330, 262, 208].forEach((f, i) => tone(f, 0.5, "sine", 0.08, i * 0.18)); },
  bad() { tone(150, 0.1, "square", 0.04); },
};
function startBgm() { if (bgm) return; bgm = new Audio("../bgm.mp3"); bgm.loop = true; bgm.volume = 0.3; bgm.play().catch(() => { bgm = null; }); }

/* ===================== 星空 ===================== */
(function starfield() {
  const c = $("starfield"), x = c.getContext("2d"); let stars = [];
  function reset() { c.width = innerWidth; c.height = innerHeight; stars = Array.from({ length: 80 }, () => ({ x: Math.random() * c.width, y: Math.random() * c.height, r: Math.random() * 1.3 + 0.3, p: Math.random() * 7, s: 0.4 + Math.random() * 1.2 })); }
  reset(); addEventListener("resize", reset);
  (function f(t) { x.clearRect(0, 0, c.width, c.height); for (const s of stars) { const a = 0.25 + 0.55 * Math.abs(Math.sin(s.p + t * 0.0006 * s.s)); x.globalAlpha = a; x.fillStyle = "#dfe6ff"; x.beginPath(); x.arc(s.x, s.y, s.r, 0, 7); x.fill(); } requestAnimationFrame(f); })(0);
})();

/* ===================== 裂隙帧 ===================== */
const FRAME = (n) => `../assets/city/cf_${String(n).padStart(3, "0")}.jpg`;
function preload(a, b) { for (let i = a; i <= b; i++) { const im = new Image(); im.src = FRAME(i); } }

/* ===================== UI 基础 ===================== */
let toastT = null;
function toast(m, d = 2200) { const e = $("toast"); e.innerHTML = m; e.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => e.classList.remove("show"), d); }
function banner(m) { const e = $("comboBanner"); e.textContent = m; e.classList.remove("show"); void e.offsetWidth; e.classList.add("show"); }
function modal(h) { $("modal").innerHTML = h; $("overlay").classList.add("show"); S.paused = true; }
function closeModal() { $("overlay").classList.remove("show"); }
function flash(red) { let f = document.querySelector(".flash"); if (!f) { f = document.createElement("div"); f.className = "flash"; document.body.appendChild(f); } f.classList.toggle("red", !!red); f.classList.remove("go"); void f.offsetWidth; f.classList.add("go"); }
function flyScore(x, y, txt, size = 18) { const e = document.createElement("div"); e.className = "fly-score"; e.textContent = txt; e.style.cssText = `left:${x}px;top:${y}px;font-size:${size}px;transform:translateX(-50%)`; document.body.appendChild(e); setTimeout(() => e.remove(), 880); }

let lastSay = 0;
function say(suit, kind, force = false) {
  const l = LEADS[suit]; if (!l) return;
  const now = performance.now(); if (!force && now - lastSay < 3800) return; lastSay = now;
  $("leadGlyph").setAttribute("href", l.glyph); $("leadAvatar").style.color = l.color; $("lbName").textContent = l.name;
  const t = $("lbText"); t.textContent = pick(l.lines[kind] || ["…"]); t.classList.remove("pop"); void t.offsetWidth; t.classList.add("pop");
  const a = $("leadAvatar"); a.classList.remove("flash"); void a.offsetWidth; a.classList.add("flash");
}
function setLeadBar(suit) { const l = LEADS[suit] || LEADS.sword; $("leadGlyph").setAttribute("href", l.glyph); $("leadAvatar").style.color = l.color; $("lbName").textContent = l.name; $("lbText").textContent = pick(l.lines.start); }

function runDialogue(seq) {
  return new Promise((resolve) => {
    const layer = $("dlgLayer"); let i = 0, typing = false, timer = null; S.paused = true;
    function show() {
      const [who, text] = seq[i]; const w = who === "sys" ? SYS : LEADS[who];
      $("dlgGlyph").setAttribute("href", w.glyph); $("dlgAvatar").style.color = w.color; $("dlgName").textContent = w.name;
      const t = $("dlgText"); t.textContent = ""; typing = true; let c = 0;
      timer = setInterval(() => { c++; t.textContent = text.slice(0, c); if (c >= text.length) { clearInterval(timer); typing = false; } }, 24);
    }
    function tap() { if (typing) { clearInterval(timer); $("dlgText").textContent = seq[i][1]; typing = false; return; } i++; if (i >= seq.length) { layer.style.display = "none"; layer.onclick = null; resolve(); } else show(); }
    layer.style.display = "flex"; layer.onclick = tap; show();
  });
}

/* ===================== 花色 / 沙团 ===================== */
/* 颜色丰富:S1 双色教学 → S2 三色 → S3+/委托/无尽 四色全开(委托主色加权,但四色都在) */
function activeSuits() {
  if (S.commission) return SUIT_KEYS;
  if (S.story) return S.stageIdx === 0 ? ["sword", "wand"] : S.stageIdx === 1 ? ["sword", "wand", "coin"] : SUIT_KEYS;
  return SUIT_KEYS;
}
function hasLaw(k) { return S.laws.some(l => l.key === k); }
function randSuitIdx() {
  const act = activeSuits();
  const w = act.map(s => (hasLaw("strength") && s === "wand") ? 2.4 : (S.commission && S.commission.pair.includes(s) ? 1.8 : 1));
  let tot = w.reduce((a, b) => a + b, 0), r = Math.random() * tot;
  for (let i = 0; i < act.length; i++) { r -= w[i]; if (r <= 0) return SUIT_IDX[act[i]]; }
  return SUIT_IDX[act[0]];
}
function genBlob() { return { suit: randSuitIdx(), n: BLOB_MIN + Math.floor(Math.random() * (BLOB_MAX - BLOB_MIN + 1)) }; }
function ensureBlobs() { if (!S.curBlob) S.curBlob = genBlob(); while (S.nextBlobs.length < 2) S.nextBlobs.push(genBlob()); }
function renderBlobUI() {
  const cell = (b, big) => b ? `<div class="blob-chip${big ? " big" : ""}" style="--bc:${SUITS[IDX_SUIT[b.suit]].color}"><svg viewBox="0 0 48 48" style="color:${SUITS[IDX_SUIT[b.suit]].color}"><use href="${SUITS[IDX_SUIT[b.suit]].glyph}"/></svg></div>` : "";
  $("blobCur").innerHTML = cell(S.curBlob, true);
  $("blobNext").innerHTML = cell(S.nextBlobs[0], false);
}

/* ===================== Canvas 布局 ===================== */
function layoutCanvas() {
  cv = $("sandCanvas"); cx = cv.getContext("2d");
  const zone = $("sandZone");
  const availW = zone.clientWidth - 4, availH = zone.clientHeight - 4, aspect = GW / GH;
  if (availW / availH > aspect) { cssH = availH; cssW = cssH * aspect; }
  else { cssW = availW; cssH = cssW / aspect; }
  dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.style.width = cssW + "px"; cv.style.height = cssH + "px";
  cv.width = Math.round(cssW * dpr); cv.height = Math.round(cssH * dpr);
  cellPx = cv.width / GW;
  /* 手中沙团跟随 canvas 顶部:落在红线(WARN_ROW)正上方 */
  const bd = $("blobDock");
  if (bd) bd.style.top = (cv.offsetTop + WARN_ROW * (cssH / GH) - 44) + "px";
}

/* ===================== 沙子物理(流体元胞自动机) ===================== */
function physicsStep() {
  const g = S.grid;
  for (let r = GH - 2; r >= 0; r--) {
    const lr = Math.random() < 0.5;
    for (let i = 0; i < GW; i++) {
      const c = lr ? i : GW - 1 - i;
      const v = g[idx(r, c)]; if (!v) continue;
      if (g[idx(r + 1, c)] === 0) { g[idx(r + 1, c)] = v; g[idx(r, c)] = 0; continue; }   /* 正下落 */
      const order = Math.random() < 0.5 ? [c - 1, c + 1] : [c + 1, c - 1];
      let moved = false;
      for (const nc of order) { if (nc < 0 || nc >= GW) continue; if (g[idx(r + 1, nc)] === 0) { g[idx(r + 1, nc)] = v; g[idx(r, c)] = 0; moved = true; break; } }  /* 斜下滑 */
      if (!moved) {  /* 横向流淌(找平,增强流体感):旁边空且其正下也空 → 流过去 */
        for (const nc of order) { if (nc < 0 || nc >= GW) continue; if (g[idx(r, nc)] === 0 && r + 1 < GH && g[idx(r + 1, nc)] === 0) { g[idx(r, nc)] = v; g[idx(r, c)] = 0; break; } }
      }
    }
  }
}

/* 投放:点击列 → 排入倾倒队列(从该列附近顶部持续滴沙) */
function pourAt(col) {
  if (S.paused || !S.running || !S.curBlob) return;
  S.pourQueue.push({ col, suit: S.curBlob.suit, remaining: S.curBlob.n, acc: 0 });
  S.curBlob = S.nextBlobs.shift(); ensureBlobs(); renderBlobUI(); sfx.pour();
}
function pourTick(dt) {
  for (let i = S.pourQueue.length - 1; i >= 0; i--) {
    const p = S.pourQueue[i]; p.acc += dt;
    let safety = 0;
    while (p.acc >= POUR_MS && p.remaining > 0 && safety++ < 14) {
      p.acc -= POUR_MS;
      /* 在落点 ±POUR_W 内随机挑一列倒(散开成宽堆,不堆单柱) */
      let placed = false;
      for (let tries = 0; tries < 6; tries++) {
        const c = p.col + Math.floor(Math.random() * (2 * POUR_W + 1)) - POUR_W;
        if (c >= 0 && c < GW && S.grid[idx(0, c)] === 0) { S.grid[idx(0, c)] = p.suit; S.shade[idx(0, c)] = 0.9 + Math.random() * 0.14; p.remaining--; placed = true; break; }
      }
      if (!placed) {   /* 随机没命中 → 顺序找最近空列 */
        let f = -1;
        for (let d = 0; d <= POUR_W && f < 0; d++) { for (const c of [p.col - d, p.col + d]) if (c >= 0 && c < GW && S.grid[idx(0, c)] === 0) { f = c; break; } }
        if (f < 0) break;   /* 顶部全堵 = 倒不下去(过载来源) */
        S.grid[idx(0, f)] = p.suit; S.shade[idx(0, f)] = 0.9 + Math.random() * 0.14; p.remaining--;
      }
    }
    if (p.remaining <= 0) S.pourQueue.splice(i, 1);
  }
}

/* ===================== 自动溃散扫描 ===================== */
function autoClearScan() {
  const g = S.grid, vis = new Uint8Array(GW * GH), groups = [];
  for (let r = 0; r < GH; r++) for (let c = 0; c < GW; c++) {
    const k = idx(r, c); if (!g[k] || vis[k]) continue;
    const suit = g[k], comp = [k], stack = [k]; vis[k] = 1;
    let touchL = false, touchR = false;     /* 是否触及最左/最右边界 */
    while (stack.length) {
      const cur = stack.pop(), cr = (cur / GW) | 0, cc = cur % GW;
      if (cc === 0) touchL = true; if (cc === GW - 1) touchR = true;
      if (cr + 1 < GH) { const nk = cur + GW; if (g[nk] === suit && !vis[nk]) { vis[nk] = 1; stack.push(nk); comp.push(nk); } }
      if (cr - 1 >= 0) { const nk = cur - GW; if (g[nk] === suit && !vis[nk]) { vis[nk] = 1; stack.push(nk); comp.push(nk); } }
      if (cc + 1 < GW) { const nk = cur + 1; if (g[nk] === suit && !vis[nk]) { vis[nk] = 1; stack.push(nk); comp.push(nk); } }
      if (cc - 1 >= 0) { const nk = cur - 1; if (g[nk] === suit && !vis[nk]) { vis[nk] = 1; stack.push(nk); comp.push(nk); } }
    }
    if (touchL && touchR) groups.push({ suit, comp });   /* 同色横贯左右两边 → 整片溃散(Sandtrix 式) */
  }
  if (!groups.length) return;
  S.combo = (S.comboT > 0 ? S.combo + 1 : 1); S.comboT = COMBO_WIN * (hasLaw("temperance") ? 1.5 : 1); S.maxCombo = Math.max(S.maxCombo, S.combo);
  let biggest = 0, bigSuit = null;
  for (const grp of groups) { burstClear(grp.suit, grp.comp); if (grp.comp.length > biggest) { biggest = grp.comp.length; bigSuit = grp.suit; } }
  if (S.combo >= 2) banner(`连锁 ×${S.combo}`);
  const anyBig = groups.some(grp => grp.comp.length >= BIG_CLEAR);
  if (anyBig) { flash(); banner("★ 星河溃散 ★"); sfx.big(); say(bigSuit, "big", true); if (S.story) leadInnerVoice(bigSuit); }
  else if (S.combo >= 3) say(bigSuit, "chain"); else say(bigSuit, "clear");
  if (S.seam >= S.goal) onLayerClear();
}
function burstClear(suit, comp) {
  const size = comp.length, isBig = size >= BIG_CLEAR;
  let base = size * 0.2;        /* 横贯片本就很大(≥屏宽),系数低 */
  if (isBig) base += 30;
  if (hasLaw("sun")) base += 8;
  if (hasLaw("star") && isBig) base += 24;
  if (hasLaw("lovers") && suit === "cup") base *= 1.5;
  if (hasLaw("empress") && S.ascendThisLayer === 0) base *= 2;
  if (hasLaw("world")) base *= (1 + 0.05 * S.laws.length);
  if (S.commission && S.commission.pair.includes(suit)) base += size * 0.12;
  const gain = Math.max(1, Math.round(base * (1 + 0.3 * (S.combo - 1) * (hasLaw("temperance") ? 1.4 : 1))));
  let sr = 0, sc = 0; for (const k of comp) { sr += (k / GW) | 0; sc += k % GW; S.grid[k] = 0; }
  const rect = cv.getBoundingClientRect();
  flyScore(rect.left + (sc / size + 0.5) * (rect.width / GW), rect.top + (sr / size + 0.5) * (rect.height / GH), "+" + gain, isBig ? 26 : Math.min(15 + Math.floor(size / 6), 26));
  sfx.clear(size, S.combo);
  S.seam += gain; S.seamTotal += gain; S.ascendThisLayer++; S.litLeads[suit] = (S.litLeads[suit] || 0) + 1;
  updateHud();
}
function leadInnerVoice(suit) {
  const lines = { wand: "他嘴上不说,其实最怕你受伤。", coin: "他把你的名字,记在最重要那一页。", sword: "他算了一百种结局,每一种都有你。", cup: "他说『别紧张』时,自己手心也在出汗。" };
  setTimeout(() => toast("✦ 灵宝:" + lines[suit], 3000), 600);
}

/* ===================== 渲染:发光星沙精灵(预渲染,亮心+高光,晶莹质感) ===================== */
const SPRITES = {};
function makeSprites() {
  const SZ = 28;
  for (const k of SUIT_KEYS) {
    const [r, g, b] = SUITS[k].rgb;
    const oc = document.createElement("canvas"); oc.width = SZ; oc.height = SZ;
    const o = oc.getContext("2d");
    const grad = o.createRadialGradient(SZ * 0.38, SZ * 0.34, SZ * 0.05, SZ * 0.5, SZ * 0.5, SZ * 0.62);
    grad.addColorStop(0, `rgb(${Math.min(255, r + 120)},${Math.min(255, g + 120)},${Math.min(255, b + 120)})`);   /* 亮心 */
    grad.addColorStop(0.42, `rgb(${r},${g},${b})`);
    grad.addColorStop(1, `rgb(${r * 0.48 | 0},${g * 0.48 | 0},${b * 0.48 | 0})`);                                   /* 暗边 */
    o.fillStyle = grad;
    if (o.roundRect) { o.beginPath(); o.roundRect(1.5, 1.5, SZ - 3, SZ - 3, SZ * 0.32); o.fill(); }
    else { o.fillRect(1.5, 1.5, SZ - 3, SZ - 3); }
    o.fillStyle = "rgba(255,255,255,0.6)";                                                                          /* 高光点 */
    o.beginPath(); o.arc(SZ * 0.34, SZ * 0.3, SZ * 0.12, 0, 7); o.fill();
    SPRITES[SUIT_IDX[k]] = oc;
  }
}
function render() {
  if (!cx) return;
  cx.clearRect(0, 0, cv.width, cv.height);
  const wy = WARN_ROW * cellPx;
  cx.strokeStyle = "rgba(255,91,110,0.5)"; cx.lineWidth = Math.max(1.5, dpr); cx.setLineDash([8 * dpr, 6 * dpr]);
  cx.beginPath(); cx.moveTo(0, wy); cx.lineTo(cv.width, wy); cx.stroke(); cx.setLineDash([]);
  const g = S.grid, w = cellPx + 1.3;
  for (let r = 0; r < GH; r++) for (let c = 0; c < GW; c++) {
    const v = g[idx(r, c)]; if (!v) continue;
    const sp = SPRITES[v]; if (sp) cx.drawImage(sp, c * cellPx - 0.4, r * cellPx - 0.4, w, w);
  }
}

/* ===================== HUD / 计时 ===================== */
function updateHud() {
  $("seamNow").textContent = Math.floor(S.seam); $("seamGoal").textContent = S.goal;
  $("goalFill").style.width = Math.min(100, (S.seam / S.goal) * 100) + "%";
  $("dustHud").textContent = "✦ " + S.dust;
}
function renderRelics() { const row = $("relicRow"); row.innerHTML = ""; S.laws.forEach(l => { const e = document.createElement("button"); e.className = "relic"; e.style.color = RAR_COLOR[l.rar]; e.innerHTML = `<svg viewBox="0 0 48 48"><use href="${l.icon}"/></svg>`; e.onclick = () => toast(`「${l.name}」${l.desc}`); row.appendChild(e); }); }
function comboTick(dt) { if (S.comboT > 0) { S.comboT -= dt; if (S.comboT <= 0) S.combo = 0; } }
function overloadTick(dt) {
  let topFill = 0; for (let c = 0; c < GW; c++) for (let r = 0; r < WARN_ROW; r++) if (S.grid[idx(r, c)]) topFill++;
  const crisis = topFill >= GW * WARN_ROW * 0.4;
  cv.classList.toggle("crisis", crisis && S.seam < S.goal);
  if (crisis) { S.overloadT += dt; if (S.overloadT >= OVERLOAD_MS && S.seam < S.goal) onOverload(); }
  else S.overloadT = Math.max(0, S.overloadT - dt * 2);
}

/* ===================== 游戏循环 ===================== */
let lastT = 0, physAcc = 0;
function loop(t) {
  if (!S.running) return;
  const dt = Math.min(100, t - lastT); lastT = t;
  if (!S.paused) {
    physAcc += dt; pourTick(dt); comboTick(dt); overloadTick(dt);
    let steps = 0; while (physAcc >= PHYS_MS && steps < 6) { for (let s = 0; s < SUBSTEP; s++) physicsStep(); physAcc -= PHYS_MS; steps++; }
    S.clearAcc += dt; if (S.clearAcc >= CLEAR_SCAN_MS) { autoClearScan(); S.clearAcc = 0; }
  }
  render(); requestAnimationFrame(loop);
}
function startLoop() { if (S.running) return; S.running = true; lastT = performance.now(); physAcc = 0; S.clearAcc = 0; requestAnimationFrame(loop); }

/* ===================== 命运之轮 ===================== */
function onArcana() {
  if (S.paused || S.wheelUses <= 0 || !S.running) return;
  modal(`
    <h2>命运之轮</h2><div class="m-sub">转动命运 · 三选一(每层 ${S.wheelUses} 次)</div>
    <div class="pick-card" data-w="mono"><div class="pick-icon"><svg viewBox="0 0 48 48"><use href="#glyph-octa"/></svg></div><div><div class="pc-name">同辉归一</div><div class="pc-desc">把全场星沙染成一色,瞬间溃散超大片</div></div></div>
    <div class="pick-card" data-w="sweep"><div class="pick-icon"><svg viewBox="0 0 48 48"><use href="#glyph-wheel"/></svg></div><div><div class="pc-name">净空</div><div class="pc-desc">震落底部沙层,直接缝合 + 大幅腾空间</div></div></div>
    <div class="pick-card" data-w="quake"><div class="pick-icon"><svg viewBox="0 0 48 48"><use href="#glyph-octa"/></svg></div><div><div class="pc-name">星震</div><div class="pc-desc">摇晃星盘,沙子重新流动找平,凑出新连片</div></div></div>
    <button class="m-btn minor" id="wCancel">先不用</button>`);
  $("modal").querySelectorAll(".pick-card").forEach(card => card.onclick = () => { closeModal(); doWheel(card.dataset.w); });
  $("wCancel").onclick = () => { closeModal(); S.paused = false; };
}
function doWheel(kind) {
  S.wheelUses--; sfx.wheel(); $("btnArcana").classList.add("used"); $("arcanaUses").textContent = S.wheelUses;
  if (kind === "mono") {
    const suit = SUIT_IDX[S.commission ? S.commission.pair[(S.layer) % 2] : activeSuits()[0]];
    for (let i = 0; i < S.grid.length; i++) if (S.grid[i]) S.grid[i] = suit;
    toast("同辉归一——全场染色"); S.clearAcc = CLEAR_SCAN_MS;
  } else if (kind === "sweep") {
    let n = 0; for (let r = GH - 12; r < GH; r++) for (let c = 0; c < GW; c++) { if (S.grid[idx(r, c)]) { S.grid[idx(r, c)] = 0; n++; } }
    if (n) { const gain = Math.round(n * 0.3); S.seam += gain; S.seamTotal += gain; const rect = cv.getBoundingClientRect(); flyScore(rect.left + rect.width / 2, rect.top + rect.height - 20, "+" + gain, 20); }
    toast("净空——底层震落"); updateHud(); if (S.seam >= S.goal) { onLayerClear(); return; }
  } else {
    /* 星震:全盘沙随机轻微移位,促成新流动 */
    for (let r = GH - 2; r >= 0; r--) for (let c = 0; c < GW; c++) { if (S.grid[idx(r, c)] && Math.random() < 0.4) { const nc = c + (Math.random() < 0.5 ? -1 : 1); if (nc >= 0 && nc < GW && S.grid[idx(r, nc)] === 0) { S.grid[idx(r, nc)] = S.grid[idx(r, c)]; S.grid[idx(r, c)] = 0; } } }
    toast("星震——沙流找平");
  }
  S.paused = false;
}

/* ===================== 关卡流 ===================== */
function startLayer() {
  S.grid.fill(0); S.seam = 0; S.ascendThisLayer = 0; S.combo = 0; S.comboT = 0; S.overloadT = 0; S.eyeNext = false;
  S.pourQueue = []; S.curBlob = null; S.nextBlobs = []; ensureBlobs();
  S.wheelUses = 1 + (hasLaw("wheel") ? 1 : 0);
  $("btnArcana").classList.remove("used"); $("arcanaUses").textContent = S.wheelUses; $("btnArcana").classList.add("ready");
  $("layerName").textContent = layerName();
  $("footTip").innerHTML = "点屏幕倒沙 · 同色连通左右两边→整条溃散";
  $("hintLine").innerHTML = S.curTip || "把同色沙从屏幕最左连到最右";
  cv.classList.remove("crisis");
  layoutCanvas(); preload(1, 39); updateHud(); renderRelics(); renderBlobUI();
  /* 开局矮"小沙丘":弧形轮廓(中间高两边低,自然)+竖向大色块(成块不细碎)+轻噪声。
     竖向分段、相邻段不同色 → 任何单色都不横贯左右 → 开局不自消。首夜矮+少色 = 简单。 */
  const peak = (S.story && S.stageIdx === 0) ? 11 : 15 + S.layer * 3;   /* 沙丘峰高;首夜很矮 */
  const cols = activeSuits().map(s => SUIT_IDX[s]);                      /* 渐进色数:S1 2色 … S3+ 4色 */
  const segN = cols.length + 2 + S.layer;
  const segW = GW / segN, segCol = [];
  for (let i = 0; i < segN; i++) { let v; do { v = cols[Math.floor(Math.random() * cols.length)]; } while (i > 0 && v === segCol[i - 1] && cols.length > 1); segCol.push(v); }
  for (let c = 0; c < GW; c++) {
    const h = Math.round(peak * Math.pow(Math.sin(Math.PI * (c + 0.5) / GW), 0.62)) + 2;   /* 弧形,两端 min 2 行 */
    const seg = Math.min(segN - 1, Math.floor(c / segW));
    for (let k = 0; k < h; k++) {
      const r = GH - 1 - k;
      const v = Math.random() < 0.1 ? cols[Math.floor(Math.random() * cols.length)] : segCol[seg];   /* 10% 噪声,自然但仍成块 */
      S.grid[idx(r, c)] = v; S.shade[idx(r, c)] = 0.9 + Math.random() * 0.14;
    }
  }
  const dl = dutyLead(); setLeadBar(dl); setTimeout(() => say(dl, "start", true), 700);
  startLoop(); S.paused = false;
}
function layerName() { if (S.story) return STORY[S.stageIdx] ? STORY[S.stageIdx].name : "首夜"; return `无尽夜 · 第 ${S.endlessLayer} 层`; }
function dutyLead() { if (S.commission) return S.commission.pair[(S.layer - 1) % 2]; if (S.story) return S.stageIdx <= 1 ? "sword" : "cup"; return pick(SUIT_KEYS); }

async function onLayerClear() {
  S.paused = true; cv.classList.remove("crisis"); sfx.win();
  const reward = 15 + S.layer * 5 + S.ascendThisLayer * 2; S.dust += reward;
  if (S.story) {
    await runDialogue(STORY[S.stageIdx].post);
    save("xs_story", Math.max(storyDone(), S.stageIdx + 1));
    if (S.stageIdx >= STORY.length - 1) return storyVictory();
    showLayerClearModal(true);
  } else { save("xs_endlessBest", Math.max(load("xs_endlessBest", 0), S.endlessLayer)); showLayerClearModal(false); }
}
function showLayerClearModal(isStory) {
  const offerLaws = isStory ? S.stageIdx >= 2 : true;
  let lawHtml = "";
  if (offerLaws) {
    const picks = LAWS.filter(l => !hasLaw(l.key)).sort(() => Math.random() - 0.5).slice(0, 3);
    lawHtml = `<p class="m-text" style="margin-top:6px">裂隙深处浮出星象法则 —— 选一枚:</p>` + picks.map(l => `<div class="pick-card" data-law="${l.key}"><div class="pick-icon" style="color:${RAR_COLOR[l.rar]}"><svg viewBox="0 0 48 48"><use href="${l.icon}"/></svg></div><div><div class="pc-name" style="color:${RAR_COLOR[l.rar]}">${l.name}</div><div class="pc-desc">${l.desc}</div></div></div>`).join("");
  }
  modal(`
    <h2>裂隙稳定</h2><div class="m-sub">${layerName()} · 缝合 ${Math.floor(S.seam)}/${S.goal}</div>
    <div class="stars">${[0, 1, 2].map(i => `<span class="star-pop" style="animation-delay:${0.15 + i * 0.18}s">★</span>`).join("")}</div>
    <div class="m-text">星屑报酬 <span class="kw">+${15 + S.layer * 5 + S.ascendThisLayer * 2} ✦</span></div>
    ${lawHtml}
    <button class="m-btn" id="mNext">${isStory ? "继续 →" : "深入下一层 →"}</button>
    <button class="m-btn minor" id="mHome">回标题</button>`);
  const go = () => { closeModal(); if (isStory) { S.stageIdx++; runStage(); } else { S.endlessLayer++; S.layer++; S.goal = endlessGoal(S.endlessLayer); S.curTip = "缝满整片裂隙,刷新最深记录"; startLayer(); } };
  $("modal").querySelectorAll(".pick-card").forEach(card => card.onclick = () => { const l = LAW_MAP[card.dataset.law]; S.laws.push(l); toast(`习得法则「${l.name}」`); go(); });
  $("mNext").onclick = go; $("mHome").onclick = () => { closeModal(); backToTitle(); };
}

function onOverload() {
  S.paused = true; cv.classList.add("shake"); flash(true); sfx.bad(); setTimeout(() => cv.classList.remove("shake"), 420);
  if (S.rescues > 0) {
    S.rescues--; const su = dutyLead();
    modal(`
      <h2 style="color:${SUITS[su].color}">${LEADS[su].name} · 托住星盘</h2>
      <div class="m-text">星沙将漫过裂隙口,${LEADS[su].name}伸手拢住了它——</div>
      <div class="m-text" style="color:var(--gold-bright)">「${pick(LEADS[su].lines.rescue)}」</div>
      <button class="m-btn" id="mRev">握住他的手(震落顶部星沙)</button>
      <div class="m-sub" style="margin-top:8px">演示直接救场 · 正式版=男主/广告/分享复活位</div>`);
    $("mRev").onclick = () => { closeModal(); say(su, "rescue", true); for (let r = 0; r < WARN_ROW + 6; r++) for (let c = 0; c < GW; c++) S.grid[idx(r, c)] = 0; S.overloadT = 0; S.paused = false; };
    return;
  }
  if (S.story) {
    const su = dutyLead();
    modal(`<h2>星沙漫顶</h2><div class="m-sub">${layerName()} · 缝合 ${Math.floor(S.seam)}/${S.goal}</div>
      <div class="m-text" style="color:${SUITS[su].color}">${LEADS[su].name}:「${pick(LEADS[su].lines.rescue)}」</div>
      <button class="m-btn" id="mRetry">再缝一次这层</button><button class="m-btn minor" id="mHome">先回标题</button>`);
    $("mRetry").onclick = () => { closeModal(); S.rescues = 1; startLayer(); };
    $("mHome").onclick = () => { closeModal(); backToTitle(); };
  } else endlessSettle();
}

/* ===================== 剧情流 ===================== */
async function runStage() {
  const st = STORY[S.stageIdx]; S.story = true; S.mode = "story";
  S.layer = S.stageIdx + 1; S.goal = st.goal; S.guided = !!st.guided; S.curTip = st.tip; S.rescues = 1;
  $("titleScreen").style.display = "none";
  if (st.elevator) { const ev = $("elevator"); ev.style.display = "block"; ev.classList.toggle("alarm", st.elevator === "alarm"); $("evText").textContent = st.elevator === "alarm" ? "无尽电梯 · 裂隙湍流警报" : "无尽电梯 · 下行中…"; await wait(1900); ev.style.display = "none"; }
  $("app").style.display = "flex";
  await runDialogue(st.pre);
  if (st.commission) await pickCommission(st.commission.map(k => COMMISSIONS.find(c => c.key === k)));
  $("dustHud").style.display = S.stageIdx >= 2 ? "" : "none";
  $("relicRow").style.display = S.stageIdx >= 2 ? "" : "none";
  $("btnArcana").style.display = S.stageIdx >= 1 ? "" : "none";
  startLayer();
}
function pickCommission(opts) {
  return new Promise((resolve) => {
    modal(`<h2>选择委托</h2><div class="m-sub">驻场双主的花色沙团更频繁</div>` +
      opts.map((o, i) => `<div class="pick-card" data-i="${i}"><div class="pick-icon">${o.pair.map(s => `<svg viewBox="0 0 48 48" style="color:${SUITS[s].color};width:20px;height:20px"><use href="${SUITS[s].glyph}"/></svg>`).join("")}</div><div><div class="pc-name">${o.title}</div><div class="pc-pair">${o.pair.map(s => `<span style="color:${SUITS[s].color}">${LEADS[s].name}</span>`).join(" × ")}</div></div></div>`).join(""));
    $("modal").querySelectorAll(".pick-card").forEach(card => card.onclick = async () => { const o = opts[+card.dataset.i]; S.commission = o; closeModal(); await runDialogue(o.intro); resolve(); });
  });
}
async function storyVictory() {
  await runDialogue([["sword", "最后一片星沙……落定了。"], ["cup", "你看,他的星河,整片都缝合了。"], ["sys", "首夜记录完毕。事务所与裂隙处理室,从今夜起全面开放!"]]);
  save("xs_story", STORY.length);
  modal(`
    <svg class="title-octa" viewBox="0 0 48 48" style="width:40px;height:40px;color:var(--gold-bright);margin:0 auto 6px"><use href="#glyph-octa"/></svg>
    <div class="seal-card"><div class="sc-head">✦ 首夜完遂 ✦</div><div class="sc-big">裂隙,今夜安眠</div><div class="m-text">溃散的星沙,把他破碎的星魂缝回了一片。</div></div>
    <div class="m-stats"><div class="m-stat"><b>${S.seamTotal}</b><span>累计缝合</span></div><div class="m-stat"><b>×${S.maxCombo}</b><span>最高连击</span></div><div class="m-stat"><b>${Object.values(S.litLeads).reduce((a, b) => a + b, 0)}</b><span>溃散次数</span></div></div>
    <button class="m-btn" id="mEndless">进入 无尽夜</button><button class="m-btn minor" id="mHome">回标题</button>`);
  $("mEndless").onclick = () => { closeModal(); startEndless(); };
  $("mHome").onclick = () => { closeModal(); backToTitle(); };
}

/* ===================== 无尽夜 ===================== */
async function startEndless() {
  S.story = false; S.mode = "endless"; S.guided = false;
  S.laws = []; S.commission = null; S.dust = 0; S.seamTotal = 0; S.litLeads = {}; S.maxCombo = 0;
  S.endlessLayer = 1; S.layer = 1; S.goal = endlessGoal(1); S.rescues = 1; S.curTip = "缝满整片裂隙,刷新最深记录";
  $("titleScreen").style.display = "none"; $("app").style.display = "flex";
  $("dustHud").style.display = ""; $("relicRow").style.display = ""; $("btnArcana").style.display = "";
  await pickCommission(COMMISSIONS.slice().sort(() => Math.random() - 0.5).slice(0, 2));
  startLayer();
}
function endlessSettle() {
  const best = load("xs_endlessBest", 0);
  modal(`<h2>星沙漫顶</h2><div class="m-sub">无尽夜 · 抵达第 ${S.endlessLayer} 层</div>
    <div class="m-stats"><div class="m-stat"><b>${S.endlessLayer}</b><span>最深层</span></div><div class="m-stat"><b>${S.seamTotal}</b><span>累计缝合</span></div><div class="m-stat"><b>${best}</b><span>历史最深</span></div></div>
    <button class="m-btn" id="mAgain">再来一夜</button><button class="m-btn minor" id="mHome">回标题</button>`);
  $("mAgain").onclick = () => { closeModal(); startEndless(); };
  $("mHome").onclick = () => { closeModal(); backToTitle(); };
}

/* ===================== 图鉴 / 标题 ===================== */
function showCodex() {
  modal(`<h2>玩法图鉴</h2><div class="m-sub">同色沙横贯屏幕左右才整条溃散 · 花色 = 男主</div>
    <table class="codex-table">
      <tr><td class="cx-tier">投放</td><td class="cx-desc">点星盘任意处 → 手里这团沙从那儿倒下,流体堆积</td></tr>
      <tr><td class="cx-tier">贯通溃散</td><td class="cx-desc">同色沙<b>从最左连通到最右</b>,整条贯通片溃成星光缝合裂隙</td></tr>
      <tr><td class="cx-tier">溃不停</td><td class="cx-desc">贯通溃散后上方塌落、再连成新贯通,连锁不停,缝合翻倍</td></tr>
      <tr><td class="cx-tier">大片</td><td class="cx-desc">一次溃散 ≥ ${BIG_CLEAR} 粒 = 唤回他一整段记忆(大额缝合)</td></tr>
      <tr><td class="cx-tier">过载</td><td class="cx-desc">星沙漫过顶部警戒线 → 驻场男主托住救场</td></tr>
    </table>
    <p class="m-text" style="font-size:12.5px">· 盘底铺满四色,本身散着<span class="kw">不会自消</span><br>· 只有<span class="kw">同色从左墙连到右墙</span>,那一整条才溃散<br>· 命运之轮每层一次:同辉归一 / 净空 / 星震<br>· 过层选「星象法则」改写规则(roguelike)</p>
    <button class="m-btn" id="mClose">回到星盘</button>`);
  $("mClose").onclick = () => { if ($("app").style.display === "none") backToTitle(); else { closeModal(); S.paused = false; } };
}
function backToTitle() {
  S.running = false; S.paused = true; closeModal();
  $("app").style.display = "none"; $("dlgLayer").style.display = "none"; $("titleScreen").style.display = "flex";
  const done = storyDone(), bs = $("btnStory"), be = $("btnEndless");
  if (done >= STORY.length) { bs.textContent = "✦ 重温首夜"; be.disabled = false; const b = load("xs_endlessBest", 0); be.textContent = b ? `无尽夜(最深 ${b} 层)` : "无尽夜"; }
  else { bs.textContent = done === 0 ? "✦ 首夜 · 剧情远征" : `✦ 继续 · ${STORY[done].name}`; be.disabled = true; be.textContent = "无尽夜(完成首夜解锁)"; }
}
function showTitle() { backToTitle(); }

function bindUI() {
  $("btnStory").onclick = () => { startBgm(); S.story = true; S.laws = []; S.commission = null; S.dust = 0; S.seamTotal = 0; S.litLeads = {}; S.maxCombo = 0; S.stageIdx = storyDone() >= STORY.length ? 0 : storyDone(); runStage(); };
  $("btnEndless").onclick = () => { startBgm(); startEndless(); };
  $("btnHelp").onclick = () => { if (!S.paused) { S.paused = true; showCodex(); } else showCodex(); };
  $("btnHelp2").onclick = showCodex;
  $("btnHome").onclick = () => backToTitle();
  $("btnArcana").onclick = onArcana;
  $("btnReset").onclick = () => { save("xs_story", 0); save("xs_endlessBest", 0); toast("进度已重置"); backToTitle(); };
  const sb = $("btnSound"); sb.classList.toggle("off", !S.sound); sb.onclick = () => { S.sound = !S.sound; save("xs_sound", S.sound); sb.classList.toggle("off", !S.sound); if (bgm) bgm.muted = !S.sound; };
  $("sandCanvas").addEventListener("click", (e) => {
    if (S.paused || !S.running) return;
    const rect = cv.getBoundingClientRect(); const c = Math.floor((e.clientX - rect.left) / (rect.width / GW));
    if (c >= 0 && c < GW) pourAt(c);
  });
  addEventListener("resize", () => { if ($("app").style.display !== "none") layoutCanvas(); });
}

/* ===================== 启动 ===================== */
makeSprites(); layoutCanvas(); bindUI(); showTitle();
