/* ============================================================
   缀星 · 合成 roguelike(主玩法候选 M′,docs/11)
   核心:裂隙坠下"男主灵魂星屑"→星盘上同阶 4 邻接连通簇≥3 消除升阶→
        连锁→tier4「星座」自动升空缝合裂隙+男主反应→过载救场→过层选星象法则。
   规则只看阶不看花色;花色 = 落点星屑花色,决定点亮星座归属哪位男主。
   台词为占位稿,终稿以编剧为准。零依赖,file:// 可玩。
   ============================================================ */
"use strict";

/* ===================== 配置 ===================== */
const SUITS = {
  wand:  { name: "权杖", color: "#ff6b4a", glyph: "#glyph-wand" },
  coin:  { name: "星币", color: "#f0c75e", glyph: "#glyph-coin" },
  sword: { name: "宝剑", color: "#7fd6c2", glyph: "#glyph-sword" },
  cup:   { name: "圣杯", color: "#6f9bff", glyph: "#glyph-cup" },
};
const SUIT_KEYS = ["wand", "coin", "sword", "cup"];

/* 4 阶链:tier0..3。tier3「星座」生成即升空(登顶门槛=3^3,6×6 盘可达) */
const TIERS = ["星屑", "星砾", "星核", "星座"];
const TOP_TIER = 3;
/* 合成到该阶时的缝合贡献(tier1..3);tier3=点亮星座大段缝合 */
const TIER_SEAM = [0, 4, 14, 60];

const LEADS = {
  wand: { name: "炎烈", glyph: "#glyph-wand", color: "#ff6b4a",
    lines: {
      start: ["今天的裂隙,看着就欠烧。", "跟上我的节奏,别眨眼。"],
      ascend: ["这一座,烧得漂亮!", "看见没,你把我点亮了。"],
      chain: ["连起来了!这股势头我喜欢!", "别停,接着来!"],
      low: ["星盘要满了——稳住,听我的。", "越是挤,越要沉住气。"],
      rescue: ["谁准你放弃的?手给我。", "塌不了,有我在。"],
      win: ["赢了!……刚才那下,是不是很帅?", "干脆利落,这才像话。"],
    } },
  coin: { name: "沈寂", glyph: "#glyph-coin", color: "#f0c75e",
    lines: {
      start: ["按计划进行,很好。", "今晚的星屑,一颗都别浪费。"],
      ascend: ["这一座,值得入账。", "稳。继续。"],
      chain: ["连锁收益,可观。", "复利的美,你刚见到了。"],
      low: ["余量不多了,冷静核算。", "越到最后越不能乱。"],
      rescue: ["亏损止得住。手,伸出来。", "追加预算——这次别浪费。"],
      win: ["结算完成,收益超预期。", "这一夜,记进年报。"],
    } },
  sword: { name: "叶渊", glyph: "#glyph-sword", color: "#7fd6c2",
    lines: {
      start: ["情报核对完毕,开始吧。", "别紧张,照我说的做。"],
      ascend: ["最优解。我就说你做得到。", "这一座的弧度,和我一样漂亮。"],
      chain: ["看吧,连起来了。你总比我预测的好一点。", "漂亮,这步我都没算到。"],
      low: ["空间告急,我替你算路。", "收线了,相信你的直觉。"],
      rescue: ["想都别想输,抓紧我。", "预案启动,够你翻盘。"],
      win: ["完美收束,误差为零。", "看吧,我就说你做得到。"],
    } },
  cup: { name: "宋以衡", glyph: "#glyph-cup", color: "#6f9bff",
    lines: {
      start: ["别紧张,我陪你。", "今晚的星光,很适合你。"],
      ascend: ["你看,他的星座……被你唤回来了。", "嗯,很温柔,也很正确。"],
      chain: ["星光都在偏爱你。", "这个节奏,很舒服。"],
      low: ["深呼吸,我陪你走完。", "没关系,你已经很好了。"],
      rescue: ["我在,手给我,我们一起。", "靠着我,慢慢来。"],
      win: ["辛苦了……今天,也想被你夸一夸。", "完成得很漂亮,回去喝杯热的。"],
    } },
};
const SYS = { name: "AI 灵宝", glyph: "#glyph-octa", color: "#d8b46a" };

/* 星象法则(roguelike build)= 大阿卡纳异象,改写规则 */
const LAWS = [
  { key: "lovers", name: "恋人", icon: "#glyph-cup", rar: "l", desc: "圣杯星座缝合 ×1.5" },
  { key: "sun", name: "太阳", icon: "#glyph-octa", rar: "r", desc: "每点亮一座星座,额外 +8 缝合" },
  { key: "temperance", name: "节制", icon: "#glyph-octa", rar: "r", desc: "连锁倍率 +0.5/级" },
  { key: "wheel", name: "命运之轮", icon: "#glyph-wheel", rar: "r", desc: "命运之轮每层 +1 次" },
  { key: "world", name: "世界", icon: "#glyph-octa", rar: "l", desc: "每持有 1 条法则,缝合 +5%" },
  { key: "empress", name: "女皇", icon: "#glyph-octa", rar: "r", desc: "每层第一次点亮星座 ×2 缝合" },
  { key: "star", name: "星辰", icon: "#glyph-octa", rar: "c", desc: "坠落星砾(2 阶)概率提高" },
  { key: "strength", name: "力量", icon: "#glyph-wand", rar: "c", desc: "权杖星屑坠落更频繁" },
];
const LAW_MAP = Object.fromEntries(LAWS.map(l => [l.key, l]));
const RAR_COLOR = { c: "#9fb4d8", r: "#f0c75e", l: "#d29bff" };

