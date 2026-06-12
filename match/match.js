/* ============================================================
   星屑缝合 · 消除测试版(方案 M)
   对决设计稿见 docs/09。验证原型:立绘/语音占位,等资产到位再换。
   ============================================================ */
"use strict";

/* ===================== 配置 ===================== */
const SUIT_META = {
  wand:  { name: "权杖", color: "#ff6b4a", glyph: "#glyph-wand" },
  coin:  { name: "星币", color: "#f0c75e", glyph: "#glyph-coin" },
  sword: { name: "宝剑", color: "#7fd6c2", glyph: "#glyph-sword" },
  cup:   { name: "圣杯", color: "#6f9bff", glyph: "#glyph-cup" },
  dust:  { name: "星尘", color: "#cfc8ff", glyph: "#glyph-dust" },
};
/* 四男主 = 四花色 = 四特殊块语法(docs/09 §2) */
const SP_BY_SUIT = { wand: "row", coin: "blast", sword: "col", cup: "tide" };
const SP_NAME = { row: "焰痕", blast: "金辉", col: "剑光", tide: "潮愈", wheel: "星轮" };

const LEADS = {
  wand: { name: "炎烈", glyph: "#glyph-wand", color: "#ff6b4a",
    lines: {
      start:   ["今天的裂隙,看起来很欠烧。", "跟上我的节奏,别眨眼。"],
      special: ["烧起来了——这一行,我替你清!", "就是现在,火力全开!"],
      chain:   ["连得漂亮!再来!", "这股势头,我喜欢!"],
      low:     ["还差一点?那就更要稳住。", "别怕,把最后几步交给手感。"],
      win:     ["赢了!……喂,刚才那下是不是很帅?", "看见没,这就叫干脆利落!"],
      rescue:  ["谁准你放弃的?手给我。", "差这三步?我借你。"],
    } },
  coin: { name: "沈寂", glyph: "#glyph-coin", color: "#f0c75e",
    lines: {
      start:   ["按计划进行,很好。", "今晚的账,我们一笔一笔算。"],
      special: ["金辉入账。这一片,清了。", "按计划——引爆。"],
      chain:   ["连锁收益,很可观。", "复利的美,你刚刚见到了。"],
      low:     ["剩余步数不多。冷静,听我的。", "越是最后,越不要乱。"],
      win:     ["结算完成。收益率——超出预期。", "这单委托,值得记进年报。"],
      rescue:  ["亏损可以止住。手,伸出来。", "追加三步预算。这次别浪费。"],
    } },
  sword: { name: "叶渊", glyph: "#glyph-sword", color: "#7fd6c2",
    lines: {
      start:   ["情报核对完毕。开始吧。", "别紧张,照我说的做就好。"],
      special: ["剑光至——这一列,没了。", "我说过,这是最优解。"],
      chain:   ["看吧,连起来了。你总是比我的预测,好上一点点。", "漂亮。这步棋我都没算到。"],
      low:     ["两步定胜负。别慌,有我。", "收线了。按直觉走,你的直觉不差。"],
      win:     ["完美收束。和情报里写的一样……不,比那更好。", "看吧,我就说你做得到。"],
      rescue:  ["想都别想输。抓紧我。", "预案启动——三步,够你翻盘。"],
    } },
  cup: { name: "宋以衡", glyph: "#glyph-cup", color: "#6f9bff",
    lines: {
      start:   ["别紧张,我陪你。", "今晚的星光,很适合你。"],
      special: ["潮水来了……让它带走阻碍,也带来两步从容。", "慢慢来,不急。"],
      chain:   ["你看,星光都在偏爱你。", "嗯,这个节奏,很温柔,也很正确。"],
      low:     ["深呼吸。我陪你走完最后两步。", "没关系,你已经做得很好了。"],
      win:     ["辛苦了。今天……也想被你夸一夸。", "嗯,完成得很漂亮。回去喝杯热的吧。"],
      rescue:  ["我在。手给我,我们一起。", "再走三步……这次,靠着我走。"],
    } },
};
const SYS = { name: "AI 灵宝", glyph: "#glyph-octa", color: "#d8b46a" };

const COMMISSIONS = [
  { id: "cold", name: "冷局推演", pair: ["sword", "coin"],
    desc: "宝剑/星币星屑更多出现,其星光 ×1.5",
    open: [
      { who: "sword", text: "叶渊×沈寂,双驻场。情报与账目,都不会出错。" },
      { who: "coin",  text: "效率优先。别让推演落空。" }] },
  { id: "tide", name: "焰与潮", pair: ["wand", "cup"],
    desc: "权杖/圣杯星屑更多出现,其星光 ×1.5",
    open: [
      { who: "wand", text: "火力我来,温柔他来——你只管赢。" },
      { who: "cup",  text: "嗯,放心往前冲,后面有我。" }] },
  { id: "gold", name: "燃金之约", pair: ["wand", "coin"],
    desc: "权杖/星币星屑更多出现,其星光 ×1.5",
    open: [
      { who: "wand", text: "烧出来的每一分,都让他记到账上!" },
      { who: "coin", text: "……可以。燃烧也是一种投资。" }] },
  { id: "soft", name: "刃上温柔", pair: ["sword", "cup"],
    desc: "宝剑/圣杯星屑更多出现,其星光 ×1.5",
    open: [
      { who: "sword", text: "锋利的部分给裂隙,柔软的部分——给你。" },
      { who: "cup",   text: "他嘴硬,但今晚我们都站你这边。" }] },
];

