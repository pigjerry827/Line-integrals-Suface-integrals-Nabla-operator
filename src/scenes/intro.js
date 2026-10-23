import * as THREE from 'three';
import {
  COLORS, makeParticles, tubeFromCurve, makeGlyphSprite, makeRing,
  glowSprite, radialTexture, basicMat, lineMat, lineFromPoints,
} from '../core/sceneKit.js';

export function createIntro(ctx) {
  const { ui } = ctx;
  const group = new THREE.Group();
  const tex = radialTexture();
  const ribbons = new THREE.Group();
  group.add(ribbons);

  const palette = [COLORS.cyan, COLORS.violet, COLORS.gold, COLORS.mint, 0x4c8dff];
  for (let k = 0; k < 5; k++) {
    const pts = [];
    const phase = (k / 5) * Math.PI * 2;
    for (let i = 0; i <= 90; i++) {
      const t = i / 90;
      const a = Math.PI * 2 * t;
      const r = 2.1 + 0.75 * Math.sin(a * 2 + phase);
      pts.push(new THREE.Vector3(
        r * Math.cos(a + phase) * 1.04,
        1.55 * Math.sin(a * 1.5 + phase * 1.7) * (0.7 + 0.3 * Math.sin(a + phase)),
        r * Math.sin(a + phase)
      ));
    }
    const curve = new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.4);
    const tube = tubeFromCurve(curve, 0.012 + 0.004 * (k % 2), palette[k], {
      segments: 420, radial: 5, opacity: 0.58,
    });
    ribbons.add(tube);
  }

  const glyph = makeGlyphSprite(THREE, '∮', '#8ff5ff', 4.6);
  glyph.position.set(0, 0.1, 0);
  group.add(glyph);

  const ringA = makeRing(3.1, COLORS.cyan, 0.01, 0.22);
  ringA.rotation.z = 0.35;
  const ringB = makeRing(3.65, COLORS.violet, 0.008, 0.16);
  ringB.rotation.z = -0.5;
  group.add(ringA, ringB);

  const n = 340;
  const particles = makeParticles(tex, n, COLORS.cyan, 0.075);
  const pos = particles.userData.position;
  const colors = particles.userData.color;
  const data = [];
  const cA = new THREE.Color(COLORS.cyan);
  const cB = new THREE.Color(COLORS.violet);
  const cC = new THREE.Color(COLORS.gold);
  for (let i = 0; i < n; i++) {
    const r = 2.2 + Math.random() * 3.6;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    pos[i * 3 + 1] = r * Math.cos(ph) * 0.7;
    pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
    const c = Math.random() < 0.15 ? cC : Math.random() < 0.5 ? cB : cA;
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    data.push({ speed: 0.18 + Math.random() * 0.5, phase: Math.random() * 6.28 });
  }
  particles.geometry.attributes.position.needsUpdate = true;
  particles.geometry.attributes.color.needsUpdate = true;
  group.add(particles);

  const haze = glowSprite(tex, COLORS.cyan, 6.4, 0.05);
  group.add(haze);

  const axis = [0, 1, 0];
  const arr1 = lineFromPoints([new THREE.Vector3(-5, -2.1, 0), new THREE.Vector3(5, -2.1, 0)], COLORS.cyan, 0.16);
  group.add(arr1);

  ui.setLegend(ctx.meta.legend);
  ui.setReadouts([]);
  ui.setControls([]);

  let rot = 0;
  return {
    group,
    camera: { pos: [0.2, 2.2, 9.4], target: [0, 0, 0], fov: 40 },
    update(dt, time) {
      rot += dt * 0.045;
      ribbons.rotation.y = rot;
      ribbons.rotation.x = Math.sin(time * 0.18) * 0.12;
      ringA.rotation.y = -rot * 0.6;
      ringB.rotation.y = rot * 0.4;
      glyph.material.opacity = 0.4 + Math.sin(time * 1.1) * 0.05;
      glyph.scale.setScalar(4.3 + Math.sin(time * 1.1) * 0.08);
      for (let i = 0; i < n; i++) {
        const px = pos[i * 3], py = pos[i * 3 + 1], pz = pos[i * 3 + 2];
        const d = data[i];
        pos[i * 3] += (-pz * 0.055 + Math.sin(py + time * 0.3) * 0.02) * d.speed;
        pos[i * 3 + 1] += (px * 0.03 + Math.cos(pz * 0.8 + time * 0.25) * 0.02) * d.speed;
        pos[i * 3 + 2] += (px * 0.055) * d.speed;
        if (px * px + py * py + pz * pz > 47) {
          const r = 2.0;
          const th = Math.random() * 6.28;
          const ph = Math.acos(2 * Math.random() - 1);
          pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
          pos[i * 3 + 1] = r * Math.cos(ph) * 0.7;
          pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
        }
      }
      particles.geometry.attributes.position.needsUpdate = true;
    },
    annotations: () => [],
  };
}
