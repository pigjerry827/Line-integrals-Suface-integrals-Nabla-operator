import { TAU } from './utils.js';

export function integrateCurveScalar(pointAt, density, n = 800, t0 = 0, t1 = 1) {
  let total = 0;
  const dt = (t1 - t0) / n;
  for (let i = 0; i < n; i++) {
    const t = t0 + (i + 0.5) * dt;
    const p = pointAt(t);
    const q = pointAt(t + dt * 0.5);
    const r = pointAt(t - dt * 0.5);
    const dx = q[0] - r[0], dy = q[1] - r[1], dz = q[2] - r[2];
    const speed = Math.hypot(dx, dy, dz) / dt;
    total += density(p, t) * speed * dt;
  }
  return total;
}

export function integrateCurveVector(pointAt, field, n = 900, t0 = 0, t1 = 1) {
  let total = 0;
  const dt = (t1 - t0) / n;
  for (let i = 0; i < n; i++) {
    const t = t0 + (i + 0.5) * dt;
    const p = pointAt(t);
    const q = pointAt(Math.min(t1, t + dt * 0.5));
    const r = pointAt(Math.max(t0, t - dt * 0.5));
    const v = field(p);
    total += (v[0] * (q[0] - r[0]) + v[1] * (q[1] - r[1]) + v[2] * (q[2] - r[2])) / dt * dt;
  }
  return total;
}

export function surfaceData(surface, n) {
  const grid = [];
  const du = 1 / n, dv = 1 / n;
  for (let i = 0; i <= n; i++) {
    const row = [];
    for (let j = 0; j <= n; j++) {
      const u = i * du, v = j * dv;
      row.push({
        p: surface.point(u, v),
        n: surface.normal(u, v),
        dS: surface.dS(u, v, du, dv),
        u, v,
      });
    }
    grid.push(row);
  }
  return grid;
}

export function integrateSurface(surface, density, n = 80) {
  let total = 0;
  const du = 1 / n, dv = 1 / n;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const u = (i + 0.5) * du, v = (j + 0.5) * dv;
      const p = surface.point(u, v);
      total += density(p, u, v) * surface.dS(u, v, du, dv);
    }
  }
  return total;
}

export function integrateFlux(surface, field, n = 80, flip = 1) {
  let total = 0;
  const du = 1 / n, dv = 1 / n;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const u = (i + 0.5) * du, v = (j + 0.5) * dv;
      const p = surface.point(u, v);
      const nn = surface.normal(u, v);
      const f = field(p, u, v);
      total += (f[0] * nn[0] + f[1] * nn[1] + f[2] * nn[2]) * surface.dS(u, v, du, dv) * flip;
    }
  }
  return total;
}

export function matrixFromArray(a) {
  return [a[0], a[1], a[2]];
}

export function pointInCircle(x, z, R) {
  return x * x + z * z <= R * R;
}

export function greenCirculation(R, field2, n = 2000) {
  let total = 0;
  const dth = TAU / n;
  for (let i = 0; i < n; i++) {
    const th = (i + 0.5) * dth;
    const x = R * Math.cos(th), z = R * Math.sin(th);
    const f = field2(x, z);
    total += (f[0] * (-R * Math.sin(th)) + f[1] * (R * Math.cos(th))) * dth;
  }
  return total;
}

export function greenAreaIntegral(R, curlScalar, n = 160) {
  let total = 0;
  const d = (2 * R) / n;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const x = -R + (i + 0.5) * d;
      const z = -R + (j + 0.5) * d;
      if (x * x + z * z <= R * R) total += curlScalar(x, z) * d * d;
    }
  }
  return total;
}

export function gaussSurfaceFlux(k, R, field, n = 80) {
  let total = 0;
  const dth = TAU / n, dph = Math.PI / n;
  for (let i = 0; i < n; i++) {
    const th = (i + 0.5) * dth;
    for (let j = 0; j < n; j++) {
      const ph = (j + 0.5) * dph;
      const st = Math.sin(ph), ct = Math.cos(ph);
      const nx = st * Math.cos(th), ny = ct, nz = st * Math.sin(th);
      const p = [R * nx, R * ny, R * nz];
      const f = field(p);
      total += (f[0] * nx + f[1] * ny + f[2] * nz) * R * R * st * dth * dph;
    }
  }
  return total;
}