/* ============ 剧情点(docs/09 §1,占位稿,终稿以编剧为准)============ */
const STORY = [
  { id: "S1", name: "序章 · 电梯惊停", elevator: "alarm",
    pre: [
      { who: "sys",   text: "警告——无尽电梯检测到裂隙湍流,下行暂停。重复:下行暂停。" },
      { who: "sword", text: "别慌。抓稳扶手,看我手势。" },
      { who: "sword", text: "裂隙在吞星屑。把同色的星屑连成三个,它们就会化作星光,补进裂缝里。" },
      { who: "sword", text: "来,试试。放心——这一次有我护航,星屑不会减少。我看着你。" }],
    post: [
      { who: "sword", text: "……稳住了。第一次就能做到这个程度,不错。" },
      { who: "sword", text: "电梯恢复下行。等到了处理室,我正式教你。" },
      { who: "sys",   text: "记录:苏星轮小姐的第一次裂隙校准——完成度,超出预期。" }],
    level: { cols: 6, rows: 6, colors: ["wand", "coin", "sword", "cup"],
             goal: 40, moves: null, leads: ["sword"], guided: true,
             tip: "交换相邻星屑,连成 3 个同色 · 本关步数不减" } },
  { id: "S2", name: "第一夜 · 处理室初开", elevator: "calm",
    pre: [
      { who: "sword", text: "这里是裂隙处理室。以后,这里就是你的「战场」之一。" },
      { who: "sword", text: "记住一件事:一次连起 4 个以上,星屑会凝成「印记」——那是我们四个人借给你的力量。" },
      { who: "sword", text: "红色焰痕是炎烈的脾气,横扫一行;我的剑光,纵贯一列;金辉是沈寂的手笔,潮愈是宋以衡的温柔。" },
      { who: "sword", text: "凑出来,再消除它,你就明白了。" }],
    post: [
      { who: "sword", text: "看吧,我就说你做得到。" },
      { who: "sword", text: "对了——刚才那道剑光的弧度,和我本人一样漂亮。" }],
    level: { cols: 7, rows: 7, colors: ["wand", "coin", "sword", "cup", "dust"],
             goal: 80, moves: 18, leads: ["sword"],
             tip: "连 4 个以上凝成印记,再消除它即可发动" } },
  { id: "S3", name: "第二夜 · 星象低语", elevator: "calm",
    pre: [
      { who: "cup", text: "听,星核穹顶在响。别怕——它在认你。" },
      { who: "cup", text: "这枚信物,叫「命运之轮」。开局时,它会化作星轮印记,落在场上。" },
      { who: "cup", text: "让星轮和任意相邻的星屑交换,就能清掉全场同色——像把命运,轻轻拨快一格。" },
      { who: "cup", text: "拿着吧。从今天起,它只听你的。" }],
    post: [
      { who: "cup", text: "嗯,这个完成度,很温柔,也很正确。" },
      { who: "cup", text: "下次……也让我陪你来,好吗?" }],
    level: { cols: 7, rows: 7, colors: ["wand", "coin", "sword", "cup", "dust"],
             goal: 100, moves: 18, leads: ["cup"], startWheel: true,
             tip: "场上有星轮:点它,再点相邻星屑,同色全清" } },
  { id: "S4", name: "第三夜 · 双人委托", elevator: "calm",
    pre: [
      { who: "sys", text: "叮——事务所第一张正式委托抵达!" },
      { who: "sys", text: "本次裂隙强度提升,允许两位先生同时驻场。请选择本次委托的搭档组合。" }],
    post: [
      { who: "sys", text: "委托完成!事务所与裂隙处理室,从今天起全面向您开放。" },
      { who: "sys", text: "「自由校准」模式已解锁——每一夜,都可以选不同的先生陪您出战。" }],
    commission: ["cold", "tide"],
    level: { cols: 7, rows: 7, colors: ["wand", "coin", "sword", "cup", "dust"],
             goal: 130, moves: 20, leads: [],
             tip: "驻场男主的花色星光 ×1.5" } },
];

/* ===================== 状态 ===================== */
const S = {
  mode: "story", stageIdx: 0, freeLevel: 1,
  cols: 7, rows: 7, colors: [], grid: [],
  cell: 48, pad: 8,
  moves: 0, movesFree: false, star: 0, goal: 100,
  maxChain: 0, busy: false, sel: null,
  leads: ["sword"], commission: null, levelCfg: null,
  rescueUsed: false, guided: false,
  flags: load("ssfh_flags", {}),
  sound: load("ssfh_sound", true),
};
let tileSeq = 0;
const $ = (id) => document.getElementById(id);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
function load(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } }
function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
const storyDone = () => load("ssfh_story", 0);

/* ===================== 音频 ===================== */
let AC = null, bgm = null;
function ac() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch {} } return AC; }
function tone(freq, dur, type = "sine", vol = 0.1, when = 0) {
  if (!S.sound) return; const ctx = ac(); if (!ctx) return;
  const t = ctx.currentTime + when;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + dur + 0.05);
}
function sfxPop(i, chain) { tone(390 * Math.pow(1.059, i + chain * 3), 0.16, "triangle", 0.09); }
function sfxSpecial(kind) {
  if (!S.sound) return;
  if (kind === "row" || kind === "col") { tone(220, 0.22, "sawtooth", 0.06); tone(880, 0.18, "sine", 0.08, 0.06); }
  else if (kind === "blast") { tone(130, 0.3, "square", 0.07); tone(520, 0.2, "triangle", 0.08, 0.04); }
  else if (kind === "tide") { tone(330, 0.4, "sine", 0.09); tone(247, 0.45, "sine", 0.07, 0.12); }
  else { [659, 831, 988, 1318].forEach((f, i) => tone(f, 0.18, "sine", 0.08, i * 0.07)); }
}
function sfxWin() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.4, "sine", 0.1, i * 0.13)); }
function sfxLose() { [330, 262, 208].forEach((f, i) => tone(f, 0.5, "sine", 0.08, i * 0.2)); }
function sfxFail() { tone(150, 0.12, "square", 0.05); }
function startBgm() {
  if (bgm) return;
  bgm = new Audio("../bgm.mp3"); bgm.loop = true; bgm.volume = 0.3;
  bgm.play().catch(() => { bgm = null; });
}

