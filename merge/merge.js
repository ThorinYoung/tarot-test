/* ============================================================
   缀星 · 物理坠落合成(合成大西瓜式)  v0.3 / M3
   核心:星屑从裂隙坠落 → 物理滚动堆叠 → 同色同阶相撞「啵」地合成升阶 →
        越滚越大 → 顶阶「星象」升空缝合裂隙 + 男主反应 → 堆满溢出=过载救场。
   2 个同色同阶相撞即合成(非网格 3 连)。零依赖自写圆物理,可移植 Cocos。
   台词为占位稿,终稿以编剧为准。
   ============================================================ */
"use strict";

/* ===================== 配置 ===================== */
const SUITS = {
  wand:  { name: "权杖", color: "#ff6b4a", lead: "炎烈" },
  coin:  { name: "星币", color: "#f0c75e", lead: "沈寂" },
  sword: { name: "宝剑", color: "#7fd6c2", lead: "叶渊" },
  cup:   { name: "圣杯", color: "#6f9bff", lead: "宋以衡" },
};
const SUIT_KEYS = ["wand", "coin", "sword", "cup"];

/* 4 阶链:半径递增,2 个同色同阶相撞 → 合成高一阶;tier3「星座」升空缀亮星图一颗星 */
const TIERS = [
  { name: "星屑", r: 16, seam: 0 },
  { name: "星砾", r: 23, seam: 5 },
  { name: "星核", r: 33, seam: 14 },
  { name: "星座", r: 45, seam: 45 },   /* 顶阶,合成即升空缀亮一颗星 */
];
const TOP_TIER = 3;

/* 星座图(P1 缀星成图):每夜一张「他的命运星座」,升空的星按序缀亮其星点,缀满=过关唤记忆。
   坐标 0-100(SVG viewBox),lead=这张图属于哪位男主的记忆。 */
const CONSTELLATIONS = [
  { name: "牧夫 · 序章", lead: "sword", points: [[22, 64], [37, 46], [52, 58], [68, 40]], edges: [[0, 1], [1, 2], [2, 3]] },
  { name: "天琴 · 初遇", lead: "cup", points: [[26, 42], [42, 60], [56, 44], [70, 62], [50, 74]], edges: [[0, 1], [1, 2], [2, 3], [1, 4]] },
  { name: "猎户 · 心动", lead: "wand", points: [[22, 36], [36, 54], [50, 50], [64, 54], [78, 36], [50, 72]], edges: [[0, 1], [1, 2], [2, 3], [3, 4], [2, 5]] },
  { name: "天蝎 · 誓约", lead: "coin", points: [[18, 40], [32, 52], [48, 56], [62, 50], [74, 60], [83, 72]], edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]] },
];
function pickConstellation() {
  if (S.story) return CONSTELLATIONS[Math.min(S.stageIdx, CONSTELLATIONS.length - 1)];
  return CONSTELLATIONS[(S.endlessLayer - 1) % CONSTELLATIONS.length];
}

/* 数值中枢 BAL(所有可调数值集中,供后续 bot 体检 / 真人手感调参) */
const BAL = {
  gravity: 0.42,          /* 每子步重力 */
  subSteps: 4,            /* 每帧物理子步 */
  collideIters: 3,        /* 每子步碰撞迭代次数(防穿透) */
  airDamp: 0.992,         /* 空气阻尼 */
  rest: 0.12,             /* 球-球弹性 */
  wallBounce: 0.25,       /* 侧墙反弹 */
  floorBounce: 0.18,      /* 底反弹 */
  friction: 0.94,         /* 触地切向摩擦 */
  sleepV: 0.18,           /* 速度阈值以下视为静止 */
  dropCooldown: 320,      /* 投放冷却 ms */
  mergeKiss: 1.02,        /* 接触判定系数(d <= (r1+r2)*此值 即合;接触即合,合成大西瓜式) */
  overloadMs: 2200,       /* 越线持续此时长 → 过载 */
  comboWindow: 1600,      /* 连击窗口 ms */
  spawnMaxTier: 1,        /* 投放最高阶(只投 tier0/1,像合成大西瓜) */
  spawnTier1Rate: 0.32,
  rewardBase: 15, rewardPerLayer: 5, rewardPerAscend: 8,
  goalStory: [40, 70, 110, 160],
  endlessGoalBase: 60, endlessGoalGrowth: 1.3,
  powerMax: 100, powerPerMerge: 6, powerPerAscend: 20,   /* 男主星力槽:合成/缀星攒能 */
};
/* 四男主星力名(P2:男主星力改场) */
const POWER_NAME = { wand: "烈焰升腾", coin: "凝滞", sword: "罡风", cup: "潮汐" };

const LEADS = {
  wand: { name: "炎烈", color: "#ff6b4a", glyph: "#glyph-wand", lines: {
    start: ["今天的裂隙,看着就欠烧。", "跟上我的节奏,别眨眼。"],
    merge: ["这一下漂亮!", "连起来了,别停!"],
    ascend: ["这一座,烧得漂亮!", "看见没,你把我点亮了。"],
    low: ["要堆满了——稳住,听我的。", "越是挤,越要沉住气。"],
    rescue: ["谁准你放弃的?手给我。", "塌不了,有我在。"],
    win: ["赢了!刚才那下,是不是很帅?", "干脆利落,这才像话。"] } },
  coin: { name: "沈寂", color: "#f0c75e", glyph: "#glyph-coin", lines: {
    start: ["按计划进行,很好。", "今晚的星屑,一颗都别浪费。"],
    merge: ["收益,可观。", "复利的美,你刚见到了。"],
    ascend: ["这一座,值得入账。", "稳。继续。"],
    low: ["余量不多了,冷静核算。", "越到最后越不能乱。"],
    rescue: ["亏损止得住。手,伸出来。", "追加预算——别浪费。"],
    win: ["结算完成,收益超预期。", "这一夜,记进年报。"] } },
  sword: { name: "叶渊", color: "#7fd6c2", glyph: "#glyph-sword", lines: {
    start: ["情报核对完毕,开始吧。", "别紧张,照我说的做。"],
    merge: ["漂亮,这步我都没算到。", "看吧,连起来了。"],
    ascend: ["最优解。我就说你做得到。", "这一座的弧度,和你一样漂亮。"],
    low: ["空间告急,我替你算路。", "收线了,相信直觉。"],
    rescue: ["想都别想输,抓紧我。", "预案启动,够你翻盘。"],
    win: ["完美收束,误差为零。", "看吧,我就说你做得到。"] } },
  cup: { name: "宋以衡", color: "#6f9bff", glyph: "#glyph-cup", lines: {
    start: ["别紧张,我陪你。", "今晚的星光,很适合你。"],
    merge: ["星光都在偏爱你。", "这个节奏,很舒服。"],
    ascend: ["你看,他的星座……被你唤回来了。", "嗯,很温柔,也很正确。"],
    low: ["深呼吸,我陪你走完。", "没关系,你已经很好了。"],
    rescue: ["我在,手给我,我们一起。", "靠着我,慢慢来。"],
    win: ["辛苦了……今天,也想被你夸一夸。", "完成得很漂亮,回去喝杯热的。"] } },
};
const SYS = { name: "AI 灵宝", glyph: "#glyph-octa", color: "#d8b46a" };

