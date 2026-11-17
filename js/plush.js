// 인형과 크리스마스 상품: 인형뽑기 기계 안의 인형, 미니게임 상품, 캐릭터가 주렁주렁 달고 다니는 것까지 모두 여기서 만들어요.
// 상품 id: 인형은 'bear' 또는 'bear.hat' (종류.액세서리), 장식 상품은 'candy', 'bell' 같은 이름.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const KINDS = {
  bear: { name: '곰돌이', emoji: '🧸', color: 0xcf9a6b, paw: 0xf3d6b4, belly: 0xf3d6b4, w: 6 },
  bunny: { name: '토끼', emoji: '🐰', color: 0xfff7f0, paw: 0xffe3ea, w: 6 },
  chick: { name: '병아리', emoji: '🐥', color: 0xffe36a, paw: 0xffa53d, wings: true, w: 5 },
  frog: { name: '개구리', emoji: '🐸', color: 0xa3e590, belly: 0xeaf8cf, w: 4 },
  pig: { name: '돼지', emoji: '🐷', color: 0xffc1d4, w: 4 },
  cat: { name: '고양이', emoji: '🐱', color: 0xf8b56e, paw: 0xfff1e0, belly: 0xfff1e0, w: 5 },
  puppy: { name: '강아지', emoji: '🐶', color: 0xf5e6cc, w: 5 },
  snowman: { name: '눈사람', emoji: '⛄', color: 0xffffff, paw: 0xe8eef8, w: 5 },
  penguin: { name: '펭귄', emoji: '🐧', color: 0x34405a, paw: 0xffa53d, belly: 0xffffff, wings: true, w: 5 },
  reindeer: { name: '루돌프', emoji: '🦌', color: 0xb07a4f, paw: 0x7a4f2e, belly: 0xf1d9bc, w: 5 },
  dopa: { name: '레어 도파# 인형', emoji: '💚', color: 0xd9ff44, w: 0, rare: true },
};
const KIND_LIST = Object.keys(KINDS).filter((k) => KINDS[k].w > 0);
export function pickKind() {
  const total = KIND_LIST.reduce((s, k) => s + KINDS[k].w, 0);
  let r = Math.random() * total;
  for (const k of KIND_LIST) if ((r -= KINDS[k].w) < 0) return k;
  return 'bear';
}
// 크리스마스 액세서리: 인형마다 하나씩 (없을 수도)
export const ACCS = ['hat', 'scarf', 'bow', 'hat', 'scarf', ''];
export function pickAcc(kind) {
  if (kind === 'dopa') return '';
  if (kind === 'snowman') return Math.random() < 0.5 ? 'scarf' : 'hat';
  return ACCS[Math.floor(Math.random() * ACCS.length)];
}

// 두 번째 기계: 뜨개 인형(아미구루미) 스타일 크리스마스 인형. 작은 구슬 눈, 머리·몸이 나뉜 인형 모양
export const DOLLS = {
  santa: { name: '산타 인형', emoji: '🎅', w: 6 },
  elf: { name: '엘프 인형', emoji: '🧝', w: 6 },
  polar: { name: '북극곰 인형', emoji: '🐻‍❄️', w: 6 },
  ginger: { name: '진저맨 인형', emoji: '🍪', w: 5 },
  nutcracker: { name: '호두까기 병정', emoji: '💂', w: 5 },
  angel: { name: '레어 천사 인형', emoji: '👼', w: 0, rare: true },
};
const DOLL_LIST = Object.keys(DOLLS).filter((k) => DOLLS[k].w > 0);
export function pickDoll() {
  const total = DOLL_LIST.reduce((s, k) => s + DOLLS[k].w, 0);
  let r = Math.random() * total;
  for (const k of DOLL_LIST) if ((r -= DOLLS[k].w) < 0) return k;
  return 'santa';
}

// 장식 상품 (미니게임 경품)
export const CHARMS = {
  candy: { name: '사탕지팡이', emoji: '🍭' },
  sock: { name: '크리스마스 양말', emoji: '🧦' },
  cookie: { name: '진저쿠키', emoji: '🍪' },
  bell: { name: '황금 종', emoji: '🔔' },
  ornament: { name: '반짝 오너먼트', emoji: '🔮' },
  gift: { name: '선물상자', emoji: '🎁' },
  star: { name: '황금 별', emoji: '⭐', rare: true },
};

// 'bear.hat.big' 처럼 끝이 .big 이면 왕큰 인형
export const isBig = (id) => String(id).split('.')[2] === 'big';
export function itemInfo(id) {
  const [kind] = String(id).split('.');
  const k = KINDS[kind] || DOLLS[kind] || CHARMS[kind];
  if (!k) return null;
  const big = isBig(id);
  return { name: big ? `왕큰 ${k.name.replace('레어 ', '')}` : k.name, emoji: k.emoji, rare: !!k.rare || big, plush: !!(KINDS[kind] || DOLLS[kind]), big };
}
export const isItem = (id) => !!itemInfo(id);