/* 委托:驻场双主,花色权重 + 专属开场 */
const COMMISSIONS = [
  { key: "cold", title: "冷局推演", pair: ["sword", "coin"],
    intro: [["sword", "叶渊×沈寂,双驻场。情报与账目,都不会出错。"], ["coin", "效率优先,别让推演落空。"]] },
  { key: "tide", title: "焰与潮", pair: ["wand", "cup"],
    intro: [["wand", "火力我来,温柔他来——你只管赢。"], ["cup", "放心往前,后面有我。"]] },
  { key: "gold", title: "燃金之约", pair: ["wand", "coin"],
    intro: [["wand", "烧出来的每一分,都让他记到账上!"], ["coin", "可以,燃烧也是投资。"]] },
  { key: "soft", title: "刃上温柔", pair: ["sword", "cup"],
    intro: [["sword", "锋利的给裂隙,柔软的——给你。"], ["cup", "他嘴硬,但今晚我们都站你这边。"]] },
];

/* 首夜剧情点 S1-S4(占位稿,终稿以编剧为准) */
const STORY = [
  { id: "S1", name: "序章 · 电梯惊停", elevator: "alarm", goal: 40, guided: true,
    tip: "点空格放星屑 · <b>同色</b>的聚 3 枚相邻,合成升一阶",
    pre: [
      ["sys", "警告——无尽电梯检测到裂隙湍流,下行暂停。检测到星盘共鸣者:苏星轮。"],
      ["sword", "别慌,看我手势。裂隙在往下坠星屑——那是被撕碎的星魂残片。这一夜,全是我的青色星屑。"],
      ["sword", "把<同色>的星屑聚 3 枚连在一起,它们就合成更亮的一阶。颜色不同的,合不到一块儿。"],
      ["sword", "金光标的格子是此刻最好的落点。点它,放下星屑——我看着你。"]],
    post: [
      ["sword", "……稳住了。第一次就有这种手感,比情报里写的更有趣。"],
      ["sword", "到了处理室,我教你怎么把它们一路点亮成『星座』。"]] },
  { id: "S2", name: "第一夜 · 处理室初开", elevator: "calm", goal: 70,
    tip: "同色一路合到顶 = <b>点亮星座</b>,自动升空缝合裂隙",
    pre: [
      ["sword", "这里是裂隙处理室。这层起,会坠下不止一种颜色——别急,规则不变:只有<同色>的才合得起来。"],
      ["sword", "星屑→星砾→星核,同色一路合到顶,就是『星座』。星座一成形,就自己升空,缝上一大段裂隙。"],
      ["sword", "左下『命运之轮』每层一次,卡住了就转一转,它欠你一手好的。"]],
    post: [["sword", "看吧,我就说你做得到。那道升空的星座,是谁的来着?"]] },
  { id: "S3", name: "第二夜 · 星象低语", elevator: "calm", goal: 110,
    tip: "点亮的星座属于哪位男主的花色,就唤回谁的一段记忆",
    pre: [
      ["cup", "听,星核穹顶在响。每点亮一座星座,就唤回他的一段记忆。"],
      ["cup", "过层时,你能选一枚『星象法则』——大阿卡纳的碎片,会悄悄改写规则。"],
      ["cup", "选你喜欢的。从今夜起,它陪着你。"]],
    post: [["cup", "嗯,这个完成度,很温柔,也很正确。"]] },
  { id: "S4", name: "第三夜 · 双人委托", elevator: "calm", goal: 160,
    tip: "驻场双主的花色星屑坠落更频繁",
    commission: ["cold", "tide"],
    pre: [
      ["sys", "叮——事务所第一张正式委托抵达!裂隙强度上升,允许两位先生同时驻场。"],
      ["sys", "请选择本次委托的搭档组合。"]],
    post: [
      ["sys", "委托完成!事务所与裂隙处理室,从今夜起全面开放。"],
      ["sys", "「无尽夜」已解锁——想缀多久,就缀多久。"]] },
];

/* ===================== 数值 ===================== */
const COLS = 6, ROWS = 6;
const NEXT_LEN = 3;                       /* 队列长度,显示前 2 */
const CLUSTER_MIN = 3;                    /* 连通簇合成阈值 */
const CRISIS_EMPTY = 4;                   /* 空格 ≤ 此值进入危机预警 */
const endlessGoal = (n) => Math.round((45 * Math.pow(1.3, n - 1)) / 5) * 5;

/* ===================== 状态 ===================== */
const S = {
  mode: "story", stageIdx: 0, endlessLayer: 1,
  grid: [], next: [], cell: 52, pad: 7,
  seam: 0, goal: 50, layer: 1,
  laws: [], commission: null,
  wheelUses: 1, busy: false, guided: false,
  story: false, ascendThisLayer: 0, rescues: 1, maxChain: 0,
  dust: 0, seamTotal: 0, litLeads: {},
  sound: load("zx_sound", true),
};
let tileSeq = 0;
const $ = (id) => document.getElementById(id);
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const pick = (a) => a[Math.floor(Math.random() * a.length)];
function load(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } }
function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
const storyDone = () => load("zx_story", 0);

/* ===================== 音效(WebAudio) ===================== */
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
  drop() { tone(330, 0.1, "triangle", 0.07); tone(180, 0.08, "sine", 0.06); },
  merge(tier, chain) { const b = 2 + tier + chain; for (let i = 0; i <= b; i++) tone(PENTA[Math.min(i, 5)] * (1 + tier * 0.12), 0.18, "triangle", 0.08, i * 0.05); },
  ascend() { [0, 2, 4, 5].forEach((p, i) => tone(PENTA[p] * 1.5, 0.4, "sine", 0.1, i * 0.08)); tone(PENTA[5] * 2, 0.5, "sine", 0.09, 0.3); },
  wheel() { for (let i = 0; i < 8; i++) tone(300 + i * 90, 0.1, "square", 0.04, i * 0.06); tone(1046, 0.5, "sine", 0.1, 0.5); },
  coin() { tone(987, 0.07, "triangle", 0.09); tone(1318, 0.16, "triangle", 0.1, 0.06); },
  win() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.4, "sine", 0.1, i * 0.12)); },
  fail() { [330, 262, 208].forEach((f, i) => tone(f, 0.5, "sine", 0.08, i * 0.18)); },
  bad() { tone(150, 0.12, "square", 0.05); },
};
function startBgm() { if (bgm) return; bgm = new Audio("../bgm.mp3"); bgm.loop = true; bgm.volume = 0.3; bgm.play().catch(() => { bgm = null; }); }

