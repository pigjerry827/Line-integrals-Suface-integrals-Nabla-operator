import * as THREE from 'three';
import {
  COLORS, makeArrow, setArrow, makeArrowField, setArrowField, makeGridPlane,
  tubeFromCurve, glowSprite, radialTexture, lineFromPoints,
} from '../core/sceneKit.js';
import { integrateCurveVector } from '../core/math.js';
import { formatNumber, signed } from '../core/utils.js';

export function createLineVector(ctx) {
  const { ui, meta } = ctx;
  const group = new THREE.Group();
  const tex = radialTexture();

  let strength = 1;
  let fieldAngle = 0;
  let pathType = 'wave';
  let reverse = false;
  let showDecomp = true;
  let progress = 0.12;

  const pointAt = (t) => {
    if (pathType === 'wave') {
      return [-3.5 + 7 * t, 0.1 * Math.sin(Math.PI * t), 1.32 * Math.sin(2 * Math.PI * t)];
    }
    return [-3.5 + 7 * t, 0.22 + 0.36 * Math.sin(Math.PI * t), 1.75 * Math.sin(Math.PI * t)];
  };
  const vecAt = (t) => new THREE.Vector3(...pointAt(t));

  const baseField = (p) => {
    const [x, , z] = p;
    return [
      0.62 * Math.sin(0.72 * z + 0.35) + 0.28,
      0.02,
      0.82 * Math.cos(0.55 * x - 0.4) + 0.18,
    ];
  };
  const field = (p) => {
    const f = baseField(p);
    const c = Math.cos(fieldAngle), s = Math.sin(fieldAngle);
    const fx = f[0] * c - f[2] * s;
    const fz = f[0] * s + f[2] * c;
    return [fx * strength, 0.02 * strength, fz * strength];
  };

  const grid = makeGridPlane(8.8, 20, 0x2e7d9a, 0.17);
  group.add(grid);
  const halo = lineFromPoints([
    new THREE.Vector3(-4.3, 0.005, -2.35), new THREE.Vector3(4.3, 0.005, -2.35),
  ], COLORS.cyan, 0.1);
  group.add(halo);

  const arrows = makeArrowField(220);
  group.add(arrows);

  let pathMesh = null;
  let pathCurve = null;
  function rebuildPath() {
    if (pathMesh) {
      group.remove(pathMesh);
      pathMesh.geometry.dispose();
      pathMesh.material.dispose();
    }
    const pts = [];
    for (let i = 0; i <= 180; i++) pts.push(vecAt(i / 180));
    pathCurve = new THREE.CatmullRomCurve3(pts);
    pathMesh = tubeFromCurve(pathCurve, 0.045, COLORS.gold, { segments: 380, radial: 7, opacity: 0.92 });
    group.add(pathMesh);
  }
  rebuildPath();

  const fieldArrows = [
    makeArrow(new THREE.Vector3(), new THREE.Vector3(0, 1, 0), COLORS.cyan, { head: 0.16, headWidth: 0.09 }),
    makeArrow(new THREE.Vector3(), new THREE.Vector3(0, 1, 0), COLORS.gold, { head: 0.16, headWidth: 0.09 }),
    makeArrow(new THREE.Vector3(), new THREE.Vector3(0, 1, 0), COLORS.mint, { head: 0.13, headWidth: 0.075 }),
    makeArrow(new THREE.Vector3(), new THREE.Vector3(0, 1, 0), COLORS.pink, { head: 0.13, headWidth: 0.075 }),
  ];
  const arrowGroup = new THREE.Group();
  fieldArrows.forEach((a) => arrowGroup.add(a));
  group.add(arrowGroup);

  const probe = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 10),
    new THREE.MeshBasicMaterial({ color: 0xdffbff, toneMapped: false }));
  const probeGlow = glowSprite(tex, COLORS.cyan, 0.7, 0.3);
  group.add(probe, probeGlow);

  const pathStart = makeArrow(new THREE.Vector3(), new THREE.Vector3(0, 1, 0), COLORS.mint, { head: 0.17, headWidth: 0.09 });
  const pathEnd = makeArrow(new THREE.Vector3(), new THREE.Vector3(0, 1, 0), COLORS.pink, { head: 0.17, headWidth: 0.09 });
  group.add(pathStart, pathEnd);

  function updateStartEnd() {
    const a = vecAt(0), b = vecAt(1);
    const d0 = new THREE.Vector3().subVectors(vecAt(0.03), a).normalize().multiplyScalar(0.55);
    const d1 = new THREE.Vector3().subVectors(b, vecAt(0.97)).normalize().multiplyScalar(0.55);
    setArrow(pathStart, a, a.clone().add(reverse ? d0.clone().negate() : d0));
    setArrow(pathEnd, b, b.clone().add(reverse ? d1.clone().negate() : d1));
  }

  function rebuildArrows() {
    const list = [];
    for (let ix = 0; ix <= 14; ix++) {
      for (let iz = 0; iz <= 7; iz++) {
        const x = -4.05 + (8.1 * ix) / 14;
        const z = -2.3 + (4.6 * iz) / 7;
        const p = [x, 0.02, z];
        const f = field(p);
        const mag = Math.hypot(f[0], f[1], f[2]);
        if (mag < 0.015) continue;
        const len = 0.12 + 0.3 * Math.min(1.8, mag) / 1.8;
        list.push({
          pos: p,
          dir: [f[0], 0.02, f[2]],
          width: 0.8,
          scale: len,
          color: mag > 1.1 ? '#63d6ef' : '#24758e',
        });
      }
    }
    setArrowField(arrows, list);
  }

  function computerValues() {
    const W = integrateCurveVector((t) => pointAt(t), (p) => field(p), 900) * (reverse ? -1 : 1);
    let L = 0;
    const N = 500;
    for (let i = 0; i < N; i++) {
      const t = (i + 0.5) / N;
      const p = pointAt(t);
      const q = pointAt(t + 0.0005);
      L += Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]) / 0.0005 / N;
    }
    return { W, L };
  }

  let values = computerValues();

  function refreshAll() {
    rebuildPath();
    updateStartEnd();
    rebuildArrows();
    values = computerValues();
    ui.setReadout('work', signed(values.W, 2));
    ui.setReadout('force', formatNumber(Math.hypot(...field(pointAt(0.5))), 2));
    ui.setReadout('len', formatNumber(values.L, 2));
  }

  ui.setLegend(meta.legend);
  ui.setReadouts([
    { id: 'rate', label: '此刻 F · T', value: '+0.00', color: '#5ff2b6', note: '瞬时做功功率' },
    { id: 'work', label: '整段路径做功 W', value: signed(values.W, 2), color: '#ffb454', note: '反向则变号' },
    { id: 'force', label: '场强 |F|', value: '1.00', color: '#38e8ff', note: '滑杆可调' },
    { id: 'len', label: '路径长度', value: formatNumber(values.L, 2), color: '#9a7bff', note: '路径切换会改变' },
  ]);
  ui.setControls([
    {
      type: 'range', label: '场强 |F|', min: 0.25, max: 1.8, step: 0.01, value: strength,
      format: (v) => v.toFixed(2),
      onInput: (v) => { strength = v; refreshAll(); },
    },
    {
      type: 'range', label: '场的方向旋转', min: -180, max: 180, step: 1, value: 0,
      format: (v) => `${v}°`,
      onInput: (v) => { fieldAngle = (v * Math.PI) / 180; refreshAll(); },
    },
    {
      type: 'segmented', label: '选择路径', value: 'wave',
      options: [{ label: '波浪路', value: 'wave' }, { label: '大弧线', value: 'arc' }],
      onChange: (v) => { pathType = v; refreshAll(); updateStartEnd(); },
    },
    {
      type: 'toggles',
      items: [
        { label: '反向积分', value: false, onChange: (v) => { reverse = v; updateStartEnd(); values = computerValues(); ui.setReadout('work', signed(values.W, 2)); } },
        { label: '显示分解', value: true, onChange: (v) => { showDecomp = v; arrowGroup.visible = v; } },
      ],
    },
  ]);

  arrows.material.opacity = 0.55;
  rebuildArrows();
  updateStartEnd();

  let acc = 0;
  function applyProbe(t) {
    t = Math.max(0, Math.min(1, t));
    const p = vecAt(t);
    const eps = 0.002;
    const tangent = new THREE.Vector3().subVectors(vecAt(Math.min(1, t + eps)), vecAt(Math.max(0, t - eps))).normalize();
    const f = field(pointAt(t));
    const fv = new THREE.Vector3(f[0], f[1], f[2]);
    const proj = tangent.clone().multiplyScalar(fv.dot(tangent));
    const normal = fv.clone().sub(proj);
    const origin = p.clone().add(new THREE.Vector3(0, 0.06, 0));
    setArrow(fieldArrows[0], origin, origin.clone().add(fv.clone().multiplyScalar(0.9)));
    setArrow(fieldArrows[1], origin, origin.clone().add(tangent.clone().multiplyScalar(0.8)));
    setArrow(fieldArrows[2], origin, origin.clone().add(proj.clone().multiplyScalar(0.9)));
    setArrow(fieldArrows[3], origin, origin.clone().add(normal.clone().multiplyScalar(0.9)));
    fieldArrows[0].visible = true;
    fieldArrows[1].visible = true;
    fieldArrows[2].visible = showDecomp;
    fieldArrows[3].visible = showDecomp;
    probe.position.copy(p).add(new THREE.Vector3(0, 0.04, 0));
    probeGlow.position.copy(probe.position);
    return { p, fv, proj, normal, tangent, origin };
  }

  let probeData = applyProbe(progress);
  return {
    group,
    camera: { pos: [6.3, 5.8, 7.4], target: [0, 0, 0], fov: 43 },
    update(dt, time) {
      progress += dt * 0.075;
      if (progress > 1.12) progress = -0.06;
      const shown = Math.max(0, Math.min(1, progress));
      probeData = applyProbe(reverse ? 1 - shown : shown);
      fieldArrows[2].setColor(new THREE.Color(COLORS.mint));
      fieldArrows[3].setColor(new THREE.Color(COLORS.pink));
      acc += dt;
      if (acc > 0.1) {
        acc = 0;
        const rate = probeData.fv.dot(probeData.tangent);
        ui.setReadout('rate', signed(rate, 2));
        ui.setReadout('force', formatNumber(probeData.fv.length(), 2));
        ui.setReadout('work', signed(values.W, 2));
        ui.setReadout('len', formatNumber(values.L, 2));
      }
    },
    annotations() {
      const origin = probeData.origin;
      const endF = origin.clone().add(probeData.fv.clone().multiplyScalar(0.9));
      const endT = origin.clone().add(probeData.tangent.clone().multiplyScalar(0.8));
      return [
        { id: 'f', anchor: endF, text: 'F 力场', sub: '推着箱子走', color: '#38e8ff', dx: 34, dy: -38 },
        { id: 't', anchor: endT, text: 'T 前进方向', sub: '沿路的切向', color: '#ffb454', dx: 42, dy: 30 },
        { id: 'dot', anchor: origin, text: 'F · T 才有功', sub: '垂直分量不贡献', color: '#5ff2b6', dx: -34, dy: 34 },
      ];
    },
  };

}

