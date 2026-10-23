import puppeteer from 'puppeteer-core';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const file = path.join(root, '多元积分_互动实验室.html');
const outDir = path.join(root, 'screenshots');
await mkdir(outDir, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome',
  headless: 'new',
  args: [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--window-size=1600,1000',
  ],
});

const page = await browser.newPage();
await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 1 });
const logs = [];
page.on('console', (msg) => {
  if (msg.type() === 'error' || msg.type() === 'warning') logs.push(`[${msg.type()}] ${msg.text()}`);
});
page.on('pageerror', (err) => logs.push(`[pageerror] ${err.stack || err.message}`));

const url = 'file://' + encodeURI(file);
await page.goto(url, { waitUntil: 'load' });
await new Promise((r) => setTimeout(r, 1500));
await page.evaluate(() => window.__lab?.start());
await new Promise((r) => setTimeout(r, 900));

const count = await page.evaluate(() => window.__lab?.chapters.length || 0);
for (let i = 0; i < count; i++) {
  await page.evaluate((idx) => window.__lab.goTo(idx), i);
  await new Promise((r) => setTimeout(r, 500));
  await page.evaluate(() => {
    const lab = window.__lab;
    if (lab?.engine?.activeScene?.camera) {
      lab.engine.setCamera(lab.engine.activeScene.camera, true);
    }
  });
  await new Promise((r) => setTimeout(r, 900));
  const id = await page.evaluate(() => window.__lab.chapters[window.__lab.current].id);
  await page.screenshot({ path: path.join(outDir, `desktop-${String(i).padStart(2, '0')}-${id}.png`) });
  const state = await page.evaluate(() => ({
    fallback: !document.getElementById('fallback').hidden,
    loader: document.getElementById('loader').className,
    status: document.getElementById('stage-status').textContent,
    readouts: [...document.querySelectorAll('.readout')].map((r) => ({
      label: r.querySelector('.readout-label')?.textContent,
      value: r.querySelector('.rv')?.textContent,
    })),
    controls: document.querySelectorAll('.controls .control').length,
    labels: document.querySelectorAll('#overlay .anno').length,
    canvas: !!document.querySelector('#canvas-host canvas'),
  }));
  console.log(`desktop ${i} ${id}`, JSON.stringify(state));
  if (logs.length) {
    console.log(logs.join('\n'));
    logs.length = 0;
  }
}

await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
for (const i of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]) {
  await page.evaluate((idx) => window.__lab.goTo(idx), i);
  await new Promise((r) => setTimeout(r, 400));
  await page.evaluate(() => {
    const lab = window.__lab;
    if (lab?.engine?.activeScene?.camera) {
      lab.engine.setCamera(lab.engine.activeScene.camera, true);
    }
  });
  await new Promise((r) => setTimeout(r, 800));
  const id = await page.evaluate(() => window.__lab.chapters[window.__lab.current].id);
  await page.screenshot({ path: path.join(outDir, `mobile-${String(i).padStart(2, '0')}-${id}.png`) });
}
if (logs.length) console.log(logs.join('\n'));
await browser.close();
