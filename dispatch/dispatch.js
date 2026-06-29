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
    label: "董事会围猎",
    saved: "沈寂收回董事会密钥。",
    crack: "沈寂线索被董事会截走。",
  },
  yan: {
    name: "炎烈",
    short: "炎",
    color: "#ff6b4a",
    mark: "刹",
    label: "赛车场事故",
    saved: "炎烈压住最后一个弯道。",
    crack: "炎烈事故视频被剪成黑料。",
  },
  ye: {
    name: "叶渊",
    short: "叶",
    color: "#7fd6c2",
    mark: "码",
    label: "情报泄露",
    saved: "叶渊保住线人坐标。",
    crack: "叶渊关闭了共享定位。",
  },
  song: {
    name: "宋以衡",
    short: "宋",
    color: "#7da4ff",
    mark: "历",
    label: "实验室嫁祸",
    saved: "宋以衡锁住样本链。",
    crack: "宋以衡的病历被替换。",
  },
};

const SIGNAL_TEXT = {
  shen: ["合同陷阱", "黑网回流", "席位冻结"],
  yan: ["刹车报警", "赛道遮挡", "油温爆点"],
  ye: ["暗号反破", "线人断联", "黑账坐标"],
  song: ["病历替换", "样本失温", "录音外泄"],
};

const LEAD_KEYS = Object.keys(LEADS);

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
  logs: [],
  drag: null,
  firstWave: true,
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
  S.drag = null;
  S.firstWave = true;
  S.logs = [];
  $("overlay").classList.remove("show");
  $("overlay").setAttribute("aria-hidden", "true");
  $("btnStart").textContent = intro ? "开始调度" : "调度中";
  $("stageHint").classList.toggle("hide", !intro);
  addLog("危机信号会从边缘进入。拖它们画线,送到同色男主锚点。");
  addLog("航线相撞、信号漏进中心裂隙,都会留下剧情裂痕。", true);
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
    toast("拖住危机信号,画线送到同色锚点");
    tone(520, 0.08, "triangle", 0.045);
  }
}

function spawnOpeningWave() {
  if (!S.firstWave) return;
  S.firstWave = false;
  spawnSignal(0, "song", 3);
  spawnSignal(0.45, "yan", 0);
}

function spawnSignal(delay = 0, forcedLead = null, forcedEdge = null) {
  const lead = forcedLead || LEAD_KEYS[Math.floor(Math.random() * LEAD_KEYS.length)];
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
  const critical = Math.random() < 0.24;
  const labelPool = SIGNAL_TEXT[lead];
  S.signals.push({
    id: S.nextId++,
    lead,
    label: labelPool[Math.floor(Math.random() * labelPool.length)],
    x,
    y,
    vx: Math.cos(angle),
    vy: Math.sin(angle),
    speed: critical ? 46 : 32,
    radius: critical ? 13 : 11,
    age: 0,
    ttl: critical ? 11 : 16,
    route: null,
    routeIndex: 0,
    target: null,
    done: false,
    critical,
    bornDelay: delay,
  });
}

