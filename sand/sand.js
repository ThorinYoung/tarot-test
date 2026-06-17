/* ============================================================
   星沙 · 沙子物理消除(消除方案,docs/10 §6)
   核心:裂隙把男主星魂磨成「星沙」倾泻而下(元胞自动机,非刚体物理:
        逐格下落/斜滑堆积);点击同色连通片≥阈值→溃散成星光缝合裂隙→
        上方塌落→连击"消不停";堆到顶部警戒线→过载,男主救场。
   规则同色才消;花色 = 男主。台词占位稿,终稿以编剧为准。零依赖可玩。
   ============================================================ */
"use strict";

/* ===================== 配置 ===================== */
const SUITS = {
  wand:  { name: "权杖", color: "#ff6b4a", rgb: [255, 107, 74], glyph: "#glyph-wand" },
  coin:  { name: "星币", color: "#f0c75e", rgb: [240, 199, 94], glyph: "#glyph-coin" },
  sword: { name: "宝剑", color: "#7fd6c2", rgb: [127, 214, 194], glyph: "#glyph-sword" },
  cup:   { name: "圣杯", color: "#6f9bff", rgb: [111, 155, 255], glyph: "#glyph-cup" },
};
const SUIT_KEYS = ["wand", "coin", "sword", "cup"];
const SUIT_IDX = { wand: 1, coin: 2, sword: 3, cup: 4 };
const IDX_SUIT = [null, "wand", "coin", "sword", "cup"];

const LEADS = {
  wand: { name: "炎烈", glyph: "#glyph-wand", color: "#ff6b4a",
    lines: { start: ["今天的沙,看着就欠烧。", "跟上我的节奏,别眨眼。"], clear: ["散得漂亮!", "就是这一片!"], chain: ["连着来,别停!", "这股势头我喜欢!"], big: ["满屏都烧亮了——这才像话!", "看见没,你把我点燃了。"], low: ["沙要漫上来了——稳住。", "越挤越要沉住气。"], rescue: ["谁准你放弃的?手给我。", "塌不了,有我。"], win: ["赢了!刚才那下是不是很帅?", "干脆利落。"] } },
  coin: { name: "沈寂", glyph: "#glyph-coin", color: "#f0c75e",
    lines: { start: ["按计划进行,很好。", "每一粒沙都别浪费。"], clear: ["入账。", "稳,继续。"], chain: ["连锁收益可观。", "复利的美。"], big: ["这一片,值一整座城的安眠。", "收益超预期。"], low: ["余量告急,冷静核算。", "越到最后越别乱。"], rescue: ["亏损止得住,手伸出来。", "追加预算,别浪费。"], win: ["结算完成,超预期。", "记进年报。"] } },
  sword: { name: "叶渊", glyph: "#glyph-sword", color: "#7fd6c2",
    lines: { start: ["情报核对完毕,开始吧。", "别紧张,照我说的做。"], clear: ["最优解。", "我就说你会点这片。"], chain: ["连起来了,你总比我预测的好。", "漂亮,这步我没算到。"], big: ["整片溃散——教科书级别。", "我就说你做得到。"], low: ["空间告急,我替你算。", "收线,信你的直觉。"], rescue: ["想都别想输,抓紧我。", "预案启动,够你翻盘。"], win: ["完美收束,误差为零。", "看吧。"] } },
  cup: { name: "宋以衡", glyph: "#glyph-cup", color: "#6f9bff",
    lines: { start: ["别紧张,我陪你。", "今晚的星沙,很适合你。"], clear: ["唤回来一点了……", "很温柔,也很正确。"], chain: ["星光都在偏爱你。", "这个节奏,很舒服。"], big: ["你看,他的星河……整片亮起来了。", "一整片,都被你唤回来了。"], low: ["深呼吸,我陪你。", "你已经很好了。"], rescue: ["我在,手给我。", "靠着我,慢慢来。"], win: ["辛苦了……今天也想被你夸夸。", "回去喝杯热的。"] } },
};
const SYS = { name: "AI 灵宝", glyph: "#glyph-octa", color: "#d8b46a" };