/* 首夜剧情(占位稿) */
const STORY = [
  { id: "S1", name: "序章 · 电梯惊停", elevator: "alarm",
    pre: [
      ["sys", "警告——无尽电梯检测到裂隙湍流,下行暂停。检测到星盘共鸣者:苏星轮。"],
      ["sword", "别慌。裂隙在往下坠星屑——那是被撕碎的星魂残片。"],
      ["sword", "把<同色>的星屑接住、让它们撞在一起,就合成更亮的一阶。瞄准位置,松手投下去。"]],
    post: [["sword", "第一次就有这种手感,比情报里写的更有趣。"]] },
  { id: "S2", name: "第一夜 · 处理室初开", elevator: "calm",
    pre: [
      ["sword", "这层起会坠下不止一种颜色——只有<同色>的撞一起才合得起来。"],
      ["sword", "星屑→星砾→星核→星座,一路撞上去,顶端就是『星象』,它会自己升空缝合裂隙。"]],
    post: [["sword", "看吧,我就说你做得到。那道升空的星象,是谁的来着?"]] },
  { id: "S3", name: "第二夜 · 星象低语", elevator: "calm",
    pre: [
      ["cup", "听,星核穹顶在响。每缀成一座星象,就唤回他的一段记忆。"],
      ["cup", "稳住节奏,别让星屑堆过那条红线。"]],
    post: [["cup", "嗯,这个完成度,很温柔,也很正确。"]] },
  { id: "S4", name: "第三夜 · 双人委托", elevator: "calm",
    pre: [
      ["sys", "叮——事务所第一张正式委托抵达!裂隙强度上升。"],
      ["sys", "「无尽夜」即将解锁——想缀多久,就缀多久。"]],
    post: [["sys", "委托完成!「无尽夜」已解锁。"]] },
];

/* 记忆养成(P3):缀亮某花色的星累计达阈值 → 该男主羁绊升级 + 解锁一段记忆(占位稿) */
const BOND_LEVELS = [3, 7, 12, 18, 26];   /* 累计缀星点亮数达到 → 羁绊 Lv1..5 */
const MEMORIES = {
  wand: ["裂隙第一次平息时,他没急着走,而是看了你很久。", "「跟上我」——可他每次都悄悄放慢半步。", "他说怕火,其实是怕你被烫到。", "年报最后一页,夹着你缀的第一颗星。", "他第一次说『我们』的时候,自己愣了一下。"],
  coin: ["他把你的名字,记在账本最贵重的那一栏。", "「都算好了」——除了心跳乱了节拍。", "他存下的不是星砂,是和你的每一夜。", "沉默是他的铠甲,你是唯一的缝隙。", "他算过最不划算的一笔:为你,值得。"],
  sword: ["他算过一百种结局,每一种里都有你。", "情报写满你的习惯,他说这叫职业病。", "「别紧张」,说这话时他自己屏着呼吸。", "最优解从来不是赢,是你还在身边。", "他唯一没算到的变量,是自己的心。"],
  cup: ["他温柔地接住你每一次失误。", "「今晚星光很好」,其实他在看你。", "他的手心在出汗,却还说别怕。", "你缀的星,他都偷偷许了同一个愿。", "他说陪你走完,没说的是——想一直走下去。"],
};

/* 四花色=四元素(世界牌·四元素配比,产品级旗舰创意 docs/17):一局缀星的元素比例触发当日元素奖励 + 成就;均衡=世界牌圆满 */
const ELEMENTS = {
  wand: { el: "火", tide: "炎之潮", lead: "炎烈" },
  coin: { el: "土", tide: "磐之潮", lead: "沈寂" },
  sword: { el: "风", tide: "罡之潮", lead: "叶渊" },
  cup: { el: "水", tide: "汐之潮", lead: "宋以衡" },
};
const ELEM_T1 = 0.5, ELEM_T2 = 0.8, ELEM_T3 = 0.98;   /* 元素占比阈值:潮/极/纯 */

/* 塔罗法则(P4 roguelike):过层三选一,改写物理/合成/元素规则,爬层累积成 build */
const RAR_COLOR = { c: "#9fb4d8", r: "#f0c75e", l: "#d29bff" };
const LAWS = [
  { key: "wheel", name: "命运之轮", rar: "r", desc: "重力左右摇摆,星屑滚动更活" },
  { key: "strength", name: "力量", rar: "c", desc: "星力槽积累 +60%" },
  { key: "temperance", name: "节制", rar: "c", desc: "连击窗口延长,更易连缀" },
  { key: "sun", name: "太阳", rar: "r", desc: "每次缀星额外 +8 星砂" },
  { key: "star", name: "星辰", rar: "c", desc: "坠落更多星砾(高一阶)" },
  { key: "world", name: "世界", rar: "l", desc: "四元素奖励阈值降低,更易达成" },
  { key: "magician", name: "魔术师", rar: "l", desc: "点「下一颗」可切换其花色" },
  { key: "empress", name: "女皇", rar: "r", desc: "每座星座第一次缀星 +20 星砂" },
];

/* ===================== 状态 ===================== */
const S = {
  mode: "story", stageIdx: 0, endlessLayer: 1, layer: 1,
  balls: [], holding: null, next: null,
  seam: 0, goal: 4, seamTotal: 0, maxCombo: 0, ascendCount: 0,
  constellation: null, litStars: 0,
  power: 0, duty: null, laws: [], firstAscendThisLayer: true, physTick: 0,
  combo: 0, comboT: 0, lastDrop: 0,
  overAccum: 0, busy: false, story: false, rescues: 1, litLeads: {},
  dust: 0, moonlight: 0, running: false, bonds: load("zx_bonds", null),
  elemCount: null, ach: load("zx_ach", null),
  sound: load("zx_sound", true),
};
let ballSeq = 0;
const $ = (id) => document.getElementById(id);
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
function load(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } }
function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
const storyDone = () => load("zx_story", 0);

/* ===================== 音效 ===================== */
let AC = null, bgm = null;
function ac() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch {} } return AC; }
function tone(freq, dur, type = "sine", vol = 0.1, when = 0) {
  if (!S.sound) return; const c = ac(); if (!c) return;
  const t = c.currentTime + when, o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.05);
}
const PENTA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5];
const sfx = {
  drop() { tone(300, 0.09, "triangle", 0.05); },
  land() { tone(150, 0.06, "sine", 0.04); },
  merge(tier, combo) { const n = Math.min(combo, 5); tone(PENTA[Math.min(tier + n, 5)] * (1 + tier * 0.08), 0.18, "triangle", 0.08); tone(PENTA[Math.min(tier + 1, 5)] * 1.5, 0.12, "sine", 0.05, 0.04); },
  ascend() { [0, 2, 4, 5].forEach((p, i) => tone(PENTA[p] * 1.5, 0.4, "sine", 0.1, i * 0.08)); tone(PENTA[5] * 2, 0.5, "sine", 0.09, 0.3); },
  win() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.4, "sine", 0.1, i * 0.12)); },
  fail() { [330, 262, 208].forEach((f, i) => tone(f, 0.5, "sine", 0.08, i * 0.18)); },
  bad() { tone(150, 0.12, "square", 0.05); },
};
function startBgm() { if (bgm) return; bgm = new Audio("../bgm.mp3"); bgm.loop = true; bgm.volume = 0.3; bgm.play().catch(() => { bgm = null; }); }

/* ===================== 星空背景 ===================== */
(function starfield() {
  const cv = $("starfield"), cx = cv.getContext("2d"); let stars = [];
  function reset() { cv.width = innerWidth; cv.height = innerHeight; stars = Array.from({ length: 90 }, () => ({ x: Math.random() * cv.width, y: Math.random() * cv.height, r: Math.random() * 1.3 + 0.3, p: Math.random() * 7, s: 0.4 + Math.random() * 1.2 })); }
  reset(); addEventListener("resize", reset);
  (function frame(t) { cx.clearRect(0, 0, cv.width, cv.height); for (const st of stars) { const a = 0.25 + 0.55 * Math.abs(Math.sin(st.p + t * 0.0006 * st.s)); cx.globalAlpha = a; cx.fillStyle = "#dfe6ff"; cx.beginPath(); cx.arc(st.x, st.y, st.r, 0, 7); cx.fill(); } requestAnimationFrame(frame); })(0);
})();