// ------------------------------------------------------------------ 재질
const SPH = new THREE.SphereGeometry(1, 32, 24);
const SPH_S = new THREE.SphereGeometry(1, 16, 12);
const black = new THREE.MeshStandardMaterial({ color: 0x1a1414, roughness: 0.12 });
const white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, emissive: 0xffffff, emissiveIntensity: 0.25 });
const cheekMat = new THREE.MeshStandardMaterial({ color: 0xff8fb0, roughness: 0.9, emissive: 0xff6c91, emissiveIntensity: 0.18, transparent: true, opacity: 0.92 });
const pinkMat = new THREE.MeshStandardMaterial({ color: 0xff8fb0, roughness: 0.6 });
const gold = new THREE.MeshStandardMaterial({ color: 0xffc94a, roughness: 0.3, metalness: 0.35, emissive: 0x6b4a00, emissiveIntensity: 0.35 });
const redFelt = new THREE.MeshStandardMaterial({ color: 0xe23b4a, roughness: 0.9 });
const greenFelt = new THREE.MeshStandardMaterial({ color: 0x1d8a4a, roughness: 0.9 });
const whiteFluff = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 });
const orange = new THREE.MeshStandardMaterial({ color: 0xff8a2a, roughness: 0.5 });
const antlerMat = new THREE.MeshStandardMaterial({ color: 0x7a4f2e, roughness: 0.8 });
const MOUTH = new THREE.TorusGeometry(1, 0.22, 6, 14, Math.PI);
const CONE4 = new THREE.ConeGeometry(1, 1.5, 4);
const CONE = new THREE.ConeGeometry(1, 1.6, 12);
const TORUS = new THREE.TorusGeometry(1, 0.32, 10, 24);
const CYL = new THREE.CylinderGeometry(1, 1, 1, 10);
const furCache = new Map();
function fur(color) {
  if (!furCache.has(color)) {
    const c = new THREE.Color(color);
    furCache.set(color, new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.95, sheen: 1, sheenRoughness: 0.4, sheenColor: c.clone().lerp(new THREE.Color(0xffffff), 0.6) }));
  }
  return furCache.get(color);
}