const LAWS = [
  { key: "lovers", name: "恋人", icon: "#glyph-cup", rar: "l", desc: "圣杯星沙溃散缝合 ×1.5" },
  { key: "sun", name: "太阳", icon: "#glyph-octa", rar: "r", desc: "每次溃散额外 +6 缝合" },
  { key: "temperance", name: "节制", icon: "#glyph-octa", rar: "r", desc: "连击窗口延长,倍率更高" },
  { key: "wheel", name: "命运之轮", icon: "#glyph-wheel", rar: "r", desc: "命运之轮每层 +1 次" },
  { key: "world", name: "世界", icon: "#glyph-octa", rar: "l", desc: "每持有 1 条法则,缝合 +5%" },
  { key: "empress", name: "女皇", icon: "#glyph-octa", rar: "r", desc: "每层第一次溃散 ×2 缝合" },
  { key: "star", name: "星辰", icon: "#glyph-octa", rar: "c", desc: "大片溃散(≥15 粒)额外 +20" },
  { key: "strength", name: "力量", icon: "#glyph-wand", rar: "c", desc: "权杖星沙坠落更频繁" },
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
  { id: "S1", name: "序章 · 电梯惊停", elevator: "alarm", goal: 120, guided: true,
    tip: "点<同色>连成的一片星沙,把它点散",
    pre: [
      ["sys", "警告——无尽电梯检测到裂隙湍流,下行暂停。检测到星盘共鸣者:苏星轮。"],
      ["sword", "别慌。裂隙把星魂磨成了沙,正往下倒——这一夜,全是我的青沙。"],
      ["sword", "同色的沙会自己堆、自己滑。等它连成一片,点它,就溃成星光,缝住裂隙。"],
      ["sword", "连得越大,缝得越多。来,点点看——我看着你。"]],
    post: [["sword", "……稳住了。手感不错,比情报里写的有趣。"], ["sword", "到了处理室,我教你怎么连着点、点不停。"]] },
  { id: "S2", name: "第一夜 · 处理室初开", elevator: "calm", goal: 210,
    tip: "连着点不停 → <b>连击</b>,缝合越来越快",
    pre: [
      ["sword", "这层起会落下别的颜色——记住,只点<同色>连成的一片。"],
      ["sword", "诀窍是『消不停』:点散一片,上面的沙会塌下来,又连成新的一片,连着点,缝合翻倍。"],
      ["sword", "卡住了就用左下『命运之轮』,它欠你一手好的。"]],
    post: [["sword", "看吧,连击一起,根本停不下来。"]] },
  { id: "S3", name: "第二夜 · 星象低语", elevator: "calm", goal: 330,
    tip: "溃散谁的颜色,就唤回谁的一段记忆",
    pre: [
      ["cup", "听,星核穹顶在响。每溃散一大片他的星沙,就唤回他的一段记忆。"],
      ["cup", "过层时能选一枚『星象法则』,大阿卡纳的碎片,会改写规则。"],
      ["cup", "选你喜欢的,它陪着你。"]],
    post: [["cup", "嗯,这一片,很温柔,也很正确。"]] },
  { id: "S4", name: "第三夜 · 双人委托", elevator: "calm", goal: 470,
    tip: "驻场双主的花色星沙坠落更频繁",
    commission: ["cold", "tide"],
    pre: [["sys", "叮——事务所第一张正式委托抵达!裂隙强度上升,两位先生同时驻场。"], ["sys", "请选择本次委托的搭档组合。"]],
    post: [["sys", "委托完成!事务所与裂隙处理室全面开放。"], ["sys", "「无尽夜」已解锁——想缝多久,就缝多久。"]] },
];

