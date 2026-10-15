/**
 * Shared index for JD test scripts. JD_INDEX=semantic loads MiniLM via a locally
 * installed @huggingface/transformers (npm i --no-save @huggingface/transformers@3.7.1),
 * matching what the browser uses once the model has loaded.
 */
import { VectorIndex } from '../src/search.ts';
import type { Vault } from '../src/vault.ts';

export async function makeIndex(vault: Vault): Promise<VectorIndex> {
  const index = new VectorIndex(vault);
  // Skip the browser idle upgrade (CDN import fails under Node).
  (index as unknown as { scheduleIdleSemanticUpgrade: () => void }).scheduleIdleSemanticUpgrade = () => {};
  await index.init();
  if (process.env.JD_INDEX !== 'semantic') return index;

  const { pipeline } = await import('@huggingface/transformers');
  const extractor = await pipeline('feature-extraction', 'Xenova/paraphrase-multilingual-MiniLM-L12-v2', { dtype: 'q8' });
  const embedder = {
    label: 'Multilingual-MiniLM · 384d',
    threshold: 0.32,
    async embed(texts: string[]) {
      const out = await extractor(texts, { pooling: 'mean', normalize: true });
      return (out.tolist() as number[][]).map((row) => Float32Array.from(row));
    },
  };
  await (index as unknown as { build: (e: typeof embedder) => Promise<void> }).build(embedder);
  index.status = { kind: 'semantic' };
  return index;
}
