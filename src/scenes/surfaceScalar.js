import * as THREE from 'three';
import {
  COLORS, buildParamGeometry, surfaceMaterial, surfaceGrid, makeTileMesh,
  makeArrowField, setArrowField, glowSprite, radialTexture, lineMat,
} from '../core/sceneKit.js';
import { integrateSurface } from '../core/math.js';
import { formatNumber } from '../core/utils.js';

export function createSurfaceScalar(ctx) {
  const { ui, meta } = ctx;
  const group = new THREE.Group();
  const tex = radialTexture();

  let amp = 0.7;
  let n = 10;
  let pattern = '斑驳';
  let flipped = false;
  let scan = 1;
  let scanning = false;

  const point = (u, v) => {
    const x = (u - 0.5) * 4.5;
    const z = (v - 0.5) * 4.5;
    const y = 0.12 + amp * (0.62 * Math.sin(x * 1.25 + 0.5) * Math.cos(z * 1.05 + 0.2) + 0.26 * Math.sin(z * 2.1 - 0.4));
    return [x, y, z];
  };
  const deriv = (u, v, du = 0.002) => {
    const a = point(Math.min(1, u + du), v);
    const b = point(Math.max(0, u - du), v);
    return [(a[0] - b[0]) / (2 * du), (a[1] - b[1]) / (2 * du), (a[2] - b[2]) / (2 * du)];
  };
  const derivV = (u, v, dv = 0.002) => {
    const a = point(u, Math.min(1, v + dv));
    const b = point(u, Math.max(0, v - dv));
    return [(a[0] - b[0]) / (2 * dv), (a[1] - b[1]) / (2 * dv), (a[2] - b[2]) / (2 * dv)];
  };
  const normal = (u, v) => {
    const a = deriv(u, v), b = derivV(u, v);
    const nx = a[1] * b[2] - a[2] * b[1];
    const ny = a[2] * b[0] - a[0] * b[2];
    const nz = a[0] * b[1] - a[1] * b[0];
    const len = Math.hypot(nx, ny, nz) || 1;
    return [nx / len, ny / len, nz / len];
  };
  const surface = {
    point,
    normal,
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

  const density = (p) => {
    const [x, , z] = p;
    if (pattern === '条纹') {
      return 0.28 + 0.72 * (0.5 + 0.5 * Math.sin(2.4 * (x + z) + 0.6));
    }
    return 0.38 + 0.62 * (0.5 + 0.5 * Math.sin(1.8 * x + 0.6) * Math.cos(1.5 * z - 0.3));
  };
  const colorFor = (f) => {
    const a = new THREE.Color(0x2c7fa6);
    const b = new THREE.Color(0xffb454);
    const c = new THREE.Color(0xff5c8a);
    if (f < 0.62) return a.clone().lerp(b, f / 0.62);
    return b.clone().lerp(c, (f - 0.62) / 0.38);
  };

  let surfaceMesh = null;
  let gridMesh = null;
  let tiles = null;
  const normals = makeArrowField(120);
  group.add(normals);

  const scanLine = new THREE.Line(new THREE.BufferGeometry(), lineMat(COLORS.gold, 0.9));
  const scanGlow = glowSprite(tex, COLORS.gold, 0.8, 0.7);
  group.add(scanLine, scanGlow);

  function rebuild() {
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
    if (tiles) {
      group.remove(tiles);
      tiles.geometry.dispose();
      tiles.material.dispose();
    }
    const geo = buildParamGeometry(point, 72, (p) => colorFor(density(p)));
    surfaceMesh = new THREE.Mesh(geo, surfaceMaterial({
      accent: COLORS.gold, opacity: 0.78, gridDensity: 16, side: THREE.DoubleSide,
    }));
    group.add(surfaceMesh);

    gridMesh = surfaceGrid(point, 72, COLORS.cyan, 0.12, 6);
    group.add(gridMesh);

    tiles = makeTileMesh(surface, n, (p) => colorFor(density(p)), { size: 0.82, opacity: 0.24, lift: 0.01 });
    group.add(tiles);

    const list = [];
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 7; j++) {
        const u = (i + 0.5) / 7, v = (j + 0.5) / 7;
        const p = point(u, v);
        const nn = normal(u, v);
        const s = flipped ? -1 : 1;
        list.push({
          pos: p,
          dir: [nn[0] * s, nn[1] * s, nn[2] * s],
          scale: 0.42,
          width: 0.85,
          color: flipped ? '#ff8a4c' : '#ffb454',
        });
      }
    }
    setArrowField(normals, list);
    updateScanLine();
  }

  function updateScanLine() {
    const pts = [];
    const u = Math.max(0.001, Math.min(0.999, scan));
    for (let i = 0; i <= 80; i++) {
      const p = point(u, i / 80);
      pts.push(new THREE.Vector3(p[0], p[1] + 0.035, p[2]));
    }
    scanLine.geometry.dispose();
    scanLine.geometry = new THREE.BufferGeometry().setFromPoints(pts);
    const mid = point(u, 0.5);
    scanGlow.position.set(mid[0], mid[1] + 0.12, mid[2]);
  }

  function computeValues() {
    return integrateSurface(surface, (p) => density(p), 90);
  }
  let totalMass = 0;
  let totalArea = 0;
  function refreshNumbers() {
    totalMass = computeValues();
    totalArea = integrateSurface(surface, () => 1, 90);
    ui.setReadout('mass', formatNumber(totalMass, 3));
    ui.setReadout('area', formatNumber(totalArea, 2));
    ui.setReadout('pieces', `${n * n}`);
    ui.setReadout('sweep', formatNumber(totalMass, 3));
  }

  function partialMass() {
    let sum = 0;
    const N = 60;
    const du = 1 / N, dv = 1 / 50;
    for (let i = 0; i < N; i++) {
      const u = (i + 0.5) * du;
      if (u > scan) break;
      for (let j = 0; j < 50; j++) {
        const v = (j + 0.5) * dv;
        const p = point(u, v);
        sum += density(p) * surface.dS(u, v, du, dv);
      }
    }
    return sum;
  }

  ui.setLegend(meta.legend);
  ui.setReadouts([
    { id: 'mass', label: '曲面“质量”', value: '0', color: '#ffb454', note: '∬ f dS 数值近似' },
    { id: 'area', label: '曲面总面积', value: '0', color: '#38e8ff', note: '∬ dS' },
    { id: 'pieces', label: '采样小片', value: '100', color: '#5ff2b6', note: 'n × n' },
    { id: 'sweep', label: '已扫过质量', value: '0', color: '#9a7bff', note: '扫描条左侧累加' },
  ]);
  ui.setControls([
    {
      type: 'range', label: '采样密度 n', min: 4, max: 20, step: 1, value: n,
      format: (v) => `${v} × ${v}`,
      onInput: (v) => { n = v; rebuild(); refreshNumbers(); },
    },
    {
      type: 'range', label: '曲面起伏', min: 0, max: 1.2, step: 0.01, value: amp,
      format: (v) => v.toFixed(2),
      onInput: (v) => { amp = v; rebuild(); refreshNumbers(); },
    },
    {
      type: 'segmented', label: '密度花纹', value: '斑驳',
      options: ['斑驳', '条纹'],
      onChange: (v) => { pattern = v; rebuild(); refreshNumbers(); },
    },
    {
      type: 'toggles',
      items: [
        { label: '翻转法向（面积不变）', value: false, onChange: (v) => { flipped = v; rebuild(); } },
      ],
    },
    {
      type: 'button', label: '播放刷漆扫描', labelPlaying: '扫描中…',
      onClick: () => { scan = 0; scanning = true; updateScanLine(); },
    },
  ]);

  rebuild();
  refreshNumbers();

  let acc = 0;
  return {
    group,
    camera: { pos: [6.4, 5.4, 7.1], target: [0, 0.05, 0], fov: 42 },
    update(dt, time) {
      surfaceMesh.material.uniforms.uTime.value = time;
      if (scanning) {
        scan += dt * 0.22;
        if (scan >= 1) { scan = 1; scanning = false; }
        updateScanLine();
      }
      tiles.material.opacity = 0.19 + Math.sin(time * 1.4) * 0.035;
      if (scanning) {
        scanGlow.material.opacity = 0.8;
        scanGlow.scale.setScalar(0.9 + Math.sin(time * 6) * 0.05);
      }
      acc += dt;
      if (acc > 0.1) {
        acc = 0;
        ui.setReadout('sweep', formatNumber(partialMass(), 3));
      }
    },
    annotations() {
      const p = point(0.7, 0.32);
      const p2 = point(0.3, 0.7);
      const nn = normal(0.7, 0.32);
      return [
        { id: 'ds', anchor: p, text: 'dS 一小片面积', sub: '把曲面切成小片', color: '#38e8ff', dx: 20, dy: -24 },
        { id: 'f', anchor: p2, text: 'f 面密度', sub: '冷色轻，暖色重', color: '#ffb454', dx: -18, dy: 24 },
        { id: 'n', anchor: new THREE.Vector3(p[0] + nn[0] * 0.5, p[1] + nn[1] * 0.5, p[2] + nn[2] * 0.5), text: flipped ? '法向已翻转' : '法向 n', sub: '翻面不改变结果', color: flipped ? '#ff8a4c' : '#5ff2b6', dx: 22, dy: 18 },
      ];
    },
  };
}