/* ===================== 星空背景 ===================== */
(function starfield() {
  const cv = $("starfield"), cx = cv.getContext("2d"); let stars = [];
  function reset() {
    cv.width = innerWidth; cv.height = innerHeight;
    stars = Array.from({ length: 90 }, () => ({ x: Math.random() * cv.width, y: Math.random() * cv.height, r: Math.random() * 1.3 + 0.3, p: Math.random() * 7, s: 0.4 + Math.random() * 1.2 }));
  }
  reset(); addEventListener("resize", reset);
  (function frame(t) { cx.clearRect(0, 0, cv.width, cv.height); for (const st of stars) { const a = 0.25 + 0.55 * Math.abs(Math.sin(st.p + t * 0.0006 * st.s)); cx.globalAlpha = a; cx.fillStyle = "#dfe6ff"; cx.beginPath(); cx.arc(st.x, st.y, st.r, 0, 7); cx.fill(); } requestAnimationFrame(frame); })(0);
})();

/* ===================== 裂隙序列帧 ===================== */
const FRAME = (n) => `../assets/city/cf_${String(n).padStart(3, "0")}.jpg`;
const frameCache = {};
function preload(a, b) { for (let i = a; i <= b; i++) if (!frameCache[i]) { const im = new Image(); im.src = FRAME(i); frameCache[i] = im; } }
function riftProgress(p) { const idx = 1 + Math.round(Math.max(0, Math.min(1, p)) * 38); $("riftFrame").src = FRAME(idx); $("riftGlow").style.opacity = String(1 - p * 0.65); }
async function riftSettle() { $("stage").classList.add("sealed"); for (let i = 40; i <= 61; i++) { $("riftFrame").src = FRAME(i); await wait(34); } }

/* ===================== UI 基础 ===================== */
let toastT = null;
function toast(msg, dur = 2300) { const e = $("toast"); e.innerHTML = msg; e.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => e.classList.remove("show"), dur); }
function banner(msg) { const e = $("comboBanner"); e.textContent = msg; e.classList.remove("show"); void e.offsetWidth; e.classList.add("show"); }
function modal(html) { $("modal").innerHTML = html; $("overlay").classList.add("show"); }
function closeModal() { $("overlay").classList.remove("show"); }
function flash(red) { let f = document.querySelector(".flash"); if (!f) { f = document.createElement("div"); f.className = "flash"; document.body.appendChild(f); } f.classList.toggle("red", !!red); f.classList.remove("go"); void f.offsetWidth; f.classList.add("go"); }
function flyScore(x, y, txt, size = 17) { const e = document.createElement("div"); e.className = "fly-score"; e.textContent = txt; e.style.cssText = `left:${x}px;top:${y}px;font-size:${size}px;transform:translateX(-50%)`; document.body.appendChild(e); setTimeout(() => e.remove(), 880); }

/* ===================== 男主台词 ===================== */
let lastSay = 0;
function say(suit, kind, force = false) {
  const lead = LEADS[suit]; if (!lead) return;
  const now = performance.now(); if (!force && now - lastSay < 4800) return; lastSay = now;
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
      timer = setInterval(() => { c++; t.textContent = text.slice(0, c); if (c >= text.length) { clearInterval(timer); typing = false; } }, 24);
    }
    function tap() { if (typing) { clearInterval(timer); $("dlgText").textContent = seq[i][1]; typing = false; return; } i++; if (i >= seq.length) { layer.style.display = "none"; layer.onclick = null; resolve(); } else show(); }
    layer.style.display = "flex"; layer.onclick = tap; show();
  });
}

/* ===================== 星盘核心 ===================== */
function inB(r, c) { return r >= 0 && r < ROWS && c >= 0 && c < COLS; }
function at(r, c) { return inB(r, c) ? S.grid[r][c] : null; }
function emptyCells() { const o = []; for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (!S.grid[r][c]) o.push({ r, c }); return o; }
function mkTile(suit, tier) { return { id: ++tileSeq, suit, tier, r: 0, c: 0, el: null }; }

/* 当前局的活跃花色(渐进引入:S1 单色教学 → S2/S3 双色 → 委托双主)。
   控制有效色数,既符合"同色才合"的直觉,又避免四色同时养链塞死。 */
function activeSuits() {
  if (S.commission) return S.commission.pair;
  if (S.story) return S.stageIdx === 0 ? ["sword"] : ["sword", "cup"];
  return SUIT_KEYS.slice(0, 2);
}
function randSuit() {
  const act = activeSuits();
  const w = act.map(s => (hasLaw("strength") && s === "wand") ? 2 : 1);
  let tot = w.reduce((a, b) => a + b, 0), r = Math.random() * tot;
  for (let i = 0; i < act.length; i++) { r -= w[i]; if (r <= 0) return act[i]; }
  return act[0];
}
function randTier() {
  let p1 = 0.14 - S.layer * 0.012;            /* 高层更少高阶坠落 */
  if (hasLaw("star")) p1 += 0.12;
  return Math.random() < Math.max(0.03, p1) ? 1 : 0;
}
function genNext() { while (S.next.length < NEXT_LEN) S.next.push(mkTile(randSuit(), randTier())); }
function hasLaw(k) { return S.laws.some(l => l.key === k); }

