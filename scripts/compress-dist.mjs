import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync, brotliCompressSync, constants } from 'node:zlib';

const DIST = 'dist';
const EXT_REGEX = /\.(html|js|css|svg|json|xml|txt)$/i;

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else if (entry.isFile() && EXT_REGEX.test(entry.name)) {
      const buf = readFileSync(full);
      // Skip tiny files (< 256 bytes) where compression adds overhead
      if (buf.length < 256) continue;

      const gz = gzipSync(buf, { level: 9 });
      writeFileSync(`${full}.gz`, gz);

      const br = brotliCompressSync(buf, {
        params: {
          [constants.BROTLI_PARAM_QUALITY]: 11,
          [constants.BROTLI_PARAM_SIZE_HINT]: buf.length,
        },
      });
      writeFileSync(`${full}.br`, br);

      const origSize = (buf.length / 1024).toFixed(1);
      const brSize = (br.length / 1024).toFixed(1);
      console.log(`Compressed: ${entry.name} (${origSize} KB -> ${brSize} KB br)`);
    }
  }
}

try {
  walk(DIST);
  console.log('✓ Pre-compression complete (.gz and .br generated)');
} catch (e) {
  console.warn('Pre-compression skipped:', e.message);
}