// 아기 같은 비율: 통통한 몸, 아래쪽에 크고 반짝이는 눈, 볼터치, ω 입, 짧은 팔다리 + 크리스마스 액세서리
export function makePlush(kind, r, acc = '') {
  const k = KINDS[kind] || KINDS.bear;
  const g = new THREE.Group();
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const part = (geo, mat, pos, scale, rot, parent = g) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.copy(pos);
    if (typeof scale === 'number') m.scale.setScalar(scale);
    else m.scale.copy(scale);
    if (rot) m.rotation.set(...rot);
    const big = typeof scale === 'number' ? scale : Math.max(scale.x, scale.y, scale.z);
    m.castShadow = big >= r * 0.18; // 자잘한 건 그림자 생략
    parent.add(m);
    return m;
  };
  // 몸 표면 위의 점 (몸은 위아래로 살짝 눌린 공)
  const on = (x, y, z, s = 1) => {
    const v = V(x, y, z).normalize();
    v.multiply(V(r * 1.02, r * 0.92, r * 0.98)).multiplyScalar(s);
    return v;
  };
  const base = fur(k.color);
  const paw = fur(k.paw ?? k.color);
  const body = part(SPH, base, V(0, 0, 0), V(r * 1.02, r * 0.92, r * 0.98));
  body.receiveShadow = true;
  if (k.belly) part(SPH_S, fur(k.belly), on(0, -0.5, 0.86, 0.9), V(r * 0.5, r * 0.4, r * 0.2));

  // 짧은 발 + 앞발
  for (const s of [-1, 1]) {
    part(SPH_S, paw, V(s * r * 0.4, -r * 0.8, r * 0.42), V(r * 0.21, r * 0.14, r * 0.24));
    if (!k.wings) part(SPH_S, paw, on(s * 0.78, -0.38, 0.5, 0.97), V(r * 0.14, r * 0.2, r * 0.14), [0.4, 0, s * 0.6]);
  }

  // 얼굴: 크고 낮게 붙은 눈 + 하이라이트 두 개 + 볼터치
  const eyes = (y = -0.04, gap = 0.36, size = 0.14) => {
    for (const s of [-1, 1]) {
      part(SPH_S, black, on(s * gap, y, 0.92, 0.97), V(r * size, r * size * 1.15, r * size * 0.6));
      part(SPH_S, white, on(s * gap - 0.05, y + 0.08, 0.92, 1.02), r * size * 0.38);
      part(SPH_S, white, on(s * gap + 0.04, y - 0.06, 0.92, 1.02), r * size * 0.18);
      part(SPH_S, cheekMat, on(s * (gap + 0.24), y - 0.2, 0.8, 0.985), V(r * 0.15, r * 0.085, r * 0.04));
    }
  };
  // ω 입 (작은 반원 두 개)
  const mouth = (y = -0.24, z = 1, s0 = 0.985, size = 0.055) => {
    for (const s of [-1, 1]) part(MOUTH, black, on(s * size * 1.05, y, z, s0), r * size, [0, 0, Math.PI]);
  };

  if (kind === 'bear') {
    eyes();
    for (const s of [-1, 1]) {
      part(SPH_S, base, on(s * 0.62, 0.74, 0.05, 0.92), r * 0.3);
      part(SPH_S, fur(0xf3d6b4), on(s * 0.64, 0.76, 0.24, 0.99), V(r * 0.17, r * 0.17, r * 0.07));
    }
    part(SPH_S, fur(0xf6e2c6), on(0, -0.26, 1, 0.9), V(r * 0.27, r * 0.19, r * 0.17));
    part(SPH_S, black, on(0, -0.17, 1, 1.06), V(r * 0.075, r * 0.055, r * 0.05));
    mouth(-0.3, 1, 1.05, 0.05);
    part(SPH_S, base, V(0, -r * 0.35, -r * 0.95), r * 0.13); // 꼬리
  } else if (kind === 'bunny') {
    eyes();
    for (const s of [-1, 1]) {
      part(SPH_S, base, V(s * r * 0.3, r * 1.22, -r * 0.05), V(r * 0.17, r * 0.52, r * 0.13), [0, 0, -s * 0.15]);
      part(SPH_S, fur(0xffbfd0), V(s * r * 0.31, r * 1.18, r * 0.06), V(r * 0.085, r * 0.38, r * 0.05), [0, 0, -s * 0.15]);
    }
    // 리본
    const bow = new THREE.Group();
    bow.position.copy(V(r * 0.42, r * 0.82, r * 0.12));
    bow.rotation.z = -0.4;
    for (const s of [-1, 1]) part(CONE, pinkMat, V(s * r * 0.11, 0, 0), V(r * 0.09, r * 0.11, r * 0.06), [0, 0, s * Math.PI / 2], bow);
    part(SPH_S, pinkMat, V(0, 0, 0), r * 0.05, null, bow);
    g.add(bow);
    part(SPH_S, pinkMat, on(0, -0.13, 1, 1.0), V(r * 0.055, r * 0.04, r * 0.04));
    mouth(-0.22);
    part(SPH_S, fur(0xffffff), V(0, -r * 0.4, -r * 0.95), r * 0.17); // 솜꼬리
  } else if (kind === 'chick') {
    eyes(0.02, 0.34);
    part(CONE, new THREE.MeshStandardMaterial({ color: 0xff9a2e, roughness: 0.5 }), on(0, -0.12, 1, 1.04), V(r * 0.1, r * 0.13, r * 0.1), [Math.PI / 2, 0, 0]);
    for (let i = -1; i <= 1; i++) part(SPH_S, base, V(i * r * 0.1, r * 0.96, 0), V(r * 0.05, r * 0.17, r * 0.05), [0, 0, -i * 0.55]);
    for (const s of [-1, 1]) part(SPH_S, fur(0xffcf3a), V(s * r * 0.95, -r * 0.12, 0), V(r * 0.12, r * 0.3, r * 0.24), [0, 0, s * 0.35]);
  } else if (kind === 'frog') {
    for (const s of [-1, 1]) {
      part(SPH_S, base, V(s * r * 0.42, r * 0.74, r * 0.22), r * 0.3);
      part(SPH_S, white, V(s * r * 0.42, r * 0.78, r * 0.44), V(r * 0.21, r * 0.21, r * 0.1));
      part(SPH_S, black, V(s * r * 0.42, r * 0.77, r * 0.52), V(r * 0.11, r * 0.13, r * 0.05));
      part(SPH_S, white, V(s * r * 0.38, r * 0.83, r * 0.56), r * 0.035);
      part(SPH_S, cheekMat, on(s * 0.6, -0.12, 0.78, 0.985), V(r * 0.15, r * 0.085, r * 0.04));
    }
    part(new THREE.TorusGeometry(1, 0.08, 6, 20, Math.PI), black, on(0, 0.02, 1, 0.95), r * 0.26, [0, 0, Math.PI]);
  } else if (kind === 'pig') {
    eyes(0.04, 0.38);
    part(new THREE.CylinderGeometry(1, 1, 1, 24), fur(0xff9dbb), on(0, -0.18, 1, 0.97), V(r * 0.23, r * 0.13, r * 0.17), [Math.PI / 2, 0, 0]);
    for (const s of [-1, 1]) {
      part(SPH_S, fur(0xd8668b), on(s * 0.08, -0.17, 1, 1.07), V(r * 0.035, r * 0.055, r * 0.03));
      part(CONE4, base, on(s * 0.52, 0.8, 0.15, 0.95), r * 0.16, [0.4, 0, -s * 0.5]);
    }
    part(new THREE.TorusGeometry(1, 0.3, 6, 16, Math.PI * 1.6), fur(0xff9dbb), V(0, -r * 0.25, -r * 0.98), r * 0.09, [0, Math.PI / 2, 0]);
  } else if (kind === 'cat') {
    eyes();
    for (const s of [-1, 1]) {
      part(CONE4, base, on(s * 0.55, 0.82, 0.05, 0.9), r * 0.2, [0, Math.PI / 4, -s * 0.35]);
      part(CONE4, fur(0xffd6b8), on(s * 0.55, 0.8, 0.26, 0.93), r * 0.11, [0.2, Math.PI / 4, -s * 0.35]);
    }
    for (const x of [-0.12, 0, 0.12]) part(SPH_S, fur(0xd98031), on(x, 0.62, 0.78, 0.99), V(r * 0.035, r * 0.12, r * 0.03));
    part(SPH_S, pinkMat, on(0, -0.14, 1, 1.0), V(r * 0.05, r * 0.035, r * 0.035));
    mouth(-0.22);
    part(new THREE.TorusGeometry(1, 0.18, 6, 16, Math.PI), base, V(r * 0.5, -r * 0.45, -r * 0.82), r * 0.3, [0, -0.4, 0]); // 꼬리
  } else if (kind === 'puppy') {
    eyes();
    part(SPH_S, fur(0xc48a5a), on(0.36, 0.08, 0.9, 0.96), V(r * 0.22, r * 0.24, r * 0.1)); // 눈 얼룩
    for (const s of [-1, 1]) part(SPH_S, fur(0xb57c4f), V(s * r * 0.82, r * 0.25, 0), V(r * 0.16, r * 0.4, r * 0.24), [0, 0, s * 0.35]); // 늘어진 귀
    part(SPH_S, fur(0xfff4e2), on(0, -0.26, 1, 0.9), V(r * 0.26, r * 0.18, r * 0.16));
    part(SPH_S, black, on(0, -0.16, 1, 1.06), V(r * 0.08, r * 0.06, r * 0.05));
    mouth(-0.3, 1, 1.05, 0.05);
    part(SPH_S, pinkMat, on(0, -0.42, 1, 0.99), V(r * 0.06, r * 0.07, r * 0.03)); // 혀
    part(SPH_S, base, V(0, -r * 0.2, -r * 0.98), V(r * 0.08, r * 0.2, r * 0.08), [-0.6, 0, 0]); // 꼬리
  } else if (kind === 'dopa') {
    body.material = new THREE.MeshPhysicalMaterial({ color: k.color, roughness: 0.8, sheen: 1, sheenColor: new THREE.Color(0xffffff), emissive: 0x4d6600, emissiveIntensity: 0.35 });
    eyes();
    mouth(-0.24);
    const crown = new THREE.Group();
    crown.position.set(0, r * 0.88, 0);
    crown.add(new THREE.Mesh(new THREE.CylinderGeometry(r * 0.32, r * 0.36, r * 0.18, 16, 1, true), gold));
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const spike = new THREE.Mesh(new THREE.ConeGeometry(r * 0.08, r * 0.2, 6), gold);
      spike.position.set(Math.cos(a) * r * 0.32, r * 0.17, Math.sin(a) * r * 0.32);
      crown.add(spike);
    }
    crown.traverse((o) => { o.castShadow = true; });
    g.add(crown);
  }
  if (kind === 'snowman') {
    eyes(0.02, 0.32, 0.12);
    part(CONE, orange, on(0, -0.14, 1, 1.02), V(r * 0.07, r * 0.2, r * 0.07), [Math.PI / 2, 0, 0]); // 당근 코
    for (const y of [-0.5, -0.7]) part(SPH_S, black, on(0, y, 0.9, 0.99), r * 0.05); // 단추
    mouth(-0.3, 1, 0.985, 0.045);
  } else if (kind === 'penguin') {
    part(SPH_S, fur(0xffffff), on(0, -0.15, 0.9, 0.72), V(r * 0.7, r * 0.72, r * 0.27)); // 하얀 얼굴·배
    eyes(0.0, 0.3, 0.13);
    part(CONE, orange, on(0, -0.18, 1, 1.01), V(r * 0.09, r * 0.13, r * 0.07), [Math.PI / 2, 0, 0]);
    for (const s of [-1, 1]) part(SPH_S, fur(k.color), V(s * r * 0.95, -r * 0.15, 0), V(r * 0.12, r * 0.34, r * 0.22), [0, 0, s * 0.3]);
  } else if (kind === 'reindeer') {
    eyes();
    part(SPH_S, fur(0xf1d9bc), on(0, -0.28, 1, 0.9), V(r * 0.28, r * 0.2, r * 0.17));
    part(SPH_S, new THREE.MeshStandardMaterial({ color: 0xff3040, emissive: 0xff2030, emissiveIntensity: 0.6, roughness: 0.3 }), on(0, -0.18, 1, 1.08), r * 0.1); // 빨간 코
    mouth(-0.34, 1, 1.04, 0.045);
    for (const s of [-1, 1]) {
      part(SPH_S, fur(0xb07a4f), V(s * r * 0.82, r * 0.42, 0), V(r * 0.2, r * 0.1, r * 0.12), [0, 0, s * 0.5]); // 귀
      const a = part(CYL, antlerMat, V(s * r * 0.36, r * 1.12, -r * 0.05), V(r * 0.05, r * 0.5, r * 0.05), [0, 0, -s * 0.3]);
      a.castShadow = false;
      part(CYL, antlerMat, V(s * r * 0.55, r * 1.22, -r * 0.05), V(r * 0.04, r * 0.26, r * 0.04), [0, 0, -s * 1.1]);
      part(CYL, antlerMat, V(s * r * 0.3, r * 1.3, -r * 0.05), V(r * 0.04, r * 0.2, r * 0.04), [0, 0, s * 0.6]);
    }
  }

  // ---- 크리스마스 액세서리
  if (acc === 'hat') {
    const hat = new THREE.Group();
    const earsUp = kind === 'bunny' || kind === 'reindeer';
    hat.position.copy(V(earsUp ? r * 0.08 : r * 0.12, r * 0.84, -r * 0.04));
    hat.rotation.set(-0.15, 0, -0.35);
    part(CONE, redFelt, V(0, r * 0.32, 0), V(r * 0.36, r * 0.42, r * 0.36), null, hat);
    part(TORUS, whiteFluff, V(0, 0, 0), V(r * 0.36, r * 0.36, r * 0.36), [Math.PI / 2, 0, 0], hat);
    part(SPH_S, whiteFluff, V(r * 0.06, r * 0.66, 0), r * 0.1, null, hat);
    if (earsUp) hat.scale.setScalar(0.8);
    g.add(hat);
  } else if (acc === 'scarf') {
    const mat = Math.random() < 0.5 ? redFelt : greenFelt;
    part(TORUS, mat, V(0, -r * 0.46, 0), V(r * 0.8, r * 0.8, r * 0.36), [Math.PI / 2, 0, 0]);
    part(SPH_S, mat, V(r * 0.45, -r * 0.62, r * 0.72), V(r * 0.11, r * 0.24, r * 0.06), [0.2, 0, 0.25]);
  } else if (acc === 'bow') {
    const bow = new THREE.Group();
    bow.position.copy(V(-r * 0.5, r * 0.72, r * 0.18));
    bow.rotation.z = 0.5;
    for (const s of [-1, 1]) part(CONE, redFelt, V(s * r * 0.12, 0, 0), V(r * 0.1, r * 0.12, r * 0.07), [0, 0, s * Math.PI / 2], bow);
    part(SPH_S, gold, V(0, 0, 0), r * 0.055, null, bow);
    g.add(bow);
  }
  return g;
}

