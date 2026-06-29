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
  wand: { name: "江驰野", glyph: "#glyph-wand", color: "#ff4d2e", portrait: "../assets/characters/sand/wand-portrait.jpg", cutin: "../assets/characters/sand/wand-cutin.jpg",
    lines: { start: ["今天的沙,看着就欠烧。", "跟上我的节奏,别眨眼。"], clear: ["散得漂亮!", "就是这一片!"], chain: ["连着来,别停!", "这股势头我喜欢!"], big: ["满屏都烧亮了——这才像话!", "看见没,你把我点燃了。"], low: ["沙要漫上来了——稳住。", "越挤越要沉住气。"], rescue: ["谁准你放弃的?手给我。", "塌不了,有我。"], win: ["赢了!刚才那下是不是很帅?", "干脆利落。"] } },
  coin: { name: "沈寂", glyph: "#glyph-coin", color: "#ffd21f", portrait: "../assets/characters/sand/coin-portrait.jpg", cutin: "../assets/characters/sand/coin-cutin.jpg",
    lines: { start: ["按计划进行,很好。", "每一粒沙都别浪费。"], clear: ["入账。", "稳,继续。"], chain: ["连锁收益,可观。", "复利的美。"], big: ["这一片,值一整座城的安眠。", "收益超预期。"], low: ["余量告急,冷静核算。", "越到最后越别乱。"], rescue: ["亏损止得住,手伸出来。", "追加预算,别浪费。"], win: ["结算完成,超预期。", "记进年报。"] } },
  sword: { name: "叶渊", glyph: "#glyph-sword", color: "#15d683", portrait: "../assets/characters/sand/sword-portrait.jpg", cutin: "../assets/characters/sand/sword-cutin.jpg",
    lines: { start: ["情报核对完毕,开始吧。", "别紧张,照我说的做。"], clear: ["最优解。", "我就说你会倒这儿。"], chain: ["连起来了,你总比我预测的好。", "漂亮,这步我没算到。"], big: ["整片溃散——教科书级别。", "我就说你做得到。"], low: ["空间告急,我替你算。", "收线,信你的直觉。"], rescue: ["想都别想输,抓紧我。", "预案启动,够你翻盘。"], win: ["完美收束,误差为零。", "看吧。"] } },
  cup: { name: "宋以衡", glyph: "#glyph-cup", color: "#4a7bff", portrait: "../assets/characters/sand/cup-portrait.jpg", cutin: "../assets/characters/sand/cup-cutin.jpg",
    lines: { start: ["别紧张,我陪你。", "今晚的星沙,很适合你。"], clear: ["唤回来一点了……", "很温柔,也很正确。"], chain: ["星光都在偏爱你。", "这个节奏,很舒服。"], big: ["你看,他的星河……整片亮起来了。", "一整片,都被你唤回来了。"], low: ["深呼吸,我陪你。", "你已经很好了。"], rescue: ["我在,手给我。", "靠着我,慢慢来。"], win: ["辛苦了……今天也想被你夸夸。", "回去喝杯热的。"] } },
};
const SYS = { name: "AI 灵宝", glyph: "#glyph-octa", color: "#d8b46a" };
const POWER_NAME = { wand: "驰焰贯通", coin: "沈压固守", sword: "罡风归拢", cup: "潮汐冲刷" };   /* P1 四男主星力名(换男主=换破局方式) */

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

/* P1 记忆养成:大片溃散"唤回"累计 → 羁绊 Lv1-5 解锁记忆(跨局存档) */
const BOND_LEVELS = [1, 3, 6, 10, 15];
const MEMORIES = {
  wand: ["裂隙第一次平息时,他没急着走,而是看了你很久。", "「跟上我」——可他每次都悄悄放慢半步。", "他说怕火,其实是怕你被烫到。", "年报最后一页,夹着你溃散的第一片星沙。", "他第一次说『我们』的时候,自己愣了一下。"],
  coin: ["他把你的名字,记在账本最贵重的那一栏。", "「都算好了」——除了心跳乱了节拍。", "他存下的不是星砂,是和你的每一夜。", "沉默是他的铠甲,你是唯一的缝隙。", "他算过最不划算的一笔:为你,值得。"],
  sword: ["他算过一百种结局,每一种里都有你。", "情报写满你的习惯,他说这叫职业病。", "「别紧张」,说这话时他自己屏着呼吸。", "最优解从来不是赢,是你还在身边。", "他唯一没算到的变量,是自己的心。"],
  cup: ["他温柔地接住你每一次失误。", "「今晚星光很好」,其实他在看你。", "他的手心在出汗,却还说别怕。", "你溃散的星,他都偷偷许了同一个愿。", "他说陪你走完,没说的是——想一直走下去。"],
};
/* P1 今夜星河·偏色共鸣(对标缀星世界牌四元素 docs/17):一局溃散各色占比 → 偏色潮/星河长明/四相圆满 */
const ELEMENTS = {
  wand: { el: "火", tide: "炎之潮", lead: "江驰野" },
  coin: { el: "土", tide: "磐之潮", lead: "沈寂" },
  sword: { el: "风", tide: "罡之潮", lead: "叶渊" },
  cup: { el: "水", tide: "汐之潮", lead: "宋以衡" },
};
const ELEM_T1 = 0.5, ELEM_T2 = 0.8, ELEM_T3 = 0.98;   /* 偏色占比阈值:潮/长明/纯 */
const BAL_LO = 0.18, BAL_HI = 0.32;                    /* 四相均衡区间 */

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
const GW = 264, GH = 372;      /* ~9.8 万粒细沙(分辨率×3:沙粒尺寸 1/3,流体更细腻) */
const CLEAR_MIN = 144;         /* (保留)横贯消除不用数量门槛,仅供旧引用 */
const BIG_CLEAR = 2300;        /* 大片横贯("点亮"):一次溃散 ≥ 此粒数 = 唤回整段记忆(随面积×9) */
const PHYS_MS = 15;            /* 物理步长(短=流动顺) */
const SUBSTEP = 2;             /* 每次物理跑几遍(流体更顺) */
const GRAVITY = 0.45;          /* 下落重力加速度(每物理步速度增量,由慢到快) */
const MAX_FALL = 3;            /* 下落速度上限(格/步,防瞬移失真;真机调这两个平衡手感) */
const FRICTION = 0.72;         /* 削坡只在 fric<此值的格发生(其余保留 45° 局部) */
const STICK = 0.88;            /* 静摩擦:fric>此值的格沙完全卡住(斜下空也不滑)→凸起,表面起伏不规整(位置固定→收敛静止) */
const POUR_MS = 0.5;           /* 倾倒滴速(分辨率高粒多→加快维持倒沙时长) */
const POUR_BATCH = 32;         /* 每次 pourTick 单团最多倒几粒(随分辨率提高) */
const BLOB_MIN = 620, BLOB_MAX = 1000;   /* 一团沙的粒数(随面积×9) */
const POUR_W = 21;             /* 倒沙散布半宽(随分辨率×3) */
const CLEAR_SCAN_MS = 100;     /* 自动溃散扫描间隔 */
const COMBO_WIN = 2200;
const WARN_ROW = 72;           /* 警戒线行(随分辨率×3) */
const OVERLOAD_MS = 3200;
const POWER_MAX = 100, POWER_PER_BURST = 16, POWER_PER_COMBO = 6;   /* P1 男主星力槽:溃散/连锁充能 */
const endlessGoal = (n) => Math.round((120 * Math.pow(1.3, n - 1)) / 5) * 5;