/* ===================== 星空背景 ===================== */
(function starfield() {
  const cv = $("starfield"), cx = cv.getContext("2d");
  let stars = [];
  function reset() {
    cv.width = innerWidth; cv.height = innerHeight;
    stars = Array.from({ length: 90 }, () => ({
      x: Math.random() * cv.width, y: Math.random() * cv.height,
      r: Math.random() * 1.3 + 0.3, p: Math.random() * Math.PI * 2, s: 0.4 + Math.random() * 1.2,
    }));
  }
  reset(); addEventListener("resize", reset);
  (function frame(t) {
    cx.clearRect(0, 0, cv.width, cv.height);
    for (const st of stars) {
      const a = 0.25 + 0.55 * Math.abs(Math.sin(st.p + t * 0.0006 * st.s));
      cx.globalAlpha = a; cx.fillStyle = "#dfe6ff";
      cx.beginPath(); cx.arc(st.x, st.y, st.r, 0, 7); cx.fill();
    }
    requestAnimationFrame(frame);
  })(0);
})();

/* ===================== 裂隙帧 ===================== */
const FRAME = (n) => `../assets/city/cf_${String(n).padStart(3, "0")}.jpg`;
const frameCache = {};
function preloadFrames(a, b) { for (let i = a; i <= b; i++) { if (!frameCache[i]) { const im = new Image(); im.src = FRAME(i); frameCache[i] = im; } } }
function riftProgress(p) {
  const idx = 1 + Math.round(Math.max(0, Math.min(1, p)) * 38);
  $("riftFrame").src = FRAME(idx);
  $("riftGlow").style.opacity = String(1 - p * 0.65);
}
async function riftSettle() {
  $("stage").classList.add("sealed");
  for (let i = 40; i <= 61; i++) { $("riftFrame").src = FRAME(i); await wait(36); }
}

/* ===================== UI 基础 ===================== */
let toastTimer = null;
function toast(msg, dur = 2300) {
  const el = $("toast"); el.textContent = msg; el.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("show"), dur);
}
function banner(msg) {
  const el = $("comboBanner"); el.textContent = msg;
  el.classList.remove("show"); void el.offsetWidth; el.classList.add("show");
}
function modal(html) { $("modal").innerHTML = html; $("overlay").classList.add("show"); }
function closeModal() { $("overlay").classList.remove("show"); }
function floatScore(x, y, txt, size = 16) {
  const el = document.createElement("div");
  el.className = "float-score"; el.textContent = txt;
  el.style.cssText = `left:${x}px;top:${y}px;font-size:${size}px;transform:translateX(-50%)`;
  document.body.appendChild(el); setTimeout(() => el.remove(), 900);
}
function flyStars(x, y, n) {
  const bar = $("goalFill").getBoundingClientRect();
  const tx = bar.left + bar.width, ty = bar.top + bar.height / 2;
  for (let i = 0; i < n; i++) {
    const el = document.createElement("div");
    el.className = "fly-star"; el.textContent = "✦";
    el.style.cssText = `left:${x + (Math.random() - 0.5) * 30}px;top:${y + (Math.random() - 0.5) * 30}px;transition:transform ${0.5 + i * 0.08}s cubic-bezier(.4,0,.7,1),opacity .2s ${0.45 + i * 0.08}s`;
    document.body.appendChild(el);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.style.transform = `translate(${tx - x}px,${ty - y}px) scale(0.5)`; el.style.opacity = "0";
    }));
    setTimeout(() => el.remove(), 1100);
  }
}

/* ===================== 男主台词 ===================== */
let lastSayAt = 0;
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function setLeadBar() {
  const a = S.leads[0] ? LEADS[S.leads[0]] : null;
  if (a) { $("leadGlyph").setAttribute("href", a.glyph); $("leadAvatar").style.color = a.color; $("lbName").textContent = a.name; }
  const second = S.leads[1] ? LEADS[S.leads[1]] : null;
  $("leadAvatar2").style.display = second ? "flex" : "none";
  if (second) { $("leadGlyph2").setAttribute("href", second.glyph); $("leadAvatar2").style.color = second.color; }
}
function say(suit, kind, force = false) {
  const lead = LEADS[suit]; if (!lead) return;
  const now = Date.now();
  if (!force && now - lastSayAt < 5500) return;
  lastSayAt = now;
  $("leadGlyph").setAttribute("href", lead.glyph);
  $("leadAvatar").style.color = lead.color;
  $("lbName").textContent = lead.name;
  const t = $("lbText"); t.textContent = pick(lead.lines[kind] || ["…"]);
  t.classList.remove("pop"); void t.offsetWidth; t.classList.add("pop");
  $("leadAvatar").classList.remove("flash"); void $("leadAvatar").offsetWidth; $("leadAvatar").classList.add("flash");
}

/* ===================== 对白系统 ===================== */
function runDialogue(seq) {
  return new Promise((resolve) => {
    const layer = $("dlgLayer"); let i = 0, typing = false, timer = null;
    function show() {
      const item = seq[i];
      const who = item.who === "sys" ? SYS : { name: LEADS[item.who].name, glyph: LEADS[item.who].glyph, color: LEADS[item.who].color };
      $("dlgGlyph").setAttribute("href", who.glyph);
      $("dlgAvatar").style.color = who.color;
      $("dlgName").textContent = who.name;
      const t = $("dlgText"); t.textContent = ""; typing = true;
      let c = 0;
      timer = setInterval(() => {
        c++; t.textContent = item.text.slice(0, c);
        if (c >= item.text.length) { clearInterval(timer); typing = false; }
      }, 26);
    }
    function tap() {
      if (typing) { clearInterval(timer); $("dlgText").textContent = seq[i].text; typing = false; return; }
      i++;
      if (i >= seq.length) { layer.style.display = "none"; layer.onclick = null; resolve(); }
      else show();
    }
    layer.style.display = "flex"; layer.onclick = tap; show();
  });
}

