// 도파# 크리스마스 오락실: 장면 · 캐릭터 이동 · 멀티플레이 · 대기열 · 오락기 플레이를 묶는 곳.
// 폰 하나로도(화면 조이스틱) PC로도(WASD, 폰 QR 조종기) 할 수 있어요.
import * as THREE from 'three';
import * as sfx from './sound.js?v=3';
import { buildWorld, MACHINES, ROOM, SPAWN, CLAW_SCALE, rotatedBox, canvasTex } from './world.js?v=3';
import { createClawMachine } from './claw.js?v=3';
import { createAvatar, OUTFITS, roundRect } from './avatar.js?v=3';
import { tenGame, rouletteGame, applyTenLive, applyRouletteLive } from './minigames.js?v=3';
import { connect, mode as netMode, STALE_MS, makeCode } from './net.js?v=3';
import { itemInfo, isItem } from './plush.js?v=3';

const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const TOUCH = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
document.body.classList.toggle('is-touch', TOUCH);

// ------------------------------------------------------------------ 저장 (티켓은 재미용: 기기마다 따로, 매일 최소 10장 충전)
const SAVE_KEY = 'xmas-arcade-v1';
const COIN_MAX = 10;
const today = () => new Date().toLocaleDateString('sv');
const save = (() => {
  let s = {};
  try { s = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}'); } catch { /* noop */ }
  // 🪙 동전: 오락기에 넣는 돈. 10개까지만 주고, 다 쓰면 동전 교환기에서 다시 10개
  // 🎟️ 티켓: 게임에서 받는 보상 (쓰지 않고 모이기만 해요)
  if (s.coins == null) { s.coins = COIN_MAX; s.tickets = 0; }
  s.tickets ??= 0;
  s.items ??= (s.plush || []).filter(Boolean); // 뽑은 인형 + 미니게임 상품
  delete s.plush;
  delete s.day;
  return s;
})();
const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { /* noop */ } };
persist();
const CARRY_MAX = 12; // 캐릭터에 달고 다니는 최대 개수