/* 布局 */
function layoutBoard() {
  const wrap = $("boardWrap");
  const availW = wrap.clientWidth - 2, availH = wrap.clientHeight - 2;
  S.cell = Math.max(38, Math.min(Math.floor((availW - S.pad * 2) / COLS), Math.floor((availH - S.pad * 2) / ROWS), 64));
  const bw = S.cell * COLS + S.pad * 2, bh = S.cell * ROWS + S.pad * 2;
  const board = $("board"); board.style.width = bw + "px"; board.style.height = bh + "px";
  board.querySelectorAll(".cell-bg").forEach(e => e.remove());
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const bg = document.createElement("div"); bg.className = "cell-bg"; bg.dataset.r = r; bg.dataset.c = c;
    bg.style.cssText = `left:${S.pad + c * S.cell + 2}px;top:${S.pad + r * S.cell + 2}px;width:${S.cell - 4}px;height:${S.cell - 4}px`;
    board.appendChild(bg);
  }
}
function posXY(r, c) { return { x: S.pad + c * S.cell + 2, y: S.pad + r * S.cell + 2 }; }
function applyPos(t, instant) { const { x, y } = posXY(t.r, t.c); if (instant) t.el.style.transition = "none"; t.el.style.setProperty("--pos", `translate(${x}px,${y}px)`); t.el.style.transform = "var(--pos)"; t.el.style.width = (S.cell - 4) + "px"; t.el.style.height = (S.cell - 4) + "px"; if (instant) { void t.el.offsetWidth; t.el.style.transition = ""; } }
function tileInner(t) { return `<svg viewBox="0 0 48 48" fill="none"><use href="${SUITS[t.suit].glyph}"/></svg><span class="tier-pip">${t.tier + 1}</span>`; }
function makeEl(t, drop) {
  const el = document.createElement("div"); el.className = `tile t-${t.suit} tier-${t.tier}`;
  el.innerHTML = tileInner(t); el._t = t; t.el = el; $("board").appendChild(el);
  applyPos(t, true); if (drop) { el.classList.add("drop"); }
}
function refreshEl(t) { t.el.className = `tile t-${t.suit} tier-${t.tier}`; t.el.innerHTML = tileInner(t); }

function renderNext() {
  const draw = (cell, t, show) => { cell.innerHTML = (show && t) ? `<div class="tile t-${t.suit} tier-${t.tier}" style="position:relative;width:78%;height:78%;transform:none">${tileInner(t)}</div>` : ""; };
  draw($("nextCell"), S.next[0], true); draw($("nextCell2"), S.next[1], true);
  $("nextCell").classList.toggle("pulse", !S.busy);
}
function updateHud() {
  $("seamNow").textContent = Math.floor(S.seam); $("seamGoal").textContent = S.goal;
  $("goalFill").style.width = Math.min(100, (S.seam / S.goal) * 100) + "%";
  $("dustHud").textContent = "✦ " + S.dust;
  riftProgress(S.seam / S.goal);
  const empt = emptyCells().length;
  $("stage").classList.toggle("crisis", empt <= CRISIS_EMPTY && S.seam < S.goal);
  $("board").querySelectorAll(".cell-bg").forEach(bg => { const occ = at(+bg.dataset.r, +bg.dataset.c); bg.classList.toggle("hot", empt <= CRISIS_EMPTY && !occ); });
}

/* 连通簇(同色 + 同阶,4 邻接)——只有同一花色同一阶的星屑才能合成 */
function clusterAt(r, c) {
  const t0 = at(r, c); if (!t0) return [];
  const tier = t0.tier, suit = t0.suit, seen = new Set([r + "," + c]), stack = [{ r, c }], out = [{ r, c }];
  while (stack.length) {
    const { r: cr, c: cc } = stack.pop();
    for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const nr = cr + dr, nc = cc + dc, k = nr + "," + nc;
      const t = at(nr, nc);
      if (t && t.tier === tier && t.suit === suit && !seen.has(k)) { seen.add(k); stack.push({ r: nr, c: nc }); out.push({ r: nr, c: nc }); }
    }
  }
  return out;
}

/* 放置 + 连锁合成 */
async function placeAt(r, c) {
  if (S.busy || at(r, c)) return;
  S.busy = true; renderNext();
  const t = S.next.shift(); genNext();
  t.r = r; t.c = c; S.grid[r][c] = t; makeEl(t, true);
  sfx.drop();
  await wait(180);
  await resolveChain(r, c, 0);
  /* 收尾:判定过层 / 过载 */
  if (S.seam >= S.goal) { await onLayerClear(); return; }
  if (emptyCells().length === 0) { await onOverload(); return; }
  S.busy = false; updateHud(); renderNext(); refreshHint();
}

/* 从 focus 起连锁:同阶簇≥3 → 整簇消除,落点生成高一阶(花色=落点) */
async function resolveChain(r, c, chain) {
  const cluster = clusterAt(r, c);
  if (cluster.length < CLUSTER_MIN) {
    if (chain > 0) S.maxChain = Math.max(S.maxChain, chain);
    return;
  }
  const focus = at(r, c), newTier = focus.tier + 1, newSuit = focus.suit;
  /* 合成动画:簇内向 focus 收拢 */
  const fp = posXY(r, c);
  for (const cell of cluster) {
    const tile = at(cell.r, cell.c); if (!tile) continue;
    const p = posXY(cell.r, cell.c);
    tile.el.style.setProperty("--mpos", `translate(${fp.x}px,${fp.y}px)`);
    if (cell.r === r && cell.c === c) continue;
    tile.el.classList.add("merging");
  }
  sfx.merge(newTier, chain);
  await wait(240);
  for (const cell of cluster) { const tile = at(cell.r, cell.c); if (tile) { tile.el.remove(); S.grid[cell.r][cell.c] = null; } }

  if (newTier >= TOP_TIER) {
    /* 生成「星座」→ 立即点亮升空缝合 */
    await ascendConstellation(r, c, newSuit, chain);
  } else {
    const nt = mkTile(newSuit, newTier); nt.r = r; nt.c = c; S.grid[r][c] = nt; makeEl(nt, false);
    nt.el.classList.add("born");
    addSeam(TIER_SEAM[newTier], chain, fp.x, fp.y);
    if (chain >= 1) { banner(`连锁 ×${chain + 1}`); say(newSuit, "chain"); }
    await wait(260);
    nt.el.classList.remove("born");
    /* 连锁:新阶继续找簇 */
    await resolveChain(r, c, chain + 1);
  }
}

