import { cp, copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

await mkdir('dist', { recursive: true });
await cp('assets', 'dist/assets', { recursive: true, force: true });

// Rebuild the OWASP cover from text chunks so the GitHub connector never has to
// transport a large binary blob directly. The resulting file is a normal WebP.
const partsDir = 'asset-parts';
try {
  const parts = (await readdir(partsDir))
    .filter((name) => name.startsWith('owasp.part'))
    .sort();

  if (parts.length > 0) {
    const chunks = await Promise.all(parts.map((name) => readFile(join(partsDir, name), 'utf8')));
    const webp = Buffer.from(chunks.join(''), 'base64');
    await writeFile('dist/assets/owasp-readonly-auditor-cover.webp', webp);
  }
} catch (error) {
  if (error?.code !== 'ENOENT') throw error;
}

for (const file of ['CNAME', '.nojekyll']) {
  try {
    await copyFile(file, `dist/${file}`);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
}