/* ===================== 数值 ===================== */
const GW = 34, GH = 48;       /* 细颗粒网格(~1600 粒),堆出真正的"沙"质感 */
const CLEAR_MIN = 18;         /* 同色连通 ≥ 此值可溃散(细沙下一片有几十粒) */
const PORTS = [8, 17, 26];    /* 倾泻口:沙从几个口倒下堆成山(同色更易在山体连片) */
const BIG_CLEAR = 60;         /* 大片溃散("点亮") */
const PHYS_MS = 24;           /* 沙子物理步长(细格下落更顺) */
const COMBO_WIN = 2400;       /* 连击窗口 ms */
const WARN_ROW = 5;           /* 警戒线行 */
const OVERLOAD_MS = 3000;     /* 顶部持续堵塞达此时长 → 过载 */
const endlessGoal = (n) => Math.round((120 * Math.pow(1.3, n - 1)) / 5) * 5;
/* 沙子持续涌入(制造"消不停"流动感 + 满屏细沙山);层越深涌入越快 */
/* 高频从倾泻口滴沙(每口一根同色柱,塌成同色堆;不铺行,避免悬空横带) */
const spawnInterval = () => Math.max(55, 130 - S.layer * 9);

/* ===================== 状态 ===================== */
const S = {
  mode: "story", stageIdx: 0, endlessLayer: 1,
  grid: new Uint8Array(GW * GH), shade: new Float32Array(GW * GH),
  seam: 0, goal: 50, layer: 1,
  laws: [], commission: null, wheelUses: 1,
  running: false, paused: true, guided: false, story: false,
  combo: 0, comboT: 0, overloadT: 0, ascendThisLayer: 0, rescues: 1,
  seamTotal: 0, maxCombo: 0, litLeads: {}, dust: 0, curTip: "", portSuit: [],
  sound: load("xs_sound", true),
};
let cv, cx, cssW = 0, cssH = 0, cellPx = 0, dpr = 1;
const $ = (id) => document.getElementById(id);
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const pick = (a) => a[Math.floor(Math.random() * a.length)];
function load(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } }
function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
const storyDone = () => load("xs_story", 0);

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
  clear(size, combo) { const n = Math.min(5, 1 + Math.floor(size / 4)); for (let i = 0; i <= n; i++) tone(PENTA[Math.min(i + combo, 5)], 0.18, "triangle", 0.08, i * 0.04); },
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
  const now = performance.now(); if (!force && now - lastSay < 4200) return; lastSay = now;
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

/* ===================== 裂隙序列帧(缝合进度驱动) ===================== */
const FRAME = (n) => `../assets/city/cf_${String(n).padStart(3, "0")}.jpg`;
function preload(a, b) { for (let i = a; i <= b; i++) { const im = new Image(); im.src = FRAME(i); } }
let riftImg = null;
function riftProgress(p) { const idx = 1 + Math.round(Math.max(0, Math.min(1, p)) * 38); if (!riftImg) riftImg = new Image(); riftImg.src = FRAME(idx); }

/* ===================== 花色权重 ===================== */
function activeSuits() {
  if (S.commission) return S.commission.pair;
  if (S.story) return S.stageIdx === 0 ? ["sword"] : ["sword", "cup"];
  return SUIT_KEYS.slice(0, 2);
}
function hasLaw(k) { return S.laws.some(l => l.key === k); }
function randSuitIdx() {
  const act = activeSuits();
  const w = act.map(s => (hasLaw("strength") && s === "wand") ? 2 : 1);
  let tot = w.reduce((a, b) => a + b, 0), r = Math.random() * tot;
  for (let i = 0; i < act.length; i++) { r -= w[i]; if (r <= 0) return SUIT_IDX[act[i]]; }
  return SUIT_IDX[act[0]];
}

