// Self-host the Tesseract.js worker + WASM core so OCR does not depend on a CDN.
import { cpSync, mkdirSync, existsSync } from 'fs';
const out = 'public/tesseract';
mkdirSync(out, { recursive: true });
const src = 'node_modules/tesseract.js/dist/worker.min.js';
if (existsSync(src)) cpSync(src, `${out}/worker.min.js`);
for (const f of ['tesseract-core-lstm.wasm.js', 'tesseract-core-simd-lstm.wasm.js', 'tesseract-core-lstm.wasm', 'tesseract-core-simd-lstm.wasm']) {
  const p = `node_modules/tesseract.js-core/${f}`;
  if (existsSync(p)) cpSync(p, `${out}/${f}`);
}
console.log('tesseract assets copied to', out);
// English language data (from the @tesseract.js-data/eng npm package) -> /tessdata
const lang = 'node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz';
if (existsSync(lang)) {
  mkdirSync('public/tessdata', { recursive: true });
  cpSync(lang, 'public/tessdata/eng.traineddata.gz');
}