/* ===================== 裂隙序列帧 ===================== */
const FRAME = (n) => `../assets/city/cf_${String(n).padStart(3, "0")}.jpg`;
const frameCache = {};
function preload(a, b) { for (let i = a; i <= b; i++) if (!frameCache[i]) { const im = new Image(); im.src = FRAME(i); frameCache[i] = im; } }
function riftProgress(p) { const idx = 1 + Math.round(clamp(p, 0, 1) * 38); $("riftFrame").src = FRAME(idx); $("riftGlow").style.opacity = String(1 - p * 0.65); }
async function riftSettle() { $("stage").classList.add("sealed"); for (let i = 40; i <= 61; i++) { $("riftFrame").src = FRAME(i); await wait(34); } }

/* ===================== UI 基础 ===================== */
let toastT = null;
function toast(msg, dur = 2300) { const e = $("toast"); e.innerHTML = msg; e.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => e.classList.remove("show"), dur); }
function banner(msg) { const e = $("comboBanner"); e.textContent = msg; e.classList.remove("show"); void e.offsetWidth; e.classList.add("show"); }
function modal(html) { $("modal").innerHTML = html; $("overlay").classList.add("show"); }
function closeModal() { $("overlay").classList.remove("show"); }
function flash(red) { let f = document.querySelector(".flash"); if (!f) { f = document.createElement("div"); f.className = "flash"; document.body.appendChild(f); } f.classList.toggle("red", !!red); f.classList.remove("go"); void f.offsetWidth; f.classList.add("go"); }
function flyScore(x, y, txt, size = 18) { const e = document.createElement("div"); e.className = "fly-score"; e.textContent = txt; e.style.cssText = `left:${x}px;top:${y}px;font-size:${size}px;transform:translateX(-50%)`; document.body.appendChild(e); setTimeout(() => e.remove(), 880); }

/* ===================== 男主台词 ===================== */
let lastSay = 0;
function say(suit, kind, force = false) {
  const lead = LEADS[suit]; if (!lead) return;
  const now = performance.now(); if (!force && now - lastSay < 4200) return; lastSay = now;
  $("leadGlyph").setAttribute("href", lead.glyph); $("leadAvatar").style.color = lead.color;
  $("lbName").textContent = lead.name;
  const t = $("lbText"); t.textContent = pick(lead.lines[kind] || ["…"]);
  t.classList.remove("pop"); void t.offsetWidth; t.classList.add("pop");
  const a = $("leadAvatar"); a.classList.remove("flash"); void a.offsetWidth; a.classList.add("flash");
}
function setLeadBar(suit) { const l = LEADS[suit] || LEADS.sword; $("leadGlyph").setAttribute("href", l.glyph); $("leadAvatar").style.color = l.color; $("lbName").textContent = l.name; $("lbText").textContent = pick(l.lines.start); }

/* ===================== 对白系统 ===================== */
function runDialogue(seq) {
  return new Promise((resolve) => {
    const layer = $("dlgLayer"); let i = 0, typing = false, timer = null;
    function show() {
      const [who, text] = seq[i];
      const w = who === "sys" ? SYS : LEADS[who];
      $("dlgGlyph").setAttribute("href", w.glyph); $("dlgAvatar").style.color = w.color; $("dlgName").textContent = w.name;
      const t = $("dlgText"); t.textContent = ""; typing = true; let c = 0;
      timer = setInterval(() => { c++; t.textContent = text.slice(0, c); if (c >= text.length) { clearInterval(timer); typing = false; } }, 22);
    }
    function tap() { if (typing) { clearInterval(timer); $("dlgText").textContent = seq[i][1]; typing = false; return; } i++; if (i >= seq.length) { layer.style.display = "none"; layer.onclick = null; resolve(); } else show(); }
    layer.style.display = "flex"; layer.onclick = tap; show();
  });
}

/* ===================== Canvas + 容器布局 ===================== */
let cv, cx, DPR = 1;
let CW = 0, CH = 0;              /* canvas 逻辑尺寸 */
let JAR = { L: 0, R: 0, BOT: 0, TOP: 0, DROP: 0 };   /* 容器边界 + 投放线 + 投放高度 */
function layoutCanvas() {
  cv = $("game"); cx = cv.getContext("2d");
  const wrap = $("boardZone");
  let W = wrap.clientWidth, H = wrap.clientHeight;
  if (!(W > 50)) W = Math.min(window.innerWidth || 380, 520) || 380;   /* 容器未布局时兜底 */
  if (!(H > 100)) H = Math.round((window.innerHeight || 700) * 0.52) || 360;
  if (!(H > 100)) H = 360;
  CW = W; CH = H;
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = CW * DPR; cv.height = CH * DPR; cv.style.width = CW + "px"; cv.style.height = CH + "px";
  cx.setTransform(DPR, 0, 0, DPR, 0, 0);
  /* 容器:居中竖杯,宽度容纳约 3.4 个最大球 */
  const jarW = Math.min(CW - 24, TIERS[TOP_TIER].r * 2 * 3.4, 420);
  const L = (CW - jarW) / 2;
  JAR.L = L; JAR.R = L + jarW;
  JAR.DROP = 34;                 /* 投放球中心高度 */
  JAR.TOP = JAR.DROP + TIERS[TOP_TIER].r + 14;   /* 越过此红线即溢出危机 */
  JAR.BOT = CH - 12;
}

/* ===================== 球 / 投放 ===================== */
function mkBall(suit, tier, x, y, vy) {
  return { id: ++ballSeq, suit, tier, r: TIERS[tier].r, x, y, vx: (Math.random() - 0.5) * 0.4, vy: vy || 0, dead: false, bornT: performance.now(), held: false };
}
function randSpawnTier() { return Math.random() < (BAL.spawnTier1Rate + (hasLaw("star") ? 0.3 : 0)) ? 1 : 0; }
function activeSuits() {
  if (S.story) return S.stageIdx === 0 ? ["sword"] : S.stageIdx === 1 ? ["sword", "cup"] : SUIT_KEYS.slice(0, 3);
  return SUIT_KEYS;
}
function randSuit() { return pick(activeSuits()); }
function newHolding() {
  S.holding = { suit: S.next ? S.next.suit : randSuit(), tier: S.next ? S.next.tier : randSpawnTier(), x: (JAR.L + JAR.R) / 2 };
  S.next = { suit: randSuit(), tier: randSpawnTier() };
  renderNextPreview();
}
function renderNextPreview() {
  const e = $("nextDot"); if (!e || !S.next) return;
  e.style.background = SUITS[S.next.suit].color;
  e.style.width = e.style.height = (TIERS[S.next.tier].r * 1.1) + "px";
}
function dropHolding() {
  if (!S.holding || S.busy || !S.running) return;
  const now = performance.now(); if (now - S.lastDrop < BAL.dropCooldown) return;
  S.lastDrop = now;
  const h = S.holding;
  const x = clamp(h.x, JAR.L + TIERS[h.tier].r, JAR.R - TIERS[h.tier].r);
  S.balls.push(mkBall(h.suit, h.tier, x, JAR.DROP, 1.5));
  sfx.drop();
  newHolding();
}

