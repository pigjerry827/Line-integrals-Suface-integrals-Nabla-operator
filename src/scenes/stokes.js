import * as THREE from 'three';
import {
  COLORS, buildParamGeometry, surfaceMaterial, surfaceGrid, makeArrowField,
  setArrowField, tubeFromCurve, glowSprite, radialTexture, lineMat,
} from '../core/sceneKit.js';
import { integrateCurveVector, integrateFlux } from '../core/math.js';
import { formatNumber, signed, TAU, lerp } from '../core/utils.js';

export function createStokes(ctx) {
  const { ui, meta } = ctx;
  const group = new THREE.Group();
  const tex = radialTexture();

  let R = 2.15;
  let h = 1.05;
  let strength = 1;
  let showRings = true;
  let showCurl = true;
  let showBase = true;
  let morphTarget = null;

  const point = (u, v) => {
    const r = u;
    const th = TAU * v;
    return [R * r * Math.cos(th), 0.035 + h * (1 - r * r), -R * r * Math.sin(th)];
  };
  const normal = (u, v) => {
    const r = Math.max(1e-4, u);
    const th = TAU * v;
    const nx = 2 * h * r * Math.cos(th);
    const ny = R;
    const nz = -2 * h * r * Math.sin(th);
    const l = Math.hypot(nx, ny, nz) || 1;
    return [nx / l, ny / l, nz / l];
  };
  const surface = {
    point,
    normal,
    dS(u, v, du = 0.01, dv = 0.01) {
      const r = Math.max(1e-4, u);
      return R * r * Math.sqrt(R * R + 4 * h * h * r * r) * du * TAU * dv;
    },
  };

  const field = (p) => [p[2] * strength, 0, -p[0] * strength];
  const curl = () => [0, 2 * strength, 0];

  const baseDisk = new THREE.Mesh(
    new THREE.CircleGeometry(R, 96),
    new THREE.MeshBasicMaterial({
      color: COLORS.cyan,
      transparent: true,
      opacity: 0.035,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    })
  );
  baseDisk.rotation.x = -Math.PI / 2;
  baseDisk.position.y = 0.006;
  group.add(baseDisk);

  const baseRings = new THREE.Group();
  for (let i = 1; i <= 4; i++) {
    const rr = (R * i) / 4;
    const pts = [];
    for (let k = 0; k <= 120; k++) {
      const t = (k / 120) * TAU;
      pts.push(new THREE.Vector3(rr * Math.cos(t), 0.012, rr * Math.sin(t)));
    }
    baseRings.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat(COLORS.cyan, 0.1)));
  }
  group.add(baseRings);

  let surfaceMesh = null, gridMesh = null, boundary = null, boundaryArrows = null;
  let curlArrows = null;
  const ringGroup = new THREE.Group();
  group.add(ringGroup);

  const boundaryProbe = glowSprite(tex, COLORS.cyan, 0.52, 0.9);
  group.add(boundaryProbe);

  function rebuildSurface() {
    if (surfaceMesh) {
      group.remove(surfaceMesh);
      surfaceMesh.geometry.dispose();
      surfaceMesh.material.dispose();
    }
    if (gridMesh) {
      group.remove(gridMesh);
      gridMesh.geometry.dispose();
      gridMesh.material.dispose();
    }
    const geo = buildParamGeometry(point, 72, (p, u, v) => {
      const height = h * (1 - u * u);
      const c = new THREE.Color(0x204d78).lerp(new THREE.Color(COLORS.violet), 0.32 + 0.5 * Math.min(1, height / Math.max(0.4, h)));
      c.lerp(new THREE.Color(COLORS.cyan), 0.18 + 0.12 * Math.sin(TAU * v * 3));
      return c;
    });
    surfaceMesh = new THREE.Mesh(geo, surfaceMaterial({
      accent: COLORS.violet, opacity: 0.66, gridDensity: 12, side: THREE.DoubleSide,
    }));
    group.add(surfaceMesh);
    gridMesh = surfaceGrid(point, 72, COLORS.cyan, 0.13, 6);
    group.add(gridMesh);
  }

  function rebuildBoundary() {
    if (boundary) {
      group.remove(boundary);
      boundary.geometry.dispose();
      boundary.material.dispose();
    }
    if (boundaryArrows) {
      group.remove(boundaryArrows);
      boundaryArrows.geometry.dispose();
      boundaryArrows.material.dispose();
    }
    const pts = [];
    for (let i = 0; i <= 220; i++) {
      const t = (i / 220) * TAU;
      pts.push(new THREE.Vector3(R * Math.cos(t), 0.03, -R * Math.sin(t)));
    }
    boundary = tubeFromCurve(new THREE.CatmullRomCurve3(pts, true), 0.027, COLORS.cyan, { segments: 420, radial: 7, opacity: 0.96 });
    group.add(boundary);
    const arrs = [];
    for (let i = 0; i < 20; i++) {
      const t = (i / 20) * TAU;
      arrs.push({
        pos: [R * Math.cos(t), 0.07, -R * Math.sin(t)],
        dir: [-Math.sin(t) * 0.32, 0, -Math.cos(t) * 0.32],
        scale: 0.9,
        width: 0.8,
        color: '#8ff5ff',
      });
    }
    boundaryArrows = makeArrowField(28);
    setArrowField(boundaryArrows, arrs);
    group.add(boundaryArrows);
  }

  function rebuildCurl() {
    if (curlArrows) {
      group.remove(curlArrows);
      curlArrows.geometry.dispose();
      curlArrows.material.dispose();
    }
    const list = [];
    const cv = curl();
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 10; j++) {
        const u = 0.18 + i * 0.27;
        const v = (j + 0.5) / 10;
        const p = point(u, v);
        list.push({
          pos: p,
          dir: [cv[0] * 0.16, cv[1] * 0.16, cv[2] * 0.16],
          scale: 0.95,
          width: 0.8,
          color: '#b69cff',
        });
      }
    }
    curlArrows = makeArrowField(48);
    setArrowField(curlArrows, list);
    curlArrows.visible = showCurl;
    group.add(curlArrows);

    for (const child of [...ringGroup.children]) {
      ringGroup.remove(child);
      child.geometry?.dispose();
      child.material?.dispose();
    }
    const positions = [];
    for (let j = 0; j < 12; j++) {
      const u = 0.25 + (j % 3) * 0.28;
      const v = (j + 0.5) / 12;
      positions.push({ p: point(u, v), n: normal(u, v) });
    }
    const rgeo = new THREE.TorusGeometry(0.085, 0.009, 4, 20, Math.PI * 1.55);
    rgeo.rotateX(Math.PI / 2);
    const rmat = new THREE.MeshBasicMaterial({
      color: COLORS.violet,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const inst = new THREE.InstancedMesh(rgeo, rmat, positions.length);
    inst.frustumCulled = false;
    inst.userData.positions = positions;
    ringGroup.add(inst);
    ringGroup.userData.instance = inst;
    ringGroup.visible = showRings;
    updateRingMatrices(0);
  }

  const qOrient = new THREE.Quaternion();
  const qSpin = new THREE.Quaternion();
  const yAxis = new THREE.Vector3(0, 1, 0);
  const dummy = new THREE.Object3D();
  function updateRingMatrices(t) {
    const inst = ringGroup.userData.instance;
    if (!inst) return;
    const positions = inst.userData.positions;
    positions.forEach((item, i) => {
      qOrient.setFromUnitVectors(yAxis, new THREE.Vector3(...item.n));
      qSpin.setFromAxisAngle(yAxis, t * 1.8);
      dummy.position.set(item.p[0], item.p[1] + 0.015, item.p[2]);
      dummy.quaternion.copy(qOrient).multiply(qSpin);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
    });
    inst.instanceMatrix.needsUpdate = true;
  }

  let lineValue = 0, fluxValue = 0;
  function updateNumbers() {
    lineValue = integrateCurveVector(
      (t) => [R * Math.cos(TAU * t), 0, -R * Math.sin(TAU * t)],
      field, 1400, 0, 1
    );
    fluxValue = integrateFlux(surface, () => curl(), 70);
    ui.setReadout('line', signed(lineValue, 2));
    ui.setReadout('flux', signed(fluxValue, 2));
    ui.setReadout('diff', formatNumber(Math.abs(lineValue - fluxValue), 3));
    ui.setReadout('h', h.toFixed(2));
  }

  function rebuildAll() {
    rebuildSurface();
    rebuildCurl();
    updateNumbers();
  }

  ui.setLegend(meta.legend);
  ui.setReadouts([
    { id: 'line', label: '边界环流 ∮', value: '0', color: '#38e8ff', note: '沿边缘走一圈' },
    { id: 'flux', label: '旋度通量 ∬', value: '0', color: '#9a7bff', note: '涡管穿过曲面' },
    { id: 'diff', label: '两边之差', value: '0', color: '#5ff2b6', note: '数值误差内为 0' },
    { id: 'h', label: '曲面鼓包 h', value: '1.05', color: '#ffb454', note: '改变形状，结果不变' },
  ]);
  ui.setControls([
    {
      type: 'range', label: '曲面鼓包 h', min: 0, max: 1.4, step: 0.01, value: h,
      format: (v) => v.toFixed(2),
      onInput: (v) => { h = v; morphTarget = null; rebuildAll(); },
    },
    {
      type: 'range', label: '旋度强度 |∇×F|', min: 0.2, max: 1.8, step: 0.01, value: strength,
      format: (v) => v.toFixed(2),
      onInput: (v) => { strength = v; rebuildCurl(); updateNumbers(); },
    },
    {
      type: 'toggles',
      items: [
        { label: '显示涡旋环', value: true, onChange: (v) => { showRings = v; ringGroup.visible = v; } },
        { label: '显示旋度箭头', value: true, onChange: (v) => { showCurl = v; if (curlArrows) curlArrows.visible = v; } },
        { label: '显示另一张同边界曲面', value: true, onChange: (v) => { showBase = v; baseDisk.visible = v; baseRings.visible = v; } },
      ],
    },
    {
      type: 'button', label: '让曲面包鼓 / 压平', labelPlaying: '变形中…',
      onClick: () => { morphTarget = h > 0.7 ? 0 : 1.25; },
    },
  ]);

  rebuildBoundary();
  rebuildSurface();
  rebuildCurl();
  updateNumbers();

  let acc = 0, lastMorphBuild = 0, clock = 0;
  return {
    group,
    camera: { pos: [6.4, 5.7, 7.8], target: [0, 0.35, 0], fov: 43 },
    update(dt, time) {
      clock = time;
      if (surfaceMesh) surfaceMesh.material.uniforms.uTime.value = time;
      if (morphTarget != null) {
        const old = h;
        h = lerp(h, morphTarget, Math.min(1, dt * 4.2));
        if (Math.abs(h - morphTarget) < 0.012) {
          h = morphTarget;
          morphTarget = null;
        }
        lastMorphBuild += dt;
        if (Math.abs(h - old) > 0.008 && lastMorphBuild > 0.07) {
          lastMorphBuild = 0;
          rebuildSurface();
          rebuildCurl();
          ui.setReadout('h', h.toFixed(2));
        }
      }
      updateRingMatrices(time);
      const bt = (time * 0.24) % TAU;
      boundaryProbe.position.set(R * Math.cos(bt), 0.12, -R * Math.sin(bt));
      boundaryProbe.material.opacity = 0.75 + Math.sin(time * 3.2) * 0.14;
      acc += dt;
      if (acc > 0.25) {
        acc = 0;
        updateNumbers();
      }
    },
    annotations() {
      const bt = (clock * 0.24) % TAU;
      const p = point(0.62, 0.18);
      const tip = point(0.62, 0.18);
      tip[1] += 0.55;
      return [
        { id: 'boundary', anchor: new THREE.Vector3(R * Math.cos(bt), 0.15, -R * Math.sin(bt)), text: '同一条边界', sub: '方向由右手定则确定', color: '#38e8ff', dx: 22, dy: -22 },
        { id: 'curl', anchor: new THREE.Vector3(tip[0], tip[1], tip[2]), text: '旋度 ∇×F', sub: '像一根根穿过曲面的涡管', color: '#9a7bff', dx: 22, dy: -20 },
        { id: 'surface', anchor: new THREE.Vector3(p[0], p[1], p[2]), text: '曲面可以随便鼓', sub: '只要边缘不变，积分不变', color: '#ffb454', dx: -24, dy: 22 },
      ];
    },
  };
}

