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

function normalizeHtml(html) {
  return html
    .replace(/\r\n/g, '\n')
    .replace(/<!DOCTYPE html>/i, '<!doctype html>')
    .replace(/>\s+</g, '><')
    .replace(/\s+/g, ' ')
    .trim();
}

function replaceFooterWithMarker(html) {
  const footerPattern = /<footer class="site-footer">[\s\S]*?<\/footer>/i;
  if (!footerPattern.test(html)) {
    throw new Error('Footer parity check failed: site footer was not found');
  }
  return html.replace(footerPattern, '<footer class="site-footer"></footer>');
}

const sourceHtml = await readFile('index.html', 'utf8');
const builtHtml = await readFile('dist/index.html', 'utf8');

const sourceWithoutFooter = normalizeHtml(replaceFooterWithMarker(sourceHtml));
const builtWithoutFooter = normalizeHtml(replaceFooterWithMarker(builtHtml));

if (sourceWithoutFooter !== builtWithoutFooter) {
  throw new Error('HTML parity check failed: the Astro build changed rendered markup outside the approved footer component');
}

const requiredFooterContent = [
  '© 2026 ศิริโชติ วิภารัตน์ / ThaiAgent Studio สงวนลิขสิทธิ์',
  '© 2026 Sirichot Wipharat / ThaiAgent Studio. All rights reserved.',
  'เว้นแต่จะระบุไว้อย่างชัดเจนว่าเป็นผลงานของนายจ้างหรือลูกค้า',
  'Unless explicitly identified as employer or client work',
  'เครื่องหมายการค้าและทรัพย์สินของบุคคลที่สามยังคงเป็นกรรมสิทธิ์ของเจ้าของแต่ละราย',
  'Third-party trademarks and assets remain the property of their respective owners.',
];

for (const text of requiredFooterContent) {
  if (!builtHtml.includes(text)) {
    throw new Error(`Footer content check failed: missing required notice text: ${text}`);
  }
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

console.log('Parity check passed: Astro preserves the approved page structure outside the footer, validates the bilingual ownership notice, and preserves assets, CNAME and .nojekyll.');