/* ===================== 物理 ===================== */
function physics() {
  const g = BAL.gravity;
  const gx = hasLaw("wheel") ? Math.sin((S.physTick = (S.physTick || 0) + 1) * 0.018) * 0.10 : 0;
  for (let s = 0; s < BAL.subSteps; s++) {
    for (const b of S.balls) {
      b.vy += g; b.vx += gx; b.vx *= BAL.airDamp; b.vy *= BAL.airDamp;
      b.x += b.vx / BAL.subSteps; b.y += b.vy / BAL.subSteps;
    }
    /* 墙 + 地 */
    for (const b of S.balls) {
      if (b.x - b.r < JAR.L) { b.x = JAR.L + b.r; b.vx = -b.vx * BAL.wallBounce; }
      if (b.x + b.r > JAR.R) { b.x = JAR.R - b.r; b.vx = -b.vx * BAL.wallBounce; }
      if (b.y + b.r > JAR.BOT) { b.y = JAR.BOT - b.r; b.vy = -b.vy * BAL.floorBounce; b.vx *= BAL.friction; }
    }
    /* 球-球碰撞(多次迭代防穿透) */
    for (let it = 0; it < BAL.collideIters; it++) {
      const n = S.balls.length;
      for (let i = 0; i < n; i++) {
        const a = S.balls[i];
        for (let j = i + 1; j < n; j++) {
          const b = S.balls[j];
          let dx = b.x - a.x, dy = b.y - a.y;
          let d2 = dx * dx + dy * dy; const min = a.r + b.r;
          if (d2 >= min * min || d2 === 0) continue;
          let d = Math.sqrt(d2); const nx = dx / d, ny = dy / d, overlap = min - d;
          a.x -= nx * overlap / 2; a.y -= ny * overlap / 2;
          b.x += nx * overlap / 2; b.y += ny * overlap / 2;
          const rvx = b.vx - a.vx, rvy = b.vy - a.vy, vn = rvx * nx + rvy * ny;
          if (vn < 0) { const imp = -(1 + BAL.rest) * vn / 2; a.vx -= imp * nx; a.vy -= imp * ny; b.vx += imp * nx; b.vy += imp * ny; }
        }
      }
    }
  }
}

/* ===================== 合成检测 ===================== */
function detectMerges() {
  const n = S.balls.length;
  for (let i = 0; i < n; i++) {
    const a = S.balls[i]; if (a.dead) continue;
    for (let j = i + 1; j < n; j++) {
      const b = S.balls[j]; if (b.dead) continue;
      if (a.suit !== b.suit || a.tier !== b.tier) continue;
      const dx = b.x - a.x, dy = b.y - a.y, kiss = (a.r + b.r) * BAL.mergeKiss;
      if (dx * dx + dy * dy <= kiss * kiss) { mergeBalls(a, b); return true; }
    }
  }
  return false;
}
function mergeBalls(a, b) {
  a.dead = b.dead = true;
  const nt = a.tier + 1, suit = a.suit;
  const x = (a.x + b.x) / 2, y = (a.y + b.y) / 2;
  S.balls = S.balls.filter(x => !x.dead);
  /* 连击窗口 */
  const now = performance.now();
  S.combo = (now - S.comboT < BAL.comboWindow * (hasLaw("temperance") ? 1.6 : 1)) ? S.combo + 1 : 1;
  S.comboT = now; S.maxCombo = Math.max(S.maxCombo, S.combo);
  S.power = Math.min(BAL.powerMax, S.power + BAL.powerPerMerge * (hasLaw("strength") ? 1.6 : 1));
  if (S.elemCount) S.elemCount[suit] = (S.elemCount[suit] || 0) + 1;
  sfx.merge(nt, S.combo);
  if (nt >= TOP_TIER) { ascendStar(x, y, suit); return; }
  const nb = mkBall(suit, nt, x, y, -2.2); nb.pop = now; S.balls.push(nb);
  addSeam(TIERS[nt].seam, S.combo, x, y);
  if (S.combo >= 2) { banner(`连击 ×${S.combo}`); shake(); }
  if (nt === TOP_TIER - 1) { flash(); say(suit, "ascend"); } else if (S.combo >= 2) say(suit, "merge");
}

/* 缝合分 */
function addSeam(base, combo, x, y) {
  const val = Math.round(base * (1 + 0.25 * (combo - 1)));
  S.seam += val; S.seamTotal += val;
  const rect = cv.getBoundingClientRect();
  flyScore(rect.left + x, rect.top + y, "+" + val, 16 + Math.min(combo, 6) * 2);
}

/* 星象升空 */
async function ascendStar(x, y, suit) {
  S.ascendCount++; S.litLeads[suit] = (S.litLeads[suit] || 0) + 1;
  flash(); banner("✦ 缀 星 ✦"); shake();
  const rect = cv.getBoundingClientRect();
  /* 缀星:升空的星座飞向星图上待缀的那一颗,缀亮它 */
  const target = starmapPointXY(S.litStars);
  const star = document.createElement("div"); star.className = "seam-streak";
  star.style.cssText = `left:${rect.left + x}px;top:${rect.top + y}px;width:20px;height:20px;background:${SUITS[suit].color};box-shadow:0 0 30px 10px ${SUITS[suit].color};transition:transform .65s cubic-bezier(.4,0,.7,1),opacity .25s .5s`;
  document.body.appendChild(star);
  requestAnimationFrame(() => requestAnimationFrame(() => { star.style.transform = `translate(${target.x - rect.left - x}px,${target.y - rect.top - y}px) scale(0.5)`; star.style.opacity = "0"; }));
  setTimeout(() => star.remove(), 950);
  sfx.ascend();
  let gain = TIERS[TOP_TIER].seam;
  gain = Math.round(gain * (1 + 0.25 * (S.combo - 1)));
  S.seam += gain; S.seamTotal += gain;
  S.power = Math.min(BAL.powerMax, S.power + BAL.powerPerAscend * (hasLaw("strength") ? 1.6 : 1));
  if (hasLaw("sun")) S.dust += 8;
  if (hasLaw("empress") && S.firstAscendThisLayer) S.dust += 20;
  S.firstAscendThisLayer = false;
  flyScore(rect.left + x, rect.top + y, "✦ +" + gain, 24);
  const idx = S.litStars; S.litStars++;
  setTimeout(() => lightStar(idx, suit), 560);
  say(suit, "ascend", true);
  feedMemory(suit);
  if (S.story) leadInnerVoice(suit);
}

/* ===================== 记忆养成与羁绊(P3) ===================== */
function ensureBonds() {
  if (!S.bonds || typeof S.bonds !== "object") S.bonds = {};
  for (const k of SUIT_KEYS) if (!S.bonds[k]) S.bonds[k] = { mem: 0, bond: 0 };
}
function ensureAch() { if (!S.ach || typeof S.ach !== "object") S.ach = {}; }