/* ===================== Canvas 布局 ===================== */
function layoutCanvas() {
  cv = $("sandCanvas"); cx = cv.getContext("2d");
  const zone = $("sandZone");
  const availW = zone.clientWidth - 4, availH = zone.clientHeight - 4;
  const aspect = GW / GH;
  if (availW / availH > aspect) { cssH = availH; cssW = cssH * aspect; }
  else { cssW = availW; cssH = cssW / aspect; }
  dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.style.width = cssW + "px"; cv.style.height = cssH + "px";
  cv.width = Math.round(cssW * dpr); cv.height = Math.round(cssH * dpr);
  cellPx = cv.width / GW;
}

/* ===================== 沙子物理(元胞自动机) ===================== */
function idx(r, c) { return r * GW + c; }
function physicsStep() {
  const g = S.grid;
  for (let r = GH - 2; r >= 0; r--) {
    const lr = Math.random() < 0.5;
    for (let i = 0; i < GW; i++) {
      const c = lr ? i : GW - 1 - i;
      const v = g[idx(r, c)]; if (!v) continue;
      if (g[idx(r + 1, c)] === 0) { g[idx(r + 1, c)] = v; g[idx(r, c)] = 0; continue; }
      const order = Math.random() < 0.5 ? [c - 1, c + 1] : [c + 1, c - 1];
      for (const nc of order) {
        if (nc < 0 || nc >= GW) continue;
        if (g[idx(r + 1, nc)] === 0) { g[idx(r + 1, nc)] = v; g[idx(r, c)] = 0; break; }
      }
    }
  }
}
/* 每个倾泻口持续滴下同色沙柱(偶尔换色),靠物理塌成同色堆;顶格满则跳过(堵塞=过载来源) */
function spawnGrains() {
  const wide = 1 + Math.floor(S.layer / 3);     /* 层越深口越粗,涌入更猛 */
  for (let i = 0; i < PORTS.length; i++) {
    if (Math.random() < 0.10) S.portSuit[i] = randSuitIdx();   /* 偶尔换色 → 山体分块同色 */
    for (let w = 0; w <= wide; w++) {
      const c = Math.max(0, Math.min(GW - 1, PORTS[i] + (Math.floor(Math.random() * 3) - 1)));
      if (S.grid[idx(0, c)] === 0) { S.grid[idx(0, c)] = S.portSuit[i]; S.shade[idx(0, c)] = 0.72 + Math.random() * 0.46; }
    }
  }
}

/* ===================== 渲染 ===================== */
function render() {
  if (!cx) return;
  cx.clearRect(0, 0, cv.width, cv.height);
  /* 警戒线 */
  const wy = WARN_ROW * cellPx;
  cx.strokeStyle = "rgba(255,91,110,0.55)"; cx.lineWidth = Math.max(1.5, dpr);
  cx.setLineDash([8 * dpr, 6 * dpr]); cx.beginPath(); cx.moveTo(0, wy); cx.lineTo(cv.width, wy); cx.stroke(); cx.setLineDash([]);
  /* 沙粒:无缝实心填充 + 每粒明暗噪声 → 细沙质感(轻微 overdraw 消除亚像素缝) */
  const g = S.grid, w = cellPx + 0.7;
  for (let r = 0; r < GH; r++) for (let c = 0; c < GW; c++) {
    const v = g[idx(r, c)]; if (!v) continue;
    const rgb = SUITS[IDX_SUIT[v]].rgb, sh = S.shade[idx(r, c)] || 1;
    cx.fillStyle = `rgb(${Math.min(255, rgb[0] * sh) | 0},${Math.min(255, rgb[1] * sh) | 0},${Math.min(255, rgb[2] * sh) | 0})`;
    cx.fillRect(c * cellPx, r * cellPx, w, w);
  }
}

