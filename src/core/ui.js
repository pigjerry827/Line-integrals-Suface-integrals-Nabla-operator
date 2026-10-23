import katex from 'katex';

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));

export class UI {
  constructor({ onChapter, onAction, onStart, onIntroTour, onJump }) {
    this.onChapter = onChapter;
    this.onAction = onAction;
    this.onStart = onStart;
    this.onIntroTour = onIntroTour;
    this.onJump = onJump;
    this.meta = null;
    this.rigor = false;
    this.readoutEls = new Map();
    this.controls = [];
    this.toastTimer = null;

    this.el = {
      app: $('#app'),
      panel: $('#panel'),
      panelScroll: $('#panel-scroll'),
      num: $('#chapter-num'),
      kicker: $('#chapter-kicker'),
      title: $('#chapter-title'),
      subtitle: $('#chapter-subtitle'),
      human: $('#human-text'),
      rigor: $('#rigor-toggle'),
      formula: $('#formula'),
      formulaNote: $('#formula-note'),
      physics: $('#physics-text'),
      trap: $('#trap-text'),
      readoutCard: $('#readout-card'),
      readouts: $('#readouts'),
      controlsCard: $('#controls-card'),
      controls: $('#controls'),
      extraCard: $('#extra-card'),
      legend: $('#legend'),
      strip: $('#chapterstrip'),
      status: $('#stage-status'),
      intro: $('#intro'),
      loader: $('#loader'),
      modal: $('#modal'),
      tooltip: $('#tooltip'),
      stage: $('#stage'),
      fallback: $('#fallback'),
      autoTour: $('#auto-tour'),
      symbolHelp: $('#symbol-help'),
      startBtn: $('#start-btn'),
      introTour: $('#intro-tour'),
    };

    this._bind();
  }