// ------------------------------------------------------------------ 장식 상품
const stripeTex = (() => {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const x = c.getContext('2d');
  x.fillStyle = '#ffffff';
  x.fillRect(0, 0, 64, 64);
  x.fillStyle = '#e23b4a';
  for (let i = -64; i < 128; i += 22) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 11, 0); x.lineTo(i + 11 + 64, 64); x.lineTo(i + 64, 64); x.fill(); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1, 4);
  return t;
})();
const candyMat = new THREE.MeshStandardMaterial({ map: stripeTex, roughness: 0.3 });
const cookieMat = new THREE.MeshStandardMaterial({ color: 0xb8743a, roughness: 0.85 });
const icing = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
const ORN_COLORS = [0xe23b4a, 0x5aa0ff, 0xd9ff44, 0xff6c91, 0x86efc8];

export function makeCharm(id, r) {
  const g = new THREE.Group();
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const part = (geo, mat, pos, scale, rot) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.copy(pos);
    if (typeof scale === 'number') m.scale.setScalar(scale);
    else m.scale.copy(scale);
    if (rot) m.rotation.set(...rot);
    m.castShadow = true;
    g.add(m);
    return m;
  };
  if (id === 'candy') {
    const path = new THREE.CatmullRomCurve3([V(0, -r * 1.3, 0), V(0, r * 0.4, 0), V(0, r * 0.9, 0), V(-r * 0.25, r * 1.2, 0), V(-r * 0.55, r * 0.95, 0), V(-r * 0.6, r * 0.65, 0)]);
    part(new THREE.TubeGeometry(path, 24, r * 0.17, 10), candyMat, V(0, 0, 0), 1);
  } else if (id === 'sock') {
    const red = redFelt;
    part(new THREE.BoxGeometry(1, 1, 1), red, V(0, 0, 0), V(r * 0.6, r * 1.2, r * 0.4));
    part(SPH_S, red, V(r * 0.22, -r * 0.62, 0), V(r * 0.5, r * 0.32, r * 0.22));
    part(new THREE.BoxGeometry(1, 1, 1), whiteFluff, V(0, r * 0.68, 0), V(r * 0.72, r * 0.3, r * 0.5));
    part(SPH_S, gold, V(0, r * 0.1, r * 0.21), r * 0.12);
  } else if (id === 'cookie') {
    part(SPH_S, cookieMat, V(0, r * 0.62, 0), V(r * 0.38, r * 0.38, r * 0.16));
    part(SPH_S, cookieMat, V(0, -r * 0.1, 0), V(r * 0.45, r * 0.55, r * 0.16));
    for (const s of [-1, 1]) {
      part(SPH_S, cookieMat, V(s * r * 0.5, r * 0.12, 0), V(r * 0.32, r * 0.14, r * 0.14), [0, 0, s * 0.4]);
      part(SPH_S, cookieMat, V(s * r * 0.26, -r * 0.72, 0), V(r * 0.15, r * 0.32, r * 0.14), [0, 0, s * 0.3]);
      part(SPH_S, black, V(s * r * 0.13, r * 0.68, r * 0.14), r * 0.05);
    }
    for (const y of [0.1, -0.15, -0.4]) part(SPH_S, icing, V(0, r * y, r * 0.15), r * 0.06);
    part(new THREE.TorusGeometry(r * 0.14, r * 0.03, 6, 12, Math.PI), icing, V(0, r * 0.55, r * 0.14), 1, [0, 0, Math.PI]);
  } else if (id === 'bell') {
    const pts = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      pts.push(new THREE.Vector2(r * (0.18 + 0.55 * t ** 2.2 + (t > 0.9 ? 0.08 : 0)), r * (0.6 - t * 1.2)));
    }
    part(new THREE.LatheGeometry(pts, 20), gold, V(0, 0, 0), 1);
    part(SPH_S, gold, V(0, -r * 0.65, 0), r * 0.16);
    for (const s of [-1, 1]) part(CONE, redFelt, V(s * r * 0.22, r * 0.68, 0), V(r * 0.14, r * 0.18, r * 0.08), [0, 0, s * Math.PI / 2]);
  } else if (id === 'ornament') {
    const c = ORN_COLORS[Math.floor(Math.random() * ORN_COLORS.length)];
    part(SPH, new THREE.MeshStandardMaterial({ color: c, roughness: 0.15, metalness: 0.6 }), V(0, 0, 0), r * 0.75);
    part(new THREE.CylinderGeometry(1, 1, 1, 12), gold, V(0, r * 0.78, 0), V(r * 0.2, r * 0.18, r * 0.2));
    part(new THREE.TorusGeometry(1, 0.3, 6, 16), white, V(0, 0, 0), V(r * 0.76, r * 0.76, r * 0.3), [Math.PI / 2, 0, 0]);
  } else if (id === 'gift') {
    const colors = [0xff6c91, 0x5aa0ff, 0xd9ff44, 0x86efc8];
    const box = new THREE.MeshStandardMaterial({ color: colors[Math.floor(Math.random() * colors.length)], roughness: 0.5 });
    part(new THREE.BoxGeometry(1, 1, 1), box, V(0, 0, 0), r * 1.1);
    part(new THREE.BoxGeometry(1, 1, 1), redFelt, V(0, 0, 0), V(r * 1.13, r * 1.13, r * 0.25));
    part(new THREE.BoxGeometry(1, 1, 1), redFelt, V(0, 0, 0), V(r * 0.25, r * 1.13, r * 1.13));
    for (const s of [-1, 1]) part(TORUS, redFelt, V(s * r * 0.18, r * 0.7, 0), V(r * 0.2, r * 0.2, r * 0.2), [0, Math.PI / 2, 0]);
  } else if (id === 'star') {
    const sh = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const rr = i % 2 ? r * 0.42 : r;
      const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
      if (i) sh.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      else sh.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    const geo = new THREE.ExtrudeGeometry(sh, { depth: r * 0.3, bevelEnabled: true, bevelThickness: r * 0.1, bevelSize: r * 0.08, bevelSegments: 2 });
    geo.center();
    part(geo, new THREE.MeshStandardMaterial({ color: 0xffd36b, emissive: 0xffb020, emissiveIntensity: 0.6, metalness: 0.5, roughness: 0.25 }), V(0, 0, 0), 1);
    for (const s of [-1, 1]) part(SPH_S, black, V(s * r * 0.16, r * 0.05, r * 0.27), r * 0.07);
    part(SPH_S, cheekMat, V(-r * 0.32, -r * 0.1, r * 0.25), V(r * 0.09, r * 0.05, r * 0.03));
    part(SPH_S, cheekMat, V(r * 0.32, -r * 0.1, r * 0.25), V(r * 0.09, r * 0.05, r * 0.03));
  }
  return g;
}

