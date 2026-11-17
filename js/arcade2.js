// 새 오락기 다섯 대: 농구 · 도끼 연타 · 사격 · 밀어내기 인형 · 타이밍 인형뽑기.
// 각 기계는 build() 로 3D 모델을 만들고, start(ctx) 로 게임 진행기를 돌려줘요 (minigames.js 와 같은 모양).
//   진행기: label() · info() · busy() · action() · update(dt) · exit() · pointer?(type, x, y)
//   ctx: sfx · pay() · reward(n) · prize(id, why) · score(s, v) · banner · confetti · show(big, sub, color) · ray(x, y) · flash(x, y, hit)
import * as THREE from 'three';
import { canvasTex, marqueeTex, FONT } from './world.js?v=11';
import { makeItem, pickKind, pickDoll, pickAcc, itemInfo } from './plush.js?v=11';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.5, ...o });
const LIME = 0xd9ff44;
const RED = 0xe23b4a;
const GOLD = 0xffd36b;

function add(parent, geo, mat, x, y, z, rot) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  if (rot) m.rotation.set(...rot);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
const BOX = (w, h, d) => new THREE.BoxGeometry(w, h, d);
function signPlate(parent, text, w, h, x, y, z, color, stroke) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: marqueeTex(text, color, stroke) }));
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}
// 숫자 전광판
function led(w, h) {
  const tex = canvasTex(256, 112, () => {});
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex }));
  let last = '';
  const set = (text, color = '#D9FF44') => {
    if (`${text}${color}` === last) return;
    last = `${text}${color}`;
    const c = tex.userData.canvas;
    const g = c.getContext('2d');
    g.fillStyle = '#071412';
    g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = color;
    g.shadowColor = color;
    g.shadowBlur = 14;
    g.font = `80px ${FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, c.width / 2, c.height / 2 + 4);
    g.shadowBlur = 0;
    tex.needsUpdate = true;
  };
  set('--');
  return { mesh, set };
}
function glass(parent, w, h, d, x, y, z) {
  const m = new THREE.Mesh(BOX(w, h, d), new THREE.MeshPhysicalMaterial({ color: 0xcfefff, roughness: 0.05, transparent: true, opacity: 0.1, depthWrite: false }));
  m.position.set(x, y, z);
  m.renderOrder = 10;
  parent.add(m);
  return m;
}
function randomPlushId() {
  if (Math.random() < 0.6) {
    const k = pickKind();
    const a = pickAcc(k);
    return a ? `${k}.${a}` : k;
  }
  return pickDoll();
}
const GIANTS = ['bear.hat', 'bunny.scarf', 'snowman.hat', 'penguin.scarf', 'reindeer.bow', 'cat.hat', 'santa.', 'polar.', 'elf.'];
const giant = () => `${GIANTS[Math.floor(Math.random() * GIANTS.length)]}.big`;

// 점수에 따라 상품 주기 (모두 뭐라도 받아요)
function grant(ctx, tiers, value, why) {
  const t = tiers.find((x) => value >= x.min) || tiers[tiers.length - 1];
  const item = typeof t.item === 'function' ? t.item() : t.item;
  const info = itemInfo(item);
  ctx.prize(item, why);
  if (t.n) ctx.reward(t.n);
  ctx.sfx.win();
  if (t.n >= 5) ctx.confetti(t.n * 7);
  ctx.banner(`${info.emoji} ${info.name} GET!`, t.n >= 10 ? 'rare' : t.n ? 'win' : 'go', 2200);
  return { info, n: t.n };
}

// ====================================================================== 🏀 농구
function buildBasket() {
  const g = new THREE.Group();
  const body = std(0xff8a2a);
  add(g, BOX(1.7, 0.2, 2.2), std(0x6b3f22, { roughness: 0.7 }), 0, 0.8, 0.1, [-0.12, 0, 0]);
  for (const s of [-1, 1]) {
    add(g, BOX(0.08, 0.9, 2.2), body, s * 0.86, 0.45, 0.1);
    const net = add(g, BOX(0.02, 1.6, 1.6), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.16 }), s * 0.86, 1.7, -0.3);
    net.castShadow = false;
  }
  add(g, BOX(1.7, 0.75, 0.1), body, 0, 0.38, 1.18);
  add(g, BOX(1.4, 1.0, 0.06), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 }), 0, 2.3, -1.0);
  const sq = new THREE.LineSegments(new THREE.EdgesGeometry(BOX(0.5, 0.36, 0.01)), new THREE.LineBasicMaterial({ color: RED }));
  sq.position.set(0, 2.15, -0.96);
  g.add(sq);
  add(g, new THREE.TorusGeometry(0.22, 0.022, 8, 28), std(RED, { metalness: 0.4 }), 0, 1.95, -0.7, [Math.PI / 2, 0, 0]);
  const net = add(g, new THREE.CylinderGeometry(0.22, 0.14, 0.3, 14, 1, true), new THREE.MeshStandardMaterial({ color: 0xffffff, wireframe: true }), 0, 1.8, -0.7);
  add(g, BOX(1.8, 0.4, 0.3), body, 0, 3.0, -1.0);
  signPlate(g, '농구', 1.7, 0.34, 0, 3.0, -0.84);
  add(g, BOX(1.7, 2.9, 0.12), body, 0, 1.45, -1.12);
  const score = led(0.6, 0.26);
  score.mesh.position.set(0, 2.66, -0.965);
  g.add(score.mesh);
  // 공 (줄무늬 텍스처)
  const ballTex = canvasTex(128, 64, (c, w, h) => {
    c.fillStyle = '#e8742a';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = '#3a1a08';
    c.lineWidth = 3;
    for (const x of [w / 4, w / 2, (3 * w) / 4]) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
    c.beginPath(); c.moveTo(0, h / 2); c.lineTo(w, h / 2); c.stroke();
  });
  const ballGeo = new THREE.SphereGeometry(0.12, 20, 14);
  const ballMat = new THREE.MeshStandardMaterial({ map: ballTex, roughness: 0.8 });
  for (let i = 0; i < 4; i++) add(g, ballGeo, ballMat, -0.55 + i * 0.22, 0.97, 0.95);
  const ball = add(g, ballGeo, ballMat, 0, 1.15, 0.75);

  const HOOP = V(0, 1.95, -0.7);
  const RIM = 0.22;
  const R = 0.12;
  let swish = 0;
  return {
    group: g,
    footprint: { x0: -0.95, x1: 0.95, z0: -1.2, z1: 1.25 },
    cam: { pos: V(0, 1.72, 2.45), look: V(0, 1.6, -0.5) },
    idle(dt) {
      if (swish > 0) { swish = Math.max(0, swish - dt * 3); net.scale.set(1, 1 + Math.sin(swish * 12) * 0.15 * swish, 1); }
    },
    start(ctx) {
      let state = 'ready';
      let shots = 0;
      let made = 0;
      let left = 0;
      let aim = 0;
      let motion = false;
      let swipe = null;
      let lastThrow = 0;
      let endT = 0;
      const b = { p: V(0, 1.15, 0.75), v: V(), fly: false, scored: false, rest: 0 };
      const holdPos = () => V(aim * 0.3, 1.15, 0.75);
      const onOri = (e) => { if (e.gamma != null) aim = clamp(e.gamma / 35, -1, 1); };
      const onMot = (e) => {
        if (!motion || state !== 'play' || b.fly) return;
        const a = e.acceleration;
        if (!a) return;
        const m = Math.hypot(a.x || 0, a.y || 0, a.z || 0);
        if (m > 14 && performance.now() - lastThrow > 800) throwBall(clamp(0.8 + (m - 14) / 40, 0.7, 1.35), 0);
      };
      function throwBall(p, lateral) {
        if (state !== 'play' || b.fly || shots <= 0) return;
        shots--;
        lastThrow = performance.now();
        const P0 = holdPos();
        b.p.copy(P0);
        const T = 0.78;
        const v = V(HOOP.x, HOOP.y + 0.06, HOOP.z).sub(P0);
        v.y += 0.5 * 9.8 * T * T;
        v.divideScalar(T);
        v.multiplyScalar(1 + (p - 1) * 0.75);
        v.x += lateral;
        b.v.copy(v);
        b.fly = true;
        b.scored = false;
        b.rest = 0;
        ctx.sfx.drop();
      }
      async function toggleMotion() {
        if (!motion) {
          try {
            if (window.DeviceMotionEvent?.requestPermission) await DeviceMotionEvent.requestPermission();
            if (window.DeviceOrientationEvent?.requestPermission) await DeviceOrientationEvent.requestPermission();
          } catch { /* 거절 */ }
          addEventListener('devicemotion', onMot);
          addEventListener('deviceorientation', onOri);
          motion = true;
          ctx.show('📱', '폰을 앞으로 휙! 던지듯 흔들어요 · 좌우로 기울여 조준', '#86EFC8');
        } else {
          motion = false;
          aim = 0;
          removeEventListener('devicemotion', onMot);
          removeEventListener('deviceorientation', onOri);
        }
      }
      function finish() {
        state = 'ready';
        score.set(`${made}`, '#D9FF44');
        ctx.score(made, made);
        const r = grant(ctx, [
          { min: 8, item: giant, n: 10 }, { min: 6, item: 'star', n: 5 }, { min: 4, item: 'gift', n: 3 },
          { min: 2, item: 'bell', n: 1 }, { min: 1, item: 'cookie', n: 0 }, { min: 0, item: 'candy', n: 0 },
        ], made, '농구');
        ctx.show(`${made}골`, `${r.info.emoji} ${r.info.name}${r.n ? ` + 🎟️${r.n}` : ''}`, '#D9FF44');
      }
      ctx.show('🏀', '화면을 위로 휙 밀어서 던져요 · 10개 중 8골이면 왕큰 인형!', '#FF8A2A');
      return {
        label: () => (state === 'play' ? (motion ? '📱 흔들기 끄기' : '📱 폰으로 던지기') : '▶ START 🪙1'),
        info: () => (state === 'play' ? `🏀 ${made}골 · 공 ${shots} · ${Math.ceil(left)}초` : '공 10개 · 30초'),
        busy: () => state === 'play',
        action() {
          if (state === 'play') { toggleMotion(); return; }
          if (!ctx.pay()) return;
          state = 'play';
          shots = 10;
          made = 0;
          left = 30;
          endT = 0;
          score.set('0');
          ctx.sfx.coin();
          setTimeout(ctx.sfx.start, 200);
          ctx.show('GO!', motion ? '폰을 휙! 흔들어 던져요' : '위로 휙 밀어서 던져요', '#86EFC8');
        },
        pointer(type, x, y) {
          if (state !== 'play') return;
          if (type === 'down') swipe = { x, y };
          else if (type === 'up' && swipe) {
            const dy = swipe.y - y;
            const dx = x - swipe.x;
            swipe = null;
            if (dy < 25) return;
            throwBall(clamp(dy / innerHeight / 0.3, 0.5, 1.6), (dx / innerWidth) * 1.8);
          }
        },
        update(dt) {
          if (b.fly) {
            const sub = 4;
            for (let i = 0; i < sub; i++) {
              const h = dt / sub;
              const prevY = b.p.y;
              b.v.y -= 9.8 * h;
              b.p.addScaledVector(b.v, h);
              if (b.p.z - R < -0.97 && b.v.z < 0 && Math.abs(b.p.x) < 0.7 && b.p.y > 1.8 && b.p.y < 2.8) { b.p.z = -0.97 + R; b.v.z *= -0.5; b.v.x *= 0.8; ctx.sfx.thud(); }
              const dxh = b.p.x - HOOP.x;
              const dzh = b.p.z - HOOP.z;
              const dh = Math.hypot(dxh, dzh) || 1e-6;
              const radial = dh - RIM;
              const ry = b.p.y - HOOP.y;
              const d = Math.hypot(radial, ry) || 1e-6;
              if (d < R + 0.022) {
                const nx = (radial / d) * (dxh / dh);
                const nz = (radial / d) * (dzh / dh);
                const ny = ry / d;
                const vn = b.v.x * nx + b.v.y * ny + b.v.z * nz;
                if (vn < 0) { b.v.x -= 1.6 * vn * nx; b.v.y -= 1.6 * vn * ny; b.v.z -= 1.6 * vn * nz; b.v.multiplyScalar(0.8); ctx.sfx.tick(false); }
                const push = R + 0.022 - d;
                b.p.x += nx * push; b.p.y += ny * push; b.p.z += nz * push;
              }
              if (!b.scored && b.v.y < 0 && prevY >= HOOP.y && b.p.y < HOOP.y && dh < RIM - 0.03) {
                b.scored = true;
                made++;
                swish = 1;
                score.set(`${made}`);
                ctx.sfx.grab();
                ctx.show(`${made}골!`, '나이스 슛 🏀', '#D9FF44');
              }
              if (Math.abs(b.p.x) > 0.86 - R) { b.p.x = Math.sign(b.p.x) * (0.86 - R); b.v.x *= -0.5; }
            }
            ball.rotation.x -= dt * 9;
            if (b.p.y < 0.95 || b.p.z > 1.4) {
              b.rest += dt;
              if (b.rest > 0.25) { b.fly = false; b.p.copy(holdPos()); }
            }
          } else {
            b.p.lerp(holdPos(), Math.min(1, dt * 8));
          }
          ball.position.copy(b.p);
          if (state === 'play') {
            left -= dt;
            if ((shots <= 0 && !b.fly) || left <= 0) {
              endT += dt;
              if (endT > 0.6 || left <= -1) finish();
            }
          }
        },
        exit() {
          if (motion) toggleMotion();
          b.fly = false;
          b.p.copy(holdPos());
          ball.position.copy(b.p);
        },
      };
    },
  };
}

// ====================================================================== 🪓 도끼 연타
function buildPunch() {
  const g = new THREE.Group();
  const body = std(0x6c4cff, { roughness: 0.45 });
  add(g, BOX(1.1, 1.0, 0.8), body, 0, 0.5, 0);
  add(g, BOX(1.1, 1.7, 0.25), body, 0, 1.85, -0.3);
  add(g, BOX(1.16, 0.06, 0.86), std(LIME, { emissive: LIME, emissiveIntensity: 0.5 }), 0, 1.0, 0);
  const screen = led(0.8, 0.34);
  screen.mesh.position.set(0, 2.25, -0.17);
  g.add(screen.mesh);
  add(g, BOX(1.2, 0.36, 0.4), std(RED), 0, 2.86, -0.3);
  signPlate(g, '도끼 연타', 1.1, 0.3, 0, 2.86, -0.095);
  // 통나무 과녁
  const wood = std(0xa0663b, { roughness: 0.85 });
  const log = add(g, new THREE.CylinderGeometry(0.2, 0.2, 0.7, 20), wood, 0, 1.2, 0.0, [0, 0, Math.PI / 2]);
  const ringTex = canvasTex(128, 128, (c, w, h) => {
    c.fillStyle = '#e8c28a';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = '#a0663b';
    c.lineWidth = 4;
    for (let r = 10; r < 64; r += 12) { c.beginPath(); c.arc(w / 2, h / 2, r, 0, Math.PI * 2); c.stroke(); }
  });
  for (const s of [-1, 1]) add(g, new THREE.CircleGeometry(0.2, 20), new THREE.MeshStandardMaterial({ map: ringTex }), s * 0.351, 1.2, 0, [0, s * Math.PI / 2, 0]);
  // 도끼: 앞쪽 축을 중심으로 내리찍음
  const axe = new THREE.Group();
  axe.position.set(0.0, 1.32, 0.62);
  g.add(axe);
  add(axe, new THREE.CylinderGeometry(0.025, 0.03, 0.62, 10), std(0x6b3f22), 0, 0, -0.3, [Math.PI / 2, 0, 0]);
  add(axe, BOX(0.05, 0.22, 0.16), std(0xdfe4ea, { metalness: 0.8, roughness: 0.25 }), 0, -0.04, -0.58);
  add(axe, BOX(0.052, 0.04, 0.17), std(RED), 0, 0.08, -0.58);
  const UP = 1.15;
  axe.rotation.x = UP;
  // 나무 조각
  const chips = [];
  const chipGeo = BOX(0.03, 0.02, 0.05);
  for (let i = 0; i < 18; i++) { const c = add(g, chipGeo, wood, 0, -1, 0); c.visible = false; chips.push({ m: c, v: V(), life: 0 }); }
  let swing = 0;
  let chipI = 0;
  function chop() {
    swing = 1;
    for (let i = 0; i < 3; i++) {
      const c = chips[chipI++ % chips.length];
      c.m.visible = true;
      c.m.position.set(rand(-0.1, 0.1), 1.38, 0.12);
      c.v.set(rand(-1.2, 1.2), rand(1.2, 2.4), rand(0.3, 1.2));
      c.life = 0.8;
    }
    log.rotation.x = rand(-0.05, 0.05);
  }
  return {
    group: g,
    footprint: { x0: -0.6, x1: 0.6, z0: -0.45, z1: 0.45 },
    cam: { pos: V(1.25, 1.85, 1.45), look: V(0, 1.35, 0.1) },
    idle(dt) {
      swing = Math.max(0, swing - dt * 9);
      // 내리찍을 때 빠르게, 올라갈 때 천천히
      axe.rotation.x = UP * (1 - Math.sin(Math.min(1, swing) * Math.PI * 0.5));
      for (const c of chips) {
        if (c.life <= 0) continue;
        c.life -= dt;
        c.v.y -= 9.8 * dt;
        c.m.position.addScaledVector(c.v, dt);
        c.m.rotation.x += dt * 12;
        if (c.life <= 0 || c.m.position.y < 1.0) { c.m.visible = false; c.life = 0; }
      }
    },
    start(ctx) {
      let state = 'ready';
      let t = 0;
      let hits = 0;
      const PLAY = 10;
      screen.set('READY', '#86EFC8');
      ctx.show('🪓', '10초 동안 최대한 빨리 연타! 110번이면 왕큰 인형', '#B9A6FF');
      const hit = () => {
        if (state !== 'play') return;
        hits++;
        chop();
        screen.set(`${hits}`);
        if (hits % 2) ctx.sfx.thud(); else ctx.sfx.tick(false);
        ctx.show(`${hits}`, `${Math.max(0, PLAY - t).toFixed(1)}초`, '#D9FF44');
      };
      function finish() {
        state = 'ready';
        screen.set(`${hits}`, '#FFD36B');
        ctx.score(hits, hits);
        const r = grant(ctx, [
          { min: 110, item: giant, n: 10 }, { min: 90, item: 'star', n: 5 }, { min: 70, item: 'gift', n: 3 },
          { min: 50, item: 'bell', n: 1 }, { min: 30, item: 'cookie', n: 0 }, { min: 0, item: 'candy', n: 0 },
        ], hits, '도끼 연타');
        ctx.show(`${hits}번`, `초당 ${(hits / PLAY).toFixed(1)}번 · ${r.info.emoji} ${r.info.name}${r.n ? ` + 🎟️${r.n}` : ''}`, '#D9FF44');
      }
      return {
        label: () => (state === 'play' ? '🪓 TAP!' : state === 'count' ? '…' : '▶ START 🪙1'),
        info: () => (state === 'play' ? `🪓 ${hits}번 · ${Math.max(0, PLAY - t).toFixed(1)}초` : '버튼이나 화면 아무 데나 연타'),
        busy: () => state === 'play' || state === 'count',
        action() {
          if (state === 'play') { hit(); return; }
          if (state !== 'ready' || !ctx.pay()) return;
          state = 'count';
          t = 3;
          hits = 0;
          ctx.sfx.coin();
        },
        pointer(type) { if (type === 'down') hit(); },
        update(dt) {
          if (state === 'count') {
            const before = Math.ceil(t);
            t -= dt;
            const now = Math.ceil(t);
            ctx.show(now > 0 ? `${now}` : 'GO!', '준비…', '#86EFC8');
            screen.set(now > 0 ? `${now}` : 'GO!', '#86EFC8');
            if (now !== before) ctx.sfx.tick(now <= 0);
            if (t <= 0) { state = 'play'; t = 0; ctx.sfx.start(); }
          } else if (state === 'play') {
            t += dt;
            if (t >= PLAY) finish();
          }
        },
        exit() { screen.set('--'); },
      };
    },
  };
}

// ====================================================================== 🎯 사격
function buildShoot() {
  const g = new THREE.Group();
  const stripe = canvasTex(256, 256, (c, w, h) => {
    for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#ffffff' : '#e23b4a'; c.fillRect((i * w) / 8, 0, w / 8, h); }
  });
  add(g, BOX(2.0, 1.7, 0.06), new THREE.MeshStandardMaterial({ map: stripe, roughness: 0.8 }), 0, 1.55, -0.6);
  for (const s of [-1, 1]) add(g, BOX(0.08, 2.2, 1.3), std(0x1d7a3f), s * 1.02, 1.1, 0.0);
  add(g, BOX(2.0, 1.0, 0.4), std(0x1d7a3f), 0, 0.5, 0.5);
  add(g, BOX(2.06, 0.06, 0.46), std(GOLD, { metalness: 0.4, roughness: 0.3 }), 0, 1.02, 0.5);
  add(g, BOX(2.2, 0.4, 1.4), std(RED), 0, 2.4, 0.0);
  signPlate(g, '사격 게임', 1.6, 0.34, 0, 2.4, 0.705);
  // 레일 + 과녁
  const bull = (gold) => canvasTex(128, 128, (c, w, h) => {
    const cols = gold ? ['#FFD36B', '#ffffff', '#FFD36B', '#e23b4a'] : ['#ffffff', '#e23b4a', '#ffffff', '#e23b4a'];
    cols.forEach((col, i) => { c.fillStyle = col; c.beginPath(); c.arc(w / 2, h / 2, 64 - i * 15, 0, Math.PI * 2); c.fill(); });
  });
  const discMat = [new THREE.MeshStandardMaterial({ map: bull(false), roughness: 0.6 }), new THREE.MeshStandardMaterial({ map: bull(true), roughness: 0.4, emissive: 0x6b4a00, emissiveIntensity: 0.4 })];
  const rimMat = std(0x2b1d3d);
  const RAILS = [
    { y: 1.2, n: 4, speed: 0.32, r: 0.11, pts: 10 },
    { y: 1.58, n: 3, speed: -0.5, r: 0.1, pts: 20 },
    { y: 1.95, n: 2, speed: 0.78, r: 0.075, pts: 50, gold: true },
  ];
  const targets = [];
  for (const rail of RAILS) {
    add(g, BOX(1.95, 0.025, 0.03), std(0xdfe4ea, { metalness: 0.7, roughness: 0.3 }), 0, rail.y - rail.r - 0.06, -0.5);
    for (let i = 0; i < rail.n; i++) {
      const pivot = new THREE.Group();
      pivot.position.set(-0.85 + (i * 1.7) / rail.n, rail.y - rail.r - 0.05, -0.48);
      const stick = add(pivot, BOX(0.015, 0.06, 0.015), rimMat, 0, 0.03, 0);
      stick.castShadow = false;
      const disc = add(pivot, new THREE.CylinderGeometry(rail.r, rail.r, 0.02, 24), [rimMat, discMat[rail.gold ? 1 : 0], rimMat], 0, rail.r + 0.05, 0, [Math.PI / 2, Math.PI / 2, 0]);
      g.add(pivot);
      targets.push({ pivot, disc, rail, x: pivot.position.x, down: 0, back: 0 });
    }
  }
  // 장난감 총
  const gun = new THREE.Group();
  gun.position.set(0.32, 1.1, 0.5);
  gun.rotation.y = 0.15;
  add(gun, BOX(0.06, 0.06, 0.4), std(0x2b2b2b, { metalness: 0.5 }), 0, 0, -0.1);
  add(gun, BOX(0.06, 0.14, 0.06), std(0x6b3f22), 0, -0.08, 0.06);
  g.add(gun);
  let recoil = 0;
  return {
    group: g,
    footprint: { x0: -1.08, x1: 1.08, z0: -0.66, z1: 0.75 },
    cam: { pos: V(0, 1.55, 2.0), look: V(0, 1.55, -0.45) },
    idle(dt) {
      for (const t of targets) {
        t.x += t.rail.speed * dt;
        if (t.x > 0.9) t.x -= 1.8;
        if (t.x < -0.9) t.x += 1.8;
        t.pivot.position.x = t.x;
        if (t.down > 0) {
          t.down += dt;
          t.pivot.rotation.x = -Math.min(1, t.down * 6) * (Math.PI / 2);
          if (t.down > 1.4) { t.down = 0; t.back = 1; }
        } else if (t.back > 0) {
          t.back = Math.max(0, t.back - dt * 4);
          t.pivot.rotation.x = -t.back * (Math.PI / 2);
        }
      }
      recoil = Math.max(0, recoil - dt * 6);
      gun.position.z = 0.5 + recoil * 0.05;
      gun.rotation.x = recoil * 0.25;
    },
    start(ctx) {
      let state = 'ready';
      let left = 0;
      let pts = 0;
      let shots = 0;
      let hitsN = 0;
      const PLAY = 20;
      ctx.show('🎯', '움직이는 과녁을 눌러서 쏘세요 · 금색은 50점!', '#FFD36B');
      function finish() {
        state = 'ready';
        ctx.score(pts, pts);
        const r = grant(ctx, [
          { min: 400, item: giant, n: 10 }, { min: 300, item: 'star', n: 5 }, { min: 200, item: 'gift', n: 3 },
          { min: 120, item: 'bell', n: 1 }, { min: 60, item: 'cookie', n: 0 }, { min: 0, item: 'candy', n: 0 },
        ], pts, '사격');
        const acc = shots ? Math.round((hitsN / shots) * 100) : 0;
        ctx.show(`${pts}점`, `명중률 ${acc}% · ${r.info.emoji} ${r.info.name}${r.n ? ` + 🎟️${r.n}` : ''}`, '#D9FF44');
      }
      return {
        label: () => (state === 'play' ? `🎯 ${Math.ceil(left)}초` : '▶ START 🪙1'),
        info: () => (state === 'play' ? `🎯 ${pts}점 · ${Math.ceil(left)}초` : '20초 · 과녁을 탭/클릭'),
        busy: () => state === 'play',
        action() {
          if (state === 'play') return;
          if (!ctx.pay()) return;
          state = 'play';
          left = PLAY;
          pts = 0;
          shots = 0;
          hitsN = 0;
          ctx.sfx.coin();
          setTimeout(ctx.sfx.start, 200);
          ctx.show('0점', '탕! 과녁을 눌러요', '#F7F6F2');
        },
        pointer(type, x, y) {
          if (type !== 'down' || state !== 'play') return;
          shots++;
          recoil = 1;
          const ray = ctx.ray(x, y);
          const standing = targets.filter((t) => t.down === 0 && t.back === 0);
          const hit = ray.intersectObjects(standing.map((t) => t.disc), false)[0];
          const t = hit && standing.find((s) => s.disc === hit.object);
          ctx.flash(x, y, !!t);
          if (t) {
            t.down = 0.001;
            pts += t.rail.pts;
            hitsN++;
            ctx.sfx.grab();
            ctx.show(`${pts}점`, `+${t.rail.pts}${t.rail.gold ? ' ✨' : ''}`, t.rail.gold ? '#FFD36B' : '#D9FF44');
          } else {
            ctx.sfx.tick(false);
          }
        },
        update(dt) {
          if (state !== 'play') return;
          left -= dt;
          if (left <= 0) finish();
        },
        exit() {},
      };
    },
  };
}

// ====================================================================== 🧸 밀어내기 인형 (푸셔)
function buildPusher() {
  const g = new THREE.Group();
  const body = std(0x3fa7ff, { roughness: 0.45 });
  const SHELF_Y = 0.95;
  const W = 0.68; // 선반 반폭
  const EDGE = 0.52; // 앞 가장자리 z
  add(g, BOX(1.6, SHELF_Y, 1.3), body, 0, SHELF_Y / 2, 0);
  const shelf = add(g, BOX(1.42, 0.02, 1.1), std(0xfff3c4, { roughness: 0.6 }), 0, SHELF_Y + 0.01, -0.03);
  shelf.castShadow = false;
  // 배출 구멍 + 받침
  add(g, BOX(1.42, 0.3, 0.2), std(0x101310), 0, SHELF_Y - 0.15, EDGE + 0.12);
  add(g, BOX(1.0, 0.16, 0.24), std(0x15191a), 0, 0.35, 0.72);
  // 밀판
  const pusher = add(g, BOX(1.42, 0.2, 0.5), std(0xff6c91, { roughness: 0.4 }), 0, SHELF_Y + 0.11, -0.4);
  // 유리 + 틀 + 간판
  for (const s of [-1, 1]) glass(g, 0.02, 1.2, 1.2, s * 0.74, SHELF_Y + 0.6, -0.03);
  glass(g, 1.46, 1.2, 0.02, 0, SHELF_Y + 0.6, -0.62);
  glass(g, 1.46, 0.8, 0.02, 0, SHELF_Y + 0.8 + 0.2, EDGE + 0.05);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(g, BOX(0.06, 1.25, 0.06), body, sx * 0.77, SHELF_Y + 0.62, sz * 0.62 - 0.02);
  add(g, BOX(1.66, 0.42, 1.34), body, 0, SHELF_Y + 1.42, -0.03);
  signPlate(g, '밀어내기 인형', 1.4, 0.32, 0, SHELF_Y + 1.42, 0.645);
  // 떨어뜨리는 장치
  const dropper = new THREE.Group();
  dropper.position.set(0, SHELF_Y + 1.1, -0.12);
  add(dropper, new THREE.CylinderGeometry(0.1, 0.14, 0.12, 16, 1, true), std(GOLD, { metalness: 0.5, side: THREE.DoubleSide }), 0, 0, 0);
  g.add(dropper);
  let holding = null;

  const R = 0.11;
  const plushes = [];
  let t = 0;
  let pz = -0.32;
  let pv = 0;
  const pusherFront = (time) => -0.3 + 0.13 * Math.sin(time * 1.5);
  function spawn(id, x, z, state = 'shelf') {
    const mesh = makeItem(id, R);
    mesh.rotation.y = rand(-0.4, 0.4);
    g.add(mesh);
    const p = { id, mesh, x, z, y: SHELF_Y + R * 0.9, vx: 0, vz: 0, vy: 0, state };
    plushes.push(p);
    return p;
  }
  function step(dt, onFall) {
    t += dt;
    const nz = pusherFront(t);
    pv = (nz - pz) / Math.max(dt, 1e-4);
    pz = nz;
    pusher.position.z = pz - 0.25;
    const shelfP = plushes.filter((p) => p.state === 'shelf');
    for (const p of shelfP) {
      const f = Math.min(1, dt * 7);
      p.vx -= p.vx * f;
      p.vz -= p.vz * f;
      p.x += p.vx * dt;
      p.z += p.vz * dt;
    }
    for (let it = 0; it < 4; it++) {
      for (let i = 0; i < shelfP.length; i++) {
        const a = shelfP[i];
        if (a.z - R < pz) { a.z = pz + R; if (pv > 0) a.vz = Math.max(a.vz, pv); }
        for (let j = i + 1; j < shelfP.length; j++) {
          const b = shelfP[j];
          const dx = b.x - a.x;
          const dz = b.z - a.z;
          const d = Math.hypot(dx, dz);
          const min = R * 1.9;
          if (d >= min || d < 1e-5) continue;
          const nx = dx / d;
          const nzz = dz / d;
          const push = (min - d) / 2;
          a.x -= nx * push; a.z -= nzz * push;
          b.x += nx * push; b.z += nzz * push;
          const rel = (b.vx - a.vx) * nx + (b.vz - a.vz) * nzz;
          if (rel < 0) { a.vx += rel * nx * 0.5; a.vz += rel * nzz * 0.5; b.vx -= rel * nx * 0.5; b.vz -= rel * nzz * 0.5; }
        }
        a.x = clamp(a.x, -W + R, W - R);
      }
    }
    for (const p of plushes) {
      if (p.state === 'shelf' && p.z > EDGE) { p.state = 'fall'; p.vy = 0; p.vz = Math.max(p.vz, 0.3); }
      if (p.state === 'fall') {
        p.vy -= 9.8 * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        p.mesh.rotation.x += dt * 5;
        if (p.y < 0.45) { p.state = 'gone'; g.remove(p.mesh); onFall?.(p); }
      }
      if (p.state === 'drop') {
        p.vy -= 9.8 * dt;
        p.y += p.vy * dt;
        if (p.y <= SHELF_Y + R * 0.9) { p.y = SHELF_Y + R * 0.9; p.state = 'shelf'; p.z = Math.max(p.z, pz + R); ctx0?.sfx.thud(); }
      }
      p.mesh.position.set(p.x, p.y, p.z);
    }
    for (let i = plushes.length - 1; i >= 0; i--) if (plushes[i].state === 'gone') plushes.splice(i, 1);
  }
  let ctx0 = null;
  // 처음에 인형을 깔아 두고 안정될 때까지 미리 돌림 (그동안 떨어진 건 그냥 없어짐)
  function refill(n) {
    for (let i = 0; i < n; i++) spawn(randomPlushId(), rand(-W + R, W - R), rand(-0.1, 0.42));
    for (let i = 0; i < 600; i++) step(1 / 60);
  }
  refill(17);

  return {
    group: g,
    footprint: { x0: -0.85, x1: 0.85, z0: -0.7, z1: 0.86 },
    cam: { pos: V(0, 2.05, 1.75), look: V(0, 1.1, 0.0) },
    idle(dt) {
      if (!ctx0) step(dt);
    },
    start(ctx) {
      ctx0 = ctx;
      let state = 'ready';
      let drops = 0;
      let won = 0;
      let dropT = 0;
      let waitT = 0;
      const DROPS = 5;
      ctx.show('🧸', '타이밍 맞춰 인형을 떨어뜨리면 밀판이 슥슥 밀어 줘요', '#86EFC8');
      const newHold = () => {
        if (holding) dropper.remove(holding.mesh);
        const id = randomPlushId();
        const mesh = makeItem(id, R);
        mesh.position.y = -0.14;
        dropper.add(mesh);
        holding = { id, mesh };
      };
      function finish() {
        state = 'ready';
        if (holding) { dropper.remove(holding.mesh); holding = null; }
        ctx.score(won, won);
        if (!won) {
          const r = grant(ctx, [{ min: 0, item: 'candy', n: 0 }], 0, '밀어내기 인형');
          ctx.show('0개', `아깝다! 참가상 ${r.info.emoji} ${r.info.name}`, '#FF6C91');
        } else ctx.show(`${won}개`, '밀어내기 성공! 🧸', '#D9FF44');
        if (plushes.filter((p) => p.state === 'shelf').length < 13) refill(5);
      }
      const onFall = (p) => {
        if (state !== 'play' && state !== 'wait') return;
        won++;
        const info = itemInfo(p.id);
        ctx.prize(p.id, '밀어내기 인형');
        ctx.reward(1);
        ctx.sfx.win();
        ctx.banner(`${info.emoji} ${info.name} GET!`, info.rare ? 'rare' : 'win', 1800);
        ctx.confetti(30);
        ctx.show(`${won}개!`, `${info.emoji} 밀려 나왔다!`, '#D9FF44');
      };
      return {
        label: () => (state === 'play' ? `⬇ 떨어뜨리기 (${drops})` : state === 'wait' ? '두근두근…' : '▶ START 🪙1'),
        info: () => (state === 'ready' ? `인형 ${DROPS}개 떨어뜨리기` : `🧸 ${won}개 · 남은 인형 ${drops}`),
        busy: () => state !== 'ready',
        action() {
          if (state === 'play') {
            if (!holding || dropT > 0) return;
            const p = spawn(holding.id, dropper.position.x, -0.12, 'drop');
            p.y = dropper.position.y - 0.14;
            dropper.remove(holding.mesh);
            holding = null;
            drops--;
            dropT = 0.5;
            ctx.sfx.drop();
            if (drops <= 0) { state = 'wait'; waitT = 0; }
            return;
          }
          if (state !== 'ready' || !ctx.pay()) return;
          state = 'play';
          drops = DROPS;
          won = 0;
          ctx.sfx.coin();
          newHold();
          ctx.show('GO!', '움직이는 위치를 보고 떨어뜨려요', '#86EFC8');
        },
        update(dt) {
          step(dt, onFall);
          dropper.position.x = 0.55 * Math.sin(t * 1.3);
          if (state === 'play' && !holding) {
            dropT -= dt;
            if (dropT <= 0) newHold();
          }
          if (state === 'wait') {
            waitT += dt;
            if (waitT > 5) finish();
          }
        },
        exit() {
          if (holding) { dropper.remove(holding.mesh); holding = null; }
          ctx0 = null;
        },
      };
    },
  };
}

// ====================================================================== 🕹️ 타이밍 인형뽑기
function buildTiming() {
  const g = new THREE.Group();
  const body = std(0x14b8a6, { roughness: 0.45 });
  const FLOOR = 0.9;
  add(g, BOX(1.4, FLOOR, 1.2), body, 0, FLOOR / 2, 0);
  add(g, BOX(1.3, 0.02, 1.1), std(0x2b1d3d, { roughness: 0.9 }), 0, FLOOR + 0.01, 0);
  for (const s of [-1, 1]) glass(g, 0.02, 1.25, 1.12, s * 0.66, FLOOR + 0.63, 0);
  glass(g, 1.32, 1.25, 0.02, 0, FLOOR + 0.63, -0.56);
  glass(g, 1.32, 1.25, 0.02, 0, FLOOR + 0.63, 0.56);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(g, BOX(0.06, 1.3, 0.06), body, sx * 0.68, FLOOR + 0.65, sz * 0.58);
  add(g, BOX(1.46, 0.42, 1.26), body, 0, FLOOR + 1.47, 0);
  signPlate(g, '타이밍 인형뽑기', 1.3, 0.3, 0, FLOOR + 1.47, 0.635);
  // 버튼 두 개 (←→ / ↑↓)
  const btnMat = [std(LIME, { emissive: LIME, emissiveIntensity: 0.4 }), std(0xff6c91, { emissive: 0xff6c91, emissiveIntensity: 0.4 })];
  const btns = [-0.25, 0.25].map((x, i) => add(g, new THREE.CylinderGeometry(0.08, 0.08, 0.05, 20), btnMat[i], x, FLOOR - 0.05, 0.62, [Math.PI / 2, 0, 0]));
  // 받침대 + 왕큰 인형
  const pedestal = add(g, new THREE.CylinderGeometry(0.13, 0.15, 0.14, 20), std(GOLD, { metalness: 0.4, roughness: 0.3 }), 0, FLOOR + 0.07, 0);
  let prize = null;
  let prizeId = '';
  const PX = { x0: -0.45, x1: 0.45, z0: -0.3, z1: 0.3 };
  function newPrize() {
    if (prize) g.remove(prize);
    prizeId = giant();
    prize = makeItem(prizeId, 0.17);
    const x = rand(PX.x0 + 0.08, PX.x1 - 0.08);
    const z = rand(PX.z0 + 0.06, PX.z1 - 0.06);
    pedestal.position.set(x, FLOOR + 0.07, z);
    prize.position.set(x, FLOOR + 0.14 + 0.15, z);
    g.add(prize);
  }
  newPrize();
  // 집게
  const claw = new THREE.Group();
  g.add(claw);
  const goldM = std(GOLD, { metalness: 0.5, roughness: 0.3 });
  add(claw, new THREE.CylinderGeometry(0.07, 0.08, 0.1, 16), goldM, 0, 0, 0);
  const prongs = [0, 1, 2].map((i) => {
    const yaw = new THREE.Group();
    yaw.rotation.y = (i / 3) * Math.PI * 2;
    const piv = new THREE.Group();
    piv.position.set(0, -0.04, 0.06);
    add(piv, BOX(0.025, 0.2, 0.02), std(0xdfe4ea, { metalness: 0.8, roughness: 0.2 }), 0, -0.1, 0);
    yaw.add(piv);
    claw.add(yaw);
    return piv;
  });
  const cable = add(g, new THREE.CylinderGeometry(0.008, 0.008, 1, 6), std(0x15191a), 0, 0, 0);
  const TOP = FLOOR + 1.12;
  const c = { x: PX.x0, z: PX.z1, y: TOP, open: 1 };
  // 바닥 조준 표시
  const mark = new THREE.Mesh(new THREE.RingGeometry(0.05, 0.075, 24), new THREE.MeshBasicMaterial({ color: LIME, transparent: true, opacity: 0.7, depthWrite: false }));
  mark.rotation.x = -Math.PI / 2;
  g.add(mark);
  function draw(held) {
    claw.position.set(c.x, c.y, c.z);
    for (const p of prongs) p.rotation.x = -0.1 - c.open * 0.5;
    cable.position.set(c.x, (TOP + 0.3 + c.y) / 2, c.z);
    cable.scale.y = Math.max(0.01, TOP + 0.3 - c.y);
    mark.position.set(c.x, FLOOR + 0.02, c.z);
    if (held && prize) prize.position.set(c.x, c.y - 0.32, c.z);
  }
  draw(false);
  return {
    group: g,
    footprint: { x0: -0.75, x1: 0.75, z0: -0.65, z1: 0.7 },
    cam: { pos: V(0, 2.85, 1.85), look: V(0, 1.1, -0.05) },
    idle() {},
    start(ctx) {
      let state = 'ready';
      let t = 0;
      let wins = 0;
      let speed = 1.3;
      let held = false;
      let dist = 1;
      ctx.show('🕹️', '버튼 두 번: 좌우에서 한 번, 앞뒤에서 한 번 딱 맞춰 멈춰요', '#86EFC8');
      const pressFx = (i) => { btns[i].position.y = FLOOR - 0.07; setTimeout(() => { btns[i].position.y = FLOOR - 0.05; }, 150); };
      return {
        label: () => ({ ready: '▶ START 🪙1', x: '⏹ 좌우 멈춤', z: '⏹ 앞뒤 멈춤' }[state] || '두근두근…'),
        info: () => (wins ? `🏆 성공 ${wins}번` : '성공하면 왕큰 인형!'),
        busy: () => state !== 'ready',
        action() {
          if (state === 'x') { state = 'z'; t = 0; pressFx(0); ctx.sfx.tick(false); return; }
          if (state === 'z') { state = 'down'; pressFx(1); ctx.sfx.drop(); return; }
          if (state !== 'ready' || !ctx.pay()) return;
          state = 'x';
          t = -Math.PI / 2 / speed; // 왼쪽 끝에서 출발
          c.z = PX.z1;
          ctx.sfx.coin();
          ctx.show('좌우', '인형 바로 위에서 멈춰요', '#F7F6F2');
        },
        update(dt) {
          t += dt;
          if (state === 'x') {
            c.x = ((PX.x0 + PX.x1) / 2) + ((PX.x1 - PX.x0) / 2) * Math.sin(t * speed);
            ctx.sfx.motor(0.4);
          } else if (state === 'z') {
            c.z = ((PX.z0 + PX.z1) / 2) + ((PX.z1 - PX.z0) / 2) * Math.cos(t * speed * 1.2);
            ctx.sfx.motor(0.4);
          } else if (state === 'down') {
            ctx.sfx.motor(0.3);
            c.y -= dt * 0.7;
            if (c.y <= FLOOR + 0.62) {
              c.y = FLOOR + 0.62;
              dist = Math.hypot(c.x - pedestal.position.x, c.z - pedestal.position.z);
              state = 'close';
              t = 0;
              ctx.sfx.motor(0);
            }
          } else if (state === 'close') {
            c.open = Math.max(dist < 0.065 ? 0.25 : 0, 1 - t * 2.5);
            if (t > 0.5) { held = dist < 0.065; state = 'up'; ctx.sfx.grab(); if (!held && prize) prize.rotation.z = 0.3; }
          } else if (state === 'up') {
            c.y = Math.min(TOP, c.y + dt * 0.6);
            if (prize && !held) prize.rotation.z *= 0.9;
            if (c.y >= TOP) state = held ? 'carry' : 'result';
          } else if (state === 'carry') {
            c.x += (-0.5 - c.x) * Math.min(1, dt * 3);
            c.z += (0.4 - c.z) * Math.min(1, dt * 3);
            if (Math.hypot(c.x + 0.5, c.z - 0.4) < 0.02) state = 'result';
          } else if (state === 'result') {
            ctx.sfx.motor(0);
            c.open = 1;
            if (held) {
              wins++;
              const perfect = dist < 0.025;
              ctx.prize(prizeId, '타이밍 인형뽑기');
              ctx.reward(perfect ? 10 : 5);
              ctx.sfx.win();
              ctx.confetti(perfect ? 90 : 60);
              const info = itemInfo(prizeId);
              ctx.banner(`${info.emoji} ${info.name} GET!`, 'rare', 2400);
              ctx.show(perfect ? 'PERFECT!' : '성공!', `${info.emoji} ${info.name} + 🎟️${perfect ? 10 : 5}`, '#D9FF44');
              ctx.score(wins, wins);
              speed = Math.min(2.2, speed + 0.15);
              newPrize();
            } else {
              const r = grant(ctx, [{ min: 0, item: 'candy', n: 0 }], 0, '타이밍 인형뽑기');
              ctx.show(`${(dist * 100).toFixed(0)}cm 빗나감`, `아깝다! 참가상 ${r.info.emoji}`, '#FF6C91');
            }
            held = false;
            state = 'home';
          } else if (state === 'home') {
            c.x += (PX.x0 - c.x) * Math.min(1, dt * 3);
            c.z += (PX.z1 - c.z) * Math.min(1, dt * 3);
            if (Math.hypot(c.x - PX.x0, c.z - PX.z1) < 0.02) state = 'ready';
          }
          draw(held);
        },
        exit() { ctx.sfx.motor(0); },
      };
    },
  };
}

export const GAMES2 = {
  basket: { build: buildBasket, score: { asc: false, label: '공 10개 중 골', fmt: (e) => `🏀 ${e.s}골` } },
  punch: { build: buildPunch, score: { asc: false, label: '10초 연타', fmt: (e) => `🪓 ${e.s}번` } },
  shoot: { build: buildShoot, score: { asc: false, label: '20초 사격 점수', fmt: (e) => `🎯 ${e.s}점` } },
  pusher: { build: buildPusher, score: { asc: false, label: '한 판에 밀어낸 인형', fmt: (e) => `🧸 ${e.s}개` } },
  timing: { build: buildTiming, score: { asc: false, label: '한 번 앉아 성공', fmt: (e) => `🕹️ ${e.s}번` } },
};