/* 世界牌·四元素结算(旗舰创意):一局缀星元素比例 → 当日元素奖励 / 极致成就 / 世界牌圆满 */
function settleElements() {
  ensureBonds(); ensureAch();
  const ec = S.elemCount || { wand: 0, coin: 0, sword: 0, cup: 0 };
  const total = SUIT_KEYS.reduce((s, k) => s + (ec[k] || 0), 0) || 1;
  const ratios = {}; SUIT_KEYS.forEach(k => ratios[k] = (ec[k] || 0) / total);
  let top = SUIT_KEYS[0]; SUIT_KEYS.forEach(k => { if (ratios[k] > ratios[top]) top = k; });
  const r = ratios[top], out = { top, ratio: r, lines: [], dust: 0, moon: 0, achNew: [] };
  const balanced = total >= 8 && SUIT_KEYS.every(k => ratios[k] >= 0.18 && ratios[k] <= 0.32);
  if (balanced) {
    out.lines.push("✦ 世界牌 · 四元素圆满 ✦"); out.moon += 20;
    SUIT_KEYS.forEach(k => S.bonds[k].mem += 1);
    if (!S.ach.world) out.achNew.push("世界牌·圆满"); S.ach.world = (S.ach.world || 0) + 1;
  } else {
    const w = hasLaw("world") ? 0.08 : 0;
    if (r >= ELEM_T1 - w) { out.lines.push("✦ " + ELEMENTS[top].tide + " · 今日" + ELEMENTS[top].el + "元素奖励"); out.dust += 24; S.bonds[top].mem += 1; }
    if (r >= ELEM_T2 - w) { const a = "el80_" + top; out.lines.push("★ " + ELEMENTS[top].el + "之极 · 成就达成"); out.moon += 15; if (!S.ach[a]) out.achNew.push(ELEMENTS[top].el + "之极"); S.ach[a] = (S.ach[a] || 0) + 1; }
    if (r >= ELEM_T3 - w) { const a = "el100_" + top; out.lines.push("☆ 纯" + ELEMENTS[top].el + " · 极致专精!"); out.moon += 30; if (!S.ach[a]) out.achNew.push("纯" + ELEMENTS[top].el); S.ach[a] = (S.ach[a] || 0) + 1; }
  }
  S.dust += out.dust; S.moonlight = (S.moonlight || 0) + out.moon;
  save("zx_bonds", S.bonds); save("zx_ach", S.ach);
  return out;
}
function feedMemory(suit) {
  ensureBonds();
  const b = S.bonds[suit]; b.mem++;
  const lvl = BOND_LEVELS.filter(t => b.mem >= t).length;
  if (lvl > b.bond) {
    b.bond = lvl; S.moonlight = (S.moonlight || 0) + 5;
    setTimeout(() => toast(`♡ ${LEADS[suit].name} · 羁绊 Lv${lvl} —— 唤回一段记忆(星轨手账可看)`, 3400), 1100);
  }
  save("zx_bonds", S.bonds);
}
function showMemoryAlbum() {
  ensureBonds();
  let html = `<h2>星轨手账</h2><div class="m-sub">缀亮他的星座 · 唤回他的记忆</div>`;
  for (const k of SUIT_KEYS) {
    const b = S.bonds[k], L = LEADS[k], next = BOND_LEVELS.find(t => b.mem < t);
    html += `<div class="bond-card" style="border-color:${SUITS[k].color}66">
      <div class="bond-head"><div class="bond-ava" style="color:${L.color};border-color:${L.color}88"><svg viewBox="0 0 48 48" fill="none"><use href="${L.glyph}"/></svg></div>
        <div><div class="bond-name" style="color:${L.color}">${L.name}</div><div class="bond-lv">羁绊 Lv${b.bond}${next ? " · 缀星 " + b.mem + "/" + next : " · ✦ 圆满"}</div></div></div>
      <div class="bond-mems">` +
      MEMORIES[k].map((m, i) => `<div class="bond-mem ${i < b.bond ? "lit" : ""}">${i < b.bond ? "✦ " + m : "✧ ???（Lv" + (i + 1) + " 解锁）"}</div>`).join("") +
      `</div></div>`;
  }
  html += `<button class="m-btn" id="mClose">合上手账</button>`;
  modal(html);
  $("mClose").onclick = () => { if ($("app").style.display === "none") backToTitle(); else closeModal(); };
}