/* ===================== 点击溃散 ===================== */
function floodSame(r0, c0) {
  const g = S.grid, v = g[idx(r0, c0)]; if (!v) return [];
  const seen = new Set([idx(r0, c0)]), stack = [[r0, c0]], out = [[r0, c0]];
  while (stack.length) {
    const [r, c] = stack.pop();
    for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const nr = r + dr, nc = c + dc; if (nr < 0 || nr >= GH || nc < 0 || nc >= GW) continue;
      const k = idx(nr, nc); if (g[k] === v && !seen.has(k)) { seen.add(k); stack.push([nr, nc]); out.push([nr, nc]); }
    }
  }
  return out;
}
function onCanvasClick(e) {
  if (S.paused || !S.running) return;
  const rect = cv.getBoundingClientRect();
  const c = Math.floor((e.clientX - rect.left) / (rect.width / GW));
  const r = Math.floor((e.clientY - rect.top) / (rect.height / GH));
  if (r < 0 || r >= GH || c < 0 || c >= GW) return;
  const v = S.grid[idx(r, c)]; if (!v) return;
  const cluster = floodSame(r, c);
  if (cluster.length < CLEAR_MIN) { sfx.bad(); pulseHint(`这片只有 ${cluster.length} 粒——同色连够 ${CLEAR_MIN} 粒才能点散`); return; }
  doClear(cluster, IDX_SUIT[v]);
}
let hintT = null;
function pulseHint(msg) { const h = $("hintLine"); h.innerHTML = `<span style="color:var(--rift-core)">${msg}</span>`; clearTimeout(hintT); hintT = setTimeout(() => { h.innerHTML = S.curTip || "点同色连成的一片星沙,把它点散"; }, 1800); }

function doClear(cluster, suit) {
  const size = cluster.length;
  /* 连击 */
  S.combo = (S.comboT > 0 ? S.combo + 1 : 1); S.comboT = COMBO_WIN * (hasLaw("temperance") ? 1.5 : 1);
  S.maxCombo = Math.max(S.maxCombo, S.combo);
  const isBig = size >= BIG_CLEAR;
  /* 计分 */
  let base = size * 0.5 + Math.max(0, size - CLEAR_MIN) * 0.25;
  if (isBig) base += 24;
  if (hasLaw("sun")) base += 6;
  if (hasLaw("star") && isBig) base += 20;
  if (hasLaw("lovers") && suit === "cup") base *= 1.5;
  if (hasLaw("empress") && S.ascendThisLayer === 0) base *= 2;
  if (hasLaw("world")) base *= (1 + 0.05 * S.laws.length);
  if (S.commission && S.commission.pair.includes(suit)) base += size * 0.3;
  const comboMult = 1 + 0.3 * (S.combo - 1) * (hasLaw("temperance") ? 1.4 : 1);
  const gain = Math.round(base * comboMult);
  /* 质心(像素) */
  let sr = 0, sc = 0; for (const [r, c] of cluster) { sr += r; sc += c; S.grid[idx(r, c)] = 0; }
  const rect = cv.getBoundingClientRect();
  const px = rect.left + (sc / size + 0.5) * (rect.width / GW), py = rect.top + (sr / size + 0.5) * (rect.height / GH);
  S.seam += gain; S.seamTotal += gain; S.ascendThisLayer++;
  S.litLeads[suit] = (S.litLeads[suit] || 0) + 1;
  flyScore(px, py, "+" + gain, isBig ? 26 : Math.min(15 + size, 26));
  sfx.clear(size, S.combo);
  if (S.combo >= 2) banner(`连击 ×${S.combo}`);
  if (isBig) { flash(); banner("★ 星河溃散 ★"); sfx.big(); say(suit, "big", true); if (S.story) leadInnerVoice(suit); }
  else if (S.combo >= 3) say(suit, "chain"); else say(suit, "clear");
  updateHud();
  if (S.seam >= S.goal) onLayerClear();
}
function leadInnerVoice(suit) {
  const lines = { wand: "他嘴上不说,其实最怕你受伤。", coin: "他把你的名字,记在最重要那一页。", sword: "他算了一百种结局,每一种都有你。", cup: "他说『别紧张』时,自己手心也在出汗。" };
  setTimeout(() => toast("✦ 灵宝:" + lines[suit], 3000), 600);
}