// ------------------------------------------------------------------ 렌더러/장면
const canvas = $('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, TOUCH ? 1.5 : 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.05, 80);
const world = buildWorld(scene);
if (TOUCH) world.sun.shadow.mapSize.set(1024, 1024);

function resize() {
  const w = innerWidth;
  const h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

// ------------------------------------------------------------------ 기계별 최고 기록
// claw: 한 번 앉아서 뽑은 인형 수 · ten: 10초와의 오차(작을수록 1등) · roulette: 한 번 앉아서 받은 티켓
const SCORE = {
  claw: { asc: false, label: '한 번에 뽑은 인형', fmt: (e) => `🧸 ${e.s}개` },
  claw2: { asc: false, label: '한 번에 뽑은 인형', fmt: (e) => `🎅 ${e.s}개` },
  ten: { asc: true, label: '10초에 가장 가깝게', fmt: (e) => `${Number(e.v).toFixed(2)}초` },
  roulette: { asc: false, label: '한 번에 받은 티켓', fmt: (e) => `🎟️ ${e.s}` },
};
const boards = {}; // mid → 상위 5명

// ------------------------------------------------------------------ 오락기 배치
const MDEF = Object.fromEntries(MACHINES.map((m) => [m.id, m]));
// 인형뽑기 기계들 (기계마다 인형 세트·색이 달라요)
const claws = {};
const clawOf = (mid) => claws[mid] || null;
for (const m of MACHINES.filter((x) => x.claw)) {
  const claw = createClawMachine({
    sfx,
    ...m.claw,
    hooks: {
      banner, confetti,
      pay: () => pay(),
      onWin(kind, k, acc) {
        prize(acc ? `${kind}.${acc}` : kind);
        reward(3);
        S.caught = (S.caught || 0) + 1;
        submitScore(m.id, S.caught, S.caught);
      },
    },
  });
  claws[m.id] = claw;
  claw.spectating = false;
  claw.group.scale.setScalar(CLAW_SCALE);
  claw.group.position.set(m.x, 1.6 * CLAW_SCALE, m.z);
  claw.group.rotation.y = m.face;
  claw.group.traverse((o) => { if (o.isMesh) o.receiveShadow = true; });
  scene.add(claw.group);
  const f = claw.footprint;
  world.colliders.push(rotatedBox(m, { x0: f.x0 * CLAW_SCALE, x1: f.x1 * CLAW_SCALE, z0: f.z0 * CLAW_SCALE, z1: f.z1 * CLAW_SCALE }));
}
// 기계 앞 서는 자리까지의 거리
const FRONT = { changer: 1.0, claw: 1.55, claw2: 1.55, ten: 1.15, roulette: 1.2, basket: 1.9, pinball: 1.6, prize: 1.1 };
for (const m of MACHINES) {
  const fx = Math.sin(m.face);
  const fz = Math.cos(m.face);
  m.fx = fx;
  m.fz = fz;
  m.spot = { x: m.x + fx * FRONT[m.id], z: m.z + fz * FRONT[m.id] };
  m.group = m.claw ? claws[m.id].group : world.machineMeshes[m.id].group;
}
// 줄 서는 자리: 기계 앞에서 바깥쪽으로 한 줄
function queueSlot(m, i) {
  const d = 1.3 + 0.9 * i;
  return { x: m.spot.x + m.fx * d, z: m.spot.z + m.fz * d };
}

// 오락기 위 상태 표시판 (AVAILABLE / PLAYING / WAITING / COMING SOON)
const LABEL_Y = { changer: 2.55, claw: 3.4, claw2: 3.4, ten: 3.1, basket: 3.6, pinball: 2.6, roulette: 3.4, prize: 3.5 };
const statusBoards = {};
for (const m of MACHINES) {
  const tex = canvasTex(512, 200, () => {});
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sp.scale.set(2.0, 0.78, 1);
  sp.position.set(m.x + m.fx * 0.2, LABEL_Y[m.id], m.z + m.fz * 0.2);
  sp.renderOrder = 15;
  scene.add(sp);
  statusBoards[m.id] = { sp, tex, key: '' };
}
function drawStatus(m, st) {
  const b = statusBoards[m.id];
  const top = boards[m.id]?.[0];
  const topText = SCORE[m.id] ? (top ? `👑 ${top.n} · ${SCORE[m.id].fmt(top)}` : '👑 첫 기록에 도전!') : '';
  const key = `${st.kind}|${st.text}|${topText}`;
  if (b.key === key) return;
  b.key = key;
  const c = b.tex.userData.canvas;
  const g = c.getContext('2d');
  g.clearRect(0, 0, c.width, c.height);
  const col = { available: '#86EFC8', playing: '#FF6C91', waiting: '#FFD36B', soon: '#AAB4AE' }[st.kind];
  g.fillStyle = 'rgba(11,14,13,.82)';
  roundRect(g, 16, 10, 480, topText ? 180 : 130, 30);
  g.fill();
  g.strokeStyle = col;
  g.lineWidth = 5;
  g.stroke();
  g.textAlign = 'center';
  g.fillStyle = '#F7F6F2';
  g.font = '700 40px "Pretendard Variable", sans-serif';
  g.fillText(`${m.emoji} ${m.name}`, 256, 62);
  g.fillStyle = col;
  g.font = '800 34px "Pretendard Variable", sans-serif';
  g.fillText(st.text, 256, 112);
  if (topText) {
    g.fillStyle = '#FFD36B';
    g.font = '700 30px "Pretendard Variable", sans-serif';
    let t = topText;
    while (g.measureText(t).width > 450 && t.length > 4) t = `${t.slice(0, -2)}…`;
    g.fillText(t, 256, 160);
  }
  b.tex.needsUpdate = true;
}

// ------------------------------------------------------------------ 상태
const S = {
  mode: 'entry', // entry | walk | claw | ten | roulette
  nick: '',
  outfit: localStorage.getItem('xmas-outfit') || 'red',
  queue: null, // 줄 선 기계 id
  turn: null, // { mid, until }
  idle: 0,
  view: 'claw',
  near: null,
  zoom: 1, // 오락실 걸어다닐 때 카메라 거리 배율
  zoomPlay: 1, // 오락기 앞에서
  yaw: 0, pitch: 0, // 화면을 끌어서 돌린 시점 (걸어다닐 때)
  playYaw: 0, playPitch: 0, // 오락기 앞에서
  go: null, // 클릭한 곳으로 걸어가기 { x, z, mid, best, stuck }
};
let net = null;
let me = null; // { avatar, x, z, r, speed }
const others = new Map(); // uid → { avatar, data, x, z, r, speed }
let machinesState = {};
let game = null; // 지금 하는 미니게임 (ten / roulette)

// ------------------------------------------------------------------ 입력: 키보드 · 화면 조이스틱 · 폰 조종기
const keys = new Set();
const joy = { x: 0, z: 0 };
const pad = { x: 0, z: 0, on: false };
const KEYMAP = { ArrowLeft: 'l', a: 'l', ArrowRight: 'r', d: 'r', ArrowUp: 'u', w: 'u', ArrowDown: 'd', s: 'd' };
addEventListener('keydown', (e) => {
  if (e.target.closest?.('input, textarea')) return;
  const k = KEYMAP[e.key] || KEYMAP[e.key.toLowerCase?.()];
  if (k) { keys.add(k); e.preventDefault(); return; }
  if (e.repeat) return;
  const key = e.key.toLowerCase();
  if (key === 'e' || e.key === ' ' || e.key === 'Enter') { e.preventDefault(); action(); }
  else if (key === 'q') wave();
  else if (e.key === '+' || e.key === '=') zoomBy(1 / 1.2);
  else if (e.key === '-' || e.key === '_') zoomBy(1.2);
  else if (e.key === 'Escape') {
    const open = document.querySelector('#bagOverlay.show, #qrOverlay.show');
    if (open) open.classList.remove('show');
    else exitMachine();
  }
  else if (key === 'v') toggleView();
});
addEventListener('keyup', (e) => {
  const k = KEYMAP[e.key] || KEYMAP[e.key.toLowerCase?.()];
  if (k) keys.delete(k);
});
addEventListener('blur', () => keys.clear());

function moveInput() {
  let x = (keys.has('r') ? 1 : 0) - (keys.has('l') ? 1 : 0);
  let z = (keys.has('d') ? 1 : 0) - (keys.has('u') ? 1 : 0);
  if (!x && !z) { x = joy.x; z = joy.z; }
  if (!x && !z && pad.on) { x = pad.x; z = pad.z; }
  const l = Math.hypot(x, z);
  if (l > 1) { x /= l; z /= l; }
  // 걸어다닐 때는 돌려 본 화면 기준으로 (위 = 화면 안쪽)
  if (S.mode === 'walk' && S.yaw) {
    const c = Math.cos(S.yaw);
    const s = Math.sin(S.yaw);
    [x, z] = [x * c + z * s, -x * s + z * c];
  }
  return { x, z };
}

// 화면 조이스틱 (왼쪽 아래)
{
  const el = $('joy');
  const knob = $('knob');
  let id = null;
  const R = 46;
  const moveKnob = (e) => {
    const r = el.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2);
    let dy = e.clientY - (r.top + r.height / 2);
    const l = Math.hypot(dx, dy);
    if (l > R) { dx *= R / l; dy *= R / l; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    const dead = 0.15;
    const nx = dx / R;
    const ny = dy / R;
    const m = Math.hypot(nx, ny);
    joy.x = m < dead ? 0 : nx;
    joy.z = m < dead ? 0 : ny;
  };
  const release = () => { id = null; joy.x = joy.z = 0; knob.style.transform = ''; el.classList.remove('active'); };
  el.addEventListener('pointerdown', (e) => {
    id = e.pointerId;
    try { el.setPointerCapture(id); } catch { /* noop */ }
    el.classList.add('active');
    sfx.unlock();
    moveKnob(e);
  });
  el.addEventListener('pointermove', (e) => { if (e.pointerId === id) moveKnob(e); });
  el.addEventListener('pointerup', (e) => { if (e.pointerId === id) release(); });
  el.addEventListener('pointercancel', (e) => { if (e.pointerId === id) release(); });
}
$('btnA').addEventListener('pointerdown', (e) => { e.preventDefault(); sfx.unlock(); action(); });
$('btnB').addEventListener('pointerdown', (e) => { e.preventDefault(); wave(); });
$('exitBtn').addEventListener('click', () => exitMachine());
$('viewBtn').addEventListener('click', () => toggleView());
$('soundBtn').addEventListener('click', () => {
  sfx.unlock();
  sfx.setMuted(!sfx.isMuted());
  $('soundBtn').textContent = sfx.isMuted() ? '🔇' : '🔊';
});
addEventListener('pointerdown', () => sfx.unlock());

// ------------------------------------------------------------------ 랜덤 닉네임 (크리스마스 꾸밈말 + 이름, 10자 이내)
const NICK_A = ['반짝이는', '졸린', '배고픈', '수줍은', '용감한', '말랑한', '꽁꽁 언', '신난', '포근한', '뽀송한', '달콤한', '두근두근', '느긋한', '깜찍한', '수상한', '부지런한', '눈 덮인', '빨간 코', '춤추는', '선물 든'];
const NICK_B = ['산타', '루돌프', '눈사람', '펭귄', '엘프', '진저맨', '북극곰', '트리', '양말', '썰매', '눈송이', '호빵', '군고구마', '붕어빵', '캐롤', '종소리', '사탕', '곰돌이', '토끼', '호두까기'];
function randomNick() {
  for (let i = 0; i < 20; i++) {
    const a = NICK_A[Math.floor(Math.random() * NICK_A.length)];
    const b = NICK_B[Math.floor(Math.random() * NICK_B.length)];
    const n = `${a} ${b}`;
    if (n.length <= 10) return n;
  }
  return `산타${Math.floor(Math.random() * 900 + 100)}`;
}

// ------------------------------------------------------------------ 클릭/탭으로 걸어가기 + 확대/축소 (휠 · 두 손가락 · ＋/－)
const ZOOM = { min: 0.5, max: 1.8 };
function rotateView(dx, dy) {
  if (S.mode === 'entry') return;
  if (S.mode === 'walk') {
    S.yaw -= dx * 0.008;
    S.pitch = clamp(S.pitch + dy * 0.005, -0.55, 0.5);
  } else if (!(clawOf(S.mode) && S.view === 'claw')) {
    S.playYaw = clamp(S.playYaw - dx * 0.006, -1.0, 1.0);
    S.playPitch = clamp(S.playPitch + dy * 0.004, -0.35, 0.6);
  }
}
function resetView() {
  if (S.mode === 'walk') { S.yaw = 0; S.pitch = 0; S.zoom = 1; }
  else { S.playYaw = 0; S.playPitch = 0; S.zoomPlay = 1; }
}
canvas.addEventListener('dblclick', resetView);
$('viewReset').addEventListener('click', resetView);
function zoomBy(k) {
  if (S.mode === 'entry') return;
  if (S.mode === 'walk') S.zoom = clamp(S.zoom * k, ZOOM.min, ZOOM.max);
  else S.zoomPlay = clamp(S.zoomPlay * k, 0.55, 1.6);
}
$('zoomIn').addEventListener('click', () => zoomBy(1 / 1.2));
$('zoomOut').addEventListener('click', () => zoomBy(1.2));
canvas.addEventListener('wheel', (e) => { e.preventDefault(); zoomBy(e.deltaY > 0 ? 1.1 : 1 / 1.1); }, { passive: false });

// 바닥 위 목적지 표시
const goMarker = new THREE.Mesh(new THREE.RingGeometry(0.18, 0.26, 32), new THREE.MeshBasicMaterial({ color: 0xd9ff44, transparent: true, opacity: 0.8, depthWrite: false }));
goMarker.rotation.x = -Math.PI / 2;
goMarker.position.y = 0.02;
goMarker.visible = false;
scene.add(goMarker);

function cancelGo() {
  S.go = null;
  goMarker.visible = false;
}
function arrive(g) {
  cancelGo();
  if (!g.mid) return;
  const m = MDEF[g.mid];
  me.r = Math.atan2(-m.fx, -m.fz);
  // 기계를 눌러서 왔으면 바로 플레이 (또는 줄 서기)
  if (m.playable && nearestMachine() === m) action();
}
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
function tapAt(cx, cy) {
  if (S.mode !== 'walk' || !me) return;
  ndc.set((cx / innerWidth) * 2 - 1, -(cy / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  // 오락기를 눌렀으면 그 앞자리로
  let hitM = null;
  let hitD = Infinity;
  for (const m of MACHINES) {
    const h = ray.intersectObject(m.group, true)[0];
    if (h && h.distance < hitD) { hitD = h.distance; hitM = m; }
  }
  const p = new THREE.Vector3();
  if (!ray.ray.intersectPlane(floorPlane, p)) return;
  if (hitM && hitM.playable) {
    S.go = { x: hitM.spot.x, z: hitM.spot.z, mid: hitM.id, best: Infinity, stuck: 0 };
  } else {
    if (hitM && !hitM.playable) { toast(`${hitM.emoji} ${hitM.name}은(는) 준비 중이에요`); }
    const q = { x: p.x, z: p.z };
    collide(q); // 못 가는 곳이면 가까운 빈 곳으로
    S.go = { x: q.x, z: q.z, mid: null, best: Infinity, stuck: 0 };
  }
  goMarker.position.x = S.go.x;
  goMarker.position.z = S.go.z;
  goMarker.visible = true;
  goMarker.scale.setScalar(1.6);
}
{
  const pts = new Map();
  let pinch = 0;
  let tap = null;
  canvas.addEventListener('pointerdown', (e) => {
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 1) tap = { x: e.clientX, y: e.clientY, t: performance.now() };
    else { tap = null; const [a, b] = [...pts.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); }
  });
  canvas.addEventListener('pointermove', (e) => {
    const p = pts.get(e.pointerId);
    if (!p) return;
    p.x = e.clientX;
    p.y = e.clientY;
    if (tap && Math.hypot(p.x - tap.x, p.y - tap.y) > 12) tap = null;
    if (pts.size === 1 && !tap) {
      // 한 손가락(마우스)으로 끌기 = 시점 돌리기
      const dx = e.movementX || (p.x - (p.lx ?? p.x));
      const dy = e.movementY || (p.y - (p.ly ?? p.y));
      rotateView(dx, dy);
    }
    p.lx = p.x;
    p.ly = p.y;
    if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch > 0 && d > 0) zoomBy(pinch / d);
      pinch = d;
    }
  });
  const up = (e) => {
    if (tap && pts.size === 1 && performance.now() - tap.t < 500) tapAt(e.clientX, e.clientY);
    pts.delete(e.pointerId);
    if (pts.size < 2) pinch = 0;
    tap = null;
  };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', (e) => { pts.delete(e.pointerId); tap = null; pinch = 0; });
}

// ------------------------------------------------------------------ 입장 화면
{
  const chips = $('outfits');
  chips.innerHTML = OUTFITS.map((o) => `<button type="button" class="outfit" data-o="${o.key}" style="--c:#${o.body.toString(16).padStart(6, '0')}" aria-label="${o.label}"><i></i><span>${o.label}</span></button>`).join('');
  const sel = () => chips.querySelectorAll('.outfit').forEach((b) => b.classList.toggle('on', b.dataset.o === S.outfit));
  chips.addEventListener('click', (e) => {
    const b = e.target.closest('.outfit');
    if (!b) return;
    S.outfit = b.dataset.o;
    sel();
    previewAvatar();
  });
  sel();
  $('nick').value = localStorage.getItem('xmas-nick') || randomNick();
  $('diceBtn').addEventListener('click', () => {
    $('nick').value = randomNick();
    preview?.setName($('nick').value);
    const b = $('diceBtn');
    b.classList.remove('roll');
    void b.offsetWidth;
    b.classList.add('roll');
  });
  $('entryForm').addEventListener('submit', (e) => { e.preventDefault(); enter(); });
}
// 입장 화면 뒤에서 미리보기 캐릭터
let preview = null;
function previewAvatar() {
  if (preview) scene.remove(preview.root);
  preview = createAvatar({ nickname: $('nick').value.trim() || '나', outfit: S.outfit, me: true });
  preview.root.position.set(SPAWN.x, 0, SPAWN.z - 1.2);
  preview.setCarry(save.items.slice(-CARRY_MAX));
  scene.add(preview.root);
}
previewAvatar();
$('nick').addEventListener('input', () => preview?.setName($('nick').value.trim() || '나'));

async function enter() {
  const nick = $('nick').value.trim().replace(/\s+/g, ' ').slice(0, 10);
  if (!nick) { $('entryError').textContent = '닉네임을 입력해 주세요.'; $('nick').focus(); return; }
  sfx.unlock();
  const btn = $('enterBtn');
  btn.setAttribute('aria-busy', 'true');
  $('entryError').textContent = '';
  try {
    net = await connect();
  } catch (err) {
    console.error(err);
    btn.removeAttribute('aria-busy');
    $('entryError').textContent = /admin-restricted|operation-not-allowed/.test(String(err?.code || err))
      ? 'Firebase에서 익명 로그인이 꺼져 있어요. (README 참고)'
      : '오락실에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.';
    return;
  }
  btn.removeAttribute('aria-busy');
  S.nick = nick;
  localStorage.setItem('xmas-nick', nick);
  localStorage.setItem('xmas-outfit', S.outfit);
  if (preview) { scene.remove(preview.root); preview = null; }
  const avatar = createAvatar({ nickname: nick, outfit: S.outfit, me: true });
  me = { avatar, x: SPAWN.x, z: SPAWN.z, r: Math.PI, speed: 0 };
  avatar.root.position.set(me.x, 0, me.z);
  avatar.setCarry(save.items.slice(-CARRY_MAX));
  scene.add(avatar.root);
  $('entry').classList.remove('show');
  $('hud').hidden = false;
  $('touch').hidden = false;
  $('meName').textContent = nick;
  $('modeBadge').hidden = netMode !== 'local';
  renderTickets();
  renderCoins();
  renderBag();
  S.mode = 'walk';
  camInit = false;
  net.onPlayer(onPlayer);
  net.onMachines((v) => { machinesState = v; });
  for (const mid of Object.keys(SCORE)) net.onScores(mid, SCORE[mid].asc, (list) => { boards[mid] = list; renderRank(); });
  sendMe(true);
  window.DopaSharp?.track('game_start');
  toast(`${nick}님, 메리 크리스마스! 🎄`);
  setupPadHost();
}

// ------------------------------------------------------------------ 다른 사람들
function onPlayer(uid, d) {
  if (uid === net.uid) return;
  let o = others.get(uid);
  if (!d) {
    if (o) { scene.remove(o.avatar.root); others.delete(uid); }
    return;
  }
  if (!o) {
    o = { avatar: createAvatar({ nickname: d.n, outfit: d.o }), x: d.x, z: d.z, r: d.r || 0, speed: 0, data: d, seen: performance.now() };
    o.avatar.root.position.set(d.x, 0, d.z);
    scene.add(o.avatar.root);
    others.set(uid, o);
  }
  if (d.w && d.w !== o.data.w) o.avatar.wave();
  o.avatar.setCarry(d.p ? String(d.p).split(',') : []);
  o.data = d;
  o.seen = performance.now();
}

let sendT = 0;
let sentKey = '';
function sendMe(force = false) {
  if (!net || !me) return;
  const d = {
    n: S.nick, o: S.outfit,
    x: +me.x.toFixed(2), z: +me.z.toFixed(2), r: +me.r.toFixed(2),
    s: S.mode === 'walk' ? (S.queue ? 'queue' : 'walk') : 'play',
    m: S.mode !== 'walk' ? S.mode : S.queue || '',
    w: S.waveSeq || 0,
    p: save.items.slice(-CARRY_MAX).join(','),
  };
  const key = JSON.stringify(d);
  if (!force && key === sentKey) return;
  sentKey = key;
  net.setMe(d);
}

// ------------------------------------------------------------------ 오락기 상태 (네트워크 → 화면)
function occupant(mid) {
  const p = machinesState[mid]?.player;
  if (!p || !net) return null;
  if (net.now() - (p.beat || 0) > STALE_MS) return null;
  return p;
}
function queueOf(mid) {
  const q = machinesState[mid]?.queue || {};
  return Object.entries(q).map(([uid, v]) => ({ uid, ...v })).sort((a, b) => a.at - b.at);
}
function statusOf(m) {
  if (m.instant) return save.coins > 0 ? { kind: 'waiting', text: `동전 다 쓰면 🪙+${COIN_MAX}` } : { kind: 'available', text: `지금 🪙+${COIN_MAX} 받기!` };
  if (!m.playable) return { kind: 'soon', text: 'COMING SOON' };
  const p = occupant(m.id);
  const q = queueOf(m.id);
  if (p && q.length) return { kind: 'waiting', text: `WAITING · ${q.length}명 대기` };
  if (p) return { kind: 'playing', text: `PLAYING · ${p.n}` };
  if (q.length) return { kind: 'waiting', text: `WAITING · ${q.length}명 대기` };
  return { kind: 'available', text: 'AVAILABLE' };
}

// ------------------------------------------------------------------ 행동
function nearestMachine() {
  let best = null;
  let bd = 1.35;
  for (const m of MACHINES) {
    const d = Math.hypot(me.x - m.spot.x, me.z - m.spot.z);
    if (d < bd) { bd = d; best = m; }
  }
  return best;
}

function promptFor(m) {
  if (!m) return null;
  if (!m.playable) return { text: `${m.emoji} 준비 중이에요`, act: false };
  if (m.instant) return save.coins > 0 ? { text: `🪙 ${save.coins}개 남았어요 (다 쓰면 와요)`, act: false } : { text: `E : 🪙 ${COIN_MAX}개 받기`, act: true };
  if (S.queue === m.id) {
    if (S.turn) return { text: '내 차례! E : PLAY', act: true };
    const i = queueOf(m.id).findIndex((q) => q.uid === net.uid);
    return { text: `대기 ${i + 1}번째`, act: false };
  }
  const p = occupant(m.id);
  const q = queueOf(m.id);
  if (p || q.length) return { text: `E : 줄 서기${q.length ? ` (${q.length}명)` : ''}`, act: true };
  return { text: `E : PLAY ${m.emoji}`, act: true };
}

let busyAct = false;
async function action() {
  S.idle = 0;
  if (S.mode === 'entry' || !me) return;
  const claw = clawOf(S.mode);
  if (claw) {
    if (claw.game.phase === 'idle') claw.insertCoin();
    else if (claw.game.phase === 'play') claw.dropClaw();
    renderPlayHud();
    return;
  }
  if (S.mode === 'ten' || S.mode === 'roulette') { game?.action(); renderPlayHud(); return; }
  const m = nearestMachine() || (S.turn ? MDEF[S.turn.mid] : null);
  if (!m || !m.playable || busyAct) {
    if (!m) wave();
    return;
  }
  if (m.instant) { exchangeCoins(m); return; }
  busyAct = true;
  try {
    const mine = S.queue === m.id;
    const q = queueOf(m.id);
    const first = q[0]?.uid === net.uid;
    if (occupant(m.id) || (q.length && !(mine && first))) {
      if (!mine) {
        if (S.queue) await net.queueLeave(S.queue);
        S.queue = m.id;
        await net.queueJoin(m.id, S.nick);
        toast(`${m.emoji} ${m.name} 줄을 섰어요. 차례가 오면 알려 드릴게요!`);
      }
      return;
    }
    const ok = await net.claim(m.id, S.nick);
    if (!ok) { toast('앗, 누가 먼저 앉았어요. 줄을 서 볼까요?'); return; }
    if (S.queue) { await net.queueLeave(S.queue); S.queue = null; }
    S.turn = null;
    startMachine(m);
  } finally {
    busyAct = false;
  }
}

function wave() {
  if (!me || S.mode !== 'walk') return;
  me.avatar.wave();
  S.waveSeq = (S.waveSeq || 0) + 1;
  sendMe(true);
}

let liveT = 0;
// 살아있다는 표시: 화면 프레임이 아니라 실제 시간 기준 (탭이 뒤로 가도 계속)
setInterval(() => {
  if (!net || !me) return;
  sendMe(true);
  if (S.mode !== 'walk' && S.mode !== 'entry') net.beat(S.mode);
}, 3000);
function startMachine(m) {
  S.mode = m.id;
  S.idle = 0;
  S.caught = 0;
  S.view = 'claw';
  S.zoomPlay = 1;
  S.playYaw = 0;
  S.playPitch = 0;
  cancelGo();
  me.x = m.spot.x;
  me.z = m.spot.z;
  me.r = Math.atan2(-m.fx, -m.fz);
  camInit = false;
  const ctx = {
    sfx, banner, confetti,
    pay: () => pay(),
    reward: (n, why) => reward(n, why),
    prize: (id, why) => prize(id, why),
    show: (big, sub, color) => { $('playBig').textContent = big; $('playBig').style.color = color || ''; $('playSub').textContent = sub; },
    sendLive: (d) => net.sendLive(m.id, d),
    score: (s, v) => submitScore(m.id, s, v),
  };
  if (m.id === 'ten') game = tenGame(ctx, world.machineMeshes.ten);
  else if (m.id === 'roulette') game = rouletteGame(ctx, world.machineMeshes.roulette);
  else game = null;
  $('playHud').hidden = false;
  $('playHud').dataset.machine = m.id;
  $('playTitle').textContent = `${m.emoji} ${m.name}`;
  $('viewBtn').hidden = !m.claw;
  if (m.claw) ctx.show('', '', '');
  document.body.classList.add('playing');
  document.body.classList.toggle('claw-play', !!m.claw);
  renderRank();
  renderPlayHud();
  sendMe(true);
  window.DopaSharp?.track('machine_start', { machine: m.id });
}

async function exitMachine(force = false) {
  if (S.mode === 'walk' || S.mode === 'entry') {
    if (S.queue) leaveQueue('줄에서 나왔어요');
    return;
  }
  const claw = clawOf(S.mode);
  if (!force && claw && claw.busy() && claw.game.phase !== 'play') { toast('집게가 돌아올 때까지 잠깐만요!'); return; }
  if (!force && game?.busy?.()) { toast('끝날 때까지 잠깐만요!'); return; }
  const m = MDEF[S.mode];
  if (claw && claw.game.phase === 'play') claw.dropClaw();
  if (force && claw) claw.park();
  game?.exit?.();
  game = null;
  S.mode = 'walk';
  $('playHud').hidden = true;
  $('rankPanel').hidden = true;
  document.body.classList.remove('playing', 'claw-play');
  me.x = m.spot.x + m.fx * 0.6;
  me.z = m.spot.z + m.fz * 0.6;
  camInit = false;
  await net.release(m.id);
  sendMe(true);
}

async function leaveQueue(msg) {
  const mid = S.queue;
  S.queue = null;
  S.turn = null;
  $('queueCard').hidden = true;
  if (mid) await net.queueLeave(mid);
  if (msg) toast(msg);
  sendMe(true);
}

// ------------------------------------------------------------------ 동전 · 티켓
function pay() {
  if (save.coins <= 0) {
    toast('🪙 동전이 없어요! 입구 왼쪽 동전 교환기에서 10개 받아요');
    banner('🪙 동전 교환기로!', 'miss', 1600);
    sfx.miss();
    return false;
  }
  save.coins--;
  persist();
  renderCoins(-1);
  if (save.coins === 0) setTimeout(() => toast('🪙 동전을 다 썼어요. 동전 교환기에서 10개 더 받을 수 있어요'), 2400);
  return true;
}
function exchangeCoins(m) {
  if (save.coins > 0) { toast(`🪙 동전이 ${save.coins}개 남았어요. 다 쓰면 다시 와요!`); return; }
  save.coins = COIN_MAX;
  persist();
  renderCoins(COIN_MAX);
  world.machineMeshes[m.id]?.pour?.();
  for (let i = 0; i < 6; i++) setTimeout(() => sfx.coin(), i * 110);
  banner(`🪙 +${COIN_MAX}`, 'win', 1600);
  me.avatar.wave();
}
function renderCoins(delta = 0) {
  $('coins').textContent = save.coins;
  $('coinChip').classList.toggle('empty', save.coins <= 0);
  if (delta) {
    const el = $('coinChip');
    el.classList.remove('bump', 'drop');
    void el.offsetWidth;
    el.classList.add(delta > 0 ? 'bump' : 'drop');
  }
}
function reward(n, why) {
  save.tickets += n;
  persist();
  renderTickets(n);
  if (why) toast(`${why} · 🎟️ +${n}`);
}
// 기록 남기기: 내 최고 기록보다 좋을 때만 서버에 저장 (트랜잭션)
async function submitScore(mid, s, v) {
  const conf = SCORE[mid];
  if (!conf || !net) return;
  const before = boards[mid] || [];
  const wasTop = before[0];
  let ok = false;
  try { ok = await net.submitScore(mid, S.nick, s, v, conf.asc); } catch (e) { console.warn('score', e); return; }
  if (!ok) return;
  const better = (a, b) => (conf.asc ? a < b : a > b);
  setTimeout(() => {
    if (!wasTop || better(s, wasTop.s)) { banner(`👑 ${MDEF[mid].name} 1위!`, 'rare', 2200); confetti(60); }
    else banner('🏆 내 최고 기록!', 'go', 1600);
  }, 1900);
}
function renderRank() {
  const el = $('rankPanel');
  const mid = S.mode;
  const conf = SCORE[mid];
  if (!conf) { el.hidden = true; return; }
  const list = boards[mid] || [];
  const mine = list.find((e) => e.uid === net?.uid);
  el.hidden = false;
  el.innerHTML = `<div class="rank-head">🏆 ${conf.label}</div>${list.length
    ? `<ol>${list.map((e, i) => `<li class="${e.uid === net?.uid ? 'me' : ''}"><span>${['👑', '2', '3', '4', '5'][i]}</span><b>${esc(e.n)}</b><em>${conf.fmt(e)}</em></li>`).join('')}</ol>`
    : '<p>아직 기록이 없어요. 첫 1위에 도전!</p>'}${mine ? '' : '<p class="rank-mine">내 기록은 아직 순위 밖</p>'}`;
}
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// 상품: 가방에 쌓이고, 최근 CARRY_MAX 개는 캐릭터에 주렁주렁
function prize(id, why) {
  if (!isItem(id)) return;
  save.items.push(id);
  if (save.items.length > 500) save.items.splice(0, save.items.length - 500);
  persist();
  me?.avatar.setCarry(save.items.slice(-CARRY_MAX));
  renderBag(true);
  sendMe(true);
  const info = itemInfo(id);
  if (why) toast(`${why} 상품 · ${info.emoji} ${info.name}`);
}
function renderBag(bump = false) {
  $('bagCount').textContent = save.items.length;
  if (bump) {
    const el = $('bagBtn');
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
  }
}
function openBag() {
  const counts = new Map();
  for (const id of save.items) {
    const info = itemInfo(id);
    if (!info) continue;
    const key = `${info.emoji} ${info.name}`;
    counts.set(key, { info, n: (counts.get(key)?.n || 0) + 1 });
  }
  const list = [...counts.values()].sort((a, b) => b.n - a.n);
  $('bagList').innerHTML = list.length
    ? list.map(({ info, n }) => `<li class="${info.rare ? 'rare' : ''}"><span>${info.emoji}</span><b>${info.name}</b><em>×${n}</em></li>`).join('')
    : '<li class="empty">아직 없어요. 오락기에서 상품을 받아 보세요!</li>';
  $('bagTotal').textContent = save.items.length;
  $('bagOverlay').classList.add('show');
}
$('bagBtn').addEventListener('click', openBag);
$('closeBag').addEventListener('click', () => $('bagOverlay').classList.remove('show'));

function renderTickets(delta = 0) {
  $('tickets').textContent = save.tickets;
  if (delta) {
    const el = $('ticketChip');
    el.classList.remove('bump', 'drop');
    void el.offsetWidth;
    el.classList.add(delta > 0 ? 'bump' : 'drop');
  }
}

// ------------------------------------------------------------------ HUD
function renderPlayHud() {
  const btnA = $('btnA');
  const claw = clawOf(S.mode);
  if (claw) {
    const ph = claw.game.phase;
    btnA.textContent = ph === 'idle' ? '🪙 코인' : ph === 'play' ? '뽑기!' : '…';
    btnA.disabled = !['idle', 'play'].includes(ph);
    $('playTimer').textContent = ph === 'play' ? Math.ceil(claw.game.left) : '';
    $('playTimer').classList.toggle('hurry', ph === 'play' && claw.game.left <= 5);
    $('playInfo').textContent = `🎁 ${save.items.length}`;
    $('playSub').textContent = ph === 'idle' ? `🪙 동전 1개 (남은 ${save.coins}) · 뽑으면 🎟️+3` : ph === 'play' ? (TOUCH ? '조이스틱으로 옮기고 뽑기!' : '방향키로 옮기고 Space') : '두근두근…';
    $('keyHintPlay').textContent = ph === 'idle' ? 'E 코인' : ph === 'play' ? 'Space 뽑기' : '…';
  } else if (game) {
    btnA.textContent = game.label();
    btnA.disabled = false;
    $('playTimer').textContent = '';
    $('playInfo').textContent = game.info();
    $('keyHintPlay').textContent = `E ${game.label()}`;
  }
}
function renderWalkHud() {
  const m = nearestMachine();
  const p = promptFor(m) || (S.turn ? { text: '내 차례! E : PLAY', act: true } : null);
  S.near = m;
  const el = $('prompt');
  if (p) {
    el.hidden = false;
    el.textContent = TOUCH ? p.text.replace(/^E : /, '') : p.text;
    el.classList.toggle('act', p.act);
    // 내 캐릭터 머리 위에
    const v = new THREE.Vector3(me.x, 2.25, me.z).project(camera);
    el.style.left = `${(v.x * 0.5 + 0.5) * innerWidth}px`;
    el.style.top = `${(-v.y * 0.5 + 0.5) * innerHeight}px`;
  } else el.hidden = true;
  const btnA = $('btnA');
  btnA.disabled = false;
  btnA.textContent = p?.act ? (m?.instant ? '🪙 받기' : S.queue === m?.id && !S.turn ? '…' : /줄/.test(p.text) ? '줄서기' : 'PLAY') : '👋';
  $('onlineCount').textContent = others.size + 1;
}

let bannerTimer;
function banner(text, kind = 'win', ms = 1500) {
  const b = $('banner');
  b.textContent = text;
  b.className = `banner show ${kind}`;
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => b.classList.remove('show'), ms);
}
function confetti(n) {
  const layer = $('confetti');
  const colors = ['#D9FF44', '#FF6C91', '#86EFC8', '#FFD36B', '#ffffff', '#e23b4a'];
  for (let i = 0; i < n; i++) {
    const s = document.createElement('i');
    s.style.left = `${50 + (Math.random() - 0.5) * 16}%`;
    s.style.background = colors[i % colors.length];
    s.style.setProperty('--dx', `${(Math.random() - 0.5) * 90}vw`);
    s.style.setProperty('--dy', `${-25 - Math.random() * 45}vh`);
    s.style.setProperty('--r', `${(Math.random() - 0.5) * 1440}deg`);
    s.style.animationDelay = `${Math.random() * 0.15}s`;
    layer.appendChild(s);
    setTimeout(() => s.remove(), 2200);
  }
}
let toastTimer;
function toast(text) {
  const t = $('toast');
  t.textContent = text;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

function toggleView() {
  if (!clawOf(S.mode)) return;
  S.view = S.view === 'claw' ? 'machine' : 'claw';
  $('viewBtn').textContent = S.view === 'claw' ? '🎥 기계 전체' : '🎥 집게 시점';
}

// ------------------------------------------------------------------ 이동 + 충돌
const RADIUS = 0.32;
const SPEED = 3.6;
function collide(p) {
  for (const c of world.colliders) {
    if (c.r) {
      const dx = p.x - c.cx;
      const dz = p.z - c.cz;
      const d = Math.hypot(dx, dz);
      const min = c.r + RADIUS;
      if (d < min && d > 1e-4) { p.x = c.cx + (dx / d) * min; p.z = c.cz + (dz / d) * min; }
    } else {
      const nx = clamp(p.x, c.x0, c.x1);
      const nz = clamp(p.z, c.z0, c.z1);
      const dx = p.x - nx;
      const dz = p.z - nz;
      const d = Math.hypot(dx, dz);
      if (d < RADIUS) {
        if (d > 1e-4) { p.x = nx + (dx / d) * RADIUS; p.z = nz + (dz / d) * RADIUS; }
        else {
          // 상자 안에 들어와 버림: 가장 가까운 면으로 밀어냄
          const opts = [[c.x0 - RADIUS - p.x, 0], [c.x1 + RADIUS - p.x, 0], [0, c.z0 - RADIUS - p.z], [0, c.z1 + RADIUS - p.z]];
          opts.sort((a, b) => Math.abs(a[0] + a[1]) - Math.abs(b[0] + b[1]));
          p.x += opts[0][0];
          p.z += opts[0][1];
        }
      }
    }
  }
  p.x = clamp(p.x, ROOM.x0 + RADIUS, ROOM.x1 - RADIUS);
  p.z = clamp(p.z, ROOM.z0 + RADIUS, ROOM.z1 - 0.4);
}

function walk(dt) {
  let { x, z } = moveInput();
  let auto = false;
  // 클릭/탭한 곳으로 자연스럽게 걸어감 (직접 움직이면 취소)
  if (S.go && (x || z)) cancelGo();
  if (S.go && !x && !z) {
    const g = S.go;
    const dx = g.x - me.x;
    const dz = g.z - me.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.12) {
      arrive(g);
    } else {
      const sp = Math.min(1, 0.35 + d * 1.2); // 도착할 때 천천히
      x = (dx / d) * sp;
      z = (dz / d) * sp;
      // 벽·기계에 막혀서 0.6초 동안 가까워지지 않으면 멈춤
      if (d < g.best - 0.03) { g.best = d; g.stuck = 0; }
      else if ((g.stuck += dt) > 0.6) cancelGo();
    }
  }
  // 줄 서 있으면 내 자리로 자동으로 걸어감 (직접 움직이면 그만)
  if (S.queue && !x && !z) {
    const m = MDEF[S.queue];
    const i = Math.max(0, queueOf(S.queue).findIndex((q) => q.uid === net.uid));
    const slot = S.turn ? m.spot : queueSlot(m, i);
    const dx = slot.x - me.x;
    const dz = slot.z - me.z;
    const d = Math.hypot(dx, dz);
    if (d > 0.12) { x = (dx / d) * Math.min(1, d * 1.5); z = (dz / d) * Math.min(1, d * 1.5); auto = true; }
    else if (d <= 0.12) me.r += (Math.atan2(-m.fx, -m.fz) - me.r) * Math.min(1, dt * 6);
  }
  const mag = Math.hypot(x, z);
  if (mag > 0.01) {
    S.idle = 0;
    me.x += x * SPEED * dt;
    me.z += z * SPEED * dt;
    const want = Math.atan2(x, z);
    let dr = want - me.r;
    dr = Math.atan2(Math.sin(dr), Math.cos(dr));
    me.r += dr * Math.min(1, dt * 12);
    collide(me);
    if (S.queue && !auto) {
      const m = MDEF[S.queue];
      const i = Math.max(0, queueOf(S.queue).findIndex((q) => q.uid === net.uid));
      const slot = queueSlot(m, i);
      if (Math.hypot(slot.x - me.x, slot.z - me.z) > 2.6 && Math.hypot(m.spot.x - me.x, m.spot.z - me.z) > 2.6) leaveQueue('줄에서 나왔어요');
    }
  }
  me.speed += (mag - me.speed) * Math.min(1, dt * 10);
}