/* ===================== 星图(缀星成图) ===================== */
function renderStarmap() {
  const svg = $("starmap"); if (!svg || !S.constellation) return;
  const c = S.constellation; let h = "";
  for (let e = 0; e < c.edges.length; e++) { const pa = c.points[c.edges[e][0]], pb = c.points[c.edges[e][1]]; h += `<line class="cn-edge" data-a="${c.edges[e][0]}" data-b="${c.edges[e][1]}" x1="${pa[0]}" y1="${pa[1]}" x2="${pb[0]}" y2="${pb[1]}"/>`; }
  c.points.forEach((p, i) => { h += `<circle class="cn-star" data-i="${i}" cx="${p[0]}" cy="${p[1]}" r="2.4"/>`; });
  svg.innerHTML = h;
  const nm = $("starmapName"); if (nm) nm.textContent = c.name + " · 0/" + c.points.length;
}
function lightStar(i, suit) {
  const svg = $("starmap"); if (!svg) return;
  const dot = svg.querySelector(`.cn-star[data-i="${i}"]`);
  if (dot) { dot.classList.add("lit"); dot.style.fill = SUITS[suit].color; dot.style.filter = `drop-shadow(0 0 3px ${SUITS[suit].color})`; }
  svg.querySelectorAll(".cn-edge").forEach(e => { const a = svg.querySelector(`.cn-star[data-i="${e.dataset.a}"]`), b = svg.querySelector(`.cn-star[data-i="${e.dataset.b}"]`); if (a && b && a.classList.contains("lit") && b.classList.contains("lit")) e.classList.add("lit"); });
  const nm = $("starmapName"); if (nm && S.constellation) nm.textContent = S.constellation.name + " · " + S.litStars + "/" + S.constellation.points.length;
}
function starmapPointXY(i) {
  const svg = $("starmap"), c = S.constellation;
  if (!svg || !c || !c.points[i]) { const r = $("stage").getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
  const rect = svg.getBoundingClientRect(), p = c.points[i];
  return { x: rect.left + (p[0] / 100) * rect.width, y: rect.top + (p[1] / 100) * rect.height };
}

/* ===================== 男主星力(P2:男主星力改场) ===================== */
function updatePowerUI() {
  const av = $("leadAvatar"); if (av) av.classList.toggle("charged", S.power >= BAL.powerMax && S.running);
  const bar = $("powerFill"); if (bar) bar.style.width = Math.min(100, S.power / BAL.powerMax * 100) + "%";
}
async function onStarPower() {
  if (S.power < BAL.powerMax || S.busy || !S.running) return;
  S.busy = true; S.power = 0; updatePowerUI();
  const duty = S.duty || dutyLead();
  flash(); shake(); say(duty, "merge", true);
  banner("✦ " + LEADS[duty].name + " · " + POWER_NAME[duty] + " ✦");
  if (duty === "wand") await powerYanlie();
  else if (duty === "coin") await powerShenji();
  else if (duty === "sword") await powerYeyuan();
  else await powerSongyiheng();
  S.busy = false; updatePowerUI();
}
/* 炎烈·烈焰升腾:点燃全盘,同色同阶两两强制合成一轮(激进催化) */
async function powerYanlie() {
  const groups = {};
  for (const b of S.balls) { const k = b.suit + "_" + b.tier; (groups[k] = groups[k] || []).push(b); }
  for (const k in groups) { const arr = groups[k]; for (let i = 0; i + 1 < arr.length; i += 2) { if (!arr[i].dead && !arr[i + 1].dead) mergeBalls(arr[i], arr[i + 1]); } }
  sfx.ascend(); await wait(320);
}
/* 沈寂·凝滞:全盘强力压实下沉 + 触发接触合成(稳住局面、解过载) */
async function powerShenji() {
  for (const b of S.balls) { b.vx = 0; b.vy = 3.5; }
  for (let i = 0; i < 70; i++) { physics(); let g = 0; while (detectMerges() && g++ < 6) {} }
  sfx.land(); await wait(180);
}
/* 叶渊·罡风:每颗星屑被吹向最近的同色同阶,制造合成机会 */
async function powerYeyuan() {
  for (const a of S.balls) {
    let best = null, bd = 1e9;
    for (const b of S.balls) { if (b === a || b.suit !== a.suit || b.tier !== a.tier) continue; const d = (b.x - a.x) ** 2 + (b.y - a.y) ** 2; if (d < bd) { bd = d; best = b; } }
    if (best) { const dx = best.x - a.x, dy = best.y - a.y, d = Math.hypot(dx, dy) || 1; a.vx += dx / d * 3.2; a.vy += dy / d * 2; }
  }
  for (let i = 0; i < 90; i++) { physics(); let g = 0; while (detectMerges() && g++ < 6) {} }
  sfx.merge(1, 2); await wait(180);
}
/* 宋以衡·潮汐:温柔上抛扰动 + 重新沉降,化解拥堵 */
async function powerSongyiheng() {
  for (const b of S.balls) { b.vx = (Math.random() - 0.5) * 4.5; b.vy = -2 - Math.random() * 2.5; }
  for (let i = 0; i < 120; i++) { physics(); let g = 0; while (detectMerges() && g++ < 6) {} }
  sfx.win(); await wait(180);
}
function leadInnerVoice(suit) {
  const lines = { wand: "他嘴上不说,其实最怕你受伤。", coin: "他把你的名字,记在了最重要那一页。", sword: "他算了一百种结局,每一种都有你。", cup: "他说『别紧张』时,自己的手心也在出汗。" };
  setTimeout(() => toast("✦ 灵宝:" + lines[suit], 3200), 600);
}
function shake() { const st = $("stage"); st.classList.remove("shake"); void st.offsetWidth; st.classList.add("shake"); }

/* ===================== 渲染 ===================== */
function drawBall(b) {
  const t = performance.now();
  let scale = 1;
  if (b.pop) { const k = (t - b.pop) / 280; scale = k < 1 ? 1 + 0.28 * Math.sin(k * Math.PI) : 1; if (k >= 1) b.pop = 0; }
  if (b.bornT && t - b.bornT < 200) scale *= 0.6 + 0.4 * ((t - b.bornT) / 200);
  const r = b.r * scale, col = SUITS[b.suit].color;
  /* 发光辉光 */
  const g = cx.createRadialGradient(b.x - r * 0.3, b.y - r * 0.35, r * 0.1, b.x, b.y, r);
  g.addColorStop(0, "#fff");
  g.addColorStop(0.25, col);
  g.addColorStop(1, shade(col, -0.45));
  cx.beginPath(); cx.arc(b.x, b.y, r, 0, 7); cx.fillStyle = g; cx.fill();
  /* 鎏金描边(高阶更亮) */
  cx.lineWidth = b.tier >= 3 ? 2.4 : 1.4;
  cx.strokeStyle = b.tier >= 3 ? "rgba(243,216,150,0.9)" : "rgba(255,255,255,0.25)";
  cx.stroke();
  /* 外辉光 */
  cx.beginPath(); cx.arc(b.x, b.y, r, 0, 7); cx.strokeStyle = col; cx.globalAlpha = 0.25 + b.tier * 0.08; cx.lineWidth = 3; cx.stroke(); cx.globalAlpha = 1;
  /* 高光点 */
  cx.beginPath(); cx.arc(b.x - r * 0.32, b.y - r * 0.36, r * 0.16, 0, 7); cx.fillStyle = "rgba(255,255,255,0.85)"; cx.fill();
}
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16); let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = clamp(Math.round(r * (1 + amt)), 0, 255); g = clamp(Math.round(g * (1 + amt)), 0, 255); b = clamp(Math.round(b * (1 + amt)), 0, 255);
  return `rgb(${r},${g},${b})`;
}
function render() {
  cx.clearRect(0, 0, CW, CH);
  /* 容器内紫光 */
  const bg = cx.createLinearGradient(0, JAR.TOP, 0, JAR.BOT);
  bg.addColorStop(0, "rgba(124,86,201,0.05)"); bg.addColorStop(1, "rgba(124,86,201,0.14)");
  cx.fillStyle = bg; cx.fillRect(JAR.L, JAR.TOP - 8, JAR.R - JAR.L, JAR.BOT - JAR.TOP + 8);
  /* 容器边框(鎏金) */
  cx.strokeStyle = "rgba(216,180,106,0.5)"; cx.lineWidth = 2;
  cx.beginPath(); cx.moveTo(JAR.L, JAR.TOP - 8); cx.lineTo(JAR.L, JAR.BOT); cx.lineTo(JAR.R, JAR.BOT); cx.lineTo(JAR.R, JAR.TOP - 8); cx.stroke();
  /* 危机红线 */
  const danger = S.balls.some(b => b.y - b.r < JAR.TOP && Math.abs(b.vy) < 1.2);
  cx.setLineDash([7, 7]); cx.strokeStyle = danger ? "rgba(255,91,110,0.9)" : "rgba(255,91,110,0.32)"; cx.lineWidth = 1.5;
  cx.beginPath(); cx.moveTo(JAR.L, JAR.TOP); cx.lineTo(JAR.R, JAR.TOP); cx.stroke(); cx.setLineDash([]);
  /* 球 */
  for (const b of S.balls) drawBall(b);
  /* 投放预览 + 虚线引导 */
  if (S.holding && S.running && !S.busy) {
    const h = S.holding, r = TIERS[h.tier].r, x = clamp(h.x, JAR.L + r, JAR.R - r);
    cx.globalAlpha = 0.5; drawBall({ x, y: JAR.DROP, r, suit: h.suit, tier: h.tier }); cx.globalAlpha = 1;
    cx.setLineDash([4, 8]); cx.strokeStyle = "rgba(255,255,255,0.25)"; cx.lineWidth = 1;
    cx.beginPath(); cx.moveTo(x, JAR.DROP + r); cx.lineTo(x, JAR.BOT); cx.stroke(); cx.setLineDash([]);
  }
}

/* ===================== 主循环 ===================== */
let lastFrame = 0;
function loop(t) {
  requestAnimationFrame(loop);
  if (!S.running) return;
  const _bw = $("boardZone").clientWidth;
  if (_bw > 50 && Math.abs(_bw - CW) > 4) layoutCanvas();   /* 真实尺寸就绪后校正 */
  if (!S.busy) {
    physics();
    let guard = 0; while (detectMerges() && guard++ < 8) {}
    /* 过载判定:有球越红线且基本静止 → 累积 */
    const over = S.balls.some(b => b.y - b.r < JAR.TOP && Math.abs(b.vy) < 1.0);
    S.overAccum = over ? S.overAccum + (t - (lastFrame || t)) : Math.max(0, S.overAccum - (t - (lastFrame || t)) * 2);
    if (over && S.overAccum > BAL.overloadMs) { onOverload(); }
    else if (over && S.overAccum > BAL.overloadMs * 0.5) { say(dutyLead(), "low"); }
    updateHud();
    if (S.litStars >= S.goal) onLayerClear();
  }
  render();
  lastFrame = t;
}
function updateHud() {
  $("seamNow").textContent = S.litStars; $("seamGoal").textContent = S.goal;
  $("goalFill").style.width = Math.min(100, (S.litStars / S.goal) * 100) + "%";
  $("dustHud").textContent = "✦ " + S.dust;
  riftProgress(S.goal ? S.litStars / S.goal : 0);
  if (S.elemCount) {
    const total = SUIT_KEYS.reduce((s, k) => s + (S.elemCount[k] || 0), 0) || 1;
    let top = SUIT_KEYS[0];
    SUIT_KEYS.forEach(k => {
      const seg = document.querySelector(`.elem-seg[data-s="${k}"]`);
      if (seg) { seg.style.flexGrow = String(S.elemCount[k] || 0); seg.style.opacity = S.elemCount[k] ? "1" : "0.12"; }
      if ((S.elemCount[k] || 0) > (S.elemCount[top] || 0)) top = k;
    });
    const lbl = $("elemLabel");
    if (lbl) { const r = Math.round((S.elemCount[top] || 0) / total * 100); lbl.textContent = S.elemCount[top] ? ELEMENTS[top].el + " " + r + "%" : "元素 —"; lbl.style.color = SUITS[top].color; }
  }
}