/* ===================== HUD ===================== */
function updateHud() {
  $("seamNow").textContent = Math.floor(S.seam); $("seamGoal").textContent = S.goal;
  $("goalFill").style.width = Math.min(100, (S.seam / S.goal) * 100) + "%";
  $("dustHud").textContent = "✦ " + S.dust;
}
function renderRelics() { const row = $("relicRow"); row.innerHTML = ""; S.laws.forEach(l => { const e = document.createElement("button"); e.className = "relic"; e.style.color = RAR_COLOR[l.rar]; e.innerHTML = `<svg viewBox="0 0 48 48"><use href="${l.icon}"/></svg>`; e.onclick = () => toast(`「${l.name}」${l.desc}`); row.appendChild(e); }); }

/* ===================== 连击/过载 计时 ===================== */
function comboTick(dt) { if (S.comboT > 0) { S.comboT -= dt; if (S.comboT <= 0) { S.combo = 0; } } }
function overloadTick(dt) {
  let topFill = 0; for (let c = 0; c < GW; c++) for (let r = 0; r <= 1; r++) if (S.grid[idx(r, c)]) topFill++;
  const crisis = topFill >= GW * 0.5;
  cv.classList.toggle("crisis", crisis && S.seam < S.goal);
  if (crisis) { S.overloadT += dt; if (S.overloadT >= OVERLOAD_MS && S.seam < S.goal) onOverload(); }
  else S.overloadT = Math.max(0, S.overloadT - dt * 2);
}

/* ===================== 游戏循环 ===================== */
let lastT = 0, physAcc = 0, spawnAcc = 0;
function loop(t) {
  if (!S.running) return;
  const dt = Math.min(100, t - lastT); lastT = t;
  if (!S.paused) {
    physAcc += dt; spawnAcc += dt; comboTick(dt); overloadTick(dt);
    while (physAcc >= PHYS_MS) { physicsStep(); physAcc -= PHYS_MS; }
    if (spawnAcc >= spawnInterval()) { spawnGrains(); spawnAcc = 0; }
    riftProgress(S.seam / S.goal);
  }
  render();
  requestAnimationFrame(loop);
}
function startLoop() { if (S.running) return; S.running = true; lastT = performance.now(); physAcc = spawnAcc = 0; requestAnimationFrame(loop); }

/* ===================== 命运之轮 ===================== */
function onArcana() {
  if (S.paused || S.wheelUses <= 0 || !S.running) return;
  modal(`
    <h2>命运之轮</h2><div class="m-sub">转动命运 · 三选一(每层 ${S.wheelUses} 次)</div>
    <div class="pick-card" data-w="mono"><div class="pick-icon"><svg viewBox="0 0 48 48"><use href="#glyph-octa"/></svg></div><div><div class="pc-name">同辉归一</div><div class="pc-desc">把全场星沙染成驻场主色,凑出超大一片</div></div></div>
    <div class="pick-card" data-w="sweep"><div class="pick-icon"><svg viewBox="0 0 48 48"><use href="#glyph-wheel"/></svg></div><div><div class="pc-name">净空</div><div class="pc-desc">清除底部两行星沙,直接缝合 + 腾空间</div></div></div>
    <div class="pick-card" data-w="eye"><div class="pick-icon"><svg viewBox="0 0 48 48"><use href="#glyph-octa"/></svg></div><div><div class="pc-name">无视之眼</div><div class="pc-desc">下一次点击无视颜色,溃散整片相连星沙</div></div></div>
    <button class="m-btn minor" id="wCancel">先不用</button>`);
  $("modal").querySelectorAll(".pick-card").forEach(card => card.onclick = () => { closeModal(); doWheel(card.dataset.w); });
  $("wCancel").onclick = () => { closeModal(); S.paused = false; };
}
function doWheel(kind) {
  S.wheelUses--; sfx.wheel(); $("btnArcana").classList.add("used"); $("arcanaUses").textContent = S.wheelUses;
  if (kind === "mono") {
    const suit = SUIT_IDX[S.commission ? S.commission.pair[(S.layer) % 2] : activeSuits()[0]];
    for (let i = 0; i < S.grid.length; i++) if (S.grid[i]) S.grid[i] = suit;
    toast("同辉归一——全场染色");
  } else if (kind === "sweep") {
    let n = 0; for (let r = GH - 2; r < GH; r++) for (let c = 0; c < GW; c++) { if (S.grid[idx(r, c)]) { S.grid[idx(r, c)] = 0; n++; } }
    if (n) { const gain = Math.round(n * 0.8); S.seam += gain; S.seamTotal += gain; const rect = cv.getBoundingClientRect(); flyScore(rect.left + rect.width / 2, rect.top + rect.height - 20, "+" + gain, 20); }
    toast("净空——底部清空"); updateHud();
    if (S.seam >= S.goal) { onLayerClear(); return; }
  } else {
    S.eyeNext = true; toast("无视之眼——下一次点击无视颜色"); cv.classList.add("crisis");
  }
  S.paused = false;
}

