// 인형뽑기 말고 지금 할 수 있는 미니게임 두 개. main.js 가 버튼(E / ACTION)을 action() 으로 넘겨줘요.
//   ctx = { sfx, pay(): bool, reward(n, why), prize(id, why), banner(text, kind, ms), confetti(n), show(big, sub, color), sendLive(d) }
import { WHEEL } from './world.js?v=3';
import { itemInfo } from './plush.js?v=3';

const TARGET = 10;
const SHOW_SECS = 3; // 처음 3초만 숫자가 보이고 그다음은 ??.??
// ±0.05초 안에 멈추면 받는 왕큰 인형 (캐릭터가 등에 업고 다녀요)
const GIANTS = ['bear.hat.big', 'bunny.scarf.big', 'snowman.hat.big', 'penguin.scarf.big', 'reindeer.bow.big', 'cat.hat.big', 'santa..big', 'polar..big'];

export function tenGame(ctx, mesh) {
  let state = 'ready';
  let t = 0;
  let lastText = '';
  let best = +(localStorage.getItem('xmas-ten-best') ?? NaN);
  const screen = (text, color) => {
    if (text === lastText) return;
    lastText = text;
    mesh.setScreen(text, color);
    ctx.sendLive({ v: text, c: color });
  };
  const idle = () => {
    ctx.show('10.00', '누구나 상품! ±0.05초면 🧸왕큰 인형', '#86EFC8');
    screen('10.00', '#86EFC8');
  };
  idle();
  return {
    label: () => (state === 'run' ? '⏹ STOP' : '▶ START 🪙1'),
    info: () => (Number.isFinite(best) ? `최고 기록 ${best.toFixed(2)}초` : '3초 뒤엔 숫자가 사라져요'),
    busy: () => state === 'run',
    action() {
      if (state === 'run') {
        state = 'result';
        const d = Math.abs(t - TARGET);
        const v = t.toFixed(2);
        // 모두 상품을 받아요. 정확할수록 좋은 상품 + 티켓
        let n = 0;
        let msg = '';
        let item = 'candy';
        if (d <= 0.05) { n = 10; item = GIANTS[Math.floor(Math.random() * GIANTS.length)]; msg = 'PERFECT!! 🎯 왕큰 인형!'; }
        else if (d <= 0.1) { n = 5; item = 'star'; msg = '거의 완벽!'; }
        else if (d <= 0.2) { n = 3; item = 'reindeer.hat'; msg = '대단해요!'; }
        else if (d <= 0.4) { n = 2; item = 'gift'; msg = '아깝다!'; }
        else if (d <= 0.7) { n = 1; item = 'bell'; msg = '조금만 더!'; }
        else if (d <= 1.0) { item = 'cookie'; msg = t < TARGET ? '조금 빨라요' : '조금 늦어요'; }
        else msg = t < TARGET ? '너무 빨라요' : '너무 늦어요';
        const info = itemInfo(item);
        if (!Number.isFinite(best) || Math.abs(best - TARGET) > d) {
          best = t;
          try { localStorage.setItem('xmas-ten-best', String(t)); } catch { /* noop */ }
        }
        const color = n >= 5 ? '#D9FF44' : n ? '#86EFC8' : '#FF6C91';
        ctx.show(v, `${msg} · ${info.emoji} ${info.name}${n ? ` + 🎟️${n}` : ''}`, color);
        screen(v, color);
        ctx.prize(item, '10초 맞추기');
        ctx.score(Math.round(d * 1000), +t.toFixed(2)); // 오차(ms), 표시용 시간
        if (n) ctx.reward(n);
        ctx.sfx.win();
        if (n >= 5) ctx.confetti(n * 8);
        ctx.banner(`${info.emoji} ${info.name} GET!`, n >= 10 ? 'rare' : n ? 'win' : 'go', n >= 10 ? 2600 : 1800);
        return;
      }
      if (!ctx.pay()) return;
      state = 'run';
      t = 0;
      ctx.sfx.coin();
      setTimeout(ctx.sfx.start, 200);
    },
    update(dt) {
      if (state !== 'run') return;
      t += dt;
      const text = t < SHOW_SECS ? t.toFixed(2) : '??.??';
      ctx.show(text, t < SHOW_SECS ? '속으로 세어 보세요…' : '지금이다 싶을 때 STOP!', '#F7F6F2');
      screen(t < SHOW_SECS ? t.toFixed(1) : '??.??', '#F7F6F2');
      if (t > 20) this.action();
    },
    exit() { idle(); },
  };
}

export function applyTenLive(mesh, live) {
  if (live?.v) mesh.setScreen(live.v, live.c || '#86EFC8');
}

const SEG = (Math.PI * 2) / WHEEL.length;

export function rouletteGame(ctx, mesh) {
  const wheel = mesh.wheel;
  let state = 'ready';
  let from = 0;
  let to = 0;
  let t = 0;
  let pick = 0;
  let lastSeg = 0;
  let liveT = 0;
  const DUR = 4.2;
  let won = 0; // 이번에 앉아서 받은 티켓 합
  ctx.show('🎡', '꽝 없음! 모든 칸이 상품 🎁', '#FFD36B');
  return {
    label: () => (state === 'spin' ? '두근두근…' : '🎡 SPIN 🪙1'),
    info: () => WHEEL.map((w) => w.emoji).filter((e, i, a) => a.indexOf(e) === i).join(' '),
    busy: () => state === 'spin',
    action() {
      if (state === 'spin' || !ctx.pay()) return;
      state = 'spin';
      pick = Math.floor(Math.random() * WHEEL.length);
      from = wheel.rotation.z;
      const base = from - (from % (Math.PI * 2));
      to = base + Math.PI * 2 * 6 + pick * SEG + (Math.random() - 0.5) * SEG * 0.6;
      if (to < from + Math.PI * 8) to += Math.PI * 2;
      t = 0;
      ctx.sfx.coin();
      ctx.show('🎡', '돌아가는 중…', '#FFD36B');
    },
    update(dt) {
      if (state !== 'spin') return;
      t = Math.min(DUR, t + dt);
      const k = 1 - (1 - t / DUR) ** 3;
      wheel.rotation.z = from + (to - from) * k;
      const seg = Math.floor((wheel.rotation.z + SEG / 2) / SEG);
      if (seg !== lastSeg) { lastSeg = seg; ctx.sfx.tick(false); }
      liveT += dt;
      if (liveT > 0.1) { liveT = 0; ctx.sendLive({ rot: +wheel.rotation.z.toFixed(3) }); }
      if (t >= DUR) {
        state = 'ready';
        ctx.sendLive({ rot: +wheel.rotation.z.toFixed(3) });
        const seg = WHEEL[pick];
        const info = itemInfo(seg.item);
        ctx.prize(seg.item, '행운 룰렛');
        if (seg.v) ctx.reward(seg.v);
        won += seg.v;
        ctx.score(won, won);
        ctx.sfx.win();
        ctx.banner(`${info.emoji} ${info.name} GET!`, seg.v >= 5 ? 'rare' : 'win', 1800);
        if (seg.v >= 2) ctx.confetti(seg.v * 14);
        ctx.show(info.emoji, `${info.name}${seg.v ? ` + 🎟️${seg.v}` : ''}`, '#D9FF44');
      }
    },
    exit() {},
  };
}

export function applyRouletteLive(mesh, live, dt) {
  if (live?.rot == null) return;
  const w = mesh.wheel;
  w.rotation.z += (live.rot - w.rotation.z) * Math.min(1, dt * 8);
}
