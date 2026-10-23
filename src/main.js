import { chapters, chapterIndexById } from './content.js';
import { Engine } from './core/engine.js';
import { UI } from './core/ui.js';
import { AmbientAudio } from './core/audio.js';
import { createIntro } from './scenes/intro.js';
import { createLineScalar } from './scenes/lineScalar.js';
import { createLineVector } from './scenes/lineVector.js';
import { createSurfaceScalar } from './scenes/surfaceScalar.js';
import { createSurfaceVector } from './scenes/surfaceVector.js';
import { createGreen } from './scenes/green.js';
import { createStokes } from './scenes/stokes.js';
import { createGauss } from './scenes/gauss.js';
import { createOperators } from './scenes/operators.js';
import { createSummary } from './scenes/summary.js';

const factories = {
  intro: createIntro,
  'line-scalar': createLineScalar,
  'line-vector': createLineVector,
  'surface-scalar': createSurfaceScalar,
  'surface-vector': createSurfaceVector,
  green: createGreen,
  stokes: createStokes,
  gauss: createGauss,
  operators: createOperators,
  summary: createSummary,
};

function boot() {
  const host = document.getElementById('canvas-host');
  const overlay = document.getElementById('overlay');
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

  let current = -1;
  let started = false;
  let sound = readSoundPref();
  let paused = false;
  let labels = true;
  let rotate = false;
  let tour = false;
  let tourTimer = null;
  let engine = null;
  const audio = new AmbientAudio();
  if (!audio.supported) sound = false;

  const ui = new UI({
    onChapter: (i) => {
      startExperience();
      goTo(i);
    },
    onAction: (action) => handleAction(action),
    onStart: () => startExperience(),
    onIntroTour: () => startTour(),
    onJump: (id) => jumpTo(id),
  });

  ui.buildStrip(chapters);
  if (!audio.supported) document.querySelector('.stage-actions [data-action="sound"]')?.remove();

  engine = new Engine(host, overlay, {
    onError: () => {
      ui.showFallback();
      ui.hideLoader();
      ui.hideIntro();
    },
  });

  if (engine.ok) {
    engine.setAutoRotate(rotate);
    engine.setLabelsVisible(labels);
    engine.setPaused(paused);
  }

  const initialId = location.hash.replace(/^#/, '');
  const initialIndex = chapterIndexById[initialId];
  if (initialIndex != null) {
    started = true;
    ui.hideIntro();
    goTo(initialIndex, { instant: true });
    const unlock = () => {
      if (sound) audio.start();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
  } else {
    goTo(0, { instant: true });
  }

  window.addEventListener('load', () => setTimeout(() => ui.hideLoader(), 260));
  if (document.readyState === 'complete') setTimeout(() => ui.hideLoader(), 320);
  else setTimeout(() => ui.hideLoader(), 1000);

  function readSoundPref() {
    try {
      return localStorage.getItem('field-atlas-sound') !== 'off';
    } catch (e) {
      return true;
    }
  }

  function sceneContext(meta) {
    return {
      ui,
      engine,
      meta,
      reduceMotion,
      chapters,
      jump: (id) => jumpTo(id),
    };
  }

  function goTo(index, { instant = false, fromTour = false } = {}) {
    if (index < 0 || index >= chapters.length) return;
    if (!fromTour) stopTour();
    current = index;
    const meta = chapters[index];
    ui.setChapter(meta);
    ui.setActiveChapter(index);
    try {
      history.replaceState(null, '', `#${meta.id}`);
    } catch (e) {
      void e;
    }
    if (!engine?.ok) return;
    const factory = factories[meta.id];
    if (!factory) return;
    let scene = null;
    try {
      scene = factory(sceneContext(meta));
    } catch (err) {
      console.error(`Scene "${meta.id}" failed:`, err);
      ui.toast('这个场景没有加载成功，请看控制台', window.innerWidth * 0.5, window.innerHeight * 0.3);
      return;
    }
    engine.setScene(scene, { instant });
    updateActionState();
  }

  function jumpTo(id) {
    const idx = chapterIndexById[id];
    if (idx == null) return;
    startExperience();
    goTo(idx);
  }

  function startExperience() {
    if (!started) {
      started = true;
      ui.hideIntro();
      engine?.setPaused(paused);
    }
    if (sound) audio.start();
    updateActionState();
  }

  function handleAction(action) {
    if (action === 'help') {
      ui.openModal('gesture');
      return;
    }
    if (action === 'sound') {
      toggleSound();
      return;
    }
    if (!engine?.ok) return;
    if (action === 'pause') {
      paused = !paused;
      engine.setPaused(paused);
    } else if (action === 'rotate') {
      rotate = !rotate;
      engine.setAutoRotate(rotate);
    } else if (action === 'labels') {
      labels = !labels;
      engine.setLabelsVisible(labels);
    } else if (action === 'reset') {
      engine.resetCamera();
    } else if (action === 'tour') {
      if (tour) stopTour();
      else startTour();
    }
    updateActionState();
  }

  function updateActionState() {
    ui.setActionState({ paused, labels, rotate, tour, sound });
  }

  function toggleSound() {
    if (!audio.supported) return;
    sound = !sound;
    try {
      localStorage.setItem('field-atlas-sound', sound ? 'on' : 'off');
    } catch (e) {
      void e;
    }
    if (sound) {
      if (started) audio.start();
    } else {
      audio.stop();
    }
    updateActionState();
    ui.toast(sound ? '环境音已开启' : '环境音已关闭', window.innerWidth * 0.5, window.innerHeight * 0.24);
  }

  function stopTour() {
    if (!tour) return;
    tour = false;
    clearTimeout(tourTimer);
    tourTimer = null;
    updateActionState();
  }

  function startTour() {
    startExperience();
    stopTour();
    tour = true;
    goTo(1, { fromTour: true });
    scheduleTour();
    updateActionState();
  }

  function scheduleTour() {
    clearTimeout(tourTimer);
    tourTimer = setTimeout(() => {
      if (!tour) return;
      const next = current + 1;
      if (next >= chapters.length) {
        stopTour();
        ui.toast('九章导览结束，接下来交给你', window.innerWidth * 0.5, window.innerHeight * 0.28);
        return;
      }
      goTo(next, { fromTour: true });
      scheduleTour();
    }, 12500);
  }

  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (ui.el.modal.classList.contains('is-open')) return;
    const tag = e.target?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      startExperience();
      goTo(current + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      startExperience();
      goTo(current - 1);
    } else if (e.code === 'Space') {
      e.preventDefault();
      if (!ui.el.intro.classList.contains('done')) {
        startExperience();
        return;
      }
      if (!engine?.ok) return;
      paused = !paused;
      engine.setPaused(paused);
      updateActionState();
    } else if (e.key === 'r' || e.key === 'R') {
      engine?.resetCamera();
    } else if (e.key === 'l' || e.key === 'L') {
      if (!engine?.ok) return;
      labels = !labels;
      engine.setLabelsVisible(labels);
      updateActionState();
    } else if (e.key === 'm' || e.key === 'M') {
      toggleSound();
    }
  });

  window.addEventListener('hashchange', () => {
    const idx = chapterIndexById[location.hash.replace(/^#/, '')];
    if (idx != null && idx !== current) {
      startExperience();
      goTo(idx);
    }
  });

  const canvas = engine?.renderer?.domElement;
  if (canvas) {
    let down = null;
    canvas.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      down = { x: e.clientX, y: e.clientY, t: performance.now() };
    });
    canvas.addEventListener('pointerup', (e) => {
      if (!down || e.button !== 0) return;
      const dist = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      const elapsed = performance.now() - down.t;
      down = null;
      if (dist > 8 || elapsed > 650) return;
      const scene = engine.activeScene;
      if (!scene?.onPointerUp) return;
      startExperience();
      scene.onPointerUp(engine.getNDC(e));
    });
    canvas.addEventListener('pointercancel', () => { down = null; });
  }

  window.__lab = {
    goTo: (i) => goTo(i),
    jump: jumpTo,
    start: startExperience,
    ui,
    engine,
    audio,
    get current() { return current; },
    get chapters() { return chapters; },
  };
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
