import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = dirname(fileURLToPath(import.meta.url));
const url =
  process.env.ZETTELLINKER_UI_PY ??
  'https://raw.githubusercontent.com/osenevv/zettlellinker/main/src/zettellinker/ui_server.py';

const py = await fetch(url).then((r) => {
  if (!r.ok) throw new Error(`fetch ${url}: ${r.status}`);
  return r.text();
});
const m = py.match(/HTML_CONTENT = """([\s\S]*?)"""/);
if (!m) throw new Error('HTML_CONTENT not found in ui_server.py');
const out = join(root, '..', 'public', 'zettellinker-ui-snapshot.html');
writeFileSync(out, m[1]);
console.log(`Wrote ${out} (${m[1].length} bytes)`);
