import { copyFile, access } from 'node:fs/promises';

const base = process.env.PAGES_BASE_PATH;
if (!base?.startsWith('/') || !base.endsWith('/')) {
  throw new Error('Set PAGES_BASE_PATH to the GitHub Pages repository path, including leading and trailing slashes.');
}
// The hosted site's root opens the lesson. Local development keeps the playground.
await Promise.all([
  access('dist/lesson/brain.glb'),
  access('dist/lesson/original.mp4'),
]);
await copyFile('dist/lesson/index.html', 'dist/index.html');
console.log(`Prepared the lesson as the Pages landing page at ${base}`);
