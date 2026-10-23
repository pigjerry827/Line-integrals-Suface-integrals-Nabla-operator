import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeRadialTexture } from './utils.js';

export const COLORS = {
  bg: 0x050810,
  cyan: 0x38e8ff,
  cyanSoft: 0x8ff5ff,
  violet: 0x9a7bff,
  pink: 0xff5c8a,
  gold: 0xffb454,
  mint: 0x5ff2b6,
  orange: 0xff8a4c,
  white: 0xe8f7ff,
};

export const V3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);

export function basicMat(color, opts = {}) {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: opts.transparent ?? false,
    opacity: opts.opacity ?? 1,
    side: opts.side ?? THREE.FrontSide,
    blending: opts.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    depthWrite: opts.depthWrite ?? true,
    toneMapped: opts.toneMapped ?? false,
    wireframe: opts.wireframe ?? false,
  });
}

export function lineMat(color, opacity = 0.6, additive = true) {
  return new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    toneMapped: false,
  });
}

export function makeAlphaLineMaterial(color = 0x9a7bff, opacity = 1) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: opacity },
    },
    vertexShader: `
      attribute float aAlpha;
      varying float vAlpha;
      void main() {
        vAlpha = aAlpha;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying float vAlpha;
      void main() {
        gl_FragColor = vec4(uColor, vAlpha * uOpacity);
      }`,
  });
}

export function lineFromPoints(points, color, opacity = 0.7, additive = true) {
  const geo = new THREE.BufferGeometry().setFromPoints(points.map(V3));
  const line = new THREE.Line(geo, lineMat(color, opacity, additive));
  return line;
}

export function tubeFromCurve(curve, radius, color, { segments = 320, radial = 8, opacity = 1, additive = true } = {}) {
  const geo = new THREE.TubeGeometry(curve, segments, radius, radial, false);
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: opacity < 1,
    opacity,
    depthWrite: opacity >= 1,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    toneMapped: false,
  });
  return new THREE.Mesh(geo, mat);
}