/* 点亮星座:升空 → 缝合 → 男主反应 → 清格 */
async function ascendConstellation(r, c, suit, chain) {
  const placeholder = mkTile(suit, TOP_TIER); placeholder.r = r; placeholder.c = c; S.grid[r][c] = placeholder; makeEl(placeholder, false);
  placeholder.el.classList.add("born");
  flash();
  banner("★ 点亮星座 ★");
  await wait(420);
  /* 升空动画:飞向裂隙 */
  const stage = $("stage").getBoundingClientRect(), board = $("board").getBoundingClientRect();
  const fp = posXY(r, c);
  const tx = (stage.left + stage.width / 2) - (board.left + fp.x), ty = (stage.top + stage.height * 0.4) - (board.top + fp.y);
  placeholder.el.style.setProperty("--apos", `translate(${posXY(r, c).x + tx}px,${posXY(r, c).y + ty}px)`);
  placeholder.el.classList.add("ascend");
  seamStreak(board.left + fp.x + S.cell / 2, board.top + fp.y + S.cell / 2, stage.left + stage.width / 2, stage.top + stage.height * 0.4);
  sfx.ascend();
  /* 缝合分 */
  let gain = TIER_SEAM[TOP_TIER];
  if (hasLaw("sun")) gain += 8;
  if (hasLaw("lovers") && suit === "cup") gain = Math.round(gain * 1.5);
  if (hasLaw("empress") && S.ascendThisLayer === 0) gain *= 2;
  if (hasLaw("world")) gain = Math.round(gain * (1 + 0.05 * S.laws.length));
  if (S.commission && S.commission.pair.includes(suit)) gain += 5;
  S.ascendThisLayer++;
  S.litLeads[suit] = (S.litLeads[suit] || 0) + 1;
  addSeam(gain, chain, board.left + fp.x - stage.left + 0, 0, true);
  await wait(360);
  if (placeholder.el) { placeholder.el.remove(); }
  S.grid[r][c] = null;
  /* 男主反应:点亮谁的花色,谁开口 */
  say(suit, "ascend", true);
  if (S.story) leadInnerVoice(suit);
  updateHud();
  await wait(220);
}

/* AI 灵宝补男主真心(剧情向) */
function leadInnerVoice(suit) {
  const lines = { wand: "他嘴上不说,其实最怕你受伤。", coin: "他把你的名字,记在了最重要那一页。", sword: "他算了一百种结局,每一种都有你。", cup: "他说『别紧张』时,自己的手心也在出汗。" };
  setTimeout(() => toast("✦ 灵宝:" + lines[suit], 3200), 700);
}

function seamStreak(x0, y0, x1, y1) {
  const e = document.createElement("div"); e.className = "seam-streak"; e.style.cssText = `left:${x0}px;top:${y0}px;transition:transform .55s cubic-bezier(.4,0,.7,1),opacity .2s .45s`;
  document.body.appendChild(e);
  requestAnimationFrame(() => requestAnimationFrame(() => { e.style.transform = `translate(${x1 - x0}px,${y1 - y0}px) scale(0.4)`; e.style.opacity = "0"; }));
  setTimeout(() => e.remove(), 800);
}
function addSeam(base, chain, x, y, big) {
  let mult = 1 + (hasLaw("temperance") ? 0.5 : 0.5) * chain;
  if (!hasLaw("temperance")) mult = 1 + 0.35 * chain;
  const val = Math.round(base * mult);
  S.seam += val; S.seamTotal += val;
  const bx = $("board").getBoundingClientRect();
  flyScore(big ? bx.left + bx.width / 2 : bx.left + x, big ? bx.top - 6 : bx.top + y, "+" + val, big ? 24 : 16 + chain * 2);
  updateHud();
}

/* 提示:引导期高亮一个能触发合成的落点 */
function refreshHint() {
  $("board").querySelectorAll(".tile.hintable").forEach(e => e.classList.remove("hintable"));
  if (!S.guided || S.busy) return;
  const nx = S.next[0]; if (!nx) return;
  for (const { r, c } of emptyCells()) {
    let same = 0;
    for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) { const t = at(r + dr, c + dc); if (t && t.tier === nx.tier) same++; }
    if (same >= 2) { const bg = $("board").querySelector(`.cell-bg[data-r="${r}"][data-c="${c}"]`); if (bg) { bg.classList.add("hot"); } return; }
  }
}