/* ===================== 网格核心 ===================== */
function suitWeights() {
  const w = {};
  for (const s of S.colors) w[s] = 1;
  if (S.commission) {
    for (const s of S.colors) w[s] = S.commission.pair.includes(s) ? 1.35 : (s === "dust" ? 0.9 : 0.8);
  }
  return w;
}
function randSuit(w) {
  let total = 0; for (const s of S.colors) total += w[s];
  let r = Math.random() * total;
  for (const s of S.colors) { r -= w[s]; if (r <= 0) return s; }
  return S.colors[0];
}
function makeTile(suit, sp = null) { return { id: ++tileSeq, suit, sp, el: null, r: 0, c: 0 }; }
function genGrid() {
  const w = suitWeights();
  let guard = 0;
  do {
    S.grid = [];
    for (let r = 0; r < S.rows; r++) {
      const row = [];
      for (let c = 0; c < S.cols; c++) {
        let suit;
        do { suit = randSuit(w); }
        while ((c >= 2 && row[c - 1].suit === suit && row[c - 2].suit === suit) ||
               (r >= 2 && S.grid[r - 1][c].suit === suit && S.grid[r - 2][c].suit === suit));
        row.push(makeTile(suit));
      }
      S.grid.push(row);
    }
  } while (!findMove() && ++guard < 60);
  if (S.levelCfg && S.levelCfg.startWheel) {
    const t = S.grid[Math.floor(S.rows / 2)][Math.floor(S.cols / 2)];
    t.sp = "wheel"; t.suit = null;
  }
}
function inBounds(r, c) { return r >= 0 && r < S.rows && c >= 0 && c < S.cols; }
function tileAt(r, c) { return inBounds(r, c) ? S.grid[r][c] : null; }

/* 匹配组(行列扫描 + 同色重叠合并) */
function findGroups() {
  const runs = [];
  for (let r = 0; r < S.rows; r++) {
    let c = 0;
    while (c < S.cols) {
      const t = tileAt(r, c);
      if (!t || !t.suit) { c++; continue; }
      let len = 1;
      while (c + len < S.cols && tileAt(r, c + len) && tileAt(r, c + len).suit === t.suit) len++;
      if (len >= 3) runs.push({ suit: t.suit, cells: Array.from({ length: len }, (_, i) => ({ r, c: c + i })) });
      c += len;
    }
  }
  for (let c = 0; c < S.cols; c++) {
    let r = 0;
    while (r < S.rows) {
      const t = tileAt(r, c);
      if (!t || !t.suit) { r++; continue; }
      let len = 1;
      while (r + len < S.rows && tileAt(r + len, c) && tileAt(r + len, c).suit === t.suit) len++;
      if (len >= 3) runs.push({ suit: t.suit, cells: Array.from({ length: len }, (_, i) => ({ r: r + i, c })) });
      r += len;
    }
  }
  /* 合并共享格的同色 run(L/T 形) */
  const groups = [];
  for (const run of runs) {
    let target = null;
    for (const g of groups) {
      if (g.suit !== run.suit) continue;
      if (run.cells.some((rc) => g.keys.has(rc.r + "," + rc.c))) { target = g; break; }
    }
    if (!target) { target = { suit: run.suit, cells: [], keys: new Set() }; groups.push(target); }
    for (const rc of run.cells) {
      const k = rc.r + "," + rc.c;
      if (!target.keys.has(k)) { target.keys.add(k); target.cells.push(rc); }
    }
  }
  return groups;
}
/* 模拟交换找可行步 */
function swapData(a, b) {
  const ta = S.grid[a.r][a.c], tb = S.grid[b.r][b.c];
  S.grid[a.r][a.c] = tb; S.grid[b.r][b.c] = ta;
  if (ta) { ta.r = b.r; ta.c = b.c; } if (tb) { tb.r = a.r; tb.c = a.c; }
}
function wouldMatch(a, b) {
  swapData(a, b);
  const hit = findGroups().length > 0;
  swapData(a, b);
  return hit;
}
function findMove() {
  for (let r = 0; r < S.rows; r++) for (let c = 0; c < S.cols; c++) {
    const t = tileAt(r, c); if (!t) continue;
    if (t.sp === "wheel") return { a: { r, c }, b: { r, c: c + 1 < S.cols ? c + 1 : c - 1 } };
    for (const [dr, dc] of [[0, 1], [1, 0]]) {
      const r2 = r + dr, c2 = c + dc;
      if (!inBounds(r2, c2) || !tileAt(r2, c2)) continue;
      if (wouldMatch({ r, c }, { r: r2, c: c2 })) return { a: { r, c }, b: { r: r2, c: c2 } };
    }
  }
  return null;
}

/* ===================== 渲染 ===================== */
function layoutBoard() {
  const wrap = $("boardWrap");
  const availW = wrap.clientWidth - 8, availH = wrap.clientHeight - 8;
  S.cell = Math.max(34, Math.min(Math.floor((availW - S.pad * 2) / S.cols), Math.floor((availH - S.pad * 2) / S.rows), 58));
  const bw = S.cell * S.cols + S.pad * 2, bh = S.cell * S.rows + S.pad * 2;
  const board = $("board");
  board.style.width = bw + "px"; board.style.height = bh + "px";
  board.querySelectorAll(".cell-bg").forEach((e) => e.remove());
  for (let r = 0; r < S.rows; r++) for (let c = 0; c < S.cols; c++) {
    const bg = document.createElement("div");
    bg.className = "cell-bg";
    bg.style.cssText = `left:${S.pad + c * S.cell + 2}px;top:${S.pad + r * S.cell + 2}px;width:${S.cell - 4}px;height:${S.cell - 4}px`;
    board.appendChild(bg);
  }
}
function posXY(r, c) { return { x: S.pad + c * S.cell + 2, y: S.pad + r * S.cell + 2 }; }
function applyPos(t, instant = false) {
  const { x, y } = posXY(t.r, t.c);
  if (instant) t.el.style.transition = "none";
  t.el.style.setProperty("--pos", `translate(${x}px,${y}px)`);
  t.el.style.transform = `var(--pos)`;
  t.el.style.width = S.cell - 4 + "px"; t.el.style.height = S.cell - 4 + "px";
  if (instant) { void t.el.offsetWidth; t.el.style.transition = ""; }
}
function tileClass(t) {
  let cls = "tile t-" + (t.suit || "wheel");
  if (t.sp) cls += " sp sp-" + t.sp;
  return cls;
}
function tileGlyph(t) { return t.sp === "wheel" ? "#glyph-wheel" : SUIT_META[t.suit].glyph; }
function createTileEl(t, fromAbove = 0) {
  const el = document.createElement("div");
  el.className = tileClass(t);
  el.innerHTML = `<svg viewBox="0 0 48 48" fill="none"><use href="${tileGlyph(t)}"/></svg>`;
  el._tile = t; t.el = el;
  $("board").appendChild(el);
  if (fromAbove > 0) { const save = t.r; t.r = -fromAbove; applyPos(t, true); t.r = save; requestAnimationFrame(() => applyPos(t)); }
  else applyPos(t, true);
}
function renderAll() {
  $("board").querySelectorAll(".tile").forEach((e) => e.remove());
  for (let r = 0; r < S.rows; r++) for (let c = 0; c < S.cols; c++) {
    const t = tileAt(r, c); if (!t) continue;
    t.r = r; t.c = c; createTileEl(t);
  }
}
function updateHud() {
  $("starNow").textContent = Math.floor(S.star);
  $("starGoal").textContent = S.goal;
  $("goalFill").style.width = Math.min(100, (S.star / S.goal) * 100) + "%";
  const mh = $("movesHud");
  mh.textContent = S.movesFree ? "步 ∞" : "步 " + S.moves;
  mh.classList.toggle("low", !S.movesFree && S.moves <= 3);
  $("stage").classList.toggle("crisis", !S.movesFree && S.moves <= 3 && S.star < S.goal);
  riftProgress(S.star / S.goal);
}