/* ===================== 关卡流 ===================== */
function startLayer() {
  S.grid.fill(0); S.seam = 0; S.ascendThisLayer = 0; S.combo = 0; S.comboT = 0; S.overloadT = 0; S.eyeNext = false;
  S.portSuit = PORTS.map(() => randSuitIdx());
  S.wheelUses = 1 + (hasLaw("wheel") ? 1 : 0);
  $("btnArcana").classList.remove("used"); $("arcanaUses").textContent = S.wheelUses; $("btnArcana").classList.add("ready");
  $("layerName").textContent = layerName();
  $("footTip").innerHTML = S.curTip || "同色星沙连成一片,点它溃散";
  $("hintLine").innerHTML = S.curTip || "点同色连成的一片星沙,把它点散";
  cv.classList.remove("crisis");
  layoutCanvas(); preload(1, 39); updateHud(); renderRelics();
  /* 开局铺成丰满"细沙山"(大段同色成片);细格下铺到约一半高,一进场就满屏沙 */
  const seedRows = Math.floor(GH * 0.46) + Math.min(6, S.layer);
  for (let r = GH - seedRows; r < GH; r++) {
    let c = 0;
    while (c < GW) {
      const v = randSuitIdx(), run = 8 + Math.floor(Math.random() * 14);  /* 一段同色 8-21 格,大片 */
      for (let k = 0; k < run && c < GW; k++, c++) if (Math.random() < 0.88) { S.grid[idx(r, c)] = v; S.shade[idx(r, c)] = 0.72 + Math.random() * 0.46; }
    }
  }
  const dl = dutyLead(); setLeadBar(dl); setTimeout(() => say(dl, "start", true), 700);
  startLoop(); S.paused = false;
}
function layerName() { if (S.story) return STORY[S.stageIdx] ? STORY[S.stageIdx].name : "首夜"; return `无尽夜 · 第 ${S.endlessLayer} 层`; }
function dutyLead() { if (S.commission) return S.commission.pair[(S.layer - 1) % 2]; if (S.story) return S.stageIdx <= 1 ? "sword" : "cup"; return pick(SUIT_KEYS); }

