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

function stripApprovedAstroAdditions(html) {
  const footerPattern = /<footer class="site-footer">[\s\S]*?<\/footer>/i;
  if (!footerPattern.test(html)) {
    throw new Error('Footer parity check failed: site footer was not found');
  }

  return html
    .replace(footerPattern, '<footer class="site-footer"></footer>')
    .replace(/<section id="open-source"[\s\S]*?<\/section>/i, '')
    .replace(/<link\b(?=[^>]*\brel="stylesheet")(?=[^>]*\bhref="[^"]*_astro\/[^"]+")[^>]*>/gi, '')
    .replace(/<style[^>]*data-astro-cid-[^>]*>[\s\S]*?<\/style>/gi, '');
}

const sourceHtml = await readFile('index.html', 'utf8');
const builtHtml = await readFile('dist/index.html', 'utf8');

const sourceForParity = normalizeHtml(stripApprovedAstroAdditions(sourceHtml));
const builtForParity = normalizeHtml(stripApprovedAstroAdditions(builtHtml));

if (sourceForParity !== builtForParity) {
  throw new Error('HTML parity check failed: the Astro build changed rendered markup outside the approved Astro components');
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

const requiredOpenSourceContent = [
  'id="open-source"',
  'โครงการ Open Source และงานวิศวกรรม',
  'Open Source & Engineering Projects',
  'OWASP Top 10:2025 Read-Only Auditor',
  'Zero-contact',
  'Evidence-first',
  'assets/owasp-readonly-auditor-cover.webp',
  'https://github.com/nighttime-k/owasp-2025-read-only-auditor',
];

for (const text of requiredOpenSourceContent) {
  if (!builtHtml.includes(text)) {
    throw new Error(`Open-source section check failed: missing required content: ${text}`);
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

console.log('Parity check passed: Astro preserves the approved legacy page structure, validates the bilingual ownership notice and open-source engineering section, and preserves assets, CNAME and .nojekyll.');