/* ===================== 特殊块效果 ===================== */
function effectCells(t) {
  const cells = [];
  if (t.sp === "row") { for (let c = 0; c < S.cols; c++) cells.push({ r: t.r, c }); }
  else if (t.sp === "col") { for (let r = 0; r < S.rows; r++) cells.push({ r, c: t.c }); }
  else if (t.sp === "blast") {
    for (let r = t.r - 1; r <= t.r + 1; r++) for (let c = t.c - 1; c <= t.c + 1; c++)
      if (inBounds(r, c)) cells.push({ r, c });
  } else if (t.sp === "tide") {
    for (let r = 0; r < S.rows; r++) for (let c = 0; c < S.cols; c++) {
      const x = tileAt(r, c); if (x && x.suit === "cup") cells.push({ r, c });
    }
  } else if (t.sp === "wheel") {
    const present = [...new Set(S.grid.flat().filter((x) => x && x.suit).map((x) => x.suit))];
    const suit = pick(present);
    for (let r = 0; r < S.rows; r++) for (let c = 0; c < S.cols; c++) {
      const x = tileAt(r, c); if (x && x.suit === suit) cells.push({ r, c });
    }
  }
  return cells;
}
function expandSpecials(clearSet, fired) {
  const queue = [];
  for (const k of clearSet) {
    const [r, c] = k.split(",").map(Number);
    const t = tileAt(r, c);
    if (t && t.sp) queue.push(t);
  }
  const seen = new Set(queue.map((t) => t.id));
  while (queue.length) {
    const t = queue.shift();
    fired.push(t);
    if (t.sp === "tide" && !S.movesFree) { S.moves += 2; toast("潮愈:步数 +2"); }
    for (const rc of effectCells(t)) {
      const k = rc.r + "," + rc.c;
      if (clearSet.has(k)) continue;
      clearSet.add(k);
      const x = tileAt(rc.r, rc.c);
      if (x && x.sp && !seen.has(x.id)) { seen.add(x.id); queue.push(x); }
    }
  }
}

