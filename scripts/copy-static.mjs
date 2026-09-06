import { cp, copyFile, mkdir } from 'node:fs/promises';

await mkdir('dist', { recursive: true });
await cp('assets', 'dist/assets', { recursive: true, force: true });

for (const file of ['CNAME', '.nojekyll']) {
  try {
    await copyFile(file, `dist/${file}`);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
}