async function onLayerClear() {
  S.paused = true; cv.classList.remove("crisis"); sfx.win();
  const reward = 15 + S.layer * 5 + S.ascendThisLayer * 3; S.dust += reward;
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
    <div class="m-text">星屑报酬 <span class="kw">+${15 + S.layer * 5 + S.ascendThisLayer * 3} ✦</span></div>
    ${lawHtml}
    <button class="m-btn" id="mNext">${isStory ? "继续 →" : "深入下一层 →"}</button>
    <button class="m-btn minor" id="mHome">回标题</button>`);
  const go = () => { closeModal(); if (isStory) { S.stageIdx++; runStage(); } else { S.endlessLayer++; S.layer++; S.goal = endlessGoal(S.endlessLayer); S.curTip = "缝满整片裂隙,刷新最深记录"; startLayer(); } };
  $("modal").querySelectorAll(".pick-card").forEach(card => card.onclick = () => { const l = LAW_MAP[card.dataset.law]; S.laws.push(l); toast(`习得法则「${l.name}」`); go(); });
  $("mNext").onclick = go;
  $("mHome").onclick = () => { closeModal(); backToTitle(); };
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
    $("mRev").onclick = () => { closeModal(); say(su, "rescue", true); for (let r = 0; r <= 3; r++) for (let c = 0; c < GW; c++) S.grid[idx(r, c)] = 0; S.overloadT = 0; S.paused = false; };
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
    modal(`<h2>选择委托</h2><div class="m-sub">驻场双主的花色星沙坠落更频繁</div>` +
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
  modal(`<h2>玩法图鉴</h2><div class="m-sub">同色星沙连成一片即可点散 · 花色 = 男主</div>
    <table class="codex-table">
      <tr><td class="cx-tier">星沙坠落</td><td class="cx-desc">裂隙把男主星魂磨成沙,逐格下落堆积</td></tr>
      <tr><td class="cx-tier">点散溃散</td><td class="cx-desc">同色连通 ≥ ${CLEAR_MIN} 粒,点它 → 溃成星光缝合裂隙</td></tr>
      <tr><td class="cx-tier">消不停</td><td class="cx-desc">点散后上方塌落、再连成片,连着点 = 连击,缝合翻倍</td></tr>
      <tr><td class="cx-tier">大片溃散</td><td class="cx-desc">一次 ≥ ${BIG_CLEAR} 粒 = 唤回他一整段记忆(大额缝合)</td></tr>
      <tr><td class="cx-tier">过载</td><td class="cx-desc">星沙漫过顶部警戒线 → 驻场男主托住救场</td></tr>
    </table>
    <p class="m-text" style="font-size:12.5px">· <span class="kw">同色才消</span>,颜色不同合不到一块儿<br>· 命运之轮每层一次:同辉归一 / 净空 / 无视之眼<br>· 过层选「星象法则」改写规则(roguelike)</p>
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
    if (S.eyeNext && !S.paused) { /* 无视之眼:任意连通(无视色) */
      const rect = cv.getBoundingClientRect(); const c = Math.floor((e.clientX - rect.left) / (rect.width / GW)), r = Math.floor((e.clientY - rect.top) / (rect.height / GH));
      if (r >= 0 && r < GH && c >= 0 && c < GW && S.grid[idx(r, c)]) { S.eyeNext = false; cv.classList.remove("crisis"); doClearAny(r, c); return; }
    }
    onCanvasClick(e);
  });
  addEventListener("resize", () => { if ($("app").style.display !== "none") layoutCanvas(); });
  /* 不手动按可见性暂停:dt 已 clamp 100ms,切后台回来不会暴涨;手动暂停在 iframe/后台易误锁死 */
}
/* 无视之眼:无视颜色 flood */
function doClearAny(r0, c0) {
  const g = S.grid, seen = new Set([idx(r0, c0)]), stack = [[r0, c0]], out = [[r0, c0]];
  while (stack.length) { const [r, c] = stack.pop(); for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) { const nr = r + dr, nc = c + dc; if (nr < 0 || nr >= GH || nc < 0 || nc >= GW) continue; const k = idx(nr, nc); if (g[k] && !seen.has(k)) { seen.add(k); stack.push([nr, nc]); out.push([nr, nc]); } } }
  if (out.length >= 3) doClear(out, IDX_SUIT[g[idx(r0, c0)]]);
}

/* ===================== 启动 ===================== */
layoutCanvas(); bindUI(); showTitle();
