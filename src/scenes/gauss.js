import * as THREE from 'three';
import {
  COLORS, buildParamGeometry, surfaceMaterial, surfaceGrid, makeArrowField,
  setArrowField, makeParticles, glowSprite, radialTexture, basicMat,
} from '../core/sceneKit.js';
import { integrateFlux } from '../core/math.js';
import { formatNumber, signed, TAU } from '../core/utils.js';

export function createGauss(ctx) {
  const { ui, meta } = ctx;
  const group = new THREE.Group();
  const tex = radialTexture();

  let k = 0.85;
  let amp = 0.5;
  let seeThrough = false;
  let showNormals = true;
  let showFlow = true;

  const R0 = 2.0;
  const radius = (theta, phi) =>
    R0 + amp * (0.16 * Math.sin(3 * theta) * Math.cos(2 * phi) + 0.09 * Math.sin(5 * phi + 0.5));
  const point = (u, v) => {
    const th = Math.PI * u;
    const ph = TAU * v;
    const r = radius(th, ph);
    return [r * Math.sin(th) * Math.cos(ph), r * Math.cos(th), r * Math.sin(th) * Math.sin(ph)];
  };
  const crossN = (u, v) => {
    const d = 0.002;
    const a = point(Math.min(1, u + d), v);
    const b = point(Math.max(0, u - d), v);
    const c = point(u, Math.min(1, v + d));
    const e = point(u, Math.max(0, v - d));
    const du = [(a[0] - b[0]) / (2 * d), (a[1] - b[1]) / (2 * d), (a[2] - b[2]) / (2 * d)];
    const dv = [(c[0] - e[0]) / (2 * d), (c[1] - e[1]) / (2 * d), (c[2] - e[2]) / (2 * d)];
    const nx = du[1] * dv[2] - du[2] * dv[1];
    const ny = du[2] * dv[0] - du[0] * dv[2];
    const nz = du[0] * dv[1] - du[1] * dv[0];
    return [nx, ny, nz];
  };
  const normal = (u, v) => {
    const c = crossN(u, v);
    const p = point(u, v);
    let nx = c[0], ny = c[1], nz = c[2];
    if (nx * p[0] + ny * p[1] + nz * p[2] < 0) { nx = -nx; ny = -ny; nz = -nz; }
    const l = Math.hypot(nx, ny, nz) || 1;
    return [nx / l, ny / l, nz / l];
  };
  const surface = {
    point,
    normal,
    dS(u, v, du = 0.01, dv = 0.01) {
      const c = crossN(u, v);
      return Math.hypot(c[0], c[1], c[2]) * du * dv;
    },
  };
  const field = (p) => [k * p[0], k * p[1], k * p[2]];

  const surfaceGroup = new THREE.Group();
  group.add(surfaceGroup);

  let surfaceMesh = null, gridMesh = null;
  const normals = makeArrowField(100);
  group.add(normals);
  const fieldArrows = makeArrowField(200);
  group.add(fieldArrows);

  const particles = makeParticles(tex, 460, COLORS.cyan, 0.095);
  const ppos = particles.userData.position;
  const pcol = particles.userData.color;
  const pstate = [];
  group.add(particles);

  const coreGlow = glowSprite(tex, COLORS.pink, 2.4, 0.26);
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), basicMat(0xffd0dd));
  group.add(coreGlow, core);

  const innerHalo = new THREE.Mesh(
    new THREE.SphereGeometry(0.9, 24, 18),
    new THREE.MeshBasicMaterial({
      color: COLORS.pink,
      wireframe: true,
      transparent: true,
      opacity: 0.05,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })
  );
  group.add(innerHalo);

  function rebuildSurface() {
    if (surfaceMesh) {
      surfaceGroup.remove(surfaceMesh);
      surfaceMesh.geometry.dispose();
      surfaceMesh.material.dispose();
    }
    if (gridMesh) {
      surfaceGroup.remove(gridMesh);
      gridMesh.geometry.dispose();
      gridMesh.material.dispose();
    }
    const accent = k >= 0 ? COLORS.pink : COLORS.mint;
    const geo = buildParamGeometry(point, 64, (p) => {
      const h = p[1] / 2.4;
      const c = new THREE.Color(0x1c4f78).lerp(new THREE.Color(COLORS.cyan), 0.25 + 0.25 * (h * 0.5 + 0.5));
      c.lerp(new THREE.Color(accent), 0.18);
      return c;
    });
    const mat = surfaceMaterial({ accent, opacity: seeThrough ? 0.12 : 0.34, gridDensity: 16, side: THREE.DoubleSide });
    surfaceMesh = new THREE.Mesh(geo, mat);
    surfaceGroup.add(surfaceMesh);
    gridMesh = surfaceGrid(point, 64, COLORS.cyan, seeThrough ? 0.3 : 0.16, 6);
    surfaceGroup.add(gridMesh);
  }

  function rebuildNormals() {
    const list = [];
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 10; j++) {
        const u = (i + 0.5) / 6;
        const v = (j + 0.5) / 10;
        const p = point(u, v);
        const nn = normal(u, v);
        list.push({
          pos: [p[0] + nn[0] * 0.05, p[1] + nn[1] * 0.05, p[2] + nn[2] * 0.05],
          dir: [nn[0], nn[1], nn[2]],
          scale: 0.3,
          width: 0.8,
          color: '#ffb454',
        });
      }
    }
    setArrowField(normals, list);
    normals.visible = showNormals;
  }

  function rebuildFieldArrows() {
    const list = [];
    const col = k >= 0 ? '#ff7aa0' : '#5ff2b6';
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 12; j++) {
        const th = Math.PI * (i + 0.55) / 4;
        const ph = TAU * j / 12;
        const rr = 2.75;
        const dir = [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)];
        list.push({
          pos: [rr * dir[0], rr * dir[1], rr * dir[2]],
          dir: [dir[0] * Math.sign(k || 1), dir[1] * Math.sign(k || 1), dir[2] * Math.sign(k || 1)],
          scale: 0.45 * Math.max(0.25, Math.abs(k)),
          width: 0.85,
          color: col,
        });
      }
    }
    setArrowField(fieldArrows, list);
    fieldArrows.visible = showFlow;
  }

  function surfaceRadiusDir(nx, ny, nz) {
    const th = Math.acos(Math.max(-1, Math.min(1, ny)));
    const ph = Math.atan2(nz, nx);
    return radius(th, ph < 0 ? ph + TAU : ph);
  }

  function spawnParticle(i, fresh = false) {
    const src = k >= 0;
    if (fresh) {
      if (src) {
        const r = 0.03 + Math.random() * 0.9;
        const th = Math.acos(2 * Math.random() - 1);
        const ph = Math.random() * TAU;
        ppos[i * 3] = r * Math.sin(th) * Math.cos(ph);
        ppos[i * 3 + 1] = r * Math.cos(th);
        ppos[i * 3 + 2] = r * Math.sin(th) * Math.sin(ph);
      } else {
        const r = 2.5 + Math.random() * 1.5;
        const th = Math.acos(2 * Math.random() - 1);
        const ph = Math.random() * TAU;
        ppos[i * 3] = r * Math.sin(th) * Math.cos(ph);
        ppos[i * 3 + 1] = r * Math.cos(th);
        ppos[i * 3 + 2] = r * Math.sin(th) * Math.sin(ph);
      }
      pstate[i] = { speed: 0.5 + Math.random() * 0.7 };
    }
    const c = src ? new THREE.Color(COLORS.cyan) : new THREE.Color(COLORS.mint);
    pcol[i * 3] = c.r;
    pcol[i * 3 + 1] = c.g;
    pcol[i * 3 + 2] = c.b;
  }

  function resetParticles() {
    for (let i = 0; i < 460; i++) spawnParticle(i, true);
    particles.geometry.attributes.position.needsUpdate = true;
    particles.geometry.attributes.color.needsUpdate = true;
  }

  let flux = 0, volume = 0, volumeIntegral = 0;
  function updateNumbers() {
    flux = integrateFlux(surface, field, 80);
    volume = 0;
    const N = 90;
    for (let i = 0; i < N; i++) {
      const th = Math.PI * (i + 0.5) / N;
      for (let j = 0; j < N; j++) {
        const ph = TAU * (j + 0.5) / N;
        const r = radius(th, ph);
        volume += (r * r * r / 3) * Math.sin(th) * (Math.PI / N) * (TAU / N);
      }
    }
    volumeIntegral = 3 * k * volume;
    ui.setReadout('flux', signed(flux, 2));
    ui.setReadout('vol', signed(volumeIntegral, 2));
    ui.setReadout('diff', formatNumber(Math.abs(flux - volumeIntegral), 3));
    ui.setReadout('k', signed(k, 2));
  }

  function refreshColors() {
    const src = k >= 0;
    const accent = new THREE.Color(src ? COLORS.pink : COLORS.mint);
    coreGlow.material.color.copy(accent);
    core.material.color.copy(accent).lerp(new THREE.Color(0xffffff), 0.35);
    innerHalo.material.color.copy(accent);
    rebuildSurface();
    rebuildNormals();
    rebuildFieldArrows();
    resetParticles();
    updateNumbers();
  }

  ui.setLegend(meta.legend);
  ui.setReadouts([
    { id: 'flux', label: '表面通量 ∬', value: '0', color: '#38e8ff', note: '穿过闭合曲面' },
    { id: 'vol', label: '内部散度 ∭', value: '0', color: '#ff5c8a', note: '所有源头的总和' },
    { id: 'diff', label: '两边之差', value: '0', color: '#5ff2b6', note: '数值误差内为 0' },
    { id: 'k', label: '源强 k', value: '0.85', color: '#ffb454', note: '正为源，负为汇' },
  ]);
  ui.setControls([
    {
      type: 'range', label: '源强 k（正源 / 负汇）', min: -0.95, max: 1.25, step: 0.01, value: k,
      format: (v) => signed(v, 2),
      onInput: (v) => { k = v; refreshColors(); },
    },
    {
      type: 'range', label: '袋子形状起伏', min: 0, max: 1.2, step: 0.01, value: amp,
      format: (v) => v.toFixed(2),
      onInput: (v) => { amp = v; rebuildSurface(); rebuildNormals(); updateNumbers(); },
    },
    {
      type: 'toggles',
      items: [
        { label: '透视内部', value: false, onChange: (v) => {
          seeThrough = v;
          if (surfaceMesh) surfaceMesh.material.uniforms.uOpacity.value = v ? 0.12 : 0.34;
          if (gridMesh) gridMesh.material.opacity = v ? 0.3 : 0.16;
        } },
        { label: '显示外法向', value: true, onChange: (v) => { showNormals = v; normals.visible = v; } },
        { label: '显示流线粒子', value: true, onChange: (v) => { showFlow = v; particles.visible = v; fieldArrows.visible = v; } },
      ],
    },
  ]);

  rebuildSurface();
  rebuildNormals();
  rebuildFieldArrows();
  resetParticles();
  updateNumbers();

  let acc = 0;
  return {
    group,
    camera: { pos: [6.8, 5.2, 8.0], target: [0, 0, 0], fov: 43 },
    update(dt, time) {
      if (surfaceMesh) surfaceMesh.material.uniforms.uTime.value = time;
      const src = k >= 0;
      for (let i = 0; i < 460; i++) {
        const px = ppos[i * 3], py = ppos[i * 3 + 1], pz = ppos[i * 3 + 2];
        const rr = Math.hypot(px, py, pz) || 1;
        const nrm = surfaceRadiusDir(px / rr, py / rr, pz / rr);
        const base = Math.abs(k) * 0.55 * (0.35 + Math.min(1.6, rr) * 0.35) * pstate[i].speed;
        const dir = src ? 1 : -1;
        ppos[i * 3] += (px / rr) * base * dir * dt;
        ppos[i * 3 + 1] += (py / rr) * base * dir * dt;
        ppos[i * 3 + 2] += (pz / rr) * base * dir * dt;
        if (src && rr > nrm + 0.45) spawnParticle(i, true);
        if (!src && rr < 0.16) spawnParticle(i, true);
      }
      particles.geometry.attributes.position.needsUpdate = true;
      coreGlow.material.opacity = 0.2 + Math.sin(time * 1.8) * 0.06;
      core.scale.setScalar(0.9 + Math.sin(time * 1.8) * 0.1);
      innerHalo.rotation.y += dt * 0.16;
      innerHalo.rotation.x = Math.sin(time * 0.2) * 0.18;
      acc += dt;
      if (acc > 0.3) {
        acc = 0;
        updateNumbers();
      }
    },
    annotations() {
      const p = point(0.3, 0.18);
      const nn = normal(0.3, 0.18);
      const tip = [p[0] + nn[0] * 0.5, p[1] + nn[1] * 0.5, p[2] + nn[2] * 0.5];
      return [
        { id: 'surface', anchor: new THREE.Vector3(p[0], p[1], p[2]), text: '闭合曲面 ∂V', sub: '袋子表面，外法向为正', color: '#38e8ff', dx: 30, dy: -42 },
        { id: 'normal', anchor: new THREE.Vector3(...tip), text: '外法向 n', sub: '通量 = F · n dS', color: '#ffb454', dx: 36, dy: 32 },
        { id: 'source', anchor: new THREE.Vector3(0, 0, 0), text: k >= 0 ? '源：div F > 0' : '汇：div F < 0', sub: '内部每一点都在造水 / 吸水', color: k >= 0 ? '#ff5c8a' : '#5ff2b6', dx: -30, dy: 30 },
      ];
    },
  };
}