/* ===================== 命运之轮(局内金手指) ===================== */
function onArcana() {
  if (S.busy || S.wheelUses <= 0) return;
  modal(`
    <h2>命运之轮</h2><div class="m-sub">转动命运 · 三选一(每层 ${S.wheelUses} 次)</div>
    <div class="pick-card" data-w="reshuffle"><div class="pick-icon"><svg viewBox="0 0 48 48"><use href="#glyph-wheel"/></svg></div><div><div class="pc-name">星轨重排</div><div class="pc-desc">星盘上所有星屑重新散布,解开拥堵</div></div></div>
    <div class="pick-card" data-w="promote"><div class="pick-icon"><svg viewBox="0 0 48 48"><use href="#glyph-octa"/></svg></div><div><div class="pc-name">拔擢</div><div class="pc-desc">所有 1 阶星屑升为 2 阶,触发连锁</div></div></div>
    <div class="pick-card" data-w="collapse"><div class="pick-icon"><svg viewBox="0 0 48 48"><use href="#glyph-octa"/></svg></div><div><div class="pc-name">坍缩</div><div class="pc-desc">清除所有孤立(无同阶邻居)的 1 阶星屑</div></div></div>
    <button class="m-btn minor" id="wCancel">先不用</button>`);
  $("modal").querySelectorAll(".pick-card").forEach(card => card.onclick = () => { closeModal(); doWheel(card.dataset.w); });
  $("wCancel").onclick = closeModal;
}
async function doWheel(kind) {
  S.busy = true; S.wheelUses--; sfx.wheel();
  $("btnArcana").classList.add("used"); $("arcanaUses").textContent = S.wheelUses;
  const tiles = []; for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (S.grid[r][c]) tiles.push(S.grid[r][c]);
  if (kind === "reshuffle") {
    const cells = []; for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) cells.push({ r, c });
    for (let i = cells.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [cells[i], cells[j]] = [cells[j], cells[i]]; }
    S.grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    tiles.forEach((t, i) => { t.r = cells[i].r; t.c = cells[i].c; S.grid[t.r][t.c] = t; applyPos(t); });
    await wait(450); toast("星轨重排");
  } else if (kind === "promote") {
    for (const t of tiles) if (t.tier === 1) { t.tier = 2; refreshEl(t); t.el.classList.add("born"); setTimeout(() => t.el && t.el.classList.remove("born"), 500); }
    await wait(420); toast("拔擢:1 阶 → 2 阶"); await resolveGlobal();
  } else {
    let removed = 0;
    for (const t of tiles) { if (t.tier !== 0) continue; const cl = clusterAt(t.r, t.c); if (cl.length < 2) { t.el.classList.add("merging"); t.el.style.setProperty("--mpos", t.el.style.getPropertyValue("--pos")); const tr = t.r, tc = t.c; setTimeout(() => t.el && t.el.remove(), 240); S.grid[tr][tc] = null; removed++; } }
    await wait(300); toast(`坍缩:清除 ${removed} 枚孤星`);
  }
  if (S.seam >= S.goal) { await onLayerClear(); return; }
  S.busy = false; updateHud(); renderNext(); refreshHint();
}
/* 全盘连锁(命运之轮触发后) */
async function resolveGlobal() {
  let guard = 0;
  while (guard++ < 40) {
    let found = null;
    for (let r = 0; r < ROWS && !found; r++) for (let c = 0; c < COLS && !found; c++) { if (at(r, c) && clusterAt(r, c).length >= CLUSTER_MIN) found = { r, c }; }
    if (!found) break;
    await resolveChain(found.r, found.c, 0);
    if (S.seam >= S.goal) return;
  }
}

/* ===================== 输入 ===================== */
function bindBoard() {
  $("board").addEventListener("click", (e) => {
    if (S.busy) return;
    const bg = e.target.closest(".cell-bg"); if (!bg) return;
    placeAt(+bg.dataset.r, +bg.dataset.c);
  });
}

/* ===================== 关卡流 ===================== */
function startLayer() {
  S.grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  S.seam = 0; S.ascendThisLayer = 0; S.maxChain = 0;
  S.wheelUses = 1 + (hasLaw("wheel") ? 1 : 0);
  S.next = []; genNext();
  $("board").querySelectorAll(".tile").forEach(e => e.remove());
  $("stage").classList.remove("sealed");
  $("btnArcana").classList.remove("used"); $("arcanaUses").textContent = S.wheelUses;
  $("layerName").textContent = layerName();
  $("footTip").innerHTML = S.curTip || "同色星屑聚 3 枚相邻,合成升一阶";
  preload(1, 39);
  /* 开局撒几枚,避免空盘冷启动 */
  const seedN = 8 + Math.min(5, S.layer);
  const cells = emptyCells();
  for (let i = cells.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [cells[i], cells[j]] = [cells[j], cells[i]]; }
  for (let i = 0; i < seedN; i++) {
    const { r, c } = cells[i];
    const rr = Math.random();
    let tier = 0;
    if (rr < 0.10 && S.layer >= 3) tier = 2; else if (rr < 0.42) tier = 1;  /* 约 40% 中阶,加速可达性 */
    const t = mkTile(randSuit(), tier); t.r = r; t.c = c; S.grid[r][c] = t; makeEl(t, false);
  }
  layoutBoard();
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { const t = S.grid[r][c]; if (t) applyPos(t, true); }
  renderRelics(); renderNext(); updateHud();
  const dl = dutyLead(); setLeadBar(dl); setTimeout(() => say(dl, "start", true), 700);
  S.busy = false; refreshHint();
}
function layerName() {
  if (S.story) return STORY[S.stageIdx] ? STORY[S.stageIdx].name : "首夜";
  return `无尽夜 · 第 ${S.endlessLayer} 层`;
}
function dutyLead() { if (S.commission) return S.commission.pair[(S.layer - 1) % 2]; if (S.story) return S.stageIdx <= 1 ? "sword" : "cup"; return pick(SUIT_KEYS); }

function renderRelics() {
  const row = $("relicRow"); row.innerHTML = "";
  S.laws.forEach(l => { const el = document.createElement("button"); el.className = "relic"; el.style.color = RAR_COLOR[l.rar]; el.innerHTML = `<svg viewBox="0 0 48 48"><use href="${l.icon}"/></svg>`; el.onclick = () => toast(`「${l.name}」${l.desc}`); row.appendChild(el); });
}