export function makeItem(id, r) {
  const [kind, acc] = String(id).split('.');
  if (KINDS[kind]) return makePlush(kind, r, acc || '');
  if (DOLLS[kind]) return makeDoll(kind, r);
  return makeCharm(kind, r * 0.9);
}

// ------------------------------------------------------------------ 뜨개 인형
const knitTex = (() => {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const x = c.getContext('2d');
  x.fillStyle = '#ffffff';
  x.fillRect(0, 0, 64, 64);
  x.strokeStyle = '#d4d4d4';
  x.lineWidth = 3;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const cx = col * 8 + 4;
      const cy = row * 8;
      x.beginPath();
      x.moveTo(cx - 3.5, cy + 1);
      x.lineTo(cx, cy + 7);
      x.lineTo(cx + 3.5, cy + 1);
      x.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 3);
  return t;
})();
const knitCache = new Map();
function knit(color) {
  if (!knitCache.has(color)) knitCache.set(color, new THREE.MeshStandardMaterial({ color, map: knitTex, roughness: 1 }));
  return knitCache.get(color);
}
const bead = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.15 });
const haloMat = new THREE.MeshStandardMaterial({ color: 0xffd36b, emissive: 0xffc030, emissiveIntensity: 0.9, roughness: 0.3 });
const SMILE = new THREE.TorusGeometry(1, 0.25, 6, 12, Math.PI);
const BOX = new THREE.BoxGeometry(1, 1, 1);