/* ===================== 消除波次 ===================== */
function starValue(t) {
  if (S.commission && t.suit && S.commission.pair.includes(t.suit)) return 1.5;
  return 1;
}
async function clearWave(clearSet, spawns, chain, fired) {
  /* 台词 / 教学 / 音效 */
  for (const t of fired) {
    sfxSpecial(t.sp);
    if (t.sp === "wheel") {
      if (!S.flags.wheelFired) { S.flags.wheelFired = 1; save("ssfh_flags", S.flags); toast("星轮转动——同色星屑全数化光!"); }
    } else {
      const suit = Object.keys(SP_BY_SUIT).find((s) => SP_BY_SUIT[s] === t.sp);
      const fk = "sp_" + t.sp;
      if (!S.flags[fk]) { S.flags[fk] = 1; save("ssfh_flags", S.flags); toast(`${SP_NAME[t.sp]}·${LEADS[suit].name}:${t.sp === "row" ? "横扫一行!" : t.sp === "col" ? "纵贯一列!" : t.sp === "blast" ? "3×3 爆破!" : "清除全部圣杯 + 步数+2!"}`); }
      say(suit, "special", fired.length === 1 && Math.random() < 0.55);
    }
  }
  /* 计星 */
  let stars = 0; let cx = 0, cy = 0, n = 0;
  for (const k of clearSet) {
    const [r, c] = k.split(",").map(Number);
    const t = tileAt(r, c); if (!t) continue;
    stars += starValue(t);
    const p = posXY(r, c); cx += p.x; cy += p.y; n++;
  }
  if (!n) return;
  cx = cx / n + S.cell / 2; cy = cy / n + S.cell / 2;
  const factor = 1 + 0.5 * (chain - 1);
  stars = Math.round(stars * factor);
  /* 动画 */
  let i = 0;
  for (const k of clearSet) {
    const [r, c] = k.split(",").map(Number);
    const t = tileAt(r, c); if (!t) continue;
    t.el.classList.add("clearing");
    sfxPop(i++, chain);
  }
  const rect = $("board").getBoundingClientRect();
  floatScore(rect.left + cx, rect.top + cy, "+" + stars, Math.min(15 + chain * 3 + Math.floor(clearSet.size / 3) * 2, 30));
  flyStars(rect.left + cx, rect.top + cy, Math.min(3 + Math.floor(stars / 8), 7));
  if (chain >= 2) { banner(`连星 ×${chain}`); if (chain >= 3) say(pick(S.leads), "chain"); }
  await wait(300);
  /* 移除 + 生成印记 */
  for (const k of clearSet) {
    const [r, c] = k.split(",").map(Number);
    const t = tileAt(r, c); if (!t) continue;
    t.el.remove(); S.grid[r][c] = null;
  }
  for (const sp of spawns) {
    const { r, c } = sp.pos;
    if (S.grid[r][c]) continue;
    const t = makeTile(sp.suit, sp.sp);
    t.r = r; t.c = c; S.grid[r][c] = t; createTileEl(t);
    t.el.style.transform = "var(--pos) scale(0.2)";
    requestAnimationFrame(() => { t.el.style.transform = "var(--pos)"; });
    if (!S.flags.firstSpawn && sp.sp !== "wheel") { S.flags.firstSpawn = 1; save("ssfh_flags", S.flags); toast("凝成印记了!再消除它,看看会发生什么"); }
    if (sp.sp === "wheel" && !S.flags.wheelSpawn) { S.flags.wheelSpawn = 1; save("ssfh_flags", S.flags); toast("星轮诞生!点它,再点相邻星屑——同色全清"); }
  }
  S.star += stars; S.maxChain = Math.max(S.maxChain, chain);
  updateHud();
  /* 重力 + 补位 */
  const w = suitWeights();
  for (let c = 0; c < S.cols; c++) {
    let write = S.rows - 1;
    for (let r = S.rows - 1; r >= 0; r--) {
      const t = tileAt(r, c);
      if (t) {
        if (write !== r) { S.grid[write][c] = t; S.grid[r][c] = null; t.r = write; applyPos(t); }
        write--;
      }
    }
    let k = 1;
    for (let r = write; r >= 0; r--) {
      const t = makeTile(randSuit(w));
      t.r = r; t.c = c; S.grid[r][c] = t;
      createTileEl(t, k++);
    }
  }
  await wait(270);
}
function buildWave(swapInfo) {
  const groups = findGroups();
  if (!groups.length) return null;
  const clearSet = new Set(), spawns = [], fired = [];
  for (const g of groups) {
    for (const rc of g.cells) clearSet.add(rc.r + "," + rc.c);
    if (g.cells.length >= 4) {
      let pos = g.cells[Math.floor(g.cells.length / 2)];
      if (swapInfo) {
        const hit = g.cells.find((rc) => (rc.r === swapInfo.a.r && rc.c === swapInfo.a.c) || (rc.r === swapInfo.b.r && rc.c === swapInfo.b.c));
        if (hit) pos = hit;
      }
      if (g.cells.length >= 5) spawns.push({ pos, sp: "wheel", suit: null });
      else if (g.suit !== "dust") spawns.push({ pos, sp: SP_BY_SUIT[g.suit], suit: g.suit });
    }
  }
  expandSpecials(clearSet, fired);
  return { clearSet, spawns, fired };
}
async function cascadeLoop(startChain, swapInfo) {
  let chain = startChain;
  while (true) {
    const wave = buildWave(chain === startChain ? swapInfo : null);
    if (!wave) break;
    await clearWave(wave.clearSet, wave.spawns, chain, wave.fired);
    chain++;
  }
}

/* ===================== 输入与回合 ===================== */
function useMove() { if (!S.movesFree) { S.moves--; } updateHud(); }
function clearSel() { if (S.sel) { S.sel.el.classList.remove("sel"); S.sel = null; } }
function adjacent(a, b) { return Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1; }

async function trySwap(a, b) {
  if (S.busy) return;
  const ta = tileAt(a.r, a.c), tb = tileAt(b.r, b.c);
  if (!ta || !tb) return;
  S.busy = true; clearSel(); stopHint();
  /* 星轮交换 */
  if (ta.sp === "wheel" || tb.sp === "wheel") {
    swapData(a, b); applyPos(ta); applyPos(tb);
    await wait(200);
    useMove();
    const wheel = ta.sp === "wheel" ? ta : tb;
    const other = wheel === ta ? tb : ta;
    const clearSet = new Set(), fired = [];
    if (other.sp === "wheel") {
      for (let r = 0; r < S.rows; r++) for (let c = 0; c < S.cols; c++) if (tileAt(r, c)) clearSet.add(r + "," + c);
      banner("双轮共鸣!");
    } else {
      for (let r = 0; r < S.rows; r++) for (let c = 0; c < S.cols; c++) {
        const x = tileAt(r, c); if (x && x.suit === other.suit) clearSet.add(r + "," + c);
      }
      clearSet.add(wheel.r + "," + wheel.c);
    }
    sfxSpecial("wheel");
    expandSpecials(clearSet, fired);
    await clearWave(clearSet, [], 1, fired);
    await cascadeLoop(2, null);
    await endOfMove();
    return;
  }
  /* 普通交换 */
  swapData(a, b); applyPos(ta); applyPos(tb);
  await wait(210);
  if (!findGroups().length) {
    swapData(a, b); applyPos(ta); applyPos(tb);
    ta.el.classList.add("shake"); tb.el.classList.add("shake");
    sfxFail();
    setTimeout(() => { ta.el.classList.remove("shake"); tb.el.classList.remove("shake"); }, 320);
    await wait(230);
    S.busy = false; startHint();
    return;
  }
  useMove();
  await cascadeLoop(1, { a, b });
  await endOfMove();
}
async function endOfMove() {
  if (S.star >= S.goal) { S.busy = false; await onWin(); return; }
  if (!S.movesFree && S.moves <= 0) { S.busy = false; await onOutOfMoves(); return; }
  if (!findMove()) {
    toast("星屑重排中…");
    await wait(500); genGrid(); renderAll();
  }
  if (!S.movesFree && S.moves === 2) say(pick(S.leads), "low");
  S.busy = false; startHint();
}

