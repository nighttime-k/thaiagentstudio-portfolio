import { readFile, readdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, relative } from 'node:path';

async function sha256(file) {
  const data = await readFile(file);
  return createHash('sha256').update(data).digest('hex');
}

async function walk(dir) {
  const entries = await readdir(dir);
  const files = [];

  for (const entry of entries) {
    const full = join(dir, entry);
    const info = await stat(full);
    if (info.isDirectory()) files.push(...await walk(full));
    else files.push(full);
  }

  return files.sort();
}

const sourceHtml = await readFile('index.html');
const builtHtml = await readFile('dist/index.html');

if (!sourceHtml.equals(builtHtml)) {
  throw new Error('HTML parity check failed: dist/index.html differs from the current index.html');
}

const sourceAssets = await walk('assets');
const builtAssets = await walk('dist/assets');
const sourceRelative = sourceAssets.map((file) => relative('assets', file));
const builtRelative = builtAssets.map((file) => relative('dist/assets', file));

if (JSON.stringify(sourceRelative) !== JSON.stringify(builtRelative)) {
  throw new Error('Asset parity check failed: dist/assets file list differs from assets');
}

for (let index = 0; index < sourceAssets.length; index += 1) {
  const sourceHash = await sha256(sourceAssets[index]);
  const builtHash = await sha256(builtAssets[index]);
  if (sourceHash !== builtHash) {
    throw new Error(`Asset parity check failed: ${sourceRelative[index]}`);
  }
}

for (const file of ['CNAME', '.nojekyll']) {
  try {
    const source = await readFile(file);
    const built = await readFile(`dist/${file}`);
    if (!source.equals(built)) throw new Error(`${file} differs after build`);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
}

console.log('Parity check passed: HTML, assets, CNAME and .nojekyll are unchanged in dist.');