/* ===================== 状态 ===================== */
const S = {
  mode: "story", stageIdx: 0, endlessLayer: 1,
  grid: new Uint8Array(GW * GH), shade: new Float32Array(GW * GH), fall: new Float32Array(GW * GH), fric: new Float32Array(GW * GH),
  seam: 0, goal: 120, layer: 1,
  laws: [], commission: null, wheelUses: 1,
  running: false, paused: true, guided: false, story: false,
  combo: 0, comboT: 0, overloadT: 0, ascendThisLayer: 0, rescues: 1,
  seamTotal: 0, maxCombo: 0, litLeads: {}, dust: 0, curTip: "",
  curBlob: null, nextBlobs: [], pourQueue: [], clearAcc: 0, eyeNext: false,
  nearGroups: [], nearWarn: false, pourFx: null, burstFx: [], aimCol: -1,   /* P0 爽点引擎:预警光带 / 倒沙光束 / 溃散星尘 / 落点预览 */
  power: 0, busy: false, duty: null,   /* P1 男主星力 */
  elemCount: null, bonds: load("xs_bonds", null), ach: load("xs_ach", null), moonlight: load("xs_moon", 0),   /* P1 偏色共鸣 + 记忆养成 */
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
function flash(red) { let f = document.querySelector(".screen-flash"); if (!f) { f = document.createElement("div"); f.className = "screen-flash"; document.body.appendChild(f); } f.classList.toggle("red", !!red); f.classList.remove("go"); void f.offsetWidth; f.classList.add("go"); }
function flyScore(x, y, txt, size = 18) { const e = document.createElement("div"); e.className = "fly-score"; e.textContent = txt; e.style.cssText = `left:${x}px;top:${y}px;font-size:${size}px;transform:translateX(-50%)`; document.body.appendChild(e); setTimeout(() => e.remove(), 880); }
function portraitOf(suit) { return (LEADS[suit] || LEADS.sword).portrait || LEADS.sword.portrait; }
function setImgSrc(img, src) { if (img && src && !img.src.endsWith(src.replace("../", ""))) img.src = src; }
function setLeadPortrait(suit) { setImgSrc($("leadPortrait"), portraitOf(suit)); }
function preloadCharacterAssets() {
  Object.values(LEADS).forEach((lead) => [lead.portrait, lead.cutin].forEach((src) => { if (src) { const img = new Image(); img.src = src; } }));
}

let lastSay = 0;
function say(suit, kind, force = false) {
  const l = LEADS[suit]; if (!l) return;
  const now = performance.now(); if (!force && now - lastSay < 3800) return; lastSay = now;
  $("leadGlyph").setAttribute("href", l.glyph); $("leadAvatar").style.color = l.color; $("lbName").textContent = l.name;
  setLeadPortrait(suit);
  syncCharacter(suit, true);
  const t = $("lbText"); t.textContent = pick(l.lines[kind] || ["…"]); t.classList.remove("pop"); void t.offsetWidth; t.classList.add("pop");
  const a = $("leadAvatar"); a.classList.remove("flash"); void a.offsetWidth; a.classList.add("flash");
}
function setLeadBar(suit) {
  const l = LEADS[suit] || LEADS.sword;
  $("leadGlyph").setAttribute("href", l.glyph); $("leadAvatar").style.color = l.color; $("lbName").textContent = l.name; $("lbText").textContent = pick(l.lines.start);
  setLeadPortrait(suit); syncCharacter(suit, false);
}
function syncCharacter(suit, pop = false) {
  const L = LEADS[suit] || LEADS.sword;
  const c = $("characterCameo");
  if (!c) return;
  c.style.color = L.color;
  c.style.setProperty("--lead-color", L.color);
  setImgSrc(c.querySelector(".character-cameo__portrait img"), portraitOf(suit));
  const use = c.querySelector(".cameo-suit use");
  if (use) use.setAttribute("href", L.glyph || "#glyph-octa");
  if (pop) { c.classList.remove("speak"); void c.offsetWidth; c.classList.add("speak"); }
}

function runDialogue(seq) {
  return new Promise((resolve) => {
    const layer = $("dlgLayer"); let i = 0, typing = false, timer = null; S.paused = true;
    function show() {
      const [who, text] = seq[i]; const w = who === "sys" ? SYS : LEADS[who];
      $("dlgAvatar").classList.toggle("is-sys", who === "sys");
      if (who !== "sys") setImgSrc(document.querySelector(".dlg-portrait"), portraitOf(who));
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
  zone.style.setProperty("--canvas-left", cv.offsetLeft + "px");
  zone.style.setProperty("--canvas-top", cv.offsetTop + "px");
  zone.style.setProperty("--warn-y", (WARN_ROW * (cssH / GH)) + "px");
  /* 手中沙团跟随 canvas 顶部:落在红线(WARN_ROW)正上方 */
  const bd = $("blobDock");
  if (bd) bd.style.top = (cv.offsetTop + WARN_ROW * (cssH / GH) - 44) + "px";
}

/* ===================== 沙子物理(流体元胞自动机) ===================== */
function physicsStep() {
  const g = S.grid, fall = S.fall, fric = S.fric;
  for (let r = GH - 2; r >= 0; r--) {
    const lr = Math.random() < 0.5;
    for (let i = 0; i < GW; i++) {
      const c = lr ? i : GW - 1 - i;
      const k = idx(r, c), v = g[k]; if (!v) continue;
      if (g[k + GW] === 0) {   /* 正下方空:重力加速,本步下落 floor(速度) 格(≤MAX_FALL,遇阻即停) */
        const fl = Math.min(MAX_FALL, fall[k] + GRAVITY);
        const want = Math.max(1, Math.floor(fl));
        let nr = r;
        while (nr - r < want && nr + 1 < GH && g[idx(nr + 1, c)] === 0) nr++;
        const nk = idx(nr, c);
        g[nk] = v; fall[nk] = fl; g[k] = 0; fall[k] = 0; continue;   /* 速度随沙粒一起下移,持续加速 */
      }
      fall[k] = 0;   /* 落地/受阻 → 垂直速度清零(下次从静止重新加速) */
      if (fric[k] > STICK) continue;   /* 静摩擦:高摩擦格沙卡住不滑→凸起,打破"横平竖直"的规整坡面 */
      const dir = Math.random() < 0.5 ? 1 : -1;
      let moved = false;
      /* 近斜下滑(45° 基础流动) */
      for (const d of [dir, -dir]) { const nc = c + d; if (nc >= 0 && nc < GW && g[idx(r + 1, nc)] === 0) { g[idx(r + 1, nc)] = v; fall[idx(r + 1, nc)] = 0; g[k] = 0; moved = true; break; } }
      /* 横向填坑:旁边空且其正下也空 → 流过去找平 */
      if (!moved) for (const d of [dir, -dir]) { const nc = c + d; if (nc >= 0 && nc < GW && g[idx(r, nc)] === 0 && g[idx(r + 1, nc)] === 0) { g[idx(r, nc)] = v; fall[idx(r, nc)] = 0; g[k] = 0; moved = true; break; } }
      /* 远斜下滑(削陡坡留缓坡):隔一格低≥2 的位置可达 → 滑过去,休止角 45°→~27°,坡缓到隔格不再低≥2 即停(收敛静止) */
      if (!moved && fric[k] < FRICTION) for (const d of [dir, -dir]) { const nc2 = c + 2 * d; if (nc2 >= 0 && nc2 < GW && g[idx(r + 1, nc2)] === 0 && g[idx(r, nc2)] === 0) { g[idx(r + 1, nc2)] = v; fall[idx(r + 1, nc2)] = 0; g[k] = 0; moved = true; break; } }
    }
  }
}

/* 投放:点击列 → 排入倾倒队列(从该列附近顶部持续滴沙) */
function pourAt(col) {
  if (S.paused || !S.running || !S.curBlob) return;
  S.pourFx = { col, suit: S.curBlob.suit, t: performance.now() };   /* P0 倒沙光束反馈 */
  S.pourQueue.push({ col, suit: S.curBlob.suit, remaining: S.curBlob.n, acc: 0 });
  S.curBlob = S.nextBlobs.shift(); ensureBlobs(); renderBlobUI(); sfx.pour();
}
function pourTick(dt) {
  for (let i = S.pourQueue.length - 1; i >= 0; i--) {
    const p = S.pourQueue[i]; p.acc += dt;
    let safety = 0, miss = 0;
    while (p.acc >= POUR_MS && p.remaining > 0 && safety++ < POUR_BATCH) {
      p.acc -= POUR_MS;
      /* 三角分布(中间密两边疏)+ 顶部随机几行撒落 → 自然不规整的瀑布,非整齐方块 */
      const spread = (Math.random() + Math.random() - 1) * POUR_W;
      const c = Math.round(p.col + spread), rr = Math.floor(Math.random() * 5);
      if (c >= 0 && c < GW && S.grid[idx(rr, c)] === 0) {
        S.grid[idx(rr, c)] = p.suit; S.shade[idx(rr, c)] = 0.84 + Math.random() * 0.24; S.fall[idx(rr, c)] = 0; p.remaining--; miss = 0;
      } else if (++miss > 40) break;   /* 落点区持续堵 = 顶部满,本 tick 停(过载来源) */
    }
    if (p.remaining <= 0) S.pourQueue.splice(i, 1);
  }
}

/* ===================== 自动溃散扫描 ===================== */
function autoClearScan() {
  const g = S.grid, vis = new Uint8Array(GW * GH), groups = [], near = [];
  for (let r = 0; r < GH; r++) for (let c = 0; c < GW; c++) {
    const k = idx(r, c); if (!g[k] || vis[k]) continue;
    const suit = g[k], comp = [k], stack = [k]; vis[k] = 1;
    let touchL = false, touchR = false, minC = c, maxC = c;   /* 边界 + 横向跨度 */
    while (stack.length) {
      const cur = stack.pop(), cr = (cur / GW) | 0, cc = cur % GW;
      if (cc === 0) touchL = true; if (cc === GW - 1) touchR = true;
      if (cc < minC) minC = cc; if (cc > maxC) maxC = cc;
      if (cr + 1 < GH) { const nk = cur + GW; if (g[nk] === suit && !vis[nk]) { vis[nk] = 1; stack.push(nk); comp.push(nk); } }
      if (cr - 1 >= 0) { const nk = cur - GW; if (g[nk] === suit && !vis[nk]) { vis[nk] = 1; stack.push(nk); comp.push(nk); } }
      if (cc + 1 < GW) { const nk = cur + 1; if (g[nk] === suit && !vis[nk]) { vis[nk] = 1; stack.push(nk); comp.push(nk); } }
      if (cc - 1 >= 0) { const nk = cur - 1; if (g[nk] === suit && !vis[nk]) { vis[nk] = 1; stack.push(nk); comp.push(nk); } }
    }
    if (touchL && touchR) groups.push({ suit: IDX_SUIT[suit], comp });   /* 同色横贯左右 → 整片溃散;suit 转花色名(修:原传 idx 致台词/恋人法则/统计失效) */
    else { const span = (maxC - minC + 1) / GW; if (span >= 0.6 && comp.length >= 360) near.push({ suit, comp, span, touchL, touchR }); }   /* P0:逼近贯通的大片 → 预警光带(门槛随面积×9) */
  }
  /* P0 贯通过程反馈:最逼近的大片标成预警光带(render 读 S.nearGroups);≥85% 给一次"就差一线"提示 */
  near.sort((a, b) => b.span - a.span); S.nearGroups = near.slice(0, 3);
  if (!groups.length) {
    const hot = S.nearGroups[0];
    if (hot && hot.span >= 0.85) { if (!S.nearWarn) { S.nearWarn = true; banner("⚡ 就差一线 · 即将贯通"); } }
    else if (!hot || hot.span < 0.78) S.nearWarn = false;
    return;
  }
  S.nearGroups = []; S.nearWarn = false;   /* 溃散瞬间清预警 */
  S.combo = (S.comboT > 0 ? S.combo + 1 : 1); S.comboT = COMBO_WIN * (hasLaw("temperance") ? 1.5 : 1); S.maxCombo = Math.max(S.maxCombo, S.combo);
  let biggest = 0, bigSuit = null;
  for (const grp of groups) { burstClear(grp.suit, grp.comp); if (grp.comp.length > biggest) { biggest = grp.comp.length; bigSuit = grp.suit; } }
  const anyBig = groups.some(grp => grp.comp.length >= BIG_CLEAR);
  /* P0 连锁视听阶梯:×4+ 升级为"溃不停"大反馈 */
  if (anyBig) { flash(); banner("★ 星河溃散 ★"); sfx.big(); say(bigSuit, "big", true); if (S.story) leadInnerVoice(bigSuit); }
  else if (S.combo >= 4) { flash(); banner(`连锁 ×${S.combo} · 溃不停!`); say(bigSuit, "chain"); }
  else if (S.combo >= 2) { banner(`连锁 ×${S.combo}`); say(bigSuit, S.combo >= 3 ? "chain" : "clear"); }
  else say(bigSuit, "clear");
  S.power = Math.min(POWER_MAX, S.power + POWER_PER_BURST * groups.length + POWER_PER_COMBO * Math.max(0, S.combo - 1)); updatePowerUI();   /* P1 星力充能(溃散 + 连锁) */
  S.clearAcc = CLEAR_SCAN_MS - 24;   /* P0 连锁可控化:溃散后加速重扫,塌落连锁判定更跟手 */
  if (S.seam >= S.goal) onLayerClear();
}
function burstClear(suit, comp) {
  const size = comp.length, isBig = size >= BIG_CLEAR;
  let base = size * 0.022;      /* 横贯片很大(分辨率×3→面积×9),系数÷9 维持缝合尺度 */
  if (isBig) base += 30;
  if (hasLaw("sun")) base += 8;
  if (hasLaw("star") && isBig) base += 24;
  if (hasLaw("lovers") && suit === "cup") base *= 1.5;
  if (hasLaw("empress") && S.ascendThisLayer === 0) base *= 2;
  if (hasLaw("world")) base *= (1 + 0.05 * S.laws.length);
  if (S.commission && S.commission.pair.includes(suit)) base += size * 0.0133;
  const gain = Math.max(1, Math.round(base * (1 + 0.3 * (S.combo - 1) * (hasLaw("temperance") ? 1.4 : 1))));
  spawnBurstFx(suit, comp, isBig);
  let sr = 0, sc = 0; for (const k of comp) { sr += (k / GW) | 0; sc += k % GW; S.grid[k] = 0; }
  const rect = cv.getBoundingClientRect();
  flyScore(rect.left + (sc / size + 0.5) * (rect.width / GW), rect.top + (sr / size + 0.5) * (rect.height / GH), "+" + gain, isBig ? 26 : Math.min(15 + Math.floor(size / 6), 26));
  sfx.clear(size, S.combo);
  S.seam += gain; S.seamTotal += gain; S.ascendThisLayer++; S.litLeads[suit] = (S.litLeads[suit] || 0) + 1;
  if (S.elemCount) S.elemCount[suit] = (S.elemCount[suit] || 0) + size;   /* P1 偏色共鸣计数(粒数) */
  if (isBig) feedMemory(suit);   /* P1 大片溃散 = 唤回一段记忆 */
  updateHud();
}
function leadInnerVoice(suit) {
  const lines = { wand: "他嘴上不说,其实最怕你受伤。", coin: "他把你的名字,记在最重要那一页。", sword: "他算了一百种结局,每一种都有你。", cup: "他说『别紧张』时,自己手心也在出汗。" };
  setTimeout(() => toast("✦ 灵宝:" + lines[suit], 3000), 600);
}

/* ===================== 男主星力(P1:换男主 = 换破局方式) ===================== */
function updatePowerUI() {
  const av = $("leadAvatar"); if (av) av.classList.toggle("charged", S.power >= POWER_MAX && S.running && !S.paused);
  const bar = $("powerFill"); if (bar) bar.style.width = Math.min(100, S.power / POWER_MAX * 100) + "%";
}
async function onStarPower() {
  if (S.power < POWER_MAX || S.busy || !S.running || S.paused) return;
  S.busy = true; S.power = 0; updatePowerUI();
  const duty = S.duty || dutyLead();
  flash(); say(duty, "big", true);
  banner("✦ " + LEADS[duty].name + " · " + POWER_NAME[duty] + " ✦");
  if (duty === "wand") await powerJiangchiye();
  else if (duty === "coin") await powerShenji();
  else if (duty === "sword") await powerYeyuan();
  else await powerSongyiheng();
  S.clearAcc = CLEAR_SCAN_MS;   /* 星力后立即扫一次,溃散即时兑现 */
  S.busy = false; updatePowerUI();
}
/* 江驰野·驰焰贯通:选沙最满的一行烧成权杖整条 → 立即横贯溃散(暴力爆发) */
async function powerJiangchiye() {
  let bestR = GH - 2, bestN = -1;
  for (let r = GH - 1; r >= WARN_ROW; r--) { let n = 0; for (let c = 0; c < GW; c++) if (S.grid[idx(r, c)]) n++; if (n >= bestN) { bestN = n; bestR = r; } }
  for (let c = 0; c < GW; c++) { S.grid[idx(bestR, c)] = SUIT_IDX.wand; S.shade[idx(bestR, c)] = 1; }
  sfx.big(); await wait(160);
}
/* 叶渊·罡风归拢:把最逼近贯通的那片补全成整行贯通(精准,吃 P0 预警片) */
async function powerYeyuan() {
  const grp = S.nearGroups && S.nearGroups[0];
  let suit, row;
  if (grp) { suit = SUIT_IDX[grp.suit] || grp.suit; let sr = 0; for (const k of grp.comp) sr += (k / GW) | 0; row = Math.round(sr / grp.comp.length); }
  else {
    const cnt = [0, 0, 0, 0, 0]; for (let i = 0; i < S.grid.length; i++) cnt[S.grid[i]]++;
    suit = 1; for (let s = 2; s <= 4; s++) if (cnt[s] > cnt[suit]) suit = s;
    let bestR = GH - 2, bestN = -1; for (let r = GH - 1; r >= WARN_ROW; r--) { let n = 0; for (let c = 0; c < GW; c++) if (S.grid[idx(r, c)]) n++; if (n >= bestN) { bestN = n; bestR = r; } } row = bestR;
  }
  for (let c = 0; c < GW; c++) { S.grid[idx(row, c)] = suit; S.shade[idx(row, c)] = 1; }
  sfx.clear(GW, 2); await wait(160);
}
/* 沈寂·沈压固守:每列压实下沉到底,腾出顶部空间(防过载,稳健) */
async function powerShenji() {
  for (let c = 0; c < GW; c++) {
    const col = [], sh = [];
    for (let r = 0; r < GH; r++) { const k = idx(r, c); if (S.grid[k]) { col.push(S.grid[k]); sh.push(S.shade[k]); S.grid[k] = 0; } }
    for (let i = 0; i < col.length; i++) { const k = idx(GH - 1 - i, c); S.grid[k] = col[col.length - 1 - i]; S.shade[k] = sh[sh.length - 1 - i]; }
  }
  sfx.wheel(); await wait(160);
}
/* 宋以衡·潮汐冲刷:整盘沙横向冲刷重排,制造新连片机会(温柔容错) */
async function powerSongyiheng() {
  for (let pass = 0; pass < 3; pass++) for (let r = GH - 1; r >= 0; r--) for (let c = 0; c < GW; c++) {
    const k = idx(r, c); if (!S.grid[k]) continue;
    if (Math.random() < 0.5) { const nc = c + (Math.random() < 0.5 ? -1 : 1); if (nc >= 0 && nc < GW && !S.grid[idx(r, nc)]) { S.grid[idx(r, nc)] = S.grid[k]; S.shade[idx(r, nc)] = S.shade[k]; S.grid[k] = 0; } }
  }
  sfx.win(); await wait(160);
}

/* ===================== 偏色共鸣 + 记忆养成(P1) ===================== */
function ensureBonds() {
  if (!S.bonds || typeof S.bonds !== "object") S.bonds = {};
  for (const k of SUIT_KEYS) if (!S.bonds[k]) S.bonds[k] = { mem: 0, bond: 0 };
  if (!S.ach || typeof S.ach !== "object") S.ach = {};
}
function feedMemory(suit) {
  ensureBonds();
  const b = S.bonds[suit]; b.mem++;
  const lvl = BOND_LEVELS.filter(t => b.mem >= t).length;
  if (lvl > b.bond) { b.bond = lvl; S.moonlight = (S.moonlight || 0) + 5; save("xs_moon", S.moonlight); setTimeout(() => toast(`♡ ${LEADS[suit].name} · 羁绊 Lv${lvl} —— 唤回一段记忆(星轨手账可看)`, 3400), 1100); }
  save("xs_bonds", S.bonds);
}
function updateElemBar() {
  if (!S.elemCount) return;
  const total = SUIT_KEYS.reduce((s, k) => s + (S.elemCount[k] || 0), 0) || 1;
  let top = SUIT_KEYS[0];
  for (const k of SUIT_KEYS) {
    const seg = document.querySelector(`.elem-seg[data-s="${k}"]`);
    if (seg) { seg.style.flexGrow = String(S.elemCount[k] || 0); seg.style.opacity = S.elemCount[k] ? "1" : "0.12"; }
    if ((S.elemCount[k] || 0) > (S.elemCount[top] || 0)) top = k;
  }
  const lbl = $("elemLabel");
  if (lbl) { const r = Math.round((S.elemCount[top] || 0) / total * 100); lbl.textContent = S.elemCount[top] ? "星河 " + ELEMENTS[top].el + " " + r + "%" : "星河 —"; lbl.style.color = SUITS[top].color; }
}
/* 今夜星河结算:一局溃散偏色 → 潮/长明/纯/四相圆满 + 加深联结 */
function settleTide() {
  ensureBonds();
  const ec = S.elemCount || { wand: 0, coin: 0, sword: 0, cup: 0 };
  const total = SUIT_KEYS.reduce((s, k) => s + (ec[k] || 0), 0);
  const out = { top: null, ratio: 0, lines: [], dust: 0, moon: 0, achNew: [] };
  if (total <= 0) return out;
  const ratios = {}; SUIT_KEYS.forEach(k => ratios[k] = (ec[k] || 0) / total);
  const top = SUIT_KEYS.reduce((a, b) => (ec[b] || 0) > (ec[a] || 0) ? b : a, SUIT_KEYS[0]);
  out.top = top; out.ratio = ratios[top];
  const balanced = SUIT_KEYS.every(k => ratios[k] >= BAL_LO && ratios[k] <= BAL_HI);
  if (balanced) {
    out.lines.push("✦ 四相星河 · 圆满 ✦"); out.moon += 20;
    SUIT_KEYS.forEach(k => S.bonds[k].mem += 1);
    if (!S.ach.world) out.achNew.push("四相星河·圆满"); S.ach.world = (S.ach.world || 0) + 1;
  } else {
    const r = ratios[top], w = 0.02;
    if (r >= ELEM_T1 - w) { out.lines.push("✦ " + ELEMENTS[top].tide + " · 今夜唤回" + ELEMENTS[top].lead + "的星河"); out.dust += 24; S.bonds[top].mem += 1; }
    if (r >= ELEM_T2 - w) { const a = "el80_" + top; out.lines.push("★ " + ELEMENTS[top].lead + "的星河长明 · 成就"); out.moon += 15; if (!S.ach[a]) out.achNew.push(ELEMENTS[top].lead + "星河长明"); S.ach[a] = (S.ach[a] || 0) + 1; }
    if (r >= ELEM_T3 - w) { const a = "el100_" + top; out.lines.push("☆ 纯" + ELEMENTS[top].el + " · 极致专精!"); out.moon += 30; if (!S.ach[a]) out.achNew.push("纯" + ELEMENTS[top].el); S.ach[a] = (S.ach[a] || 0) + 1; }
  }
  SUIT_KEYS.forEach(k => { const b = S.bonds[k], lvl = BOND_LEVELS.filter(t => b.mem >= t).length; if (lvl > b.bond) b.bond = lvl; });
  S.dust += out.dust; S.moonlight = (S.moonlight || 0) + out.moon;
  save("xs_bonds", S.bonds); save("xs_ach", S.ach); save("xs_moon", S.moonlight);
  return out;
}
function showMemoryAlbum() {
  ensureBonds();
  let html = `<h2>星轨手账</h2><div class="m-sub">溃散他的星沙 · 唤回他的记忆 · 月辉 ${S.moonlight || 0} ☾</div>`;
  for (const k of SUIT_KEYS) {
    const b = S.bonds[k], L = LEADS[k], next = BOND_LEVELS.find(t => b.mem < t);
    html += `<div class="bond-card" style="border-color:${SUITS[k].color}66">
      <div class="bond-head"><div class="bond-ava" style="color:${L.color};border-color:${L.color}88"><svg viewBox="0 0 48 48" fill="none"><use href="${L.glyph}"/></svg></div>
        <div><div class="bond-name" style="color:${L.color}">${L.name}</div><div class="bond-lv">羁绊 Lv${b.bond}${next ? " · 唤回 " + b.mem + "/" + next : " · ✦ 圆满"}</div></div></div>
      <div class="bond-mems">` +
      MEMORIES[k].map((m, i) => `<div class="bond-mem ${i < b.bond ? "lit" : ""}">${i < b.bond ? "✦ " + m : "✧ ???（Lv" + (i + 1) + " 解锁）"}</div>`).join("") +
      `</div></div>`;
  }
  html += `<button class="m-btn" id="mClose">合上手账</button>`;
  modal(html);
  $("mClose").onclick = () => { if ($("app").style.display === "none") backToTitle(); else closeModal(); };
}

/* ===================== 渲染:鎏金星沙(星盘底 + 丝绸沙面 + 星尘溃散) ===================== */
const BRIGHT = {}, GLOW = {}, RGB = {}, SOFT_RGB = {};
const SUIT_MARK = { 1: "♣", 2: "◇", 3: "♡", 4: "♠" };
const SPARKLE_SEEDS = Array.from({ length: 280 }, (_, i) => ({
  c: (i * 73 + 29) % GW,
  r: (i * 149 + 47) % GH,
  p: (i * 0.618) % 6.283,
  z: 0.55 + ((i * 37) % 100) / 100
}));
const ASTRAL_SEEDS = Array.from({ length: 120 }, (_, i) => ({
  x: ((i * 83 + 17) % 997) / 997,
  y: ((i * 151 + 61) % 991) / 991,
  r: 0.45 + ((i * 29) % 100) / 85,
  p: (i * 0.754) % 6.283
}));
function initColors() {
  for (const k of SUIT_KEYS) {
    const [r, g, b] = SUITS[k].rgb;
    BRIGHT[SUIT_IDX[k]] = `rgb(${Math.min(255, r + 62)},${Math.min(255, g + 62)},${Math.min(255, b + 62)})`;
    GLOW[SUIT_IDX[k]] = `rgb(${r},${g},${b})`;
    RGB[SUIT_IDX[k]] = [r, g, b];
    SOFT_RGB[SUIT_IDX[k]] = [Math.min(255, r + 34), Math.min(255, g + 34), Math.min(255, b + 34)];
  }
}
let bloomCv = null, sheenCv = null, sandBuf = null, sandBufCx = null, sandImg = null;
function rgbaOf(suit, a, soft = false) {
  const rgb = (soft ? SOFT_RGB : RGB)[suit] || [255, 240, 168];
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
}
function drawDiamondStar(ctx, x, y, r, a = 1) {
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.beginPath();
  ctx.moveTo(x, y - r * 1.8);
  ctx.lineTo(x + r * 0.42, y - r * 0.42);
  ctx.lineTo(x + r * 1.8, y);
  ctx.lineTo(x + r * 0.42, y + r * 0.42);
  ctx.lineTo(x, y + r * 1.8);
  ctx.lineTo(x - r * 0.42, y + r * 0.42);
  ctx.lineTo(x - r * 1.8, y);
  ctx.lineTo(x - r * 0.42, y - r * 0.42);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
function drawCompassRose(ctx, x, y, r, a = 1) {
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.beginPath();
  for (let i = 0; i < 16; i++) {
    const ang = -Math.PI / 2 + i * Math.PI / 8;
    const rr = i % 2 === 0 ? r : r * 0.36;
    const px = x + Math.cos(ang) * rr;
    const py = y + Math.sin(ang) * rr;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, r * 0.34, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}
function drawBoardBackdrop(t) {
  const w = cv.width, h = cv.height;
  const bg = cx.createRadialGradient(w * 0.5, h * 0.62, h * 0.06, w * 0.5, h * 0.54, h * 0.74);
  bg.addColorStop(0, "#17214f");
  bg.addColorStop(0.48, "#0c1434");
  bg.addColorStop(1, "#060817");
  cx.fillStyle = bg;
  cx.fillRect(0, 0, w, h);

  cx.save();
  cx.globalCompositeOperation = "lighter";
  cx.globalAlpha = 0.34;
  const aurora = cx.createLinearGradient(0, h * 0.2, w, h * 0.82);
  aurora.addColorStop(0, "rgba(255,77,46,0.1)");
  aurora.addColorStop(0.42, "rgba(255,210,31,0.13)");
  aurora.addColorStop(0.68, "rgba(21,214,131,0.1)");
  aurora.addColorStop(1, "rgba(74,123,255,0.12)");
  cx.fillStyle = aurora;
  cx.fillRect(0, 0, w, h);
  cx.restore();

  cx.save();
  cx.strokeStyle = "rgba(255,229,141,0.18)";
  cx.lineWidth = Math.max(0.65, dpr * 0.55);
  const cx0 = w * 0.5, cy0 = h * 0.34;
  for (let i = 0; i < 7; i++) {
    const rr = h * (0.18 + i * 0.095);
    cx.beginPath();
    cx.ellipse(cx0, cy0, rr * 1.18, rr * 0.72, -0.28, 0, Math.PI * 2);
    cx.stroke();
  }
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2 + t * 0.00003;
    cx.beginPath();
    cx.moveTo(cx0, cy0);
    cx.lineTo(cx0 + Math.cos(a) * w * 0.82, cy0 + Math.sin(a) * h * 0.64);
    cx.stroke();
  }
  cx.restore();

  cx.save();
  cx.globalCompositeOperation = "lighter";
  for (const s of ASTRAL_SEEDS) {
    const pulse = 0.18 + 0.34 * Math.abs(Math.sin(t * 0.0012 + s.p));
    cx.fillStyle = `rgba(255,238,164,${pulse})`;
    drawDiamondStar(cx, s.x * w, s.y * h, s.r * dpr, pulse);
  }
  cx.restore();
}
function drawBoardOrnaments(t) {
  const w = cv.width, h = cv.height;
  cx.save();
  cx.globalCompositeOperation = "lighter";
  cx.strokeStyle = "rgba(255,232,148,0.68)";
  cx.lineWidth = Math.max(1, dpr * 0.95);
  const m = Math.max(13 * dpr, w * 0.027), len = Math.max(42 * dpr, w * 0.12);
  for (const sx of [m, w - m]) for (const sy of [m, h - m]) {
    const dx = sx < w / 2 ? 1 : -1, dy = sy < h / 2 ? 1 : -1;
    cx.beginPath();
    cx.moveTo(sx, sy + dy * len);
    cx.quadraticCurveTo(sx, sy, sx + dx * len, sy);
    cx.stroke();
    cx.fillStyle = "rgba(255,240,168,0.85)";
    drawDiamondStar(cx, sx + dx * (len + 8 * dpr), sy, 2.6 * dpr, 0.82);
  }
  cx.strokeStyle = "rgba(255,232,148,0.32)";
  cx.lineWidth = Math.max(0.8, dpr * 0.6);
  cx.beginPath();
  cx.ellipse(w * 0.5, h * 0.97, w * 0.27, h * 0.08, 0, Math.PI, Math.PI * 2);
  cx.stroke();
  cx.strokeStyle = "rgba(255,240,168,0.42)";
  drawCompassRose(cx, w * 0.5, h * 0.985, Math.min(w, h) * 0.08, 0.45);
  for (let side = -1; side <= 1; side += 2) {
    cx.strokeStyle = `rgba(255,255,245,${0.18 + 0.06 * Math.sin(t * 0.0015 + side)})`;
    cx.lineWidth = Math.max(0.8, dpr * 0.55);
    for (let i = 0; i < 5; i++) {
      const x0 = side < 0 ? -w * 0.04 : w * 1.04;
      const y0 = h * (0.58 + i * 0.075);
      cx.beginPath();
      cx.moveTo(x0, y0);
      cx.bezierCurveTo(w * (side < 0 ? 0.08 : 0.92), y0 - h * 0.035, w * (side < 0 ? 0.12 : 0.88), y0 + h * 0.04, w * (side < 0 ? 0.24 : 0.76), y0 + h * 0.005);
      cx.stroke();
    }
  }
  cx.restore();
}
function paintSandBuffer(t) {
  if (!sandBuf) {
    sandBuf = document.createElement("canvas");
    sandBuf.width = GW; sandBuf.height = GH;
    sandBufCx = sandBuf.getContext("2d");
    sandImg = sandBufCx.createImageData(GW, GH);
  }
  const g = S.grid, data = sandImg.data;
  const shimmerTick = (t * 0.018) | 0;
  for (let i = 0; i < g.length; i++) {
    const v = g[i], o = i * 4;
    if (!v) { data[o + 3] = 0; continue; }
    const rgb = RGB[v], sh = S.shade[i] || 1;
    const falling = S.fall[i] > 0.35;
    const grain = (((i * 37) ^ (i >> 5) ^ (i * 17)) & 31) / 31;
    const sparkle = (!falling && ((i * 13 + shimmerTick) % 173) === 0) ? 0.34 : 0;
    const lift = falling ? (0.42 + sh * 0.12 + grain * 0.08) : (0.62 + sh * 0.22 + grain * 0.13 + sparkle);
    data[o] = Math.min(255, rgb[0] * lift + 16 + sparkle * 72);
    data[o + 1] = Math.min(255, rgb[1] * lift + 14 + sparkle * 60);
    data[o + 2] = Math.min(255, rgb[2] * lift + 17 + sparkle * 48);
    data[o + 3] = falling ? (88 + Math.floor(grain * 34)) : (238 + Math.floor(grain * 17));
  }
  sandBufCx.putImageData(sandImg, 0, 0);
}
function drawSandBloom() {
  try {
    if (!bloomCv) bloomCv = document.createElement("canvas");
    if (bloomCv.width !== cv.width || bloomCv.height !== cv.height) { bloomCv.width = cv.width; bloomCv.height = cv.height; }
    const bx = bloomCv.getContext("2d");
    bx.clearRect(0, 0, cv.width, cv.height);
    bx.imageSmoothingEnabled = true;
    bx.drawImage(sandBuf, 0, 0, cv.width, cv.height);
    cx.save();
    cx.globalCompositeOperation = "lighter";
    cx.globalAlpha = 0.34;
    cx.filter = `blur(${Math.max(5, cellPx * 2.8).toFixed(1)}px)`;
    cx.drawImage(bloomCv, 0, 0);
    cx.globalAlpha = 0.11;
    cx.filter = `blur(${Math.max(14, cellPx * 6).toFixed(1)}px)`;
    cx.drawImage(bloomCv, 0, 0);
    cx.filter = "none";
    cx.restore();
  } catch (e) {}
}
function drawSandSheen(t) {
  try {
    if (!sheenCv) sheenCv = document.createElement("canvas");
    if (sheenCv.width !== cv.width || sheenCv.height !== cv.height) { sheenCv.width = cv.width; sheenCv.height = cv.height; }
    const sx = sheenCv.getContext("2d");
    sx.clearRect(0, 0, cv.width, cv.height);
    sx.imageSmoothingEnabled = true;
    sx.drawImage(sandBuf, 0, 0, cv.width, cv.height);
    sx.globalCompositeOperation = "source-in";
    const grad = sx.createLinearGradient(0, cv.height * 0.54, cv.width, cv.height);
    grad.addColorStop(0, "rgba(255,92,40,0.34)");
    grad.addColorStop(0.22, "rgba(255,226,63,0.36)");
    grad.addColorStop(0.48, "rgba(255,238,170,0.2)");
    grad.addColorStop(0.67, "rgba(52,255,200,0.34)");
    grad.addColorStop(1, "rgba(96,145,255,0.34)");
    sx.fillStyle = grad;
    sx.fillRect(0, 0, cv.width, cv.height);
    sx.globalCompositeOperation = "source-over";
    cx.save();
    cx.globalCompositeOperation = "screen";
    cx.globalAlpha = 0.32;
    cx.drawImage(sheenCv, 0, 0);
    cx.restore();
  } catch (e) {}
}
function collectSurface() {
  const tops = [];
  const g = S.grid;
  for (let c = 0; c < GW; c += 2) {
    for (let r = 0; r < GH; r++) {
      const v = g[idx(r, c)];
      if (v && hasDenseSand(g, r, c, 6)) { tops.push({ c, r, v }); break; }
    }
  }
  return tops;
}
function hasDenseSand(g, r, c, min = 5) {
  let n = 0;
  for (let dr = 0; dr <= 16; dr += 2) {
    const rr = r + dr;
    if (rr >= GH) break;
    for (let dc = -2; dc <= 2; dc += 2) {
      const cc = c + dc;
      if (cc >= 0 && cc < GW && g[idx(rr, cc)]) n++;
      if (n >= min) return true;
    }
  }
  return false;
}
function drawSurfaceGlow(t) {
  const tops = collectSurface();
  if (!tops.length) return;
  cx.save();
  cx.globalCompositeOperation = "lighter";
  for (let suit = 1; suit <= 4; suit++) {
    let started = false, lastC = -10, lastR = -999;
    cx.beginPath();
    for (const p of tops) {
      if (p.v !== suit) { started = false; continue; }
      const x = (p.c + 0.5) * cellPx;
      const y = (p.r + 0.24 + Math.sin(t * 0.002 + p.c * 0.09) * 0.28) * cellPx;
      if (!started || p.c - lastC > 3 || Math.abs(p.r - lastR) > 10) { cx.moveTo(x, y); started = true; }
      else cx.lineTo(x, y);
      lastC = p.c; lastR = p.r;
    }
    cx.lineWidth = Math.max(1.1, cellPx * 1.15);
    cx.strokeStyle = rgbaOf(suit, 0.48, true);
    cx.stroke();
    cx.lineWidth = Math.max(0.55, cellPx * 0.42);
    cx.strokeStyle = "rgba(255,250,210,0.74)";
    cx.stroke();
  }
  cx.restore();
}
function drawSandVeins(t) {
  const g = S.grid;
  cx.save();
  cx.globalCompositeOperation = "lighter";
  for (let band = 0; band < 7; band++) {
    const base = GH * (0.58 + band * 0.062);
    let started = false;
    cx.beginPath();
    for (let c = 0; c < GW; c += 2) {
      const wave = Math.sin(c * 0.045 + band * 0.9 + t * 0.0014) * 4.6 + Math.sin(c * 0.018 + band) * 3.2;
      const r = Math.max(0, Math.min(GH - 1, Math.round(base + wave)));
      const v = g[idx(r, c)] || g[idx(Math.min(GH - 1, r + 3), c)];
      if (!v || !hasDenseSand(g, r, c, 7)) { started = false; continue; }
      const x = (c + 0.5) * cellPx, y = (r + 0.5) * cellPx;
      if (!started) { cx.moveTo(x, y); started = true; }
      else cx.lineTo(x, y);
    }
    cx.lineWidth = Math.max(0.9, cellPx * 0.62);
    cx.strokeStyle = band % 2 ? "rgba(255,248,196,0.28)" : "rgba(255,255,255,0.2)";
    cx.stroke();
  }
  cx.restore();
}
function drawGoldDust(t) {
  cx.save();
  cx.globalCompositeOperation = "lighter";
  for (const s of SPARKLE_SEEDS) {
    const v = S.grid[idx(s.r, s.c)];
    if (!v || S.fall[idx(s.r, s.c)] > 0.35) continue;
    const pulse = Math.sin(t * 0.0031 * s.z + s.p);
    if (pulse < 0.18) continue;
    const a = Math.min(0.72, (pulse - 0.18) * 0.8);
    const x = (s.c + 0.5) * cellPx;
    const y = (s.r + 0.5) * cellPx;
    cx.fillStyle = (s.c + s.r) % 5 === 0 ? `rgba(255,247,202,${a})` : `rgba(255,202,76,${a * 0.72})`;
    cx.beginPath();
    cx.arc(x, y, Math.max(0.55, cellPx * (0.55 + s.z * 0.3)), 0, Math.PI * 2);
    cx.fill();
  }
  cx.restore();
}
function drawPourStreams(t) {
  if ((!S.pourQueue || !S.pourQueue.length) && !S.pourFx) return;
  const streams = S.pourQueue.length ? S.pourQueue.slice(0, 6) : [S.pourFx];
  cx.save();
  cx.globalCompositeOperation = "lighter";
  for (const p of streams) {
    if (!p) continue;
    const suit = p.suit, rgb = RGB[suit] || [255, 240, 168];
    const x = p.col * cellPx;
    const w = Math.max(9 * dpr, POUR_W * 0.58 * cellPx);
    const alpha = S.pourQueue.length ? 0.12 : 0.09;
    const h = cv.height * 0.72;
    const hg = cx.createLinearGradient(x - w, 0, x + w, 0);
    hg.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
    hg.addColorStop(0.5, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`);
    hg.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
    const vg = cx.createLinearGradient(0, 0, 0, h);
    vg.addColorStop(0, `rgba(255,255,255,0.34)`);
    vg.addColorStop(0.2, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.28)`);
    vg.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
    cx.fillStyle = hg;
    cx.fillRect(x - w, 0, w * 2, h);
    cx.fillStyle = vg;
    cx.fillRect(x - w * 0.42, 0, w * 0.84, h);
    cx.strokeStyle = `rgba(255,248,196,${0.2 + 0.1 * Math.sin(t * 0.008 + p.col)})`;
    cx.lineWidth = Math.max(0.8, dpr * 0.8);
    cx.beginPath();
    const sway = Math.sin(t * 0.004 + p.col * 0.03) * w * 0.18;
    cx.moveTo(x + sway, 0);
    cx.bezierCurveTo(x - w * 0.22, h * 0.28, x + w * 0.24, h * 0.45, x - sway * 0.5, h * 0.66);
    cx.stroke();
  }
  cx.restore();
}
function drawSuitMarks(t) {
  const marks = [
    { suit: 1, x: 0.20, y: 0.68, s: 0.086 },
    { suit: 2, x: 0.43, y: 0.76, s: 0.08 },
    { suit: 3, x: 0.64, y: 0.65, s: 0.083 },
    { suit: 4, x: 0.83, y: 0.70, s: 0.088 },
    { suit: 1, x: 0.18, y: 0.90, s: 0.064 },
    { suit: 2, x: 0.42, y: 0.91, s: 0.06 },
    { suit: 4, x: 0.85, y: 0.91, s: 0.064 }
  ];
  cx.save();
  cx.textAlign = "center";
  cx.textBaseline = "middle";
  cx.font = `${Math.round(cv.width * 0.086)}px Georgia,serif`;
  cx.globalCompositeOperation = "lighter";
  for (const m of marks) {
    const r = Math.floor(m.y * GH), c = Math.floor(m.x * GW);
    if (!S.grid[idx(Math.max(0, Math.min(GH - 1, r)), Math.max(0, Math.min(GW - 1, c)))]) continue;
    const pulse = 0.62 + 0.25 * Math.sin(t * 0.0016 + m.x * 11);
    cx.font = `${Math.round(cv.width * m.s)}px Georgia,serif`;
    cx.fillStyle = rgbaOf(m.suit, 0.22 * pulse, true);
    cx.strokeStyle = rgbaOf(m.suit, 0.38 * pulse, true);
    cx.lineWidth = Math.max(1, dpr * 1.2);
    cx.strokeText(SUIT_MARK[m.suit], cv.width * m.x, cv.height * m.y);
    cx.fillText(SUIT_MARK[m.suit], cv.width * m.x, cv.height * m.y);
  }
  cx.restore();
}
function drawSandSparkles(t) {
  cx.save();
  cx.globalCompositeOperation = "lighter";
  for (const s of SPARKLE_SEEDS) {
    const k = idx(s.r, s.c), v = S.grid[k];
    if (!v || S.fall[k] > 0.35) continue;
    const pulse = Math.sin(t * 0.0022 * s.z + s.p);
    if (pulse < 0.45) continue;
    const a = Math.min(0.9, (pulse - 0.45) * 1.65);
    cx.fillStyle = pulse > 0.82 ? "rgba(255,255,232,0.96)" : rgbaOf(v, 0.75, true);
    drawDiamondStar(cx, (s.c + 0.5) * cellPx, (s.r + 0.5) * cellPx, Math.max(0.75, cellPx * (0.8 + s.z * 0.65)), a);
  }
  cx.restore();
}
function spawnBurstFx(suit, comp, isBig) {
  const sidx = SUIT_IDX[suit] || suit;
  const n = isBig ? 120 : 72;
  const particles = [];
  for (let i = 0; i < n; i++) {
    const k = comp[(Math.random() * comp.length) | 0];
    particles.push({
      c: k % GW,
      r: (k / GW) | 0,
      vx: (Math.random() - 0.5) * (isBig ? 4.3 : 2.8),
      vy: (Math.random() - 0.68) * (isBig ? 4.8 : 3.1),
      z: 0.65 + Math.random() * 1.1
    });
  }
  let sr = 0;
  for (let i = 0; i < comp.length; i += Math.max(1, (comp.length / 120) | 0)) sr += (comp[i] / GW) | 0;
  const samples = Math.ceil(comp.length / Math.max(1, (comp.length / 120) | 0));
  S.burstFx.push({ suit: sidx, t: performance.now(), life: isBig ? 1250 : 850, particles, y: (sr / samples) || GH * 0.7, big: isBig });
  if (S.burstFx.length > 6) S.burstFx.splice(0, S.burstFx.length - 6);
}
function drawBurstFx(t) {
  if (!S.burstFx || !S.burstFx.length) return;
  const alive = [];
  cx.save();
  cx.globalCompositeOperation = "lighter";
  for (const fx of S.burstFx) {
    const q = (t - fx.t) / fx.life;
    if (q >= 1) continue;
    alive.push(fx);
    const a = 1 - q;
    const y = fx.y * cellPx;
    const beam = cx.createLinearGradient(0, y - cv.height * 0.08, 0, y + cv.height * 0.08);
    beam.addColorStop(0, "rgba(255,255,255,0)");
    beam.addColorStop(0.5, rgbaOf(fx.suit, 0.34 * a, true));
    beam.addColorStop(1, "rgba(255,255,255,0)");
    cx.fillStyle = beam;
    cx.fillRect(0, y - cv.height * (fx.big ? 0.11 : 0.07), cv.width, cv.height * (fx.big ? 0.22 : 0.14));
    cx.strokeStyle = `rgba(255,248,196,${0.55 * a})`;
    cx.lineWidth = Math.max(1, dpr * (fx.big ? 1.7 : 1));
    cx.beginPath();
    cx.moveTo(0, y);
    cx.lineTo(cv.width, y);
    cx.stroke();
    for (const p of fx.particles) {
      const drift = q * q * 28;
      const x = (p.c + p.vx * q * 18) * cellPx;
      const yy = (p.r + p.vy * q * 18 - drift) * cellPx;
      cx.fillStyle = ((p.c + p.r) % 7 === 0) ? "rgba(255,255,235,0.92)" : rgbaOf(fx.suit, 0.82 * a, true);
      drawDiamondStar(cx, x, yy, Math.max(0.8, cellPx * p.z * (fx.big ? 1.15 : 0.9)), a);
    }
  }
  cx.restore();
  S.burstFx = alive;
}
function render() {
  if (!cx) return;
  const t = performance.now();
  paintSandBuffer(t);
  cx.clearRect(0, 0, cv.width, cv.height);
  drawBoardBackdrop(t);
  drawBoardOrnaments(t);
  cx.imageSmoothingEnabled = true; cx.imageSmoothingQuality = "high";
  cx.save();
  cx.filter = `blur(${Math.max(0.7, dpr * 0.48).toFixed(2)}px)`;
  cx.globalAlpha = 0.96;
  cx.drawImage(sandBuf, 0, 0, cv.width, cv.height);
  cx.restore();
  cx.save();
  cx.globalCompositeOperation = "lighter";
  cx.globalAlpha = 0.24;
  cx.drawImage(sandBuf, 0, 0, cv.width, cv.height);
  cx.restore();
  drawSandSheen(t);
  drawSandBloom();
  drawPourStreams(t);
  drawSandVeins(t);
  drawSurfaceGlow(t);
  drawGoldDust(t);
  drawSuitMarks(t);
  drawSandSparkles(t);
  const grainW = cellPx + 1.2;
  /* P0 贯通预警光带:逼近贯通的大片呼吸发光,越近越亮 */
  if (S.nearGroups && S.nearGroups.length) {
    const tt = performance.now();
    cx.save(); cx.globalCompositeOperation = "lighter";
    for (const grp of S.nearGroups) {
      const inten = Math.min(1, (grp.span - 0.55) / 0.45);
      const pulse = 0.45 + 0.45 * Math.abs(Math.sin(tt * 0.006));
      cx.globalAlpha = (0.3 + 0.5 * inten) * pulse;
      cx.fillStyle = BRIGHT[grp.suit];
      for (const k of grp.comp) cx.fillRect((k % GW) * cellPx - 0.2, ((k / GW) | 0) * cellPx - 0.2, grainW, grainW);
      /* 缺口侧竖光:已贴一墙、差另一墙 → 指明"往哪连就贯通" */
      if (grp.touchL !== grp.touchR) {
        const gapRight = grp.touchL && !grp.touchR, ww = cellPx * 7;
        const gg = cx.createLinearGradient(gapRight ? cv.width : 0, 0, gapRight ? cv.width - ww : ww, 0);
        gg.addColorStop(0, BRIGHT[grp.suit]); gg.addColorStop(1, "rgba(0,0,0,0)");
        cx.globalAlpha = 0.55 * pulse; cx.fillStyle = gg; cx.fillRect(gapRight ? cv.width - ww : 0, 0, ww, cv.height);
      }
    }
    cx.restore();
  }
  /* P0 落点预览光柱:瞄准列 ±POUR_W 半透明竖光(桌面 hover 可见) */
  if (S.aimCol >= 0 && S.curBlob) {
    const sc = SUITS[IDX_SUIT[S.curBlob.suit]];
    const x0 = Math.max(0, S.aimCol - POUR_W) * cellPx, x1 = Math.min(GW, S.aimCol + POUR_W + 1) * cellPx;
    const grad = cx.createLinearGradient(0, 0, 0, cv.height);
    grad.addColorStop(0, `rgba(${sc.rgb[0]},${sc.rgb[1]},${sc.rgb[2]},0.2)`);
    grad.addColorStop(1, `rgba(${sc.rgb[0]},${sc.rgb[1]},${sc.rgb[2]},0)`);
    cx.fillStyle = grad; cx.fillRect(x0, 0, x1 - x0, cv.height);
  }
  /* P0 倒沙光束:刚倒下的列闪一道渐隐光束,"倒"这个动作有反馈 */
  if (S.pourFx) {
    const age = performance.now() - S.pourFx.t, life = 320;
    if (age >= life) S.pourFx = null;
    else {
      const sc = SUITS[IDX_SUIT[S.pourFx.suit]], a = (1 - age / life) * 0.5;
      const half = Math.max(5, Math.round(POUR_W * 0.35));
      const x0 = Math.max(0, S.pourFx.col - half) * cellPx, x1 = Math.min(GW, S.pourFx.col + half + 1) * cellPx;
      const grad = cx.createLinearGradient(0, 0, 0, cv.height * 0.6);
      grad.addColorStop(0, `rgba(${sc.rgb[0]},${sc.rgb[1]},${sc.rgb[2]},${a * 0.62})`);
      grad.addColorStop(1, `rgba(${sc.rgb[0]},${sc.rgb[1]},${sc.rgb[2]},0)`);
      cx.save(); cx.globalCompositeOperation = "lighter"; cx.fillStyle = grad; cx.fillRect(x0, 0, x1 - x0, cv.height); cx.restore();
    }
  }
  drawBoardOrnaments(t);
  drawBurstFx(t);
  /* 红线(最后画,保持清晰) */
  const wy = WARN_ROW * cellPx;
  cx.save();
  cx.globalCompositeOperation = "lighter";
  cx.strokeStyle = "rgba(255,49,90,0.82)"; cx.lineWidth = Math.max(1.5, dpr); cx.setLineDash([10 * dpr, 8 * dpr]);
  cx.beginPath(); cx.moveTo(0, wy); cx.lineTo(cv.width, wy); cx.stroke(); cx.setLineDash([]);
  cx.strokeStyle = "rgba(255,248,196,0.34)"; cx.lineWidth = Math.max(0.8, dpr * 0.7);
  cx.beginPath(); cx.moveTo(0, wy - 3 * dpr); cx.lineTo(cv.width, wy - 3 * dpr); cx.stroke();
  cx.restore();
}

/* ===================== HUD / 计时 ===================== */
function updateHud() {
  $("seamNow").textContent = Math.floor(S.seam); $("seamGoal").textContent = S.goal;
  $("goalFill").style.width = Math.min(100, (S.seam / S.goal) * 100) + "%";
  $("dustHud").textContent = "✦ " + S.dust;
  updateElemBar();   /* P1 今夜星河占比条 */
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
    let n = 0; for (let r = GH - 36; r < GH; r++) for (let c = 0; c < GW; c++) { if (S.grid[idx(r, c)]) { S.grid[idx(r, c)] = 0; n++; } }
    if (n) { const gain = Math.round(n * 0.033); S.seam += gain; S.seamTotal += gain; const rect = cv.getBoundingClientRect(); flyScore(rect.left + rect.width / 2, rect.top + rect.height - 20, "+" + gain, 20); }
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
  S.grid.fill(0); S.fall.fill(0); for (let i = 0; i < S.fric.length; i++) S.fric[i] = Math.random();   /* 固定摩擦场:本层地形颗粒摩擦,削坡受其影响→表面不规整 */
  S.seam = 0; S.ascendThisLayer = 0; S.combo = 0; S.comboT = 0; S.overloadT = 0; S.eyeNext = false;
  S.nearGroups = []; S.pourFx = null; S.burstFx = []; S.aimCol = -1; S.nearWarn = false;   /* P0 重置反馈态 */
  S.elemCount = { wand: 0, coin: 0, sword: 0, cup: 0 };   /* P1 本局偏色重置 */
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
  const peak = (S.story && S.stageIdx === 0) ? 72 : Math.min(186, 112 + S.layer * 16);   /* 沙丘峰高(随分辨率×3);提高沙海占屏,更接近成品截图 */
  const cols = activeSuits().map(s => SUIT_IDX[s]);                      /* 渐进色数:S1 2色 … S3+ 4色 */
  const segN = cols.length + 2 + S.layer;
  const segW = GW / segN, segCol = [];
  for (let i = 0; i < segN; i++) { let v; do { v = cols[Math.floor(Math.random() * cols.length)]; } while (i > 0 && v === segCol[i - 1] && cols.length > 1); segCol.push(v); }
  for (let c = 0; c < GW; c++) {
    const h = Math.round(peak * Math.pow(Math.sin(Math.PI * (c + 0.5) / GW), 0.62)) + 6;   /* 弧形,两端 min 6 行(×3) */
    for (let k = 0; k < h; k++) {
      const r = GH - 1 - k;
      const waveC = c + Math.sin(k * 0.22 + c * 0.035) * 8 + Math.sin(c * 0.08) * 4;
      const seg = Math.max(0, Math.min(segN - 1, Math.floor(waveC / segW)));
      const v = Math.random() < 0.035 ? cols[Math.floor(Math.random() * cols.length)] : segCol[seg];   /* 低噪声 + 波动边界,色块更像流动的星沙团 */
      S.grid[idx(r, c)] = v; S.shade[idx(r, c)] = 0.9 + Math.random() * 0.14;
    }
  }
  const dl = dutyLead(); S.duty = dl; S.power = 0; setLeadBar(dl); updatePowerUI(); setTimeout(() => say(dl, "start", true), 700);
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
  const tide = settleTide();   /* P1 今夜星河结算 */
  let tideHtml = "";
  if (tide.lines.length) tideHtml = `<div class="elem-result">` + tide.lines.map(l => `<div>${l}</div>`).join("") + ((tide.dust || tide.moon) ? `<div class="er-reward">${tide.dust ? "星屑 +" + tide.dust + " ✦  " : ""}${tide.moon ? "月辉 +" + tide.moon + " ☾" : ""}</div>` : "") + `</div>`;
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
    ${tideHtml}
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
  $("btnAlbum").onclick = showMemoryAlbum;   /* P1 星轨手账 */
  $("btnHome").onclick = () => backToTitle();
  $("btnArcana").onclick = onArcana;
  $("leadAvatar").onclick = onStarPower;   /* P1 攒满星力,点男主头像召唤 */
  $("btnReset").onclick = () => { ["xs_story", "xs_endlessBest", "xs_bonds", "xs_ach", "xs_moon"].forEach(k => localStorage.removeItem(k)); S.bonds = null; S.ach = null; S.moonlight = 0; toast("进度已重置"); backToTitle(); };
  const sb = $("btnSound"); sb.classList.toggle("off", !S.sound); sb.onclick = () => { S.sound = !S.sound; save("xs_sound", S.sound); sb.classList.toggle("off", !S.sound); if (bgm) bgm.muted = !S.sound; };
  $("sandCanvas").addEventListener("click", (e) => {
    if (S.paused || !S.running) return;
    const rect = cv.getBoundingClientRect(); const c = Math.floor((e.clientX - rect.left) / (rect.width / GW));
    if (c >= 0 && c < GW) pourAt(c);
  });
  $("sandCanvas").addEventListener("pointermove", (e) => {   /* P0 落点预览(桌面 hover) */
    if (S.paused || !S.running) { S.aimCol = -1; return; }
    const rect = cv.getBoundingClientRect(); const c = Math.floor((e.clientX - rect.left) / (rect.width / GW));
    S.aimCol = (c >= 0 && c < GW) ? c : -1;
  });
  $("sandCanvas").addEventListener("pointerleave", () => { S.aimCol = -1; });
  addEventListener("resize", () => { if ($("app").style.display !== "none") layoutCanvas(); });
}

/* ===================== 启动 ===================== */
initColors(); preloadCharacterAssets(); layoutCanvas(); bindUI(); showTitle();
