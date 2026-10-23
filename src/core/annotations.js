import * as THREE from 'three';

const NS = 'http://www.w3.org/2000/svg';

export class AnnotationLayer {
  constructor(svg) {
    this.svg = svg;
    this.items = new Map();
    this.width = 1;
    this.height = 1;
    this.visible = true;
    this._v = new THREE.Vector3();
  }

  resize(w, h) {
    this.width = w;
    this.height = h;
    this.svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    this.svg.setAttribute('width', w);
    this.svg.setAttribute('height', h);
  }

  setVisible(v) {
    this.visible = v;
    this.svg.style.opacity = v ? '1' : '0';
  }

  clear() {
    this.items.clear();
    this.svg.replaceChildren();
  }

  sync(list = []) {
    const seen = new Set();
    for (const item of list) {
      seen.add(item.id);
      let rec = this.items.get(item.id);
      if (!rec) rec = this._create(item);
      rec.data = item;
      this._style(rec, item);
    }
    for (const [id, rec] of this.items) {
      if (!seen.has(id)) {
        rec.g.remove();
        this.items.delete(id);
      }
    }
  }

  _create(item) {
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'anno');
    const line = document.createElementNS(NS, 'polyline');
    line.setAttribute('class', 'anno-line');
    const dot = document.createElementNS(NS, 'circle');
    dot.setAttribute('r', '2.6');
    dot.setAttribute('class', 'anno-dot');
    const halo = document.createElementNS(NS, 'circle');
    halo.setAttribute('r', '7');
    halo.setAttribute('fill', 'none');
    halo.setAttribute('stroke-width', '0.7');
    halo.setAttribute('opacity', '0.45');
    const text = document.createElementNS(NS, 'text');
    text.setAttribute('class', 'anno-text');
    const sub = document.createElementNS(NS, 'text');
    sub.setAttribute('class', 'anno-sub');
    g.append(line, halo, dot, text, sub);
    this.svg.append(g);
    const rec = { g, line, dot, halo, text, sub, data: item };
    this.items.set(item.id, rec);
    return rec;
  }

  _style(rec, item) {
    const color = item.color || '#38e8ff';
    const key = `${item.text}|${item.sub || ''}|${color}|${item.textColor || ''}`;
    rec.data = item;
    if (rec.key === key) return;
    rec.key = key;
    rec.line.setAttribute('stroke', color);
    rec.dot.setAttribute('fill', color);
    rec.halo.setAttribute('stroke', color);
    rec.text.setAttribute('fill', item.textColor || color);
    rec.text.textContent = item.text || '';
    rec.sub.setAttribute('fill', item.textColor || color);
    rec.sub.textContent = item.sub || '';
    rec.dot.style.filter = `drop-shadow(0 0 4px ${color})`;
    rec.line.style.filter = `drop-shadow(0 0 2px ${color})`;
  }

  update(camera) {
    if (!this.visible) return;
    const w = this.width, h = this.height;
    const v = this._v;
    for (const rec of this.items.values()) {
      const item = rec.data;
      if (!item.anchor) continue;
      v.copy(item.anchor);
      v.project(camera);
      const inFront = v.z > -1 && v.z < 1;
      const px = (v.x * 0.5 + 0.5) * w;
      const py = (-v.y * 0.5 + 0.5) * h;
      const margin = 16;
      if (!inFront || px < -80 || px > w + 80 || py < -80 || py > h + 80) {
        rec.g.style.opacity = '0';
        continue;
      }
      rec.g.style.opacity = item.opacity == null ? '1' : String(item.opacity);
      const dx = item.dx ?? 22;
      const dy = item.dy ?? -20;
      let tx = px + dx;
      let ty = py + dy;
      const align = dx >= 0 ? 'start' : 'end';
      rec.text.setAttribute('text-anchor', align);
      rec.sub.setAttribute('text-anchor', align);
      tx = Math.max(margin, Math.min(w - margin, tx));
      ty = Math.max(margin + 8, Math.min(h - margin, ty));
      const elbow = tx + (dx >= 0 ? -10 : 10);
      rec.line.setAttribute('points', `${px.toFixed(1)},${py.toFixed(1)} ${elbow.toFixed(1)},${ty.toFixed(1)} ${tx.toFixed(1)},${ty.toFixed(1)}`);
      rec.dot.setAttribute('cx', px.toFixed(1));
      rec.dot.setAttribute('cy', py.toFixed(1));
      rec.halo.setAttribute('cx', px.toFixed(1));
      rec.halo.setAttribute('cy', py.toFixed(1));
      rec.text.setAttribute('x', tx.toFixed(1));
      rec.text.setAttribute('y', ty.toFixed(1));
      rec.sub.setAttribute('x', tx.toFixed(1));
      rec.sub.setAttribute('y', (ty + 12).toFixed(1));
    }
  }
}