/* 指针输入:点选 + 拖拽 */
let dragStart = null;
function bindBoard() {
  const board = $("board");
  board.addEventListener("pointerdown", (e) => {
    if (S.busy) return;
    const el = e.target.closest(".tile"); if (!el) return;
    dragStart = { t: el._tile, x: e.clientX, y: e.clientY };
  });
  board.addEventListener("pointermove", (e) => {
    if (!dragStart || S.busy) return;
    const dx = e.clientX - dragStart.x, dy = e.clientY - dragStart.y;
    if (Math.abs(dx) < 16 && Math.abs(dy) < 16) return;
    const t = dragStart.t; dragStart = null;
    const dir = Math.abs(dx) > Math.abs(dy) ? { r: 0, c: dx > 0 ? 1 : -1 } : { r: dy > 0 ? 1 : -1, c: 0 };
    const b = { r: t.r + dir.r, c: t.c + dir.c };
    if (inBounds(b.r, b.c)) trySwap({ r: t.r, c: t.c }, b);
  });
  board.addEventListener("pointerup", (e) => {
    if (!dragStart) return;
    const t = dragStart.t; dragStart = null;
    if (S.busy) return;
    if (!S.sel) { S.sel = t; t.el.classList.add("sel"); return; }
    if (S.sel === t) { clearSel(); return; }
    const a = { r: S.sel.r, c: S.sel.c }, b = { r: t.r, c: t.c };
    if (adjacent(a, b)) { trySwap(a, b); }
    else { clearSel(); S.sel = t; t.el.classList.add("sel"); }
  });
}

/* 引导提示 */
let hintTimer = null, hintTiles = [];
function stopHint() {
  clearTimeout(hintTimer);
  hintTiles.forEach((t) => t.el && t.el.classList.remove("hintGlow"));
  hintTiles = [];
  $("guideHand").style.display = "none";
}
function showHint() {
  const mv = findMove(); if (!mv) return;
  const ta = tileAt(mv.a.r, mv.a.c), tb = tileAt(mv.b.r, mv.b.c);
  if (!ta || !tb) return;
  hintTiles = [ta, tb];
  ta.el.classList.add("hintGlow"); tb.el.classList.add("hintGlow");
  if (S.guided) {
    const hand = $("guideHand");
    const pa = posXY(ta.r, ta.c), pb = posXY(tb.r, tb.c);
    const board = $("board");
    hand.style.display = "block";
    hand.style.left = board.offsetLeft + pa.x + S.cell * 0.45 + "px";
    hand.style.top = board.offsetTop + pa.y + S.cell * 0.55 + "px";
    hand.style.setProperty("--dx", (pb.x - pa.x) * 0.6 + "px");
    hand.style.setProperty("--dy", (pb.y - pa.y) * 0.6 + "px");
  }
}
function startHint() {
  stopHint();
  hintTimer = setTimeout(showHint, S.guided ? 600 : 4200);
}

/* ===================== 关卡流 ===================== */
function startLevel(cfg, name) {
  S.levelCfg = cfg;
  S.cols = cfg.cols; S.rows = cfg.rows; S.colors = cfg.colors.slice();
  S.goal = cfg.goal; S.star = 0; S.maxChain = 0;
  S.movesFree = cfg.moves === null; S.moves = cfg.moves || 0;
  S.leads = cfg.leads && cfg.leads.length ? cfg.leads.slice() : (S.commission ? S.commission.pair.slice() : ["sword"]);
  S.guided = !!cfg.guided; S.rescueUsed = false;
  $("levelName").textContent = name;
  $("footTip").textContent = cfg.tip || "交换相邻星屑,连成 3 个同色即可消除";
  $("stage").classList.remove("sealed");
  preloadFrames(1, 39);
  setLeadBar();
  layoutBoard(); genGrid(); renderAll(); updateHud();
  say(S.leads[0], "start", true);
  startHint();
}
async function onWin() {
  S.busy = true; stopHint();
  sfxWin();
  preloadFrames(40, 61);
  await riftSettle();
  S.busy = false;
  if (S.mode === "story") {
    const st = STORY[S.stageIdx];
    await runDialogue(st.post);
    const done = Math.max(storyDone(), S.stageIdx + 1);
    save("ssfh_story", done);
    if (S.stageIdx >= STORY.length - 1) return showFinale();
    modal(`
      <div class="m-title">裂隙缝合</div>
      <div class="m-sub">${st.name} · 完成</div>
      ${statsHtml()}
      <button class="m-btn" id="mNext">继续 → ${STORY[S.stageIdx + 1].name}</button>
      <button class="m-btn minor" id="mHome">回标题</button>`);
    $("mNext").onclick = () => { closeModal(); S.stageIdx++; runStage(); };
    $("mHome").onclick = () => { closeModal(); showTitle(); };
  } else {
    const best = load("ssfh_freeBest", 0);
    if (S.freeLevel > best) save("ssfh_freeBest", S.freeLevel);
    say(pick(S.leads), "win", true);
    modal(`
      <div class="m-title">裂隙缝合</div>
      <div class="m-sub">自由校准 · 第 ${S.freeLevel} 夜</div>
      ${statsHtml()}
      <button class="m-btn" id="mNext">下一夜 →</button>
      <button class="m-btn minor" id="mHome">回标题</button>`);
    $("mNext").onclick = () => { closeModal(); S.freeLevel++; startFree(); };
    $("mHome").onclick = () => { closeModal(); showTitle(); };
  }
}
function statsHtml() {
  return `<div class="m-stats">
    <div class="m-stat"><b>${Math.floor(S.star)}</b><span>星光</span></div>
    <div class="m-stat"><b>×${S.maxChain}</b><span>最大连星</span></div>
    <div class="m-stat"><b>${S.movesFree ? "∞" : S.moves}</b><span>剩余步数</span></div>
  </div>`;
}
async function onOutOfMoves() {
  S.busy = true; stopHint();
  if (!S.rescueUsed) {
    S.rescueUsed = true;
    const lead = pick(S.leads);
    say(lead, "rescue", true);
    sfxLose();
    modal(`
      <div class="m-title" style="color:var(--c-${lead})">${LEADS[lead].name} · 救场</div>
      <div class="m-text">星光散落的瞬间,${LEADS[lead].name}抓住了你的手腕。</div>
      <div class="m-text" style="color:var(--gold-bright)">「${pick(LEADS[lead].lines.rescue)}」</div>
      <button class="m-btn" id="mRevive">握住他的手(+3 步)</button>
      <div class="m-sub" style="margin-top:10px">演示直接复活 · 正式版为广告/分享复活位</div>`);
    $("mRevive").onclick = async () => {
      closeModal(); S.moves += 3; updateHud();
      toast(LEADS[lead].name + " 为你争取了 3 步");
      S.busy = false; startHint();
    };
    return;
  }
  sfxLose();
  modal(`
    <div class="m-title" style="color:var(--rift-core)">星光耗尽</div>
    <div class="m-text">裂隙仍未缝合……但没关系,星屑会重新聚起来。</div>
    ${statsHtml()}
    <button class="m-btn" id="mRetry">再试一次</button>
    <button class="m-btn minor" id="mHome">回标题</button>`);
  $("mRetry").onclick = () => {
    closeModal(); S.busy = false;
    if (S.mode === "story") runStageLevel(); else startFree();
  };
  $("mHome").onclick = () => { closeModal(); S.busy = false; showTitle(); };
}
function showFinale() {
  modal(`
    <div class="seal-card">
      <div class="sc-head">✦ 首夜完遂 ✦</div>
      <div class="sc-big">裂隙,今夜安眠</div>
      <div class="m-text">事务所与裂隙处理室全面开放。<br>四位先生,正等你挑选下一夜的搭档。</div>
    </div>
    ${statsHtml()}
    <button class="m-btn" id="mFree">进入 自由校准</button>
    <button class="m-btn minor" id="mHome">回标题</button>`);
  $("mFree").onclick = () => { closeModal(); S.mode = "free"; S.freeLevel = 1; startFree(); };
  $("mHome").onclick = () => { closeModal(); showTitle(); };
}