/* 过层 */
async function onLayerClear() {
  S.busy = true;
  $("board").querySelectorAll(".tile.hintable").forEach(e => e.classList.remove("hintable"));
  sfx.win(); preload(40, 61); await riftSettle();
  const reward = 15 + S.layer * 5 + S.ascendThisLayer * 4;
  S.dust += reward;
  if (S.story) {
    const st = STORY[S.stageIdx];
    await runDialogue(st.post);
    save("zx_story", Math.max(storyDone(), S.stageIdx + 1));
    if (S.stageIdx >= STORY.length - 1) return storyVictory();
    showLayerClearModal(true);
  } else {
    save("zx_endlessBest", Math.max(load("zx_endlessBest", 0), S.endlessLayer));
    showLayerClearModal(false);
  }
}
function showLayerClearModal(isStory) {
  const ratio = S.seam / S.goal, stars = ratio >= 1.6 ? 3 : ratio >= 1.2 ? 2 : 1;
  /* 星象法则三选一(S3 后 / 无尽夜全程) */
  const offerLaws = (isStory ? S.stageIdx >= 2 : true);
  let lawHtml = "";
  if (offerLaws) {
    const pool = LAWS.filter(l => !hasLaw(l.key));
    const picks = pool.sort(() => Math.random() - 0.5).slice(0, 3);
    lawHtml = `<p class="m-text" style="margin-top:6px">裂隙深处浮出星象法则 —— 选一枚:</p>` + picks.map((l, i) =>
      `<div class="pick-card" data-law="${l.key}"><div class="pick-icon" style="color:${RAR_COLOR[l.rar]}"><svg viewBox="0 0 48 48"><use href="${l.icon}"/></svg></div><div><div class="pc-name" style="color:${RAR_COLOR[l.rar]}">${l.name}</div><div class="pc-desc">${l.desc}</div></div></div>`).join("");
  }
  modal(`
    <h2>裂隙稳定</h2><div class="m-sub">${layerName()} · 缝合 ${Math.floor(S.seam)}/${S.goal}</div>
    <div class="stars">${[0, 1, 2].map(i => `<span class="star-pop" style="animation-delay:${0.15 + i * 0.18}s">${i < stars ? "★" : "☆"}</span>`).join("")}</div>
    <div class="m-text">星屑报酬 <span class="kw">+${15 + S.layer * 5 + S.ascendThisLayer * 4} ✦</span></div>
    ${lawHtml}
    <button class="m-btn" id="mNext">${isStory ? "继续 →" : "深入下一层 →"}</button>
    <button class="m-btn minor" id="mHome">回标题</button>`);
  const proceed = () => {
    closeModal();
    if (isStory) { S.stageIdx++; runStage(); }
    else { S.endlessLayer++; S.layer++; S.goal = endlessGoal(S.endlessLayer); S.curTip = "缀满整片星空,刷新最深记录"; startLayer(); }
  };
  $("modal").querySelectorAll(".pick-card").forEach(card => card.onclick = () => { const l = LAW_MAP[card.dataset.law]; S.laws.push(l); toast(`习得法则「${l.name}」`); proceed(); });
  $("mNext").onclick = proceed;
  $("mHome").onclick = () => { closeModal(); backToTitle(); };
}

/* 过载 */
async function onOverload() {
  S.busy = true; $("stage").classList.add("shake"); flash(true); sfx.bad();
  setTimeout(() => $("stage").classList.remove("shake"), 420);
  await wait(400);
  if (S.rescues > 0) {
    S.rescues--;
    const su = dutyLead();
    modal(`
      <h2 style="color:${SUITS[su].color}">${LEADS[su].name} · 托住星盘</h2>
      <div class="m-text">星盘将倾,${LEADS[su].name}伸手稳住了它——</div>
      <div class="m-text" style="color:var(--gold-bright)">「${pick(LEADS[su].lines.rescue)}」</div>
      <button class="m-btn" id="mRev">握住他的手(清出空间)</button>
      <div class="m-sub" style="margin-top:8px">演示直接救场 · 正式版=男主/广告/分享复活位</div>`);
    $("mRev").onclick = async () => {
      closeModal(); say(su, "rescue", true);
      /* 清掉若干最低阶星屑腾空间 */
      const t0 = []; for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { const t = at(r, c); if (t && t.tier === 0) t0.push(t); }
      t0.sort(() => Math.random() - 0.5).slice(0, Math.min(6, t0.length)).forEach(t => { t.el.classList.add("merging"); t.el.style.setProperty("--mpos", t.el.style.getPropertyValue("--pos")); const r = t.r, c = t.c; setTimeout(() => t.el && t.el.remove(), 240); S.grid[r][c] = null; });
      await wait(320); S.busy = false; updateHud(); renderNext(); refreshHint();
    };
    return;
  }
  if (S.story) {
    const su = dutyLead();
    modal(`
      <h2>星盘满溢</h2><div class="m-sub">${layerName()} · 缝合 ${Math.floor(S.seam)}/${S.goal}</div>
      <div class="m-text" style="color:${SUITS[su].color}">${LEADS[su].name}:「${pick(LEADS[su].lines.rescue)}」</div>
      <button class="m-btn" id="mRetry">再缝一次这层</button>
      <button class="m-btn minor" id="mHome">先回标题</button>`);
    $("mRetry").onclick = () => { closeModal(); S.rescues = 1; startLayer(); };
    $("mHome").onclick = () => { closeModal(); backToTitle(); };
  } else {
    endlessSettle();
  }
}

