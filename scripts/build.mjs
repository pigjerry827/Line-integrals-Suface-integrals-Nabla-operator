import { build } from 'esbuild';
import { readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');

const js = await build({
  entryPoints: [path.join(root, 'src/main.js')],
  bundle: true,
  minify: true,
  format: 'iife',
  target: ['es2020'],
  write: false,
  legalComments: 'none',
  logLevel: 'warning',
});

const css = await build({
  entryPoints: [path.join(root, 'src/styles.css')],
  bundle: true,
  minify: true,
  write: false,
  loader: {
    '.woff2': 'dataurl',
    '.woff': 'dataurl',
    '.ttf': 'dataurl',
  },
  logLevel: 'warning',
});

const template = await readFile(path.join(root, 'src/index.template.html'), 'utf8');
const jsCode = js.outputFiles[0].text;
const cssCode = css.outputFiles[0].text;
const out = template
  .replace('/*__APP_CSS__*/', () => cssCode)
  .replace('/*__APP_JS__*/', () => jsCode);

const target = path.join(root, '多元积分_互动实验室.html');
await writeFile(target, out);
const info = await stat(target);
console.log(`built ${path.basename(target)}  ${(info.size / 1024 / 1024).toFixed(2)} MB`);