export function glowSprite(tex, color, scale = 1, opacity = 0.8) {
  const mat = new THREE.SpriteMaterial({
    map: tex,
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const s = new THREE.Sprite(mat);
  s.scale.setScalar(scale);
  return s;
}

export function makeDotSprite(tex, color, scale = 1) {
  const s = glowSprite(tex, color, scale, 1);
  return s;
}

export function makeArrow(from, to, color, { head = 0.24, headWidth = 0.12 } = {}) {
  const dir = new THREE.Vector3().subVectors(to, from);
  const len = Math.max(0.001, dir.length());
  const arrow = new THREE.ArrowHelper(dir.clone().normalize(), from, len, color, head, headWidth);
  arrow.line.material.transparent = true;
  arrow.line.material.opacity = 0.85;
  arrow.line.material.depthWrite = false;
  arrow.line.material.toneMapped = false;
  arrow.cone.material.toneMapped = false;
  return arrow;
}

export function setArrow(arrow, from, to) {
  const dir = new THREE.Vector3().subVectors(to, from);
  const len = Math.max(0.001, dir.length());
  arrow.position.copy(from);
  arrow.setDirection(dir.normalize());
  arrow.setLength(len, Math.min(0.28, len * 0.24), Math.min(0.13, len * 0.11));
}

let arrowGeoCache = null;
export function arrowGeometry() {
  if (arrowGeoCache) return arrowGeoCache;
  const shaft = new THREE.CylinderGeometry(0.016, 0.016, 0.7, 5, 1);
  shaft.translate(0, 0.35, 0);
  const head = new THREE.ConeGeometry(0.068, 0.3, 7, 1);
  head.translate(0, 0.85, 0);
  arrowGeoCache = mergeGeometries([shaft, head]);
  return arrowGeoCache;
}

export function makeArrowField(max = 200) {
  const geo = arrowGeometry().clone();
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, max);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  mesh.count = 0;
  mesh.userData.dummy = new THREE.Object3D();
  mesh.userData.up = new THREE.Vector3(0, 1, 0);
  mesh.userData.max = max;
  return mesh;
}

export function setArrowField(mesh, arrows) {
  const dummy = mesh.userData.dummy;
  const up = mesh.userData.up;
  const dir = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const c = new THREE.Color();
  const count = Math.min(arrows.length, mesh.userData.max);
  for (let i = 0; i < count; i++) {
    const a = arrows[i];
    dummy.position.set(a.pos[0], a.pos[1], a.pos[2]);
    dir.set(a.dir[0], a.dir[1], a.dir[2]);
    const len = dir.length() || 1;
    dir.divideScalar(len);
    q.setFromUnitVectors(up, dir);
    dummy.quaternion.copy(q);
    const w = a.width ?? 1;
    dummy.scale.set(w, len * (a.scale ?? 1), w);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    c.set(a.color ?? '#38e8ff');
    mesh.setColorAt(i, c);
  }
  mesh.count = count;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}

export function buildParamGeometry(fn, res = 64, colorFn = null, { uvScale = [1, 1] } = {}) {
  const positions = [];
  const uvs = [];
  const colors = [];
  const indices = [];
  const c = new THREE.Color();
  for (let i = 0; i <= res; i++) {
    const u = i / res;
    for (let j = 0; j <= res; j++) {
      const v = j / res;
      const p = fn(u, v);
      positions.push(p[0], p[1], p[2]);
      uvs.push(u * uvScale[0], v * uvScale[1]);
      if (colorFn) {
        const col = colorFn(p, u, v);
        c.set(col);
        colors.push(c.r, c.g, c.b);
      }
    }
  }
  for (let i = 0; i < res; i++) {
    for (let j = 0; j < res; j++) {
      const a = i * (res + 1) + j;
      const b = a + res + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  if (colors.length) geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export function surfaceMaterial({
  accent = COLORS.cyan,
  opacity = 0.82,
  grid = true,
  gridDensity = 18,
  transparent = true,
  depthWrite = false,
  side = THREE.DoubleSide,
} = {}) {
  return new THREE.ShaderMaterial({
    transparent,
    depthWrite,
    side,
    uniforms: {
      uAccent: { value: new THREE.Color(accent) },
      uOpacity: { value: opacity },
      uTime: { value: 0 },
      uGrid: { value: grid ? 1 : 0 },
      uGridDensity: { value: gridDensity },
    },
    vertexShader: `
      varying vec3 vColor;
      varying vec3 vNormalW;
      varying vec3 vViewDir;
      varying vec2 vUv;
      void main() {
        vColor = color;
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vNormalW = normalize(mat3(modelMatrix) * normal);
        vViewDir = normalize(cameraPosition - wp.xyz);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: `
      uniform vec3 uAccent;
      uniform float uOpacity;
      uniform float uTime;
      uniform float uGrid;
      uniform float uGridDensity;
      varying vec3 vColor;
      varying vec3 vNormalW;
      varying vec3 vViewDir;
      varying vec2 vUv;
      void main() {
        vec3 N = normalize(vNormalW);
        float diff = clamp(dot(N, normalize(vec3(0.35, 0.82, 0.46))), 0.0, 1.0);
        float back = clamp(dot(N, normalize(vec3(-0.4, -0.3, -0.6))), 0.0, 1.0);
        float fres = pow(1.0 - abs(dot(N, normalize(vViewDir))), 2.1);
        vec2 gv = vUv * uGridDensity;
        vec2 g = abs(fract(gv) - 0.5);
        float grid = 1.0 - smoothstep(0.46, 0.5, max(g.x, g.y));
        float pulse = 0.5 + 0.5 * sin(uTime * 0.7 + vUv.x * 4.0 - vUv.y * 3.0);
        vec3 col = vColor * (0.42 + 0.62 * diff + 0.12 * back);
        col += uAccent * fres * 0.32;
        col += vColor * grid * 0.1 * uGrid;
        col += uAccent * pulse * 0.018;
        float alpha = uOpacity * (0.62 + 0.38 * fres);
        gl_FragColor = vec4(col, alpha);
      }`,
    vertexColors: true,
  });
}

export function surfaceGrid(fn, res, color = COLORS.cyan, opacity = 0.16, step = 4) {
  const points = [];
  for (let i = 0; i <= res; i += step) {
    for (let j = 0; j < res; j += step) {
      const u0 = i / res, v0 = j / res, v1 = Math.min(1, (j + step) / res);
      points.push(V3(fn(u0, v0)), V3(fn(u0, v1)));
    }
  }
  for (let j = 0; j <= res; j += step) {
    for (let i = 0; i < res; i += step) {
      const u0 = i / res, v0 = j / res, u1 = Math.min(1, (i + step) / res);
      points.push(V3(fn(u0, v0)), V3(fn(u1, v0)));
    }
  }
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  return new THREE.LineSegments(geo, lineMat(color, opacity, true));
}

export function makeTileMesh(surface, n, colorFn, { size = 0.84, opacity = 0.26, lift = 0.014, normalFlip = 1 } = {}) {
  const geo = new THREE.PlaneGeometry(1, 1);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, n * n);
  mesh.frustumCulled = false;
  const dummy = new THREE.Object3D();
  const up = new THREE.Vector3(0, 0, 1);
  const nrm = new THREE.Vector3();
  const c = new THREE.Color();
  let idx = 0;
  const du = 1 / n;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const u = (i + 0.5) * du, v = (j + 0.5) * du;
      const p = surface.point(u, v);
      const nn = surface.normal(u, v);
      nrm.set(nn[0], nn[1], nn[2]).normalize().multiplyScalar(normalFlip);
      dummy.position.set(p[0] + nrm.x * lift, p[1] + nrm.y * lift, p[2] + nrm.z * lift);
      dummy.quaternion.setFromUnitVectors(up, nrm);
      const su = surface.tangentU ? surface.tangentU(u, v) : [1, 0, 0];
      const sv = surface.tangentV ? surface.tangentV(u, v) : [0, 0, 1];
      const w = (Math.hypot(...su) * du * size) || 0.1;
      const h = (Math.hypot(...sv) * du * size) || 0.1;
      dummy.scale.set(w, h, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(idx, dummy.matrix);
      c.set(colorFn(p, u, v, nn));
      mesh.setColorAt(idx, c);
      idx++;
    }
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return mesh;
}

export function makeParticles(tex, count, color, size = 0.08) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const c = new THREE.Color(color);
  for (let i = 0; i < count; i++) {
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({
    size,
    map: tex,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
    toneMapped: false,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.userData.count = count;
  points.userData.position = pos;
  points.userData.color = col;
  return points;
}

export function makeGridPlane(size = 9, divisions = 24, color = 0x2e7d9a, opacity = 0.18) {
  const pts = [];
  const half = size / 2;
  for (let i = 0; i <= divisions; i++) {
    const x = -half + (size * i) / divisions;
    pts.push(new THREE.Vector3(x, 0, -half), new THREE.Vector3(x, 0, half));
    pts.push(new THREE.Vector3(-half, 0, x), new THREE.Vector3(half, 0, x));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const lines = new THREE.LineSegments(geo, lineMat(color, opacity, true));
  return lines;
}

export function makeRing(radius, color = COLORS.cyan, tube = 0.018, opacity = 0.9) {
  const geo = new THREE.TorusGeometry(radius, tube, 6, 220);
  geo.rotateX(Math.PI / 2);
  return new THREE.Mesh(geo, basicMat(color, { additive: true, transparent: true, opacity, depthWrite: false }));
}

export function makeLoopCurve(radius, y = 0, segments = 240) {
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    pts.push(new THREE.Vector3(radius * Math.cos(t), y, -radius * Math.sin(t)));
  }
  return new THREE.CatmullRomCurve3(pts, true);
}

export function makeAxes(length = 1.2) {
  const g = new THREE.Group();
  const axes = [
    [[length, 0, 0], 0xff5c8a],
    [[0, length, 0], 0x5ff2b6],
    [[0, 0, length], 0x38e8ff],
  ];
  for (const [v, c] of axes) {
    const a = makeArrow(new THREE.Vector3(0, 0, 0), V3(v), c, { head: 0.08, headWidth: 0.04 });
    g.add(a);
  }
  return g;
}

export function makeCardSprite(THREE_NS, { title, lines = [], accent = '#38e8ff', width = 512, height = 320, scale = [2.2, 1.375] }) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, width, height);
  const r = 26;
  const x = 8, y = 8, w = width - 16, h = height - 16;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, 'rgba(11, 24, 39, 0.93)');
  bg.addColorStop(1, 'rgba(5, 12, 22, 0.9)');
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = accent + '88';
  ctx.stroke();
  ctx.strokeStyle = accent + '22';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 26, y + 60);
  ctx.lineTo(x + w - 26, y + 60);
  ctx.stroke();
  ctx.fillStyle = accent;
  ctx.font = '600 24px "Noto Sans CJK SC", "PingFang SC", sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, 42, 38);
  ctx.fillStyle = 'rgba(220, 240, 255, 0.9)';
  let yy = 108;
  for (const line of lines) {
    ctx.font = line.font || '30px "Latin Modern Math", "Noto Serif CJK SC", serif';
    ctx.fillStyle = line.color || 'rgba(225, 243, 255, 0.92)';
    ctx.fillText(line.text, 42, yy);
    yy += line.gap || 58;
  }
  ctx.fillStyle = accent + '55';
  ctx.font = '16px "DejaVu Sans Mono", monospace';
  ctx.fillText('FIELD ATLAS', 42, height - 38);
  const tex = new THREE_NS.CanvasTexture(canvas);
  tex.colorSpace = THREE_NS.SRGBColorSpace;
  tex.anisotropy = 4;
  const mat = new THREE_NS.SpriteMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    toneMapped: false,
  });
  const sprite = new THREE_NS.Sprite(mat);
  sprite.scale.set(scale[0], scale[1], 1);
  return sprite;
}

export function makeGlyphSprite(THREE_NS, glyph, color = '#8ff5ff', size = 3) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 512, 512);
  ctx.font = '420px "Latin Modern Math", "Noto Serif CJK SC", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = color;
  ctx.shadowBlur = 42;
  ctx.fillStyle = color;
  ctx.fillText(glyph, 256, 280);
  ctx.shadowBlur = 8;
  ctx.fillStyle = '#eaffff';
  ctx.globalAlpha = 0.8;
  ctx.fillText(glyph, 256, 280);
  const tex = new THREE_NS.CanvasTexture(canvas);
  tex.colorSpace = THREE_NS.SRGBColorSpace;
  const mat = new THREE_NS.SpriteMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    blending: THREE_NS.AdditiveBlending,
    toneMapped: false,
  });
  const s = new THREE_NS.Sprite(mat);
  s.scale.setScalar(size);
  return s;
}

export function radialTexture() {
  return makeRadialTexture(THREE);
}