/* ===================== 剧情流 ===================== */
async function runStage() {
  const st = STORY[S.stageIdx];
  S.story = true; S.mode = "story";
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
    modal(`<h2>选择委托</h2><div class="m-sub">驻场双主的花色星屑坠落更频繁</div>` +
      opts.map((o, i) => `<div class="pick-card" data-i="${i}"><div class="pick-icon">${o.pair.map(s => `<svg viewBox="0 0 48 48" style="color:${SUITS[s].color};width:20px;height:20px"><use href="${SUITS[s].glyph}"/></svg>`).join("")}</div><div><div class="pc-name">${o.title}</div><div class="pc-pair">${o.pair.map(s => `<span style="color:${SUITS[s].color}">${LEADS[s].name}</span>`).join(" × ")}</div></div></div>`).join(""));
    $("modal").querySelectorAll(".pick-card").forEach(card => card.onclick = async () => { const o = opts[+card.dataset.i]; S.commission = o; closeModal(); await runDialogue(o.intro); resolve(); });
  });
}
async function storyVictory() {
  await runDialogue([["sword", "最后一道裂隙……缝上了。"], ["cup", "你看,他的星座,整片都亮了。"], ["sys", "首夜记录完毕。事务所与裂隙处理室,从今夜起全面开放!"]]);
  save("zx_story", STORY.length);
  modal(`
    <svg class="title-octa" viewBox="0 0 48 48" style="width:40px;height:40px;color:var(--gold-bright);margin:0 auto 6px"><use href="#glyph-octa"/></svg>
    <div class="seal-card"><div class="sc-head">✦ 首夜完遂 ✦</div><div class="sc-big">裂隙,今夜安眠</div>
    <div class="m-text">点亮的星座,把他破碎的星魂缀回了一片。</div></div>
    <div class="m-stats">
      <div class="m-stat"><b>${S.seamTotal}</b><span>累计缝合</span></div>
      <div class="m-stat"><b>×${S.maxChain + 1}</b><span>最大连锁</span></div>
      <div class="m-stat"><b>${Object.values(S.litLeads).reduce((a, b) => a + b, 0)}</b><span>点亮星座</span></div>
    </div>
    <button class="m-btn" id="mEndless">进入 无尽夜</button>
    <button class="m-btn minor" id="mHome">回标题</button>`);
  $("mEndless").onclick = () => { closeModal(); startEndless(); };
  $("mHome").onclick = () => { closeModal(); backToTitle(); };
}

/* ===================== 无尽夜 ===================== */
async function startEndless() {
  S.story = false; S.mode = "endless"; S.guided = false;
  S.laws = []; S.commission = null; S.dust = S.dust || 0; S.seamTotal = 0; S.litLeads = {};
  S.endlessLayer = 1; S.layer = 1; S.goal = endlessGoal(1); S.rescues = 1; S.curTip = "缀满整片星空,刷新最深记录";
  $("titleScreen").style.display = "none"; $("app").style.display = "flex";
  $("dustHud").style.display = ""; $("relicRow").style.display = ""; $("btnArcana").style.display = "";
  const opts = COMMISSIONS.slice().sort(() => Math.random() - 0.5).slice(0, 2);
  await pickCommission(opts);
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
  const rows = TIERS.map((n, i) => `<tr><td class="cx-tier">${i + 1} 阶 · ${n}</td><td class="cx-desc">${i < TOP_TIER ? `同色 ${CLUSTER_MIN} 枚相邻 → ${i + 2} 阶` : "生成即升空,缝合一大段裂隙"}</td></tr>`).join("");
  modal(`
    <h2>玩法图鉴</h2><div class="m-sub">同色同阶 3 枚相邻即合成 · 花色 = 男主</div>
    <table class="codex-table">${rows}</table>
    <p class="m-text" style="font-size:12.5px">· <span class="kw">同色同阶</span>星屑 3 枚 4 邻接相连 → 合成升一阶,可连锁<br>· 颜色不同 <span class="kw">合不到一块儿</span>;一种颜色 = 一位男主<br>· 同色合到顶阶「星座」<span class="kw">自动升空缝合</span>裂隙 + 唤回他的记忆<br>· 星盘塞满 = 过载,驻场男主托住救场<br>· 命运之轮每层一次:重排 / 拔擢 / 坍缩<br>· 过层选「星象法则」改写规则(roguelike)</p>
    <button class="m-btn" id="mClose">回到星盘</button>`);
  $("mClose").onclick = () => { if ($("app").style.display === "none") backToTitle(); else closeModal(); };
}

/* ===================== 标题 ===================== */
function showTitle() { backToTitle(); }
function backToTitle() {
  S.busy = false; closeModal();
  $("app").style.display = "none"; $("dlgLayer").style.display = "none"; $("titleScreen").style.display = "flex";
  const done = storyDone();
  const btnStory = $("btnStory"), btnEnd = $("btnEndless");
  if (done >= STORY.length) { btnStory.textContent = "✦ 重温首夜"; btnEnd.disabled = false; const b = load("zx_endlessBest", 0); btnEnd.textContent = b ? `无尽夜(最深 ${b} 层)` : "无尽夜"; }
  else { btnStory.textContent = done === 0 ? "✦ 首夜 · 剧情远征" : `✦ 继续 · ${STORY[done].name}`; btnEnd.disabled = true; btnEnd.textContent = "无尽夜(完成首夜解锁)"; }
}
function bindUI() {
  $("btnStory").onclick = () => { startBgm(); S.story = true; S.laws = []; S.commission = null; S.dust = 0; S.seamTotal = 0; S.litLeads = {}; S.stageIdx = storyDone() >= STORY.length ? 0 : storyDone(); runStage(); };
  $("btnEndless").onclick = () => { startBgm(); startEndless(); };
  $("btnHelp").onclick = () => { if (!S.busy) showCodex(); };
  $("btnHelp2").onclick = showCodex;
  $("btnHome").onclick = () => { if (!S.busy) backToTitle(); };
  $("btnArcana").onclick = onArcana;
  $("btnReset").onclick = () => { save("zx_story", 0); save("zx_endlessBest", 0); toast("进度已重置"); backToTitle(); };
  const sb = $("btnSound"); sb.classList.toggle("off", !S.sound);
  sb.onclick = () => { S.sound = !S.sound; save("zx_sound", S.sound); sb.classList.toggle("off", !S.sound); if (bgm) bgm.muted = !S.sound; };
  addEventListener("resize", () => { if ($("app").style.display === "none") return; layoutBoard(); for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { const t = S.grid[r][c]; if (t) applyPos(t, true); } });
}

/* ===================== 启动 ===================== */
bindBoard(); bindUI(); showTitle();
