import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const dest = join(root, 'public', 'stockfish');

if (!existsSync(dest)) mkdirSync(dest, { recursive: true });

const binDir = join(root, 'node_modules', 'stockfish', 'bin');

const files = [
  'stockfish.js',
  'stockfish.wasm',
  'stockfish-18.js',
  'stockfish-18.wasm',
  'stockfish-18-single.js',
  'stockfish-18-single.wasm',
];

for (const file of files) {
  const src = join(binDir, file);
  if (existsSync(src)) {
    copyFileSync(src, join(dest, file));
    console.log(`Copied ${file}`);
  }
}