/* ===================== 剧情流 ===================== */
async function runStage() {
  const st = STORY[S.stageIdx];
  S.mode = "story"; S.commission = null;
  $("titleScreen").style.display = "none";
  if (st.elevator) {
    const ev = $("elevator");
    ev.style.display = "block";
    ev.classList.toggle("alarm", st.elevator === "alarm");
    $("evText").textContent = st.elevator === "alarm" ? "无尽电梯 · 裂隙湍流警报" : "无尽电梯 · 下行中…";
    await wait(1900);
    ev.style.display = "none";
  }
  $("app").style.display = "flex";
  await runDialogue(st.pre);
  if (st.commission) {
    await pickCommission(st.commission.map((id) => COMMISSIONS.find((c) => c.id === id)));
  }
  runStageLevel();
}
function runStageLevel() {
  const st = STORY[S.stageIdx];
  startLevel(st.level, st.name);
}
function pickCommission(options) {
  return new Promise((resolve) => {
    modal(`
      <div class="m-title">选择委托</div>
      <div class="m-sub">驻场男主的花色星光 ×1.5</div>
      ${options.map((o, i) => `
        <div class="comm-card" data-i="${i}">
          <div class="cc-name">${o.name}</div>
          <div class="cc-pair">${o.pair.map((s) => `<span style="color:${SUIT_META[s].color}">${LEADS[s].name}·${SUIT_META[s].name}</span>`).join(" × ")}</div>
          <div class="cc-desc">${o.desc}</div>
        </div>`).join("")}
      <button class="m-btn minor" id="mBackTitle">先回标题</button>`);
    $("mBackTitle").onclick = () => { closeModal(); showTitle(); };
    $("modal").querySelectorAll(".comm-card").forEach((card) => {
      card.onclick = async () => {
        const o = options[Number(card.dataset.i)];
        S.commission = o;
        closeModal();
        await runDialogue(o.open);
        resolve();
      };
    });
  });
}
async function startFree() {
  S.mode = "free"; S.commission = null;
  $("titleScreen").style.display = "none";
  $("app").style.display = "flex";
  const shuffled = COMMISSIONS.slice().sort(() => Math.random() - 0.5);
  await pickCommission(shuffled.slice(0, 2));
  startLevel({
    cols: 7, rows: 7, colors: ["wand", "coin", "sword", "cup", "dust"],
    goal: 110 + 25 * (S.freeLevel - 1), moves: 20, leads: [],
    tip: "驻场男主的花色星光 ×1.5",
  }, `自由校准 · 第 ${S.freeLevel} 夜`);
}

/* ===================== 标题页 ===================== */
function showTitle() {
  stopHint();
  $("app").style.display = "none";
  $("titleScreen").style.display = "flex";
  const done = storyDone();
  const btnStory = $("btnStory"), btnFree = $("btnFree");
  if (done >= STORY.length) {
    btnStory.textContent = "✦ 重温首夜";
    btnFree.disabled = false;
    const best = load("ssfh_freeBest", 0);
    btnFree.textContent = best ? `自由校准(最佳 第${best}夜)` : "自由校准";
  } else {
    btnStory.textContent = done === 0 ? "✦ 首夜 · 剧情模式" : `✦ 继续 · ${STORY[done].name}`;
    btnFree.disabled = true;
    btnFree.textContent = "自由校准(完成首夜解锁)";
  }
}
function bindUI() {
  $("btnStory").onclick = () => {
    startBgm();
    const done = storyDone();
    S.stageIdx = done >= STORY.length ? 0 : done;
    runStage();
  };
  $("btnFree").onclick = () => { startBgm(); S.freeLevel = 1; startFree(); };
  $("btnReset").onclick = () => {
    save("ssfh_story", 0); save("ssfh_freeBest", 0); save("ssfh_flags", {});
    S.flags = {}; toast("进度已重置"); showTitle();
  };
  $("btnQuit").onclick = () => { if (!S.busy) showTitle(); };
  const sndBtn = $("btnSound");
  sndBtn.classList.toggle("off", !S.sound);
  sndBtn.onclick = () => {
    S.sound = !S.sound; save("ssfh_sound", S.sound);
    sndBtn.classList.toggle("off", !S.sound);
    if (bgm) bgm.muted = !S.sound;
  };
  addEventListener("resize", () => {
    if ($("app").style.display === "none") return;
    layoutBoard();
    for (let r = 0; r < S.rows; r++) for (let c = 0; c < S.cols; c++) {
      const t = tileAt(r, c); if (t) applyPos(t, true);
    }
  });
}

/* ===================== 启动 ===================== */
bindBoard(); bindUI(); showTitle();