export function makeDoll(kind, r) {
  const g = new THREE.Group();
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const part = (geo, mat, pos, scale, rot) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.copy(pos);
    if (typeof scale === 'number') m.scale.setScalar(scale);
    else m.scale.copy(scale);
    if (rot) m.rotation.set(...rot);
    m.castShadow = (typeof scale === 'number' ? scale : Math.max(scale.x, scale.y, scale.z)) >= r * 0.2;
    g.add(m);
    return m;
  };
  const skin = knit(0xffe0c7);
  const body = ({
    santa: knit(0xd8283a), elf: knit(0x2f9e55), polar: knit(0xd8283a), ginger: knit(0xb8743a), nutcracker: knit(0xc8283a), angel: knit(0xfff6ea),
  })[kind] || knit(0xd8283a);
  const head = kind === 'polar' ? knit(0xf6f6f2) : kind === 'ginger' ? knit(0xb8743a) : skin;
  const hand = kind === 'santa' ? knit(0xffffff) : head;

  // 머리 + 몸 + 팔다리
  part(SPH, head, V(0, r * 0.3, 0), V(r * 0.6, r * 0.56, r * 0.56));
  part(SPH, body, V(0, -r * 0.42, 0), V(r * 0.48, r * 0.5, r * 0.42));
  for (const s of [-1, 1]) {
    part(SPH_S, body, V(s * r * 0.48, -r * 0.34, r * 0.04), V(r * 0.14, r * 0.3, r * 0.14), [0, 0, s * 0.55]);
    part(SPH_S, hand, V(s * r * 0.63, -r * 0.58, r * 0.08), r * 0.12);
    part(SPH_S, knit(kind === 'ginger' ? 0xb8743a : 0x2b1d3d), V(s * r * 0.2, -r * 0.9, r * 0.1), V(r * 0.16, r * 0.11, r * 0.2));
  }
  // 얼굴: 작은 구슬 눈 + 볼
  const smile = (y = 0.16, mat = bead) => part(SMILE, mat, V(0, r * y, r * 0.55), r * 0.07, [0, 0, Math.PI]);
  for (const s of [-1, 1]) {
    part(SPH_S, bead, V(s * r * 0.2, r * 0.32, r * 0.52), r * 0.065);
    part(SPH_S, white, V(s * r * 0.2 - r * 0.02, r * 0.345, r * 0.575), r * 0.02);
    part(SPH_S, cheekMat, V(s * r * 0.34, r * 0.2, r * 0.46), V(r * 0.09, r * 0.05, r * 0.03));
  }

  if (kind === 'santa') {
    part(SPH_S, whiteFluff, V(0, r * 0.08, r * 0.3), V(r * 0.42, r * 0.3, r * 0.3)); // 수염
    for (const s of [-1, 1]) part(SPH_S, whiteFluff, V(s * r * 0.1, r * 0.2, r * 0.54), V(r * 0.11, r * 0.05, r * 0.05), [0, 0, s * 0.3]);
    part(SPH_S, skin, V(0, r * 0.25, r * 0.58), r * 0.07);
    part(CONE, redFelt, V(r * 0.08, r * 0.85, -r * 0.04), V(r * 0.46, r * 0.4, r * 0.46), [0, 0, -0.35]);
    part(TORUS, whiteFluff, V(0, r * 0.66, 0), V(r * 0.52, r * 0.52, r * 0.4), [Math.PI / 2, 0, 0]);
    part(SPH_S, whiteFluff, V(r * 0.36, r * 1.1, -r * 0.04), r * 0.1);
    part(TORUS, bead, V(0, -r * 0.48, 0), V(r * 0.44, r * 0.44, r * 0.22), [Math.PI / 2, 0, 0]);
    part(BOX, gold, V(0, -r * 0.48, r * 0.43), V(r * 0.16, r * 0.12, r * 0.04));
  } else if (kind === 'elf') {
    smile();
    part(CONE, knit(0x2f9e55), V(-r * 0.12, r * 1.0, -r * 0.04), V(r * 0.42, r * 0.65, r * 0.42), [0, 0, 0.45]);
    part(TORUS, redFelt, V(0, r * 0.66, 0), V(r * 0.5, r * 0.5, r * 0.32), [Math.PI / 2, 0, 0]);
    part(SPH_S, redFelt, V(-r * 0.62, r * 1.4, -r * 0.04), r * 0.09);
    for (const s of [-1, 1]) part(CONE, skin, V(s * r * 0.62, r * 0.36, 0), V(r * 0.09, r * 0.18, r * 0.07), [0, 0, -s * 1.25]);
    for (const s of [-1, 1]) part(SPH_S, gold, V(s * r * 0.12, -r * 0.2, r * 0.38), r * 0.05);
  } else if (kind === 'polar') {
    for (const s of [-1, 1]) {
      part(SPH_S, head, V(s * r * 0.4, r * 0.76, 0), r * 0.16);
      part(SPH_S, pinkMat, V(s * r * 0.4, r * 0.76, r * 0.08), V(r * 0.08, r * 0.08, r * 0.04));
    }
    part(SPH_S, knit(0xffffff), V(0, r * 0.16, r * 0.42), V(r * 0.22, r * 0.15, r * 0.15));
    part(SPH_S, bead, V(0, r * 0.22, r * 0.57), V(r * 0.07, r * 0.05, r * 0.04));
    part(TORUS, greenFelt, V(0, -r * 0.04, 0), V(r * 0.42, r * 0.42, r * 0.3), [Math.PI / 2, 0, 0]);
    part(SPH_S, greenFelt, V(r * 0.22, -r * 0.24, r * 0.36), V(r * 0.08, r * 0.18, r * 0.05), [0.2, 0, 0.3]);
  } else if (kind === 'ginger') {
    smile(0.16, icing);
    for (const y of [-0.28, -0.5]) part(SPH_S, redFelt, V(0, r * y, r * 0.41), r * 0.07);
    for (const s of [-1, 1]) part(SMILE, icing, V(s * r * 0.63, -r * 0.5, r * 0.12), r * 0.08, [0, 0, s * 0.6]);
    part(TORUS, icing, V(0, -r * 0.78, 0), V(r * 0.3, r * 0.3, r * 0.15), [Math.PI / 2, 0, 0]);
  } else if (kind === 'nutcracker') {
    for (const s of [-1, 1]) part(SPH_S, whiteFluff, V(s * r * 0.1, r * 0.16, r * 0.54), V(r * 0.11, r * 0.05, r * 0.05), [0, 0, -s * 0.35]);
    part(SPH_S, knit(0xffb0a0), V(0, r * 0.24, r * 0.58), r * 0.065);
    part(CYL, knit(0x1a1a24), V(0, r * 0.88, 0), V(r * 0.44, r * 0.55, r * 0.44));
    part(CYL, gold, V(0, r * 0.66, 0), V(r * 0.46, r * 0.08, r * 0.46));
    part(SPH_S, redFelt, V(0, r * 1.2, r * 0.1), V(r * 0.1, r * 0.18, r * 0.1));
    for (const y of [-0.22, -0.42, -0.62]) for (const s of [-1, 1]) part(SPH_S, gold, V(s * r * 0.12, r * y, r * 0.4), r * 0.04);
    part(TORUS, bead, V(0, -r * 0.64, 0), V(r * 0.4, r * 0.4, r * 0.2), [Math.PI / 2, 0, 0]);
  } else if (kind === 'angel') {
    smile();
    part(SPH, knit(0xffd36b), V(0, r * 0.38, -r * 0.1), V(r * 0.64, r * 0.6, r * 0.55)); // 머리카락
    part(TORUS, haloMat, V(0, r * 1.0, 0), V(r * 0.3, r * 0.3, r * 0.2), [Math.PI / 2, 0, 0]);
    for (const s of [-1, 1]) part(SPH_S, whiteFluff, V(s * r * 0.34, -r * 0.18, -r * 0.4), V(r * 0.3, r * 0.42, r * 0.07), [0, s * 0.5, -s * 0.5]);
    part(CONE, knit(0xfff6ea), V(0, -r * 0.55, 0), V(r * 0.56, r * 0.4, r * 0.5));
    part(SPH_S, gold, V(0, -r * 0.1, r * 0.42), r * 0.07);
  }
  return g;
}