  _bind() {
    this.el.rigor.addEventListener('click', () => this.setRigor(!this.rigor));
    this.el.startBtn.addEventListener('click', () => this.onStart?.());
    this.el.introTour.addEventListener('click', () => this.onIntroTour?.());
    this.el.autoTour.addEventListener('click', () => this.onAction?.('tour'));
    this.el.symbolHelp.addEventListener('click', () => this.openModal('symbols'));

    $$('#panel [data-action]').forEach((b) => {
      b.addEventListener('click', () => this.onAction?.(b.dataset.action));
    });
    $$('.stage-actions [data-action]').forEach((b) => {
      b.addEventListener('click', () => this.onAction?.(b.dataset.action));
    });

    $$('[data-close-modal]').forEach((b) => b.addEventListener('click', () => this.closeModal()));
    $$('.modal-tab').forEach((b) => {
      b.addEventListener('click', () => this.switchModalTab(b.dataset.tab));
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.el.modal.classList.contains('is-open')) this.closeModal();
    });
    this.el.extraCard.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-jump]');
      if (btn) this.onJump?.(btn.dataset.jump);
    });
  }

  buildStrip(chapters) {
    this.el.strip.replaceChildren();
    chapters.forEach((c, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.index = String(i);
      b.title = `${c.num} ${c.title}`;
      b.setAttribute('role', 'tab');
      b.innerHTML = `<span class="cs-num">${c.num}</span><span class="cs-name">${c.short}</span>`;
      b.addEventListener('click', () => this.onChapter?.(i));
      this.el.strip.append(b);
    });
  }

  setActiveChapter(index) {
    $$('.chapterstrip button').forEach((b, i) => {
      const active = i === index;
      b.classList.toggle('is-active', active);
      b.setAttribute('aria-selected', active ? 'true' : 'false');
      if (active) {
        b.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
      }
    });
  }

  setChapter(meta) {
    this.meta = meta;
    this.el.num.textContent = meta.num;
    this.el.kicker.textContent = meta.kicker;
    this.el.title.textContent = meta.title;
    this.el.subtitle.textContent = meta.subtitle;
    this.el.human.innerHTML = meta.human;
    this.el.physics.textContent = meta.physics;
    this.el.trap.textContent = meta.trap;
    this.setRigor(false, true);
    this.renderFormula(meta.formula, meta.formulaNote);
    if (meta.extra) {
      this.el.extraCard.innerHTML = meta.extra;
      this.el.extraCard.hidden = false;
    } else {
      this.el.extraCard.innerHTML = '';
      this.el.extraCard.hidden = true;
    }
    if (meta.stage) this.setStatus(meta.stage);
    this.el.panelScroll.scrollTop = 0;
    this.el.panel.classList.remove('chapter-in');
    void this.el.panel.offsetWidth;
    this.el.panel.classList.add('chapter-in');
  }

  setRigor(v, force = false) {
    if (v === this.rigor && !force) return;
    this.rigor = v;
    if (!this.meta) return;
    this.el.human.innerHTML = v ? this.meta.rigorous : this.meta.human;
    this.el.rigor.setAttribute('aria-pressed', v ? 'true' : 'false');
    this.el.rigor.textContent = v ? '人话版' : '严谨版';
  }

  renderFormula(latex, note) {
    try {
      this.el.formula.innerHTML = katex.renderToString(latex, {
        displayMode: true,
        throwOnError: false,
        strict: false,
        trust: true,
      });
    } catch (e) {
      this.el.formula.textContent = latex;
    }
    this.el.formulaNote.innerHTML = note || '';
  }

  setStatus(text) {
    this.el.status.textContent = text;
  }

  setLegend(items = []) {
    this.el.legend.replaceChildren();
    for (const it of items) {
      const el = document.createElement('span');
      el.className = 'legend-item';
      el.style.setProperty('--lc', it.color);
      el.innerHTML = `<i class="legend-swatch ${it.type || 'line'}"></i><span>${it.label}</span>`;
      this.el.legend.append(el);
    }
  }

  setReadouts(list = []) {
    this.el.readouts.replaceChildren();
    this.readoutEls.clear();
    if (!list.length) {
      this.el.readoutCard.hidden = true;
      return;
    }
    this.el.readoutCard.hidden = false;
    for (const r of list) {
      const el = document.createElement('div');
      el.className = 'readout';
      el.style.setProperty('--rc', r.color || '#38e8ff');
      el.innerHTML = `
        <span class="readout-label">${r.label}</span>
        <span class="readout-value"><span class="rv"></span><span class="unit">${r.unit || ''}</span></span>
        ${r.note ? `<span class="readout-note">${r.note}</span>` : ''}`;
      const rv = el.querySelector('.rv');
      if (r.value != null) rv.textContent = String(r.value);
      this.el.readouts.append(el);
      this.readoutEls.set(r.id, rv);
    }
  }

  setReadout(id, value) {
    const el = this.readoutEls.get(id);
    if (!el) return;
    const str = String(value);
    if (el.textContent !== str) el.textContent = str;
  }

  setControls(list = []) {
    this.controls = list;
    this.el.controls.replaceChildren();
    if (!list.length) {
      this.el.controlsCard.hidden = true;
      return;
    }
    this.el.controlsCard.hidden = false;
    for (const c of list) {
      if (c.type === 'range') this._range(c);
      else if (c.type === 'segmented') this._segmented(c);
      else if (c.type === 'toggles') this._toggles(c);
      else if (c.type === 'button') this._button(c);
    }
  }

  _range(c) {
    const wrap = document.createElement('div');
    wrap.className = 'control';
    const step = c.step ?? 1;
    const val = c.value ?? c.min;
    const head = document.createElement('div');
    head.className = 'control-head';
    head.innerHTML = `<span>${c.label}</span><span class="control-value"></span>`;
    const valueEl = head.querySelector('.control-value');
    const fmt = c.format || ((v) => String(v));
    const input = document.createElement('input');
    input.type = 'range';
    input.min = c.min;
    input.max = c.max;
    input.step = step;
    input.value = val;
    input.setAttribute('aria-label', c.label);
    const paint = () => {
      const p = ((Number(input.value) - c.min) / (c.max - c.min)) * 100;
      input.style.setProperty('--fill', `${p}%`);
      valueEl.textContent = fmt(Number(input.value));
    };
    paint();
    input.addEventListener('input', () => {
      paint();
      c.onInput?.(Number(input.value));
    });
    wrap.append(head, input);
    this.el.controls.append(wrap);
    c._set = (v) => {
      input.value = v;
      paint();
    };
  }

  _segmented(c) {
    const wrap = document.createElement('div');
    wrap.className = 'control';
    const head = document.createElement('div');
    head.className = 'control-head';
    head.innerHTML = `<span>${c.label || ''}</span><span class="control-value">${c.hint || ''}</span>`;
    const seg = document.createElement('div');
    seg.className = 'segmented';
    const opts = c.options.map((o) => (typeof o === 'string' ? { label: o, value: o } : o));
    let current = c.value;
    const buttons = opts.map((o) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = o.label;
      b.classList.toggle('is-active', o.value === current);
      b.addEventListener('click', () => {
        if (current === o.value) return;
        current = o.value;
        buttons.forEach((bb, ii) => bb.classList.toggle('is-active', opts[ii].value === current));
        c.onChange?.(current);
      });
      seg.append(b);
      return b;
    });
    if (c.label) wrap.append(head);
    wrap.append(seg);
    this.el.controls.append(wrap);
    c._set = (v) => {
      current = v;
      buttons.forEach((bb, ii) => bb.classList.toggle('is-active', opts[ii].value === current));
    };
  }

  _toggles(c) {
    const wrap = document.createElement('div');
    wrap.className = 'control';
    if (c.label) {
      const head = document.createElement('div');
      head.className = 'control-head';
      head.innerHTML = `<span>${c.label}</span>`;
      wrap.append(head);
    }
    const row = document.createElement('div');
    row.className = 'toggle-row';
    const items = c.items.map((it) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'pill-toggle';
      b.classList.toggle('is-active', !!it.value);
      b.textContent = it.label;
      b.addEventListener('click', () => {
        const nv = !b.classList.contains('is-active');
        b.classList.toggle('is-active', nv);
        it.onChange?.(nv);
      });
      row.append(b);
      return { b, it };
    });
    wrap.append(row);
    this.el.controls.append(wrap);
    c._set = (index, v) => {
      items[index].b.classList.toggle('is-active', !!v);
    };
  }

  _button(c) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'action-btn';
    b.innerHTML = `<svg viewBox="0 0 20 20"><path d="M7 4l8 6-8 6V4z"/></svg><span>${c.label}</span>`;
    b.addEventListener('click', () => c.onClick?.(b));
    this.el.controls.append(b);
    c._set = (playing) => {
      b.classList.toggle('is-playing', !!playing);
      b.querySelector('span').textContent = playing ? (c.labelPlaying || c.label) : c.label;
    };
  }

  setActionState(state) {
    const { paused, labels, rotate, tour, sound } = state;
    const pauseBtn = $('.stage-actions [data-action="pause"]');
    if (pauseBtn && paused != null) pauseBtn.classList.toggle('is-paused', paused);
    const labelBtn = $('.stage-actions [data-action="labels"]');
    if (labelBtn && labels != null) labelBtn.classList.toggle('is-off', !labels);
    const rotateBtn = $('.stage-actions [data-action="rotate"]');
    if (rotateBtn && rotate != null) rotateBtn.classList.toggle('is-off', !rotate);
    const soundBtn = $('.stage-actions [data-action="sound"]');
    if (soundBtn && sound != null) {
      soundBtn.classList.toggle('is-off', !sound);
      soundBtn.setAttribute('aria-pressed', String(!!sound));
    }
    if (tour != null) {
      this.el.autoTour.classList.toggle('is-active', tour);
      const span = this.el.autoTour.querySelector('span');
      if (span) span.textContent = tour ? '导览中…' : '自动导览';
    }
  }

  hideIntro() {
    this.el.intro.classList.add('done');
    this.el.app.classList.remove('is-intro');
  }

  showIntro() {
    this.el.intro.classList.remove('done');
    this.el.app.classList.add('is-intro');
  }

  hideLoader() {
    this.el.loader.classList.add('done');
  }

  openModal(tab = 'gesture') {
    this.el.modal.classList.add('is-open');
    this.el.modal.setAttribute('aria-hidden', 'false');
    this.switchModalTab(tab);
    this._prevFocus = document.activeElement;
    setTimeout(() => $('.modal-card .icon-btn')?.focus(), 50);
  }

  closeModal() {
    this.el.modal.classList.remove('is-open');
    this.el.modal.setAttribute('aria-hidden', 'true');
    this._prevFocus?.focus?.();
  }

  switchModalTab(tab) {
    $$('.modal-tab').forEach((b) => {
      const on = b.dataset.tab === tab;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    $$('.modal-pane').forEach((p) => p.classList.toggle('is-active', p.dataset.pane === tab));
  }

  showFallback() {
    this.el.fallback.hidden = false;
    this.el.loader.classList.add('done');
  }

  toast(text, x, y) {
    const tip = this.el.tooltip;
    tip.textContent = text;
    tip.style.left = `${x}px`;
    tip.style.top = `${y}px`;
    tip.classList.add('is-visible');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => tip.classList.remove('is-visible'), 1400);
  }
}