function tick(dt) {
  if (!S.running || S.paused || S.ended) return;
  S.time = Math.max(0, S.time - dt);
  S.spawnAcc += dt;
  const progress = 1 - S.time / DURATION;
  const interval = Math.max(1.35, 3.15 - progress * 1.35);
  if (S.spawnAcc >= interval && S.signals.length < 9) {
    S.spawnAcc = 0;
    spawnSignal();
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
      S.combo = 0;
    } else {
      addLog(`${lead.name}线稳定: ${sig.label}`);
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
  publishDebug();
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
  drawCore();
  drawAnchors();
  drawRoutes();
  drawSignals();
  drawSparks();
  requestAnimationFrame(draw);
}

function drawCore() {
  const x = S.w / 2;
  const y = S.h / 2;
  const t = performance.now() * 0.001;
  ctx2.save();
  ctx2.translate(x, y);
  ctx2.strokeStyle = "rgba(243,216,150,0.22)";
  ctx2.lineWidth = 1;
  for (let r = 28; r <= 92; r += 32) {
    ctx2.beginPath();
    ctx2.arc(0, 0, r + Math.sin(t + r) * 2, 0, Math.PI * 2);
    ctx2.stroke();
  }
  ctx2.fillStyle = "rgba(243,216,150,0.12)";
  ctx2.beginPath();
  ctx2.arc(0, 0, 22, 0, Math.PI * 2);
  ctx2.fill();
  ctx2.fillStyle = "rgba(243,216,150,0.82)";
  ctx2.font = "700 11px serif";
  ctx2.textAlign = "center";
  ctx2.fillText("裂隙", 0, 4);
  ctx2.restore();
}

function drawAnchors() {
  for (const [key, anchor] of Object.entries(S.anchors)) {
    const lead = LEADS[key];
    const dragging = S.drag && S.signals.find((item) => item.id === S.drag.id);
    const hover = S.drag ? anchorAt(S.drag.points[S.drag.points.length - 1]) : null;
    const isMatch = dragging && dragging.lead === key;
    const isHover = hover === key;
    const pulse = 0.5 + Math.sin(performance.now() * 0.006) * 0.5;
    ctx2.save();
    ctx2.translate(anchor.x, anchor.y);
    if (isMatch || isHover) {
      ctx2.globalAlpha = isMatch ? 0.38 + pulse * 0.26 : 0.28;
      ctx2.fillStyle = isMatch ? lead.color : "#ff5d66";
      ctx2.beginPath();
      ctx2.arc(0, 0, isMatch ? 45 + pulse * 5 : 42, 0, Math.PI * 2);
      ctx2.fill();
      ctx2.globalAlpha = 1;
    }
    ctx2.strokeStyle = lead.color;
    ctx2.fillStyle = "rgba(15,12,18,0.88)";
    ctx2.lineWidth = 2;
    ctx2.beginPath();
    ctx2.arc(0, 0, 34, 0, Math.PI * 2);
    ctx2.fill();
    ctx2.stroke();
    ctx2.fillStyle = lead.color;
    ctx2.beginPath();
    ctx2.arc(0, 0, 17, 0, Math.PI * 2);
    ctx2.fill();
    ctx2.fillStyle = "#151119";
    ctx2.font = "900 15px sans-serif";
    ctx2.textAlign = "center";
    ctx2.textBaseline = "middle";
    ctx2.fillText(lead.short, 0, 0);
    ctx2.fillStyle = "rgba(243,236,223,0.92)";
    ctx2.font = "700 12px sans-serif";
    ctx2.fillText(lead.name, 0, 48);
    ctx2.fillStyle = "rgba(243,216,150,0.72)";
    ctx2.font = "10px sans-serif";
    ctx2.fillText(lead.label, 0, 63);
    if (dragging && (isMatch || isHover)) {
      ctx2.fillStyle = isMatch && isHover ? lead.color : isHover ? "#ffccd1" : "rgba(243,236,223,0.78)";
      ctx2.font = "700 10px sans-serif";
      ctx2.fillText(isHover ? (isMatch ? "松手锁定" : "送错会裂") : "目标锚点", 0, -44);
    }
    ctx2.restore();
  }
}

function drawRoutes() {
  for (const sig of S.signals) {
    if (!sig.route || sig.done) continue;
    const lead = LEADS[sig.lead];
    ctx2.strokeStyle = sig.target === sig.lead ? lead.color : "#ff5d66";
    ctx2.lineWidth = sig.critical ? 3 : 2;
    ctx2.globalAlpha = 0.62;
    ctx2.beginPath();
    ctx2.moveTo(sig.x, sig.y);
    for (let i = sig.routeIndex; i < sig.route.length; i++) ctx2.lineTo(sig.route[i].x, sig.route[i].y);
    ctx2.stroke();
    ctx2.globalAlpha = 1;
  }
  if (S.drag) {
    const sig = S.signals.find((item) => item.id === S.drag.id);
    const last = S.drag.points[S.drag.points.length - 1];
    const hover = anchorAt(last);
    ctx2.strokeStyle = sig ? LEADS[sig.lead].color : "#f3d896";
    ctx2.lineWidth = 3;
    ctx2.setLineDash([8, 7]);
    ctx2.beginPath();
    S.drag.points.forEach((pt, i) => {
      if (i === 0) ctx2.moveTo(pt.x, pt.y);
      else ctx2.lineTo(pt.x, pt.y);
    });
    ctx2.stroke();
    ctx2.setLineDash([]);
    if (sig) {
      const lead = LEADS[sig.lead];
      ctx2.fillStyle = hover && hover !== sig.lead ? "#ffccd1" : lead.color;
      ctx2.beginPath();
      ctx2.arc(last.x, last.y, 5, 0, Math.PI * 2);
      ctx2.fill();
      ctx2.fillStyle = "rgba(12,10,16,0.78)";
      roundRect(ctx2, last.x + 10, last.y - 18, 92, 24, 10);
      ctx2.fill();
      ctx2.fillStyle = hover
        ? (hover === sig.lead ? lead.color : "#ffccd1")
        : "rgba(243,236,223,0.86)";
      ctx2.font = "700 11px sans-serif";
      ctx2.textAlign = "left";
      ctx2.textBaseline = "middle";
      ctx2.fillText(hover ? (hover === sig.lead ? "松手锁定" : "送错会裂") : `送到${lead.name}`, last.x + 20, last.y - 6);
    }
  }
}

function drawSignals() {
  for (const sig of S.signals) {
    if (sig.done || sig.bornDelay > 0) continue;
    const lead = LEADS[sig.lead];
    ctx2.save();
    ctx2.translate(sig.x, sig.y);
    if (sig.critical) {
      ctx2.strokeStyle = "rgba(255,93,102,0.55)";
      ctx2.lineWidth = 2;
      ctx2.beginPath();
      ctx2.arc(0, 0, sig.radius + 7 + Math.sin(performance.now() * 0.01) * 2, 0, Math.PI * 2);
      ctx2.stroke();
    }
    ctx2.fillStyle = "rgba(13,11,17,0.94)";
    ctx2.strokeStyle = lead.color;
    ctx2.lineWidth = 2;
    roundRect(ctx2, -32, -22, 64, 44, 12);
    ctx2.fill();
    ctx2.stroke();
    const urgency = clamp(sig.age / sig.ttl, 0, 1);
    ctx2.fillStyle = "rgba(255,255,255,0.12)";
    roundRect(ctx2, -24, 16, 48, 4, 2);
    ctx2.fill();
    ctx2.fillStyle = urgency > 0.72 ? "#ff5d66" : lead.color;
    roundRect(ctx2, -24, 16, 48 * (1 - urgency), 4, 2);
    ctx2.fill();
    ctx2.fillStyle = lead.color;
    ctx2.beginPath();
    ctx2.arc(-17, 0, sig.radius, 0, Math.PI * 2);
    ctx2.fill();
    ctx2.fillStyle = "#151119";
    ctx2.font = "900 11px sans-serif";
    ctx2.textAlign = "center";
    ctx2.textBaseline = "middle";
    ctx2.fillText(lead.mark, -17, 0);
    ctx2.fillStyle = "rgba(243,236,223,0.96)";
    ctx2.font = "700 11px sans-serif";
    ctx2.textAlign = "left";
    ctx2.fillText(lead.name, -2, -3);
    ctx2.fillStyle = sig.critical ? "#ffccd1" : "rgba(243,216,150,0.82)";
    ctx2.font = "9px sans-serif";
    ctx2.fillText(sig.critical ? "红色优先" : sig.label, -2, 11);
    ctx2.restore();
  }
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
  return {
    running: S.running,
    paused: S.paused,
    ended: S.ended,
    time: S.time,
    saves: S.saves,
    cracks: S.cracks,
    score: S.score,
    anchors: S.anchors,
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
