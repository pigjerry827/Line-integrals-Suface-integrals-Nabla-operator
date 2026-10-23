import * as THREE from 'three';
import {
  COLORS, buildParamGeometry, surfaceMaterial, surfaceGrid, makeTileMesh,
  makeArrowField, setArrowField, makeParticles, radialTexture, makeArrow,
} from '../core/sceneKit.js';
import { integrateFlux } from '../core/math.js';
import { formatNumber, signed } from '../core/utils.js';

export function createSurfaceVector(ctx) {
  const { ui, meta } = ctx;
  const group = new THREE.Group();
  const tex = radialTexture();
  const netGroup = new THREE.Group();
  group.add(netGroup);

  let tilt = 0.28;
  let flowAngle = 0.35;
  let strength = 1;
  let n = 9;
  let flipped = false;

  const localPoint = (u, v) => {
    const x = (u - 0.5) * 4.3;
    const z = (v - 0.5) * 3.5;
    const y = 0.42 * Math.sin(x * 1.4 + 0.3) * Math.cos(z * 1.25 - 0.4) + 0.12 * Math.sin(z * 2.1);
    return [x, y, z];
  };
  const deriv = (u, v, d = 0.002) => {
    const a = localPoint(Math.min(1, u + d), v);
    const b = localPoint(Math.max(0, u - d), v);
    return [(a[0] - b[0]) / (2 * d), (a[1] - b[1]) / (2 * d), (a[2] - b[2]) / (2 * d)];
  };
  const derivV = (u, v, d = 0.002) => {
    const a = localPoint(u, Math.min(1, v + d));
    const b = localPoint(u, Math.max(0, v - d));
    return [(a[0] - b[0]) / (2 * d), (a[1] - b[1]) / (2 * d), (a[2] - b[2]) / (2 * d)];
  };
  const localNormal = (u, v) => {
    const a = deriv(u, v), b = derivV(u, v);
    const nx = a[2] * b[1] - a[1] * b[2];
    const ny = a[0] * b[2] - a[2] * b[0];
    const nz = a[1] * b[0] - a[0] * b[1];
    const l = Math.hypot(nx, ny, nz) || 1;
    return [nx / l, ny / l, nz / l];
  };
  const surface = {
    point: localPoint,
    normal: localNormal,
    tangentU: deriv,
    tangentV: derivV,
    dS(u, v, du = 0.01, dv = 0.01) {
      const a = deriv(u, v), b = derivV(u, v);
      const nx = a[1] * b[2] - a[2] * b[1];
      const ny = a[2] * b[0] - a[0] * b[2];
      const nz = a[0] * b[1] - a[1] * b[0];
      return Math.hypot(nx, ny, nz) * du * dv;
    },
  };

  const fieldWorld = () => new THREE.Vector3(
    0.55 * Math.cos(flowAngle) * strength,
    0.95 * strength,
    0.55 * Math.sin(flowAngle) * strength
  );
  const fieldLocal = () => fieldWorld().applyAxisAngle(new THREE.Vector3(1, 0, 0), -tilt);

  function fluxAtLocal(u, v) {
    const nn = localNormal(u, v);
    const f = fieldLocal();
    return (f.x * nn[0] + f.y * nn[1] + f.z * nn[2]) * (flipped ? -1 : 1);
  }

  const geo = buildParamGeometry(localPoint, 58, (p) => {
    const h = p[1];
    const c = new THREE.Color(0x2b6f92).lerp(new THREE.Color(0x38e8ff), 0.5 + 0.5 * Math.sin(h * 2.2));
    return c;
  });
  const surfaceMesh = new THREE.Mesh(geo, surfaceMaterial({
    accent: COLORS.cyan, opacity: 0.56, gridDensity: 13, side: THREE.DoubleSide,
  }));
  netGroup.add(surfaceMesh);
  const gridMesh = surfaceGrid(localPoint, 58, COLORS.cyan, 0.2, 4);
  netGroup.add(gridMesh);

  let tiles = null;
  const normals = makeArrowField(160);
  netGroup.add(normals);

  const fieldArrows = makeArrowField(180);
  group.add(fieldArrows);

  const particles = makeParticles(tex, 320, COLORS.cyan, 0.09);
  const ppos = particles.userData.position;
  const pcol = particles.userData.color;
  const pstate = [];
  group.add(particles);

  const normalArrow = makeArrow(new THREE.Vector3(), new THREE.Vector3(0, 1, 0), COLORS.gold, { head: 0.16, headWidth: 0.09 });
  netGroup.add(normalArrow);

  function updateTiles() {
    if (tiles) {
      netGroup.remove(tiles);
      tiles.geometry.dispose();
      tiles.material.dispose();
    }
    tiles = makeTileMesh(surface, n, (p, u, v) => {
      const fl = fluxAtLocal(u, v);
      return fl >= 0 ? '#38e8ff' : '#ff8a4c';
    }, { size: 0.8, opacity: 0.27, lift: 0.012, normalFlip: flipped ? -1 : 1 });
    netGroup.add(tiles);
  }

  function updateNormals() {
    const list = [];
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 5; j++) {
        const u = (i + 0.5) / 7, v = (j + 0.5) / 5;
        const p = localPoint(u, v);
        const nn = localNormal(u, v);
        const s = flipped ? -1 : 1;
        list.push({
          pos: p,
          dir: [nn[0] * s, nn[1] * s, nn[2] * s],
          scale: 0.3,
          width: 0.8,
          color: flipped ? '#ff8a4c' : '#ffb454',
        });
      }
    }
    setArrowField(normals, list);
    const c = localPoint(0.5, 0.5), cn = localNormal(0.5, 0.5), s = flipped ? -1 : 1;
    const tip = new THREE.Vector3(c[0] + cn[0] * s * 0.7, c[1] + cn[1] * s * 0.7, c[2] + cn[2] * s * 0.7);
    const origin = new THREE.Vector3(c[0], c[1], c[2]);
    normalArrow.position.copy(origin);
    normalArrow.setDirection(new THREE.Vector3(cn[0] * s, cn[1] * s, cn[2] * s));
    normalArrow.setLength(0.7, 0.16, 0.09);
  }

  function updateFieldArrows() {
    const f = fieldWorld();
    const len = 0.28 + 0.2 * strength;
    const list = [];
    for (let ix = 0; ix < 8; ix++) {
      for (let iz = 0; iz < 5; iz++) {
        for (let iy = 0; iy < 2; iy++) {
          const x = -2.3 + (4.6 * ix) / 7;
          const z = -1.9 + (3.8 * iz) / 4;
          const y = iy === 0 ? -1.5 : 1.55;
          list.push({
            pos: [x, y, z],
            dir: [f.x, f.y, f.z],
            scale: len,
            width: 0.85,
            color: '#2c95b5',
          });
        }
      }
    }
    setArrowField(fieldArrows, list);
  }

  function particleColor(i) {
    const fw = fieldWorld();
    const wn = new THREE.Vector3(...localNormal(0.5, 0.5)).applyAxisAngle(new THREE.Vector3(1, 0, 0), tilt);
    const sign = fw.dot(wn) * (flipped ? -1 : 1) >= 0 ? 1 : -1;
    const c = sign > 0 ? new THREE.Color(COLORS.cyan) : new THREE.Color(COLORS.orange);
    pcol[i * 3] = c.r;
    pcol[i * 3 + 1] = c.g;
    pcol[i * 3 + 2] = c.b;
  }

  function spawnParticle(i, fresh = false) {
    if (fresh) {
      ppos[i * 3] = (Math.random() - 0.5) * 4.4;
      ppos[i * 3 + 1] = -2.2 - Math.random() * 0.9;
      ppos[i * 3 + 2] = (Math.random() - 0.5) * 3.8;
    }
    particleColor(i);
    if (!pstate[i]) pstate[i] = { speed: 0.45 + Math.random() * 0.35 };
  }

  function resetParticles() {
    for (let i = 0; i < 320; i++) spawnParticle(i, true);
    particles.geometry.attributes.position.needsUpdate = true;
    particles.geometry.attributes.color.needsUpdate = true;
  }

  function recolorParticles() {
    for (let i = 0; i < 320; i++) particleColor(i);
    particles.geometry.attributes.color.needsUpdate = true;
  }

  function refreshAll() {
    netGroup.rotation.x = tilt;
    updateTiles();
    updateNormals();
    updateFieldArrows();
    resetParticles();
    const flux = integrateFlux(surface, () => fieldLocal().toArray(), 90) * (flipped ? -1 : 1);
    ui.setReadout('flux', signed(flux, 3));
    ui.setReadout('side', flux >= 0 ? '净流出' : '净流入');
    ui.setReadout('normal', flipped ? '已翻转' : '向上');
    ui.setReadout('pieces', `${n * n}`);
  }

  ui.setLegend(meta.legend);
  ui.setReadouts([
    { id: 'flux', label: '净通量 Φ', value: '0', color: '#38e8ff', note: '∬ F · n dS' },
    { id: 'side', label: '通量方向', value: '净流出', color: '#5ff2b6', note: '由 F · n 的符号决定' },
    { id: 'normal', label: '曲面定向', value: '向上', color: '#ffb454', note: '翻面则变号' },
    { id: 'pieces', label: '采样小片', value: '81', color: '#9a7bff', note: 'n × n' },
  ]);
  ui.setControls([
    {
      type: 'range', label: '水流方向', min: -180, max: 180, step: 1, value: 20,
      format: (v) => `${v}°`,
      onInput: (v) => { flowAngle = (v * Math.PI) / 180; refreshAll(); },
    },
    {
      type: 'range', label: '流速 / 场强', min: 0.25, max: 1.8, step: 0.01, value: strength,
      format: (v) => v.toFixed(2),
      onInput: (v) => { strength = v; refreshAll(); },
    },
    {
      type: 'range', label: '渔网倾角', min: -1.0, max: 1.0, step: 0.01, value: tilt,
      format: (v) => `${Math.round((v * 180) / Math.PI)}°`,
      onInput: (v) => { tilt = v; refreshAll(); },
    },
    {
      type: 'range', label: '采样密度 n', min: 4, max: 16, step: 1, value: n,
      format: (v) => `${v} × ${v}`,
      onInput: (v) => { n = v; updateTiles(); ui.setReadout('pieces', `${v * v}`); },
    },
    {
      type: 'toggles',
      items: [{ label: '翻转曲面定向', value: false, onChange: (v) => { flipped = v; refreshAll(); } }],
    },
  ]);

  refreshAll();

  let acc = 0;
  return {
    group,
    camera: { pos: [6.8, 5.6, 7.6], target: [0, 0, 0], fov: 43 },
    update(dt, time) {
      const f = fieldWorld();
      for (let i = 0; i < 320; i++) {
        const d = pstate[i];
        ppos[i * 3] += f.x * d.speed * dt * 0.55;
        ppos[i * 3 + 1] += f.y * d.speed * dt * 0.55;
        ppos[i * 3 + 2] += f.z * d.speed * dt * 0.55;
        if (ppos[i * 3 + 1] > 3.0 || Math.abs(ppos[i * 3]) > 3.0 || Math.abs(ppos[i * 3 + 2]) > 2.8) {
          spawnParticle(i, true);
        }
      }
      particles.geometry.attributes.position.needsUpdate = true;
      surfaceMesh.material.uniforms.uTime.value = time;
      if (tiles) tiles.material.opacity = 0.23 + Math.sin(time * 1.5) * 0.03;
      acc += dt;
      if (acc > 0.2) {
        acc = 0;
        recolorParticles();
      }
    },
    annotations() {
      const axis = new THREE.Vector3(1, 0, 0);
      const p = new THREE.Vector3(...localPoint(0.55, 0.35)).applyAxisAngle(axis, tilt);
      const tip = new THREE.Vector3(...localPoint(0.55, 0.35));
      const nn = localNormal(0.55, 0.35);
      tip.add(new THREE.Vector3(nn[0] * 0.55, nn[1] * 0.55, nn[2] * 0.55)).applyAxisAngle(axis, tilt);
      const p2 = new THREE.Vector3(...localPoint(0.25, 0.68)).applyAxisAngle(axis, tilt);
      return [
        { id: 'n', anchor: tip, text: '法向 n', sub: flipped ? '已翻面：通量变号' : '决定“穿过去”的正方向', color: '#ffb454', dx: 20, dy: -22 },
        { id: 'flux', anchor: p, text: 'F · n dS', sub: '只算穿过网的那部分', color: '#38e8ff', dx: 24, dy: 20 },
        { id: 'net', anchor: p2, text: '渔网 Σ', sub: '切成小片再相加', color: '#9a7bff', dx: -20, dy: 22 },
      ];
    },
  };
}
