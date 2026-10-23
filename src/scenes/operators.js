import * as THREE from 'three';
import {
  COLORS, buildParamGeometry, surfaceMaterial, surfaceGrid, makeArrowField,
  setArrowField, makeGridPlane, makeParticles, makeArrow, setArrow,
  glowSprite, radialTexture, basicMat, lineFromPoints, lineMat,
} from '../core/sceneKit.js';
import { formatNumber, signed, TAU } from '../core/utils.js';

export function createOperators(ctx) {
  const { ui, meta, engine } = ctx;
  const group = new THREE.Group();
  const tex = radialTexture();
  const modeGroup = new THREE.Group();
  group.add(modeGroup);

  const grid = makeGridPlane(9, 22, 0x2e7d9a, 0.13);
  group.add(grid);

  let mode = null;
  let A = 1.7;
  let probeX = 1.15;
  let probeZ = 0.72;
  let divA = 0.8;
  let divB = -0.25;
  let omega = 0.85;

  let dynamic = {};
  let acc = 0, clock = 0;

  function clearGroup(g) {
    for (const child of [...g.children]) {
      g.remove(child);
      child.traverse?.((o) => {
        o.geometry?.dispose?.();
        o.material?.dispose?.();
      });
    }
  }

  const gradF = (x, z) => A * Math.exp(-(x * x + z * z) / 5.2);
  const gradX = (x, z) => -2 * A * x / 5.2 * Math.exp(-(x * x + z * z) / 5.2);
  const gradZ = (x, z) => -2 * A * z / 5.2 * Math.exp(-(x * x + z * z) / 5.2);

  const divField = (p) => [divA * p[0], 0, divB * p[2]];
  const curlField = (p) => [-omega * p[2], 0, omega * p[0]];

  let modeData = null;

  function makeWheel(color, radius = 0.18, spokes = 4, opacity = 0.9) {
    const g = new THREE.Group();
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.012, 4, 32),
      basicMat(color, { additive: true, transparent: true, opacity, depthWrite: false })
    );
    ring.rotation.x = Math.PI / 2;
    g.add(ring);
    for (let i = 0; i < spokes; i++) {
      const a = (i / spokes) * TAU;
      const spoke = new THREE.Mesh(
        new THREE.CylinderGeometry(0.008, 0.008, radius, 4),
        basicMat(color, { additive: true, transparent: true, opacity, depthWrite: false })
      );
      spoke.position.set(Math.cos(a) * radius / 2, 0, Math.sin(a) * radius / 2);
      spoke.rotation.z = Math.PI / 2;
      spoke.rotation.y = -a;
      g.add(spoke);
    }
    return g;
  }

  function buildGradient() {
    clearGroup(modeGroup);
    const geo = buildParamGeometry((u, v) => {
      const x = (u - 0.5) * 6.4;
      const z = (v - 0.5) * 6.4;
      return [x, gradF(x, z), z];
    }, 64, (p) => {
      const h = p[1] / Math.max(0.4, A);
      return new THREE.Color(0x0f3b4a).lerp(new THREE.Color(COLORS.mint), 0.3 + 0.7 * Math.min(1, h));
    });
    const mesh = new THREE.Mesh(geo, surfaceMaterial({
      accent: COLORS.mint, opacity: 0.62, gridDensity: 20, side: THREE.DoubleSide,
    }));
    modeGroup.add(mesh);
    const gridMesh = surfaceGrid((u, v) => {
      const x = (u - 0.5) * 6.4;
      const z = (v - 0.5) * 6.4;
      return [x, gradF(x, z) + 0.004, z];
    }, 64, COLORS.cyan, 0.1, 9);
    modeGroup.add(gridMesh);

    for (let i = 1; i <= 5; i++) {
      const level = (i / 6) * A;
      const rr = Math.sqrt(-5.2 * Math.log(level / A));
      if (!Number.isFinite(rr) || rr > 3.2) continue;
      const pts = [];
      for (let j = 0; j <= 120; j++) {
        const t = (j / 120) * TAU;
        pts.push(new THREE.Vector3(rr * Math.cos(t), level + 0.01, rr * Math.sin(t)));
      }
      modeGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat(COLORS.gold, 0.32)));
      const basePts = pts.map((p) => new THREE.Vector3(p.x, 0.02, p.z));
      modeGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(basePts), lineMat(COLORS.gold, 0.07)));
    }

    const arrows = makeArrowField(260);
    const list = [];
    for (let ix = 0; ix <= 12; ix++) {
      for (let iz = 0; iz <= 12; iz++) {
        const x = -3 + (6 * ix) / 12;
        const z = -3 + (6 * iz) / 12;
        const gx = gradX(x, z), gz = gradZ(x, z);
        const mag = Math.hypot(gx, gz);
        if (mag < 0.025) continue;
        list.push({
          pos: [x, 0.025, z],
          dir: [gx, 0, gz],
          scale: 0.42,
          width: 0.8,
          color: mag > 0.55 ? '#9dffcf' : '#2d9a7b',
        });
      }
    }
    setArrowField(arrows, list);
    modeGroup.add(arrows);

    const probeRoot = new THREE.Group();
    modeGroup.add(probeRoot);
    const marker = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 9), basicMat(0x5ff2b6));
    const halo = glowSprite(tex, COLORS.mint, 0.3, 0.12);
    const stem = new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0),
    ]), lineMat(COLORS.mint, 0.35));
    const gradArrow = makeArrow(new THREE.Vector3(), new THREE.Vector3(0, 1, 0), COLORS.mint, { head: 0.16, headWidth: 0.09 });
    const tangentLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.55, 0, 0), new THREE.Vector3(0.55, 0, 0),
    ]), lineMat(COLORS.gold, 0.8));
    const baseRing = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.008, 5, 40),
      basicMat(COLORS.gold, { additive: true, transparent: true, opacity: 0.55, depthWrite: false }));
    baseRing.rotation.x = Math.PI / 2;
    probeRoot.add(marker, halo, stem, gradArrow, tangentLine, baseRing);

    dynamic = { arrows, probeRoot, marker, halo, stem, gradArrow, tangentLine, baseRing, mesh, gridMesh };
    updateGradientProbe();
    setGradientUI();
  }

  function updateGradientProbe() {
    const d = dynamic;
    if (!d.probeRoot) return;
    const x = probeX, z = probeZ;
    const y = gradF(x, z) + 0.02;
    d.marker.position.set(x, y, z);
    d.halo.position.set(x, y, z);
    d.stem.geometry.dispose();
    d.stem.geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x, 0.02, z), new THREE.Vector3(x, y, z),
    ]);
    d.baseRing.position.set(x, 0.05, z);
    const gx = gradX(x, z), gz = gradZ(x, z);
    const mag = Math.hypot(gx, gz) || 1;
    const visLen = Math.max(0.55, Math.min(1.3, mag * 1.15));
    const start = new THREE.Vector3(x, 0.07, z);
    const end = start.clone().add(new THREE.Vector3(gx / mag, 0, gz / mag).multiplyScalar(visLen));
    setArrow(d.gradArrow, start, end);
    const tx = -gz / mag, tz = gx / mag;
    d.tangentLine.position.set(x, 0.075, z);
    d.tangentLine.rotation.y = Math.atan2(tx, tz) + Math.PI / 2;
  }

  function setGradientUI() {
    ui.setStatus('GRADIENT · ∇f');
    ui.setLegend([
      { color: '#5ff2b6', label: '梯度 ∇f', type: 'line' },
      { color: '#ffb454', label: '等高线', type: 'line' },
      { color: '#38e8ff', label: '山丘表面', type: 'line' },
    ]);
    ui.setReadouts([
      { id: 'f', label: 'f(探针)', value: '0', color: '#38e8ff', note: '山丘高度' },
      { id: 'gx', label: '∂f/∂x', value: '0', color: '#5ff2b6', note: '东西方向坡度' },
      { id: 'gz', label: '∂f/∂z', value: '0', color: '#5ff2b6', note: '南北方向坡度' },
      { id: 'gm', label: '|∇f|', value: '0', color: '#ffb454', note: '最陡坡度' },
    ]);
    ui.setControls([
      { id: 'mode', type: 'segmented', label: '选择算子', value: mode, options: [
        { label: '梯度 ∇f', value: 'gradient' },
        { label: '散度 ∇·F', value: 'divergence' },
        { label: '旋度 ∇×F', value: 'curl' },
      ], onChange: (v) => switchMode(v) },
      { id: 'A', type: 'range', label: '山丘高度 A', min: 0.6, max: 2.6, step: 0.01, value: A, format: (v) => v.toFixed(2), onInput: (v) => { A = v; buildGradient(); } },
      { id: 'px', type: 'range', label: '探针 x', min: -2.8, max: 2.8, step: 0.01, value: probeX, format: (v) => v.toFixed(2), onInput: (v) => { probeX = v; updateGradientProbe(); } },
      { id: 'pz', type: 'range', label: '探针 z', min: -2.8, max: 2.8, step: 0.01, value: probeZ, format: (v) => v.toFixed(2), onInput: (v) => { probeZ = v; updateGradientProbe(); } },
      { type: 'button', label: '点击舞台移动探针', onClick: () => ui.toast('在网格上点一下即可移动探针', innerWidth * 0.55, innerHeight * 0.3) },
    ]);
    updateReadouts(true);
  }

  function buildDivergence() {
    clearGroup(modeGroup);
    const arrows = makeArrowField(260);
    const list = [];
    for (let ix = 0; ix <= 14; ix++) {
      for (let iz = 0; iz <= 14; iz++) {
        const x = -3 + (6 * ix) / 14;
        const z = -3 + (6 * iz) / 14;
        const f = divField([x, 0, z]);
        const mag = Math.hypot(f[0], f[2]);
        if (mag < 0.02) continue;
        list.push({
          pos: [x, 0.03, z],
          dir: [f[0], 0, f[2]],
          scale: 0.38,
          width: 0.8,
          color: divA + divB >= 0 ? '#ff7aa0' : '#5ff2b6',
        });
      }
    }
    setArrowField(arrows, list);
    modeGroup.add(arrows);

    const particles = makeParticles(tex, 200, COLORS.cyan, 0.07);
    const pos = particles.userData.position;
    const pdata = [];
    for (let i = 0; i < 200; i++) {
      const r = Math.sqrt(Math.random()) * 3.2;
      const t = Math.random() * TAU;
      pos[i * 3] = r * Math.cos(t);
      pos[i * 3 + 1] = 0.05;
      pos[i * 3 + 2] = r * Math.sin(t);
      pdata.push({ speed: 0.35 + Math.random() * 0.5 });
    }
    particles.geometry.attributes.position.needsUpdate = true;
    modeGroup.add(particles);

    const probeRoot = new THREE.Group();
    const square = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.28, 0, -0.28), new THREE.Vector3(0.28, 0, -0.28),
      new THREE.Vector3(0.28, 0, 0.28), new THREE.Vector3(-0.28, 0, 0.28),
    ]), lineMat(COLORS.pink, 0.8));
    square.position.y = 0.06;
    const marker = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), basicMat(0xffd9e4));
    const halo = glowSprite(tex, COLORS.pink, 0.9, 0.1);
    probeRoot.add(square, marker, halo);
    modeGroup.add(probeRoot);

    dynamic = { arrows, particles, pos, pdata, probeRoot };
    updateDivProbe();
    setDivUI();
  }

  function updateDivProbe() {
    if (!dynamic.probeRoot) return;
    dynamic.probeRoot.position.set(probeX, 0, probeZ);
  }

  function setDivUI() {
    ui.setStatus('DIVERGENCE · ∇·F');
    ui.setLegend([
      { color: '#ff5c8a', label: '源：净流出', type: 'dot' },
      { color: '#5ff2b6', label: '汇：净流入', type: 'dot' },
      { color: '#38e8ff', label: '流线粒子', type: 'dot' },
    ]);
    ui.setReadouts([
      { id: 'dx', label: '∂P/∂x', value: '0', color: '#ff5c8a', note: 'x 方向膨胀率' },
      { id: 'dz', label: '∂Q/∂z', value: '0', color: '#5ff2b6', note: 'z 方向膨胀率' },
      { id: 'div', label: '∇·F', value: '0', color: '#ffb454', note: '净流出密度' },
      { id: 'kind', label: '探针处是', value: '—', color: '#9a7bff', note: '源 / 汇 / 无源' },
    ]);
    ui.setControls([
      { id: 'mode', type: 'segmented', label: '选择算子', value: mode, options: [
        { label: '梯度 ∇f', value: 'gradient' },
        { label: '散度 ∇·F', value: 'divergence' },
        { label: '旋度 ∇×F', value: 'curl' },
      ], onChange: (v) => switchMode(v) },
      { id: 'da', type: 'range', label: 'x 方向源强 a', min: -1.2, max: 1.4, step: 0.01, value: divA, format: (v) => signed(v, 2), onInput: (v) => { divA = v; buildDivergence(); } },
      { id: 'db', type: 'range', label: 'z 方向源强 b', min: -1.2, max: 1.4, step: 0.01, value: divB, format: (v) => signed(v, 2), onInput: (v) => { divB = v; buildDivergence(); } },
      { id: 'px', type: 'range', label: '探针 x', min: -2.8, max: 2.8, step: 0.01, value: probeX, format: (v) => v.toFixed(2), onInput: (v) => { probeX = v; updateDivProbe(); } },
      { id: 'pz', type: 'range', label: '探针 z', min: -2.8, max: 2.8, step: 0.01, value: probeZ, format: (v) => v.toFixed(2), onInput: (v) => { probeZ = v; updateDivProbe(); } },
    ]);
    updateReadouts(true);
  }

  function buildCurl() {
    clearGroup(modeGroup);
    const arrows = makeArrowField(260);
    const list = [];
    for (let ix = 0; ix <= 13; ix++) {
      for (let iz = 0; iz <= 13; iz++) {
        const x = -2.9 + (5.8 * ix) / 13;
        const z = -2.9 + (5.8 * iz) / 13;
        const f = curlField([x, 0, z]);
        const mag = Math.hypot(f[0], f[2]);
        if (mag < 0.02) continue;
        list.push({
          pos: [x, 0.03, z],
          dir: [f[0], 0, f[2]],
          scale: 0.33,
          width: 0.8,
          color: '#9a7bff',
        });
      }
    }
    setArrowField(arrows, list);
    modeGroup.add(arrows);

    const wheels = [];
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        const x = -2.1 + i * 1.4;
        const z = -2.1 + j * 1.4;
        if (x * x + z * z > 8.5) continue;
        const w = makeWheel(COLORS.violet, 0.12, 3, 0.55);
        w.position.set(x, 0.07, z);
        modeGroup.add(w);
        wheels.push(w);
      }
    }

    const particles = makeParticles(tex, 180, COLORS.violet, 0.065);
    const pos = particles.userData.position;
    for (let i = 0; i < 180; i++) {
      const r = 0.3 + Math.sqrt(Math.random()) * 2.7;
      const t = Math.random() * TAU;
      pos[i * 3] = r * Math.cos(t);
      pos[i * 3 + 1] = 0.06;
      pos[i * 3 + 2] = r * Math.sin(t);
    }
    particles.geometry.attributes.position.needsUpdate = true;
    modeGroup.add(particles);

    const probeRoot = new THREE.Group();
    const largeWheel = makeWheel(COLORS.gold, 0.32, 4, 0.9);
    largeWheel.position.y = 0.1;
    const square = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.36, 0, -0.36), new THREE.Vector3(0.36, 0, -0.36),
      new THREE.Vector3(0.36, 0, 0.36), new THREE.Vector3(-0.36, 0, 0.36),
    ]), lineMat(COLORS.gold, 0.55));
    square.position.y = 0.055;
    probeRoot.add(largeWheel, square);
    modeGroup.add(probeRoot);

    dynamic = { arrows, wheels, particles, pos, probeRoot, largeWheel };
    updateCurlProbe();
    setCurlUI();
  }

  function updateCurlProbe() {
    if (!dynamic.probeRoot) return;
    dynamic.probeRoot.position.set(probeX, 0, probeZ);
  }

  function setCurlUI() {
    ui.setStatus('CURL · ∇×F');
    ui.setLegend([
      { color: '#9a7bff', label: '旋度 / 环流', type: 'ring' },
      { color: '#ffb454', label: '探针小风车', type: 'ring' },
      { color: '#38e8ff', label: '旋转粒子', type: 'dot' },
    ]);
    ui.setReadouts([
      { id: 'curl', label: '|∇×F|', value: '0', color: '#9a7bff', note: '轴向 +y（右手定则）' },
      { id: 'omega', label: '角速度 ω', value: '0', color: '#ffb454', note: '小风车转速' },
      { id: 'circ', label: '局部环流', value: '0', color: '#38e8ff', note: '绕探针小圈一圈' },
      { id: 'dir', label: '旋转方向', value: '—', color: '#5ff2b6', note: '从 +y 向下看' },
    ]);
    ui.setControls([
      { id: 'mode', type: 'segmented', label: '选择算子', value: mode, options: [
        { label: '梯度 ∇f', value: 'gradient' },
        { label: '散度 ∇·F', value: 'divergence' },
        { label: '旋度 ∇×F', value: 'curl' },
      ], onChange: (v) => switchMode(v) },
      { id: 'om', type: 'range', label: '旋转强度 ω', min: -1.4, max: 1.4, step: 0.01, value: omega, format: (v) => signed(v, 2), onInput: (v) => { omega = v; buildCurl(); } },
      { id: 'px', type: 'range', label: '探针 x', min: -2.8, max: 2.8, step: 0.01, value: probeX, format: (v) => v.toFixed(2), onInput: (v) => { probeX = v; updateCurlProbe(); } },
      { id: 'pz', type: 'range', label: '探针 z', min: -2.8, max: 2.8, step: 0.01, value: probeZ, format: (v) => v.toFixed(2), onInput: (v) => { probeZ = v; updateCurlProbe(); } },
    ]);
    updateReadouts(true);
  }

  function updateReadouts(force = false) {
    if (mode === 'gradient') {
      const f = gradF(probeX, probeZ);
      const gx = gradX(probeX, probeZ), gz = gradZ(probeX, probeZ);
      ui.setReadout('f', formatNumber(f, 3));
      ui.setReadout('gx', signed(gx, 3));
      ui.setReadout('gz', signed(gz, 3));
      ui.setReadout('gm', formatNumber(Math.hypot(gx, gz), 3));
    } else if (mode === 'divergence') {
      const div = divA + divB;
      ui.setReadout('dx', signed(divA, 2));
      ui.setReadout('dz', signed(divB, 2));
      ui.setReadout('div', signed(div, 2));
      ui.setReadout('kind', div > 0.04 ? '源' : div < -0.04 ? '汇' : '无源');
    } else {
      const c = 2 * omega;
      ui.setReadout('curl', formatNumber(Math.abs(c), 2));
      ui.setReadout('omega', signed(omega, 2));
      ui.setReadout('circ', signed(c * 0.36, 2));
      ui.setReadout('dir', omega > 0.02 ? '逆时针' : omega < -0.02 ? '顺时针' : '不转');
    }
  }

  function switchMode(next) {
    if (next === mode) return;
    mode = next;
    if (mode === 'gradient') buildGradient();
    else if (mode === 'divergence') buildDivergence();
    else buildCurl();
  }

  function onPointerUp(ndc) {
    const rc = new THREE.Raycaster();
    rc.setFromCamera(ndc, engine.camera);
    const hit = new THREE.Vector3();
    if (!rc.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit)) return;
    probeX = Math.max(-2.8, Math.min(2.8, hit.x));
    probeZ = Math.max(-2.8, Math.min(2.8, hit.z));
    if (mode === 'gradient') updateGradientProbe();
    else if (mode === 'divergence') updateDivProbe();
    else updateCurlProbe();
    const px = ui.controls.find((c) => c.id === 'px');
    const pz = ui.controls.find((c) => c.id === 'pz');
    px?._set?.(probeX);
    pz?._set?.(probeZ);
    updateReadouts(true);
  }

  switchMode('gradient');

  return {
    group,
    camera: { pos: [6.1, 5.9, 7.4], target: [0, 0.35, 0], fov: 43 },
    update(dt, time) {
      clock = time;
      if (mode === 'gradient') {
        dynamic.mesh?.material.uniforms.uTime && (dynamic.mesh.material.uniforms.uTime.value = time);
        dynamic.halo && (dynamic.halo.material.opacity = 0.65 + Math.sin(time * 2.2) * 0.12);
      } else if (mode === 'divergence') {
        const { pos } = dynamic;
        for (let i = 0; i < 200; i++) {
          const x = pos[i * 3], z = pos[i * 3 + 2];
          const f = divField([x, 0, z]);
          pos[i * 3] += f[0] * dt * 0.28;
          pos[i * 3 + 2] += f[2] * dt * 0.28;
          if (x * x + z * z > 11.5 || x * x + z * z < 0.004) {
            const r = Math.sqrt(Math.random()) * 3.2;
            const t = Math.random() * TAU;
            pos[i * 3] = r * Math.cos(t);
            pos[i * 3 + 2] = r * Math.sin(t);
          }
        }
        dynamic.particles.geometry.attributes.position.needsUpdate = true;
      } else {
        const { pos, wheels, largeWheel } = dynamic;
        const spd = omega * 1.6;
        for (const w of wheels) w.rotation.y += spd * dt * 0.9;
        if (largeWheel) largeWheel.rotation.y += spd * dt;
        for (let i = 0; i < 180; i++) {
          const x = pos[i * 3], z = pos[i * 3 + 2];
          pos[i * 3] += -omega * z * dt * 0.33;
          pos[i * 3 + 2] += omega * x * dt * 0.33;
          if (x * x + z * z > 10.5 || x * x + z * z < 0.02) {
            const r = 0.35 + Math.sqrt(Math.random()) * 2.7;
            const t = Math.random() * TAU;
            pos[i * 3] = r * Math.cos(t);
            pos[i * 3 + 2] = r * Math.sin(t);
          }
        }
        dynamic.particles.geometry.attributes.position.needsUpdate = true;
      }
      acc += dt;
      if (acc > 0.12) {
        acc = 0;
        updateReadouts();
      }
    },
    onPointerUp,
    annotations() {
      if (mode === 'gradient') {
        const y = gradF(probeX, probeZ);
        const gx = gradX(probeX, probeZ), gz = gradZ(probeX, probeZ);
        const mag = Math.hypot(gx, gz) || 1;
        const visLen = Math.max(0.55, Math.min(1.3, mag * 1.15));
        const tip = new THREE.Vector3(probeX + (gx / mag) * visLen, 0.15, probeZ + (gz / mag) * visLen);
        return [
          { id: 'grad', anchor: tip, text: '∇f 最陡上坡', sub: '长度 = 最大方向导数', color: '#5ff2b6', dx: 22, dy: -22 },
          { id: 'contour', anchor: new THREE.Vector3(1.8, gradF(1.8, 0) + 0.1, 0), text: '等高线', sub: '梯度与它垂直', color: '#ffb454', dx: 20, dy: 18 },
          { id: 'probe', anchor: new THREE.Vector3(probeX, y + 0.15, probeZ), text: '探针', sub: '点击网格移动', color: '#38e8ff', dx: -20, dy: 20 },
        ];
      }
      if (mode === 'divergence') {
        const div = divA + divB;
        return [
          { id: 'probe', anchor: new THREE.Vector3(probeX, 0.2, probeZ), text: div >= 0 ? '源：向外冒' : '汇：向里吸', sub: '看小方块是膨胀还是收缩', color: div >= 0 ? '#ff5c8a' : '#5ff2b6', dx: 22, dy: -20 },
          { id: 'div', anchor: new THREE.Vector3(-1.9, 0.1, 1.5), text: '∇·F = ∂P/∂x + ∂Q/∂z', sub: '每单位面积的净流出', color: '#ffb454', dx: -20, dy: 22 },
        ];
      }
      return [
        { id: 'wheel', anchor: new THREE.Vector3(probeX, 0.22, probeZ), text: '小风车', sub: '转得越快，旋度越大', color: '#ffb454', dx: 22, dy: -20 },
        { id: 'curl', anchor: new THREE.Vector3(0.9, 0.3, 0.9), text: '∇×F 指向 +y', sub: '方向由右手定则决定', color: '#9a7bff', dx: -22, dy: 22 },
      ];
    },
  };
}
