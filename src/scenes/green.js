import * as THREE from 'three';
import {
  COLORS, makeArrowField, setArrowField, makeGridPlane, tubeFromCurve,
  glowSprite, radialTexture, makeAlphaLineMaterial, basicMat,
} from '../core/sceneKit.js';
import { greenCirculation, greenAreaIntegral } from '../core/math.js';
import { formatNumber, signed, TAU } from '../core/utils.js';

export function createGreen(ctx) {
  const { ui, meta } = ctx;
  const group = new THREE.Group();
  const tex = radialTexture();

  let R = 2.15;
  let n = 9;
  let fieldType = 'rotation';
  let showField = true;
  let showSpins = true;
  let cancel = 0;
  let cancelling = false;
  let tRing = 0;

  const field2 = (x, z) => {
    if (fieldType === 'shear') return [0, x];
    return [-z, x];
  };
  const curl2 = (x, z) => {
    if (fieldType === 'shear') return 1;
    return 2;
  };

  const regionFill = new THREE.Mesh(
    new THREE.CircleGeometry(1, 96),
    new THREE.MeshBasicMaterial({
      color: COLORS.violet,
      transparent: true,
      opacity: 0.045,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    })
  );
  regionFill.rotation.x = -Math.PI / 2;
  regionFill.position.y = 0.004;
  group.add(regionFill);

  const grid = makeGridPlane(9, 22, 0x2e7d9a, 0.13);
  group.add(grid);

  const fieldArrows = makeArrowField(220);
  group.add(fieldArrows);

  let boundary = null;
  let boundaryArrows = null;
  let cells = null;
  let rings = null;
  let dots = null;
  let cellData = [];

  const boundaryProbe = glowSprite(tex, COLORS.cyan, 0.34, 0.36);
  const centerGlow = glowSprite(tex, COLORS.violet, 2.2, 0.1);
  centerGlow.position.set(0, 0.05, 0);
  group.add(boundaryProbe, centerGlow);

  function disposeMesh(m) {
    if (!m) return;
    group.remove(m);
    m.geometry?.dispose();
    m.material?.dispose();
  }

  function rebuildBoundary() {
    disposeMesh(boundary);
    disposeMesh(boundaryArrows);
    const pts = [];
    for (let i = 0; i <= 240; i++) {
      const t = (i / 240) * TAU;
      pts.push(new THREE.Vector3(R * Math.cos(t), 0.028, R * Math.sin(t)));
    }
    const curve = new THREE.CatmullRomCurve3(pts, true);
    boundary = tubeFromCurve(curve, 0.024, '#21a6c0', {
      segments: 420, radial: 7, opacity: 0.82, additive: false,
    });
    group.add(boundary);

    const arrs = [];
    for (let i = 0; i < 18; i++) {
      const t = (i / 18) * TAU;
      const x = R * Math.cos(t), z = R * Math.sin(t);
      arrs.push({
        pos: [x, 0.06, z],
        dir: [-Math.sin(t) * 0.3, 0, Math.cos(t) * 0.3],
        scale: 0.64,
        width: 0.8,
        color: '#1b8fa9',
      });
    }
    boundaryArrows = makeArrowField(24);
    boundaryArrows.material.opacity = 0.45;
    setArrowField(boundaryArrows, arrs);
    group.add(boundaryArrows);
  }

  function rebuildCells() {
    disposeMesh(cells);
    if (rings) { group.remove(rings); rings.geometry.dispose(); rings.material.dispose(); rings = null; }
    if (dots) { group.remove(dots); dots.geometry.dispose(); dots.material.dispose(); dots = null; }

    const d = (2 * R) / n;
    const positions = [];
    const alphas = [];
    cellData = [];
    const seen = new Set();
    const addEdge = (x1, z1, x2, z2) => {
      const key = `${Math.min(x1, x2).toFixed(3)},${Math.min(z1, z2).toFixed(3)},${Math.max(x1, x2).toFixed(3)},${Math.max(z1, z2).toFixed(3)}`;
      if (seen.has(key)) return;
      seen.add(key);
      positions.push(x1, 0.042, z1, x2, 0.042, z2);
      alphas.push(1, 1);
    };
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const x0 = -R + i * d, z0 = -R + j * d;
        const x1 = x0 + d, z1 = z0 + d;
        const cx = x0 + d / 2, cz = z0 + d / 2;
        if (cx * cx + cz * cz > R * R) continue;
        cellData.push({ x: cx, z: cz, curl: curl2(cx, cz) });
        addEdge(x0, z0, x1, z0);
        addEdge(x1, z0, x1, z1);
        addEdge(x1, z1, x0, z1);
        addEdge(x0, z1, x0, z0);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('aAlpha', new THREE.Float32BufferAttribute(alphas, 1));
    const mat = makeAlphaLineMaterial(COLORS.gold, 0.5);
    cells = new THREE.LineSegments(geo, mat);
    group.add(cells);

    const ringGeo = new THREE.TorusGeometry(0.07, 0.0075, 4, 22, Math.PI * 1.5);
    ringGeo.rotateX(Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    rings = new THREE.InstancedMesh(ringGeo, ringMat, cellData.length);
    rings.frustumCulled = false;
    const dotGeo = new THREE.SphereGeometry(0.016, 6, 5);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0xdffbff, toneMapped: false });
    dots = new THREE.InstancedMesh(dotGeo, dotMat, cellData.length);
    dots.frustumCulled = false;
    const c = new THREE.Color();
    cellData.forEach((cell, i) => {
      c.set(cell.curl >= 0 ? COLORS.violet : COLORS.pink).lerp(new THREE.Color(0xffffff), 0.18);
      rings.setColorAt(i, c);
    });
    if (rings.instanceColor) rings.instanceColor.needsUpdate = true;
    group.add(rings, dots);
  }

  function rebuildField() {
    const arrs = [];
    const step = 0.42;
    for (let x = -R + 0.22; x <= R - 0.1; x += step) {
      for (let z = -R + 0.22; z <= R - 0.1; z += step) {
        if (x * x + z * z > R * R) continue;
        const f = field2(x, z);
        const mag = Math.hypot(f[0], f[1]);
        arrs.push({
          pos: [x, 0.05, z],
          dir: [f[0] * 0.22, 0, f[1] * 0.22],
          scale: 0.85,
          width: 0.8,
          color: mag > 1.5 ? '#8ff5ff' : '#2c8ca8',
        });
      }
    }
    setArrowField(fieldArrows, arrs);
    fieldArrows.visible = showField;
  }

  function refresh() {
    regionFill.scale.setScalar(R);
    rebuildBoundary();
    rebuildCells();
    rebuildField();
    updateReadouts();
  }

  let circulation = 0, areaIntegral = 0;
  function updateReadouts() {
    circulation = greenCirculation(R, field2, 1800);
    areaIntegral = greenAreaIntegral(R, curl2, 150);
    ui.setReadout('circ', signed(circulation, 2));
    ui.setReadout('area', signed(areaIntegral, 2));
    ui.setReadout('diff', formatNumber(Math.abs(circulation - areaIntegral), 3));
    ui.setReadout('region', formatNumber(Math.PI * R * R, 2));
  }

  ui.setLegend(meta.legend);
  ui.setReadouts([
    { id: 'circ', label: '边界环流 ∮', value: '0', color: '#38e8ff', note: '沿外圈走一圈' },
    { id: 'area', label: '内部旋度 ∬', value: '0', color: '#9a7bff', note: '小漩涡之和' },
    { id: 'diff', label: '两边之差', value: '0', color: '#5ff2b6', note: '数值误差内为 0' },
    { id: 'region', label: '区域面积', value: '0', color: '#ffb454', note: 'πR²' },
  ]);
  ui.setControls([
    {
      type: 'segmented', label: '选择向量场', value: 'rotation',
      options: [{ label: '旋转场', value: 'rotation' }, { label: '剪切场', value: 'shear' }],
      onChange: (v) => { fieldType = v; refresh(); },
    },
    {
      type: 'range', label: '区域半径 R', min: 1.35, max: 2.85, step: 0.01, value: R,
      format: (v) => v.toFixed(2),
      onInput: (v) => { R = v; refresh(); },
    },
    {
      type: 'range', label: '网格细分 n', min: 4, max: 14, step: 1, value: n,
      format: (v) => `${v} × ${v}`,
      onInput: (v) => { n = v; rebuildCells(); },
    },
    {
      type: 'toggles',
      items: [
        { label: '显示向量场', value: true, onChange: (v) => { showField = v; fieldArrows.visible = v; } },
        { label: '显示小漩涡', value: true, onChange: (v) => { showSpins = v; if (rings) rings.visible = v; if (dots) dots.visible = v; } },
      ],
    },
    {
      type: 'button', label: '让内部边相互抵消', labelPlaying: '抵消中…',
      onClick: () => {
        if (cancel > 0.99) {
          cancel = 0;
          cancelling = false;
        } else {
          cancelling = true;
        }
      },
    },
  ]);

  refresh();

  const dummy = new THREE.Object3D();
  const col = new THREE.Color();
  let acc = 0;
  return {
    group,
    camera: { pos: [4.4, 7.4, 6.2], target: [0, 0, 0], fov: 43 },
    update(dt, time) {
      tRing += dt;
      if (cancelling) {
        cancel += dt * 0.35;
        if (cancel >= 1) { cancel = 1; cancelling = false; }
      }
      const op = 0.5 * (1 - cancel * 0.92);
      if (cells) cells.material.uniforms.uOpacity.value = op;

      if (rings && showSpins) {
        cellData.forEach((cell, i) => {
          const speed = 1.1 + Math.abs(cell.curl) * 0.55;
          const ang = tRing * speed * Math.sign(cell.curl || 1);
          dummy.position.set(cell.x, 0.055, cell.z);
          dummy.rotation.set(0, ang, 0);
          dummy.scale.setScalar(1);
          dummy.updateMatrix();
          rings.setMatrixAt(i, dummy.matrix);
          const rr = 0.07;
          dummy.position.set(cell.x + Math.cos(ang + Math.PI / 2) * rr, 0.07, cell.z - Math.sin(ang + Math.PI / 2) * rr);
          dummy.rotation.set(0, 0, 0);
          dummy.updateMatrix();
          dots.setMatrixAt(i, dummy.matrix);
        });
        rings.instanceMatrix.needsUpdate = true;
        dots.instanceMatrix.needsUpdate = true;
      }

      const bt = (time * 0.28) % TAU;
      boundaryProbe.position.set(R * Math.cos(bt), 0.1, R * Math.sin(bt));
      boundaryProbe.material.opacity = 0.3 + Math.sin(time * 3) * 0.1;
      centerGlow.material.opacity = 0.08 + Math.sin(time * 0.9) * 0.03;

      acc += dt;
      if (acc > 0.15) {
        acc = 0;
        updateReadouts();
      }
    },
    annotations() {
      const bt = (tRing * 0.28) % TAU;
      return [
        { id: 'boundary', anchor: new THREE.Vector3(R * Math.cos(bt), 0.15, R * Math.sin(bt)), text: '沿边界走一圈', sub: '累加 F · T ds = 环流', color: '#38e8ff', dx: 22, dy: -22 },
        { id: 'vortex', anchor: new THREE.Vector3(R * 0.42, 0.12, R * 0.38), text: '每个小格都在转', sub: '强度 = ∂Q/∂x − ∂P/∂z', color: '#9a7bff', dx: 26, dy: 20 },
        { id: 'cancel', anchor: new THREE.Vector3(-R * 0.55, 0.12, -R * 0.48), text: cancel > 0.4 ? '内部边已抵消' : '内部边一正一反', sub: '最后只剩最外圈', color: '#ffb454', dx: -24, dy: 22 },
      ];
    },
  };
}
