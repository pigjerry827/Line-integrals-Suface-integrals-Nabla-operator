import * as THREE from 'three';
import {
  COLORS, makeParticles, makeRing, makeLoopCurve, glowSprite, radialTexture,
  basicMat, lineMat,
} from '../core/sceneKit.js';
import { TAU } from '../core/utils.js';

function roundedPath(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.lineTo(x + w - r, y);
  c.quadraticCurveTo(x + w, y, x + w, y + r);
  c.lineTo(x + w, y + h - r);
  c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  c.lineTo(x + r, y + h);
  c.quadraticCurveTo(x, y + h, x, y + h - r);
  c.lineTo(x, y + r);
  c.quadraticCurveTo(x, y, x + r, y);
  c.closePath();
}

function makeCardTexture(card) {
  const W = 680, H = 400;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const c = cv.getContext('2d');
  const accent = card.color;

  const bg = c.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, 'rgba(6, 18, 30, 0.96)');
  bg.addColorStop(0.55, 'rgba(9, 24, 42, 0.94)');
  bg.addColorStop(1, 'rgba(16, 10, 36, 0.96)');
  roundedPath(c, 10, 10, W - 20, H - 20, 26);
  c.fillStyle = bg;
  c.fill();

  c.save();
  roundedPath(c, 10, 10, W - 20, H - 20, 26);
  c.clip();
  c.strokeStyle = 'rgba(120, 200, 255, 0.08)';
  c.lineWidth = 1;
  for (let x = 0; x < W; x += 34) {
    c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke();
  }
  for (let y = 0; y < H; y += 34) {
    c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke();
  }
  const gl = c.createRadialGradient(W * 0.82, H * 0.1, 10, W * 0.82, H * 0.1, 330);
  gl.addColorStop(0, accent + '2e');
  gl.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = gl;
  c.fillRect(0, 0, W, H);
  c.restore();

  roundedPath(c, 10, 10, W - 20, H - 20, 26);
  c.strokeStyle = accent + 'cc';
  c.lineWidth = 2.5;
  c.stroke();

  c.fillStyle = accent;
  roundedPath(c, 46, 40, 132, 38, 19);
  c.globalAlpha = 0.16;
  c.fill();
  c.globalAlpha = 1;
  c.font = '700 20px "Noto Sans CJK SC", "Noto Sans", sans-serif';
  c.textAlign = 'left';
  c.textBaseline = 'middle';
  c.fillText(card.en, 62, 60);

  c.fillStyle = '#f2fbff';
  c.font = '700 44px "Noto Sans CJK SC", "Noto Sans", sans-serif';
  c.fillText(card.title, 46, 132);

  c.fillStyle = 'rgba(180, 216, 240, 0.82)';
  c.font = '400 20px "Noto Sans CJK SC", "Noto Sans", sans-serif';
  c.fillText(card.subtitle, 48, 170);

  const lines = card.formula;
  c.textAlign = 'center';
  c.fillStyle = '#eafbff';
  c.font = '600 29px "Latin Modern Math", "Noto Serif CJK SC", "Noto Serif", serif';
  lines.forEach((line, i) => {
    let size = 29;
    while (c.measureText(line).width > W - 110 && size > 16) {
      size -= 1;
      c.font = `600 ${size}px "Latin Modern Math", "Noto Serif CJK SC", "Noto Serif", serif`;
    }
    c.fillText(line, W / 2, 244 + i * 44);
    c.font = '600 29px "Latin Modern Math", "Noto Serif CJK SC", "Noto Serif", serif';
  });

  c.fillStyle = accent;
  c.globalAlpha = 0.75;
  c.fillRect(48, H - 84, 42, 3);
  c.globalAlpha = 1;
  c.textAlign = 'left';
  c.fillStyle = 'rgba(190, 220, 240, 0.72)';
  c.font = '400 18px "Noto Sans CJK SC", "Noto Sans", sans-serif';
  c.fillText(card.tag, 48, H - 52);

  c.textAlign = 'right';
  c.fillStyle = accent;
  c.globalAlpha = 0.4;
  c.font = '700 58px "Latin Modern Math", "Noto Serif CJK SC", serif';
  c.fillText(card.glyph, W - 46, H - 42);
  c.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function createSummary(ctx) {
  const { ui, meta } = ctx;
  const group = new THREE.Group();
  const tex = radialTexture();
  const compact = (ctx.engine?.width || 1600) < 760;

  const cards = [
    {
      id: 'green', en: 'GREEN', title: '格林公式', subtitle: '平面边界 → 内部区域',
      color: '#38e8ff', glyph: '∮', tag: '环流 = 二维旋度之和',
      formula: ['∮_∂D P dx + Q dy', '= ∬_D (∂Q/∂x − ∂P/∂y) dA'],
      pos: [-2.55, 1.9, 0.1],
    },
    {
      id: 'stokes', en: 'STOKES', title: '斯托克斯公式', subtitle: '空间边界 → 曲面',
      color: '#9a7bff', glyph: '∬', tag: '环流 = 旋度通量',
      formula: ['∮_∂S F · dr = ∬_S (∇×F) · n dS'],
      pos: [2.55, 1.9, 0.1],
    },
    {
      id: 'gauss', en: 'GAUSS', title: '高斯公式', subtitle: '闭合曲面 → 体积',
      color: '#ff5c8a', glyph: '∬', tag: '通量 = 内部散度之和',
      formula: ['∬_∂V F · n dS = ∭_V (∇·F) dV'],
      pos: [-2.55, -1.9, 0.1],
    },
    {
      id: 'ftc', en: 'FUNDAMENTAL', title: '微积分基本定理', subtitle: '两端点 → 内部',
      color: '#ffb454', glyph: '∫', tag: '一维世界里的同一个故事',
      formula: ['∫_a^b f′(x) dx = f(b) − f(a)'],
      pos: [2.55, -1.9, 0.1],
    },
  ];

  const cardObjects = [];
  if (!compact) {
    for (const card of cards) {
      const glow = glowSprite(tex, card.color, 3.9, 0.09);
      glow.position.set(card.pos[0], card.pos[1], -0.4);
      group.add(glow);

      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: makeCardTexture(card),
        transparent: true,
        depthWrite: false,
        toneMapped: false,
        opacity: 0.98,
      }));
      sprite.position.set(card.pos[0], card.pos[1], card.pos[2]);
      sprite.scale.set(2.85, 1.678, 1);
      sprite.renderOrder = 6;
      group.add(sprite);
      cardObjects.push({ card, sprite, glow, baseY: card.pos[1], phase: Math.random() * TAU });
    }
  }

  const core = new THREE.Group();
  group.add(core);

  const ring = makeRing(1.42, COLORS.gold, 0.02, 0.85);
  const ring2 = makeRing(1.12, COLORS.cyan, 0.012, 0.35);
  ring2.position.y = 0.22;
  core.add(ring, ring2);

  const knot = new THREE.Mesh(
    new THREE.TorusKnotGeometry(0.56, 0.035, 160, 10, 2, 3),
    basicMat(COLORS.violet, { additive: true, transparent: true, opacity: 0.55, depthWrite: false })
  );
  knot.rotation.x = Math.PI / 2.6;
  core.add(knot);

  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.72, 22, 16),
    new THREE.MeshBasicMaterial({
      color: COLORS.violet,
      wireframe: true,
      transparent: true,
      opacity: 0.14,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    })
  );
  core.add(sphere);

  const beam = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -2.4, 0), new THREE.Vector3(0, 2.4, 0),
    ]), lineMat(COLORS.gold, 0.18)
  );
  group.add(beam);

  const boundaryGlow = glowSprite(tex, COLORS.gold, 2.2, 0.13);
  boundaryGlow.position.y = 0.02;
  core.add(boundaryGlow);

  if (compact) core.scale.setScalar(1.18);

  const dust = makeParticles(tex, 220, COLORS.violet, 0.05);
  const dpos = dust.userData.position;
  const dustData = [];
  for (let i = 0; i < 220; i++) {
    const r = 1.2 + Math.random() * 2.8;
    const a = Math.random() * TAU;
    const y = -2.2 + Math.random() * 4.4;
    dpos[i * 3] = r * Math.cos(a);
    dpos[i * 3 + 1] = y;
    dpos[i * 3 + 2] = r * Math.sin(a);
    dustData.push({ a, y, r, sp: 0.06 + Math.random() * 0.14 });
  }
  dust.geometry.attributes.position.needsUpdate = true;
  group.add(dust);

  const transports = [];
  for (const co of cardObjects) {
    const p = new THREE.Vector3(co.card.pos[0] * 0.55, co.card.pos[1] * 0.55, 0);
    const start = new THREE.Vector3(co.card.pos[0] * 0.84, co.card.pos[1] * 0.8, 0.05);
    const end = new THREE.Vector3(0, 0, 0);
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([start, p]),
      lineMat(co.card.color, 0.16)
    );
    group.add(line);
    const pulse = glowSprite(tex, co.card.color, 0.36, 0.9);
    group.add(pulse);
    transports.push({ start, end: p, pulse, t: Math.random() });
  }

  ui.setLegend(meta.legend);
  ui.setReadouts([
    { id: 'one', label: '统一公式', value: '1 条', color: '#ffb454', note: '广义斯托克斯' },
    { id: 'dim', label: '覆盖维度', value: '1→3', color: '#38e8ff', note: '线段 → 曲面 → 体积' },
    { id: 'move', label: '核心动作', value: '∂ → d', color: '#9a7bff', note: '边界换成导数' },
  ]);
  ui.setControls([
    { type: 'button', label: '回看 Green 公式', onClick: () => ctx.jump?.('green') },
    { type: 'button', label: '回看 Stokes 公式', onClick: () => ctx.jump?.('stokes') },
    { type: 'button', label: '回看 Gauss 公式', onClick: () => ctx.jump?.('gauss') },
    { type: 'button', label: '回看三算子实验台', onClick: () => ctx.jump?.('operators') },
  ]);

  let acc = 0;
  return {
    group,
    camera: compact
      ? { pos: [0, 4.4, 10.4], target: [0, 0.05, 0], fov: 44 }
      : { pos: [9.3, 5.8, 10.3], target: [0, 0, 0], fov: 42 },
    update(dt, time) {
      knot.rotation.z += dt * 0.35;
      knot.rotation.y += dt * 0.2;
      sphere.rotation.y -= dt * 0.12;
      ring.rotation.y += dt * 0.18;
      ring2.rotation.y -= dt * 0.24;
      boundaryGlow.material.opacity = 0.1 + Math.sin(time * 1.4) * 0.03;

      for (const co of cardObjects) {
        co.sprite.position.y = co.baseY + Math.sin(time * 0.7 + co.phase) * 0.06;
        co.glow.position.y = co.sprite.position.y;
        co.glow.material.opacity = 0.07 + Math.sin(time * 0.9 + co.phase) * 0.02;
      }

      for (let i = 0; i < 220; i++) {
        const d = dustData[i];
        d.a += dt * d.sp * 0.35;
        dpos[i * 3] = d.r * Math.cos(d.a);
        dpos[i * 3 + 2] = d.r * Math.sin(d.a);
        dpos[i * 3 + 1] = d.y + Math.sin(time * 0.8 + i) * 0.05;
      }
      dust.geometry.attributes.position.needsUpdate = true;

      for (const tr of transports) {
        tr.t += dt * 0.28;
        if (tr.t > 1) tr.t -= 1;
        const k = tr.t < 0.5 ? tr.t * 2 : (1 - tr.t) * 2;
        tr.pulse.position.lerpVectors(tr.start, tr.end, k);
        tr.pulse.material.opacity = Math.sin(k * Math.PI) * 0.85 + 0.1;
        tr.pulse.scale.setScalar(0.24 + Math.sin(k * Math.PI) * 0.12);
      }

      acc += dt;
    },
    annotations() {
      if (compact) {
        return [
          { id: 'boundary', anchor: new THREE.Vector3(1.68, 0.12, 0), text: '边界 ∂Ω', sub: '', color: '#ffb454', dx: 18, dy: -18 },
          { id: 'inside', anchor: new THREE.Vector3(-0.18, 0.5, 0), text: '内部 Ω', sub: '', color: '#9a7bff', dx: -18, dy: 20 },
          { id: 'd', anchor: new THREE.Vector3(0, 1.85, 0), text: '导数 d', sub: '', color: '#38e8ff', dx: 14, dy: -18 },
        ];
      }
      return [
        { id: 'boundary', anchor: new THREE.Vector3(1.42, 0.16, 0), text: '边界 ∂Ω', sub: '在边上量一圈', color: '#ffb454', dx: 24, dy: -18 },
        { id: 'inside', anchor: new THREE.Vector3(0, 0.55, 0), text: '内部 Ω', sub: '把导数加一遍', color: '#9a7bff', dx: -24, dy: 22 },
        { id: 'd', anchor: new THREE.Vector3(0, 1.95, 0), text: '导数 d', sub: '边界信息 → 内部密度', color: '#38e8ff', dx: 16, dy: -20 },
      ];
    },
  };
}