// 줄: 내 차례인지 확인
function checkTurn() {
  if (!S.queue) return;
  const mid = S.queue;
  const q = queueOf(mid);
  if (!q.some((e) => e.uid === net.uid)) return; // 아직 반영 전
  const first = q[0]?.uid === net.uid;
  const card = $('queueCard');
  if (first && !occupant(mid)) {
    if (!S.turn) {
      S.turn = { mid, until: performance.now() + 10000 };
      sfx.start();
      banner('🔔 내 차례!', 'go', 1600);
    }
    const left = Math.ceil((S.turn.until - performance.now()) / 1000);
    card.hidden = false;
    card.innerHTML = `<b>${MDEF[mid].emoji} 내 차례!</b><span>${left}초 안에 ${TOUCH ? 'PLAY' : 'E'}를 눌러요</span>`;
    if (left <= 0) leaveQueue('차례가 지나가서 다음 사람에게 넘겼어요');
  } else {
    S.turn = null;
    const i = q.findIndex((e) => e.uid === net.uid);
    card.hidden = false;
    card.innerHTML = `<b>${MDEF[mid].emoji} ${MDEF[mid].name} 대기 ${i + 1}번째</b><span>멀리 걸어가면 줄에서 빠져요</span>`;
  }
}

// ------------------------------------------------------------------ 폰 조종기 (PC 화면에 QR)
let padHost = null;
let padCode = null;
let padSeq = { a: 0, b: 0, x: 0 };
async function setupPadHost() {
  if (TOUCH) return; // 폰에서는 화면 조이스틱으로
  padCode = sessionStorage.getItem('xmas-pad') || makeCode(6);
  sessionStorage.setItem('xmas-pad', padCode);
  try {
    padHost = await net.hostPad(padCode, {
      onPad(on) {
        pad.on = on;
        $('padDot').className = `dot ${on ? 'on' : 'off'}`;
        $('qrBtn').classList.toggle('connected', on);
        $('qrBtnText').textContent = on ? '폰 조종기 연결됨' : '폰으로 조종';
        if (on) { $('qrOverlay').classList.remove('show'); toast('📱 폰 조종기가 연결됐어요!'); }
        else { pad.x = pad.z = 0; }
      },
      onInput(v) {
        pad.x = clamp(+v.x || 0, -1, 1);
        pad.z = clamp(+v.z || 0, -1, 1);
        if ((v.a | 0) > padSeq.a) { padSeq.a = v.a | 0; action(); }
        if ((v.b | 0) > padSeq.b) { padSeq.b = v.b | 0; S.mode === 'walk' ? wave() : toggleView(); }
        if ((v.x2 | 0) > padSeq.x) { padSeq.x = v.x2 | 0; exitMachine(); }
      },
    });
  } catch (e) {
    console.warn('pad host failed', e);
    return;
  }
  const url = new URL('pad.html', location.href);
  url.searchParams.set('c', padCode);
  if (netMode === 'local') url.searchParams.set('local', '');
  $('padLink').href = url.href;
  $('padLink').textContent = url.href.replace(/^https?:\/\//, '');
  $('padCode').textContent = padCode;
  for (const [el, size] of [[$('qr'), 220]]) {
    el.innerHTML = '';
    if (window.QRCode) new QRCode(el, { text: url.href, width: size, height: size, colorDark: '#0B0E0D', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M });
  }
}
$('qrBtn').addEventListener('click', () => $('qrOverlay').classList.add('show'));
$('closeQr').addEventListener('click', () => $('qrOverlay').classList.remove('show'));
let padUiKey = '';
function sendPadUi() {
  if (!padHost || !pad.on) return;
  const btnA = $('btnA');
  const ui = { a: btnA.textContent, ad: btnA.disabled ? 1 : 0, mode: S.mode === 'walk' ? 'walk' : 'play', b: S.mode === 'walk' ? '👋' : clawOf(S.mode) ? '🎥' : '', t: save.coins, title: S.mode === 'walk' ? (S.near ? `${S.near.emoji} ${S.near.name}` : '오락실') : $('playTitle').textContent };
  const k = JSON.stringify(ui);
  if (k === padUiKey) return;
  padUiKey = k;
  padHost.setUi(ui);
}

// ------------------------------------------------------------------ 카메라
let camInit = false;
const camPos = new THREE.Vector3();
const camLook = new THREE.Vector3();
const tmpA = new THREE.Vector3();
const offV = new THREE.Vector3();
function orbit(cam, look, yaw, pitch) {
  if (!yaw && !pitch) return;
  offV.subVectors(cam, look);
  const r = offV.length();
  const el = clamp(Math.asin(offV.y / r) + pitch, 0.12, 1.45);
  const az = Math.atan2(offV.x, offV.z) + yaw;
  cam.set(look.x + Math.sin(az) * Math.cos(el) * r, look.y + Math.sin(el) * r, look.z + Math.cos(az) * Math.cos(el) * r);
}
const tmpB = new THREE.Vector3();
function updateCamera(dt, now) {
  if (S.mode === 'entry') {
    const a = now / 9000;
    tmpA.set(Math.sin(a) * 9, 6.5, 4 + Math.cos(a) * 7);
    tmpB.set(0, 1.4, 0);
  } else if (clawOf(S.mode)) {
    const claw = clawOf(S.mode);
    claw.cameraPose(S.view, tmpA, tmpB);
    claw.group.localToWorld(tmpA);
    claw.group.localToWorld(tmpB);
  } else if (S.mode === 'ten' || S.mode === 'roulette') {
    const g = MDEF[S.mode].group;
    if (S.mode === 'ten') { tmpA.set(0, 1.85, 2.3); tmpB.set(0, 1.5, 0); }
    else { tmpA.set(0, 1.95, 2.9); tmpB.set(0, 1.7, 0); }
    g.localToWorld(tmpA);
    g.localToWorld(tmpB);
  } else {
    // 내 캐릭터를 뒤 위에서 따라감. 세로 화면이면 조금 더 멀리
    const portrait = camera.aspect < 1 ? Math.min(1.7, 1 / camera.aspect) : 1;
    const dist = 7.2 * (0.75 + portrait * 0.25 + (portrait - 1) * 0.35) * S.zoom;
    tmpA.set(me.x, 0.6 + dist * 0.95, me.z + dist);
    tmpB.set(me.x, 0.7, me.z - 0.6);
  }
  // 오락기 앞: 바라보는 곳을 기준으로 당기거나 밀기 (집게 시점은 화각으로)
  if (S.mode !== 'walk' && S.mode !== 'entry' && !(clawOf(S.mode) && S.view === 'claw')) {
    tmpA.sub(tmpB).multiplyScalar(S.zoomPlay).add(tmpB);
  }
  // 끌어서 돌린 시점: 바라보는 곳을 중심으로 빙글
  if (S.mode !== 'entry' && !(clawOf(S.mode) && S.view === 'claw')) {
    const walking = S.mode === 'walk';
    orbit(tmpA, tmpB, walking ? S.yaw : S.playYaw, walking ? S.pitch : S.playPitch);
  }
  const f = !camInit ? 1 : Math.min(1, dt * (clawOf(S.mode) && S.view === 'claw' ? 12 : 5));
  camPos.lerp(tmpA, f);
  camLook.lerp(tmpB, f);
  camInit = true;
  camera.position.copy(camPos);
  camera.lookAt(camLook);
  const fov = clawOf(S.mode) && S.view === 'claw' ? clamp(70 * S.zoomPlay, 40, 95) : 45;
  if (Math.abs(camera.fov - fov) > 0.01) { camera.fov += (fov - camera.fov) * Math.min(1, dt * 12); camera.updateProjectionMatrix(); }
}

// ------------------------------------------------------------------ 루프
let last = performance.now();
let hudT = 0;
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  if (me && S.mode === 'walk') walk(dt);
  if (me) {
    if (S.mode !== 'walk') me.speed += (0 - me.speed) * Math.min(1, dt * 10);
    me.avatar.root.position.set(me.x, 0, me.z);
    me.avatar.root.visible = S.mode === 'walk'; // 오락기 앞에서는 내 머리가 화면을 가리지 않게
    me.avatar.root.rotation.y = me.r;
    me.avatar.animate(dt, me.speed);
  }
  preview?.animate(dt, 0);
  if (preview) preview.root.rotation.y = Math.sin(now / 1200) * 0.5;

  // 다른 사람들: 받은 좌표로 부드럽게
  const k = Math.min(1, dt * 10);
  for (const [uid, o] of others) {
    const d = o.data;
    if (netMode === 'local' && net && net.now() - (d.t || 0) > 20000) { scene.remove(o.avatar.root); others.delete(uid); continue; }
    const px = o.x;
    const pz = o.z;
    o.x += (d.x - o.x) * k;
    o.z += (d.z - o.z) * k;
    let dr = (d.r || 0) - o.r;
    dr = Math.atan2(Math.sin(dr), Math.cos(dr));
    o.r += dr * k;
    const sp = Math.hypot(o.x - px, o.z - pz) / Math.max(dt, 1e-3) / SPEED;
    o.speed += (Math.min(1, sp) - o.speed) * k;
    o.avatar.root.position.set(o.x, 0, o.z);
    o.avatar.root.visible = S.mode === 'walk' || Math.hypot(o.x - camera.position.x, o.z - camera.position.z) > 1.4;
    o.avatar.root.rotation.y = o.r;
    o.avatar.animate(dt, o.speed);
  }

  // 인형뽑기: 내가 하면 물리, 남이 하면 구경
  for (const [mid, claw] of Object.entries(claws)) {
    const occ = net ? occupant(mid) : null;
    if (S.mode === mid) {
      const { x, z } = moveInput();
      claw.setInput(x, z);
      claw.update(dt);
      liveT += dt;
      if (liveT > 0.12) { liveT = 0; net.sendLive(mid, claw.live()); }
    } else if (occ && occ.uid !== net.uid) {
      claw.applyLive(machinesState[mid]?.live, dt);
      claw.spectating = true;
    } else {
      if (claw.spectating) { claw.park(); claw.spectating = false; }
      if (claw.busy()) { claw.setInput(0, 0); claw.update(dt); }
    }
    claw.draw(dt, now);
  }

  // 미니게임
  if (game) game.update(dt);
  for (const mid of ['ten', 'roulette']) {
    if (S.mode === mid) continue;
    const o = net ? occupant(mid) : null;
    const live = machinesState[mid]?.live;
    if (o && o.uid !== net.uid && live) {
      if (mid === 'ten') applyTenLive(world.machineMeshes.ten, live);
      else applyRouletteLive(world.machineMeshes.roulette, live, dt);
    }
  }

  for (const f of world.animated) f(dt, now);

  // 네트워크: 위치 10회/초, 가만히 있으면 3초마다 살아있다는 표시
  if (net && me) {
    sendT += dt;
    if (sendT > 0.1) {
      sendT = 0;
      sendMe(false);
    }
    if (S.mode !== 'walk' && S.mode !== 'entry') {
      // 줄 선 사람이 있는데 한참 아무것도 안 하면 자리 양보
      S.idle += dt;
      const waiting = queueOf(S.mode).length > 0;
      const idleNow = clawOf(S.mode) ? clawOf(S.mode).game.phase === 'idle' : !game?.busy?.();
      if (idleNow && ((waiting && S.idle > 20) || S.idle > 90)) { toast('한동안 조작이 없어서 자리를 비켜 줬어요'); exitMachine(); }
    }
  }

  if (goMarker.visible) {
    goMarker.scale.setScalar(1 + (goMarker.scale.x - 1) * Math.max(0, 1 - dt * 6) + Math.sin(now / 200) * 0.02);
    goMarker.material.opacity = 0.55 + Math.sin(now / 160) * 0.25;
  }
  updateCamera(dt, now);

  hudT += dt;
  if (me && hudT > 0.08) {
    hudT = 0;
    for (const m of MACHINES) drawStatus(m, statusOf(m));
    if (S.mode === 'walk') { renderWalkHud(); checkTurn(); }
    else {
      $('prompt').hidden = true;
      $('queueCard').hidden = true;
      renderPlayHud();
      // 연결이 오래 끊겨서 다른 사람이 자리를 가져갔으면 나옴
      const holder = machinesState[S.mode]?.player;
      if (holder && holder.uid !== net.uid) { toast('연결이 끊긴 사이 다음 사람이 시작했어요'); exitMachine(true); }
    }
    sendPadUi();
  } else if (!me && hudT > 0.5) {
    hudT = 0;
    for (const m of MACHINES) drawStatus(m, statusOf(m));
  }

  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

addEventListener('pagehide', () => {
  if (!net) return;
  if (S.mode !== 'walk' && S.mode !== 'entry') net.release(S.mode);
  if (S.queue) net.queueLeave(S.queue);
  net.leave();
});

window.__arcade = { S, claw: claws.claw, claws, others, save, prize, get me() { return me; }, get net() { return net; }, get machines() { return machinesState; }, action, exitMachine, scene, camera };
window.__arcadeReady = true;
