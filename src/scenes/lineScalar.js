import * as THREE from 'three';
import {
  COLORS, makeArrow, setArrow, makeParticles, glowSprite, radialTexture, basicMat,
} from '../core/sceneKit.js';
import { integrateCurveScalar } from '../core/math.js';
import { formatNumber } from '../core/utils.js';

function densityAt(t, contrast) {
  return Math.max(0.08, 0.55 + 0.46 * Math.sin(5.1 * Math.PI * t + 0.7) * contrast);
}

function rampColor(d) {
  const low = new THREE.Color(0x246c92);
  const mid = new THREE.Color(0xffb454);
  const high = new THREE.Color(0xff6a5f);
  const c = new THREE.Color();
  if (d < 0.55) c.copy(low).lerp(mid, Math.max(0, d / 0.55));
  else c.copy(mid).lerp(high, Math.min(1, (d - 0.55) / 0.55));
  return c;
}

export function createLineScalar(ctx) {
  const { ui, meta } = ctx;
  const group = new THREE.Group();
  const tex = radialTexture();

  const TURNS = 1.75;
  const pointAt = (t) => {
    const a = Math.PI * 2 * TURNS * t + 0.45;
    return [2.05 * Math.cos(a), -1.25 + 2.6 * t, 2.05 * Math.sin(a)];
  };
  const vecAt = (t) => new THREE.Vector3(...pointAt(t));
  const pts = [];
  for (let i = 0; i <= 320; i++) pts.push(vecAt(i / 320));
  const curve = new THREE.CatmullRomCurve3(pts);

  let contrast = 0.58;
  let n = 18;
  let reverse = false;
  let scan = 0.35;
  let scanning = false;

  const curveGroup = new THREE.Group();
  group.add(curveGroup);

  const tubeGeo = new THREE.TubeGeometry(curve, 480, 0.036, 8, false);
  const colors = new Float32Array(tubeGeo.attributes.position.count * 3);
  tubeGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const tubeMat = new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const tube = new THREE.Mesh(tubeGeo, tubeMat);
  curveGroup.add(tube);

  const glowMat = new THREE.MeshBasicMaterial({
    color: COLORS.gold,
    transparent: true,
    opacity: 0.055,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const glowGeo = new THREE.TubeGeometry(curve, 300, 0.095, 6, false);
  const glowTube = new THREE.Mesh(glowGeo, glowMat);
  curveGroup.add(glowTube);

  function paintCurve() {
    const uv = tubeGeo.attributes.uv;
    const colorAttr = tubeGeo.attributes.color;
    for (let i = 0; i < colorAttr.count; i++) {
      const t = uv.getX(i);
      const c = rampColor(densityAt(t, contrast));
      colorAttr.setXYZ(i, c.r, c.g, c.b);
    }
    colorAttr.needsUpdate = true;
  }
  paintCurve();

  const beadGeo = new THREE.SphereGeometry(0.048, 8, 6);
  const beadMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  let beads = new THREE.InstancedMesh(beadGeo, beadMat, n);
  beads.frustumCulled = false;
  curveGroup.add(beads);

  function rebuildBeads() {
    curveGroup.remove(beads);
    beads.material.dispose();
    beads = new THREE.InstancedMesh(beadGeo, beadMat.clone(), n);
    beads.frustumCulled = false;
    const dummy = new THREE.Object3D();
    const c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const t = i / Math.max(1, n - 1);
      const p = vecAt(t);
      dummy.position.copy(p);
      const s = 0.65 + 0.55 * densityAt(t, contrast);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      beads.setMatrixAt(i, dummy.matrix);
      c.copy(rampColor(densityAt(t, contrast))).lerp(new THREE.Color(0xffffff), 0.35);
      beads.setColorAt(i, c);
    }
    beads.instanceMatrix.needsUpdate = true;
    if (beads.instanceColor) beads.instanceColor.needsUpdate = true;
    curveGroup.add(beads);
  }
  rebuildBeads();

  const probe = new THREE.Mesh(new THREE.SphereGeometry(0.085, 14, 10), basicMat(0xffffff));
  const probeGlow = glowSprite(tex, COLORS.gold, 1.25, 0.8);
  const probeRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.17, 0.011, 5, 40),
    basicMat(COLORS.gold, { additive: true, transparent: true, opacity: 0.75, depthWrite: false })
  );
  curveGroup.add(probe, probeGlow, probeRing);

  const p0 = vecAt(0), p1 = vecAt(1);
  const t0dir = new THREE.Vector3().subVectors(vecAt(0.03), p0).normalize();
  const t1dir = new THREE.Vector3().subVectors(p1, vecAt(0.97)).normalize();
  const startA = makeArrow(p0, p0.clone().add(t0dir.clone().multiplyScalar(0.55)), COLORS.mint, { head: 0.18, headWidth: 0.1 });
  const endA = makeArrow(p1, p1.clone().add(t1dir.clone().multiplyScalar(0.55)), COLORS.pink, { head: 0.18, headWidth: 0.1 });
  curveGroup.add(startA, endA);

  const st = makeParticles(tex, 150, COLORS.gold, 0.05);
  const sp = st.userData.position;
  for (let i = 0; i < 150; i++) {
    const t = Math.random();
    const p = vecAt(t);
    sp[i * 3] = p.x + (Math.random() - 0.5) * 1.2;
    sp[i * 3 + 1] = p.y + (Math.random() - 0.5) * 1.2;
    sp[i * 3 + 2] = p.z + (Math.random() - 0.5) * 1.2;
  }
  st.geometry.attributes.position.needsUpdate = true;
  group.add(st);

  const refLength = integrateCurveScalar((t) => pointAt(t), () => 1, 2400);
  let refMass = 0;
  function computeRef() {
    refMass = integrateCurveScalar((t) => pointAt(t), (p, t) => densityAt(t, contrast), 2400);
  }
  computeRef();

  function updateValues() {
    const tEnd = reverse ? 1 - scan : scan;
    let partial = 0;
    if (!reverse) {
      if (scan > 0.0001) partial = integrateCurveScalar((t) => pointAt(t), (p, t) => densityAt(t, contrast), Math.max(60, Math.floor(1200 * scan)), 0, scan);
    } else if (scan > 0.0001) {
      partial = integrateCurveScalar((t) => pointAt(t), (p, t) => densityAt(t, contrast), Math.max(60, Math.floor(1200 * scan)), 1 - scan, 1);
    }
    return partial;
  }

  function setScan(v) {
    scan = Math.max(0, Math.min(1, v));
    const t = reverse ? 1 - scan : scan;
    const p = vecAt(t);
    probe.position.copy(p);
    probeGlow.position.copy(p);
    probeRing.position.copy(p);
    const tangent = new THREE.Vector3().subVectors(vecAt(Math.min(1, t + 0.006)), vecAt(Math.max(0, t - 0.006))).normalize();
    probeRing.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
  }
  setScan(scan);

  function toggleReverse(v) {
    reverse = v;
    const d0 = t0dir.clone().multiplyScalar(v ? -0.55 : 0.55);
    const d1 = t1dir.clone().multiplyScalar(v ? -0.55 : 0.55);
    setArrow(startA, p0, p0.clone().add(d0));
    setArrow(endA, p1, p1.clone().add(d1));
    setScan(scan);
  }

  ui.setLegend(meta.legend);
  ui.setReadouts([
    { id: 'mass', label: '已称质量 M(t)', value: '0', color: '#ffb454', note: '沿已走过的弧段累加' },
    { id: 'total', label: '整条铁丝质量', value: formatNumber(refMass, 3), color: '#5ff2b6', note: '反向不变' },
    { id: 'len', label: '曲线总弧长', value: formatNumber(refLength, 2), unit: 'L', color: '#38e8ff', note: '∫ ds' },
    { id: 'nseg', label: '采样段数 n', value: String(n), color: '#9a7bff', note: '滑杆可调' },
  ]);
  ui.setControls([
    {
      type: 'range', label: '采样段数 n', min: 6, max: 48, step: 2, value: n,
      format: (v) => `${v} 段`,
      onInput: (v) => { n = v; rebuildBeads(); ui.setReadout('nseg', v); },
    },
    {
      type: 'range', label: '密度对比度', min: 0, max: 1, step: 0.01, value: contrast,
      format: (v) => v.toFixed(2),
      onInput: (v) => {
        contrast = v;
        paintCurve();
        rebuildBeads();
        computeRef();
        ui.setReadout('total', formatNumber(refMass, 3));
      },
    },
    {
      type: 'toggles', label: '方向实验',
      items: [{ label: '反向走一遍', value: false, onChange: (v) => toggleReverse(v) }],
    },
    {
      type: 'button', label: '播放称重动画', labelPlaying: '称重中…',
      onClick: () => { scan = 0; scanning = true; setScan(0); },
    },
  ]);

  let acc = 0;
  return {
    group,
    camera: { pos: [6.2, 4.3, 7.2], target: [0, 0.15, 0], fov: 42 },
    update(dt, time) {
      if (scanning) {
        scan += dt * 0.175;
        if (scan >= 1) { scan = 1; scanning = false; }
        setScan(scan);
      } else {
        const t = reverse ? 1 - scan : scan;
        const p = vecAt(t);
        p.y += Math.sin(time * 2.2) * 0.018;
        probe.position.copy(p);
        probeGlow.position.copy(p);
        probeRing.position.copy(p);
        probeRing.rotateZ(dt * 0.8);
      }
      glowMat.opacity = 0.04 + Math.sin(time * 1.3) * 0.012;
      acc += dt;
      if (acc > 0.1) {
        acc = 0;
        const partial = updateValues();
        ui.setReadout('mass', formatNumber(partial, 3));
        ui.setReadout('total', formatNumber(refMass, 3));
        ui.setReadout('len', formatNumber(refLength, 2));
      }
    },
    annotations() {
      const t = reverse ? 1 - scan : scan;
      const p = vecAt(t);
      const mid = vecAt(0.62);
      return [
        { id: 'probe', anchor: p, text: 'f(P) · ds', sub: '这一小段的质量', color: '#ffb454', dx: 20, dy: -26 },
        { id: 'mid', anchor: mid, text: '密度沿曲线变化', sub: '颜色越暖，f 越大', color: '#ff8a4c', dx: 28, dy: 20 },
        { id: 'start', anchor: p0, text: reverse ? '终点 B' : '起点 A', sub: reverse ? '反向遍历' : '出发点', color: '#5ff2b6', dx: -18, dy: -20 },
        { id: 'end', anchor: p1, text: reverse ? '起点 A' : '终点 B', sub: reverse ? '出发点' : '方向可变', color: '#ff5c8a', dx: 18, dy: -20 },
      ];
    },
  };
}