/* ===================== 关卡流 ===================== */
function hasLaw(k) { return S.laws && S.laws.some(l => l.key === k); }
function renderRelics() {
  const row = $("relicRow"); if (!row) return;
  row.style.display = (S.laws && S.laws.length) ? "flex" : "none";
  row.innerHTML = (S.laws || []).map(l => `<button class="relic" style="color:${RAR_COLOR[l.rar] || "#f0c75e"}" title="${l.name}:${l.desc}"><svg viewBox="0 0 48 48"><use href="#glyph-octa"/></svg></button>`).join("");
}
function dutyLead() { if (S.story) return S.stageIdx <= 1 ? "sword" : "cup"; return pick(SUIT_KEYS); }
function layerName() { return S.story ? (STORY[S.stageIdx] ? STORY[S.stageIdx].name : "首夜") : `无尽夜 · 第 ${S.endlessLayer} 层`; }
function goalFor() {
  if (S.story) return BAL.goalStory[S.stageIdx] || 160;
  return Math.round((BAL.endlessGoalBase * Math.pow(BAL.endlessGoalGrowth, S.endlessLayer - 1)) / 5) * 5;
}
function startLayer() {
  layoutCanvas();
  S.balls = []; S.seam = 0; S.combo = 0; S.overAccum = 0; S.ascendCount = 0;
  S.constellation = pickConstellation(); S.litStars = 0;
  S.elemCount = { wand: 0, coin: 0, sword: 0, cup: 0 }; S.firstAscendThisLayer = true;
  S.goal = S.constellation.points.length; S.busy = false; S.running = true;
  $("stage").classList.remove("sealed");
  $("layerName").textContent = layerName();
  renderStarmap();
  preload(1, 39);
  newHolding();
  const dl = dutyLead(); S.duty = dl; S.power = 0; setLeadBar(dl); setTimeout(() => say(dl, "start", true), 600);
  updateHud(); updatePowerUI(); renderRelics();
}
async function onLayerClear() {
  if (S.busy) return; S.busy = true; S.running = false;
  banner(""); sfx.win(); preload(40, 61); await riftSettle();
  const reward = BAL.rewardBase + S.layer * BAL.rewardPerLayer + S.ascendCount * BAL.rewardPerAscend;
  S.dust += reward;
  const elem = settleElements();
  if (S.story) {
    const st = STORY[S.stageIdx];
    await runDialogue(st.post);
    save("zx_story", Math.max(storyDone(), S.stageIdx + 1));
    if (S.stageIdx >= STORY.length - 1) return storyVictory();
    layerClearModal(true, reward, elem);
  } else {
    save("zx_endlessBest", Math.max(load("zx_endlessBest", 0), S.endlessLayer));
    layerClearModal(false, reward, elem);
  }
}
function layerClearModal(isStory, reward, elem) {
  const elemHtml = elem ? `<div class="elem-result">
    <div class="elem-bar">${SUIT_KEYS.map(k => `<span class="elem-seg" style="flex-grow:${S.elemCount[k] || 0};background:${SUITS[k].color};opacity:${S.elemCount[k] ? 1 : 0.12}"></span>`).join("")}</div>
    ${elem.lines.length ? elem.lines.map(l => `<div class="elem-line">${l}</div>`).join("") : `<div class="elem-line dim">元素均散 · 主${ELEMENTS[elem.top].el} ${Math.round(elem.ratio * 100)}%（专精 ${ELEM_T1 * 100}% 起触发奖励）</div>`}
    ${elem.moon ? `<div class="elem-line moon">☾ +${elem.moon} 月辉</div>` : ""}
    ${elem.achNew.length ? `<div class="elem-line ach">🏆 新成就:${elem.achNew.join("、")}</div>` : ""}
  </div>` : "";
  const offerLaws = (!S.story || S.stageIdx >= 2) && LAWS.some(l => !hasLaw(l.key));
  let lawHtml = "";
  if (offerLaws) {
    const pool = LAWS.filter(l => !hasLaw(l.key)).sort(() => Math.random() - 0.5).slice(0, 3);
    lawHtml = `<div class="m-text" style="margin-top:10px">裂隙浮出星象法则 —— 选一枚改写规则:</div>` + pool.map(l => `<div class="pick-card" data-law="${l.key}"><div class="pick-icon" style="color:${RAR_COLOR[l.rar]}"><svg viewBox="0 0 48 48"><use href="#glyph-octa"/></svg></div><div><div class="pc-name" style="color:${RAR_COLOR[l.rar]}">${l.name}</div><div class="pc-desc">${l.desc}</div></div></div>`).join("");
  }
  modal(`
    <h2>星座圆满</h2><div class="m-sub">${S.constellation ? S.constellation.name : layerName()} · 缀满 ${S.litStars}/${S.goal} 颗</div>
    <div class="m-stats">
      <div class="m-stat"><b>${S.ascendCount}</b><span>缀亮星座</span></div>
      <div class="m-stat"><b>×${S.maxCombo}</b><span>最高连击</span></div>
      <div class="m-stat"><b>+${reward}</b><span>星屑报酬</span></div>
    </div>
    ${elemHtml}
    ${lawHtml}
    <button class="m-btn" id="mNext">${isStory ? "继续 →" : (offerLaws ? "跳过 · 深入下一层 →" : "深入下一层 →")}</button>
    <button class="m-btn minor" id="mHome">回标题</button>`);
  const proceed = () => { closeModal(); if (isStory) { S.stageIdx++; runStage(); } else { S.endlessLayer++; S.layer++; startLayer(); } };
  $("modal").querySelectorAll(".pick-card").forEach(card => card.onclick = () => { const l = LAWS.find(x => x.key === card.dataset.law); if (l) { S.laws.push(l); toast("习得法则「" + l.name + "」"); } proceed(); });
  $("mNext").onclick = proceed;
  $("mHome").onclick = () => { closeModal(); backToTitle(); };
}
async function onOverload() {
  if (S.busy) return; S.busy = true; S.running = false;
  $("stage").classList.add("shake"); flash(true); sfx.bad();
  setTimeout(() => $("stage").classList.remove("shake"), 420);
  await wait(380);
  const su = dutyLead();
  if (S.rescues > 0) {
    S.rescues--;
    modal(`
      <h2 style="color:${SUITS[su].color}">${LEADS[su].name} · 托住星盘</h2>
      <div class="m-text">星屑将溢出,${LEADS[su].name}伸手压住了裂隙——</div>
      <div class="m-text" style="color:var(--gold-bright)">「${pick(LEADS[su].lines.rescue)}」</div>
      <button class="m-btn" id="mRev">握住他的手(震落顶部星屑)</button>
      <div class="m-sub" style="margin-top:8px">演示直接救场 · 正式版=男主/广告/分享复活位</div>`);
    $("mRev").onclick = () => {
      closeModal(); say(su, "rescue", true);
      /* 震落:移除最高的若干星屑 */
      S.balls.sort((a, b) => a.y - b.y);
      const cut = S.balls.slice(0, Math.min(5, Math.floor(S.balls.length / 3)));
      S.balls = S.balls.filter(b => !cut.includes(b));
      for (const b of S.balls) b.vy += 1;
      S.overAccum = 0; S.busy = false; S.running = true;
    };
  } else {
    if (S.story) {
      modal(`<h2>星盘满溢</h2><div class="m-sub">${layerName()}</div>
        <div class="m-text" style="color:${SUITS[su].color}">${LEADS[su].name}:「${pick(LEADS[su].lines.rescue)}」</div>
        <button class="m-btn" id="mRetry">再缝一次这层</button>
        <button class="m-btn minor" id="mHome">先回标题</button>`);
      $("mRetry").onclick = () => { closeModal(); S.rescues = 1; startLayer(); };
      $("mHome").onclick = () => { closeModal(); backToTitle(); };
    } else { endlessSettle(); }
  }
}

