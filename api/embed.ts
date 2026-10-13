import type { VercelRequest, VercelResponse } from '@vercel/node';

let extractorPromise: Promise<any> | null = null;
const getExtractor = async () => {
  if (!extractorPromise) {
    const { pipeline } = await import('@huggingface/transformers');
    extractorPromise = pipeline('feature-extraction', 'Xenova/paraphrase-multilingual-MiniLM-L12-v2', { dtype: 'q8' });
  }
  return extractorPromise;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const { texts } = req.body ?? {};
  if (!Array.isArray(texts) || !texts.length) {
    res.status(400).json({ error: 'texts array required' });
    return;
  }
  try {
    const extractor = await getExtractor();
    const out = await extractor(texts, { pooling: 'mean', normalize: true });
    res.status(200).json({ vectors: out.tolist() });
  } catch (err: any) {
    res.status(500).json({ error: String(err) });
  }
}
