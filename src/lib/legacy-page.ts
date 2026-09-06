import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');

function between(text: string, open: string, close: string) {
  const start = text.indexOf(open);
  if (start < 0) throw new Error(`Missing marker: ${open}`);

  const contentStart = start + open.length;
  const end = text.indexOf(close, contentStart);
  if (end < 0) throw new Error(`Missing marker: ${close}`);

  return text.slice(contentStart, end);
}

function bounds(text: string, marker: string, close: string) {
  const start = text.indexOf(marker);
  if (start < 0) throw new Error(`Missing marker: ${marker}`);

  const closeStart = text.indexOf(close, start);
  if (closeStart < 0) throw new Error(`Missing closing marker ${close} for ${marker}`);

  return {
    start,
    end: closeStart + close.length,
  };
}

function extract(text: string, marker: string, close: string) {
  const range = bounds(text, marker, close);
  return text.slice(range.start, range.end);
}

function assertWhitespaceOnly(label: string, value: string) {
  if (value.trim() !== '') {
    throw new Error(`Unexpected legacy markup in ${label}. Update the Astro migration boundaries before building.`);
  }
}

export const headHtml = between(source, '<head>', '</head>');
const bodyHtml = between(source, '<body>', '</body>');

const headerRange = bounds(bodyHtml, '<header class="site-header">', '</header>');
const mainOpen = '<main id="main-content">';
const mainStart = bodyHtml.indexOf(mainOpen, headerRange.end);
if (mainStart < 0) throw new Error('Missing main content marker');
const mainContentStart = mainStart + mainOpen.length;
const mainEnd = bodyHtml.indexOf('</main>', mainContentStart);
if (mainEnd < 0) throw new Error('Missing </main>');

const footerRange = bounds(bodyHtml, '<footer class="site-footer">', '</footer>');

assertWhitespaceOnly('between header and main', bodyHtml.slice(headerRange.end, mainStart));
assertWhitespaceOnly('between main and footer', bodyHtml.slice(mainEnd + '</main>'.length, footerRange.start));

export const bodyLeadHtml = bodyHtml.slice(0, headerRange.start).trim();
export const headerHtml = bodyHtml.slice(headerRange.start, headerRange.end);

const mainHtml = bodyHtml.slice(mainContentStart, mainEnd);

export const heroHtml = extract(mainHtml, '<section id="top" class="hero"', '</section>');
export const ownerStripHtml = extract(mainHtml, '<aside class="owner-strip"', '</aside>');
export const quickStartHtml = extract(mainHtml, '<section class="quick-start"', '</section>');
export const workHtml = extract(mainHtml, '<section id="work" class="work-section"', '</section>');
export const systemsHtml = extract(mainHtml, '<section id="systems" class="project-index"', '</section>');
export const contactHtml = extract(mainHtml, '<section id="contact" class="contact-section"', '</section>');

const orderedMainParts = [
  heroHtml,
  ownerStripHtml,
  quickStartHtml,
  workHtml,
  systemsHtml,
  contactHtml,
];

let cursor = 0;
for (const part of orderedMainParts) {
  const index = mainHtml.indexOf(part, cursor);
  if (index < 0) throw new Error('Legacy main sections are out of the expected order');
  assertWhitespaceOnly('between main sections', mainHtml.slice(cursor, index));
  cursor = index + part.length;
}
assertWhitespaceOnly('after final main section', mainHtml.slice(cursor));

export const footerHtml = bodyHtml.slice(footerRange.start, footerRange.end);
export const bodyTailHtml = bodyHtml.slice(footerRange.end).trim();