/* ===================== 剧情流 ===================== */
async function runStage() {
  const st = STORY[S.stageIdx];
  S.story = true; S.mode = "story"; S.layer = S.stageIdx + 1; S.rescues = 1;
  $("titleScreen").style.display = "none";
  if (st.elevator) { const ev = $("elevator"); ev.style.display = "block"; ev.classList.toggle("alarm", st.elevator === "alarm"); $("evText").textContent = st.elevator === "alarm" ? "无尽电梯 · 裂隙湍流警报" : "无尽电梯 · 下行中…"; await wait(1800); ev.style.display = "none"; }
  $("app").style.display = "flex";
  layoutCanvas();
  await runDialogue(st.pre);
  $("dustHud").style.display = S.stageIdx >= 2 ? "" : "none";
  startLayer();
}
async function storyVictory() {
  await runDialogue([["sword", "最后一道裂隙……缝上了。"], ["cup", "你看,他的星象,整片都亮了。"], ["sys", "首夜记录完毕。「无尽夜」已全面开放!"]]);
  save("zx_story", STORY.length);
  modal(`
    <div class="seal-card"><div class="sc-head">✦ 首夜完遂 ✦</div><div class="sc-big">裂隙,今夜安眠</div>
    <div class="m-text">缀成的星象,把他破碎的星魂缀回了一片。</div></div>
    <div class="m-stats">
      <div class="m-stat"><b>${S.seamTotal}</b><span>累计缝合</span></div>
      <div class="m-stat"><b>×${S.maxCombo}</b><span>最高连击</span></div>
      <div class="m-stat"><b>${Object.values(S.litLeads).reduce((a, b) => a + b, 0)}</b><span>升空星象</span></div>
    </div>
    <button class="m-btn" id="mEndless">进入 无尽夜</button>
    <button class="m-btn minor" id="mHome">回标题</button>`);
  $("mEndless").onclick = () => { closeModal(); startEndless(); };
  $("mHome").onclick = () => { closeModal(); backToTitle(); };
}

/* ===================== 无尽夜 ===================== */
function startEndless() {
  S.story = false; S.mode = "endless"; S.seamTotal = 0; S.maxCombo = 0; S.litLeads = {}; S.laws = [];
  S.endlessLayer = 1; S.layer = 1; S.rescues = 1;
  $("titleScreen").style.display = "none"; $("app").style.display = "flex"; $("dustHud").style.display = "";
  startLayer();
}
function endlessSettle() {
  const best = load("zx_endlessBest", 0);
  modal(`
    <h2>星盘满溢</h2><div class="m-sub">无尽夜 · 抵达第 ${S.endlessLayer} 层</div>
    <div class="m-stats">
      <div class="m-stat"><b>${S.endlessLayer}</b><span>最深层</span></div>
      <div class="m-stat"><b>${S.seamTotal}</b><span>累计缝合</span></div>
      <div class="m-stat"><b>${best}</b><span>历史最深</span></div>
    </div>
    <button class="m-btn" id="mAgain">再来一夜</button>
    <button class="m-btn minor" id="mHome">回标题</button>`);
  $("mAgain").onclick = () => { closeModal(); startEndless(); };
  $("mHome").onclick = () => { closeModal(); backToTitle(); };
}

/* ===================== 图鉴 ===================== */
function showCodex() {
  const rows = TIERS.map((t, i) => `<tr><td class="cx-tier">${i + 1} 阶 · ${t.name}</td><td class="cx-desc">${i < TOP_TIER ? `2 个同色相撞 → ${TIERS[i + 1].name}` : "合成即升空,缝合一大段裂隙 + 唤回他的记忆"}</td></tr>`).join("");
  modal(`
    <h2>玩法图鉴</h2><div class="m-sub">同色同阶相撞即合成 · 花色 = 男主</div>
    <table class="codex-table">${rows}</table>
    <p class="m-text" style="font-size:12.5px">· 瞄准位置松手,星屑<span class="kw">坠落</span>进裂隙<br>· <span class="kw">2 个同色同阶</span>星屑撞在一起 → 合成升一阶,可连击<br>· 颜色不同 <span class="kw">撞不合</span>;一种颜色 = 一位男主<br>· 一路撞到顶阶「星象」<span class="kw">自动升空缝合</span>裂隙 + 唤回他的记忆<br>· 星屑堆过<span class="kw">红线</span>且压不下去 = 过载,男主救场</p>
    <button class="m-btn" id="mClose">回到星盘</button>`);
  $("mClose").onclick = () => { if ($("app").style.display === "none") backToTitle(); else closeModal(); };
}

/* ===================== 标题 ===================== */
function backToTitle() {
  S.busy = false; S.running = false; closeModal();
  $("app").style.display = "none"; $("dlgLayer").style.display = "none"; $("titleScreen").style.display = "flex";
  const done = storyDone();
  const btnStory = $("btnStory"), btnEnd = $("btnEndless");
  if (done >= STORY.length) { btnStory.textContent = "✦ 重温首夜"; btnEnd.disabled = false; const b = load("zx_endlessBest", 0); btnEnd.textContent = b ? `无尽夜(最深 ${b} 层)` : "无尽夜"; }
  else { btnStory.textContent = done === 0 ? "✦ 首夜 · 剧情远征" : `✦ 继续 · ${STORY[done].name}`; btnEnd.disabled = true; btnEnd.textContent = "无尽夜(完成首夜解锁)"; }
}

/* ===================== 输入 ===================== */
function bindInput() {
  const el = $("game");
  function pointerX(e) { const rect = el.getBoundingClientRect(); const cxp = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left; return cxp; }
  function move(e) { if (S.holding && S.running) { S.holding.x = clamp(pointerX(e), JAR.L, JAR.R); } }
  el.addEventListener("mousemove", move);
  el.addEventListener("touchmove", (e) => { move(e); e.preventDefault(); }, { passive: false });
  el.addEventListener("mousedown", move);
  el.addEventListener("click", () => dropHolding());
  el.addEventListener("touchend", (e) => { dropHolding(); e.preventDefault(); }, { passive: false });
}
function bindUI() {
  $("btnStory").onclick = () => { startBgm(); S.story = true; S.dust = 0; S.seamTotal = 0; S.litLeads = {}; S.maxCombo = 0; S.laws = []; S.stageIdx = storyDone() >= STORY.length ? 0 : storyDone(); runStage(); };
  $("btnEndless").onclick = () => { startBgm(); startEndless(); };
  $("btnHelp").onclick = () => showCodex();
  $("btnHelp2").onclick = showCodex;
  $("btnAlbum").onclick = showMemoryAlbum;
  $("btnHome").onclick = () => { if (!S.busy) backToTitle(); };
  $("leadAvatar").onclick = onStarPower;   /* 攒满星力,点男主头像召唤他出手 */
  $("nextDot").onclick = () => { if (hasLaw("magician") && S.next) { const i = SUIT_KEYS.indexOf(S.next.suit); S.next.suit = SUIT_KEYS[(i + 1) % SUIT_KEYS.length]; renderNextPreview(); toast("魔术师:下一颗 → " + SUITS[S.next.suit].name); } };
  $("btnReset").onclick = () => { save("zx_story", 0); save("zx_endlessBest", 0); save("zx_bonds", null); S.bonds = null; toast("进度已重置"); backToTitle(); };
  const sb = $("btnSound"); sb.classList.toggle("off", !S.sound);
  sb.onclick = () => { S.sound = !S.sound; save("zx_sound", S.sound); sb.classList.toggle("off", !S.sound); if (bgm) bgm.muted = !S.sound; };
  addEventListener("resize", () => { if ($("app").style.display !== "none") layoutCanvas(); });
}

/* ===================== 启动 ===================== */
layoutCanvas(); bindInput(); bindUI(); backToTitle();
requestAnimationFrame(loop);