// 인형뽑기 기계마다 다른 인형 세트
export const PRIZE_SETS = {
  round: { kinds: KINDS, pick: pickKind, rare: 'dopa', acc: pickAcc, make: makePlush },
  doll: { kinds: DOLLS, pick: pickDoll, rare: 'angel', acc: () => '', make: (kind, r) => makeDoll(kind, r) },
};


// 캐릭터에 달고 다니는 작은 상품: 재질별로 합쳐서 그리기 횟수를 줄이고, 같은 상품은 지오메트리를 공유
const merged = new Map();
export function makeTinyItem(id, r = 0.085) {
  const key = `${id}@${r}`;
  if (!merged.has(key)) {
    const src = makeItem(id, r);
    src.updateMatrixWorld(true);
    const byMat = new Map();
    src.traverse((o) => {
      if (!o.isMesh) return;
      let geo = o.geometry.clone().applyMatrix4(o.matrixWorld);
      if (geo.index) geo = geo.toNonIndexed();
      for (const name of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(name)) geo.deleteAttribute(name);
      if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
      if (!byMat.has(o.material)) byMat.set(o.material, []);
      byMat.get(o.material).push(geo);
    });
    const parts = [];
    for (const [mat, geos] of byMat) {
      const geo = mergeGeometries(geos, false);
      if (geo) parts.push([geo, mat]);
    }
    merged.set(key, parts);
  }
  const g = new THREE.Group();
  for (const [geo, mat] of merged.get(key)) g.add(new THREE.Mesh(geo, mat));
  return g;
}

