import { defineConfig, type Plugin } from 'vite';

function embedApiPlugin(): Plugin {
  let extractorPromise: Promise<any> | null = null;
  const getExtractor = async () => {
    if (!extractorPromise) {
      const { pipeline } = await import('@huggingface/transformers');
      extractorPromise = pipeline('feature-extraction', 'Xenova/paraphrase-multilingual-MiniLM-L12-v2', { dtype: 'q8' });
    }
    return extractorPromise;
  };

  const handler = async (req: any, res: any, next: any) => {
    if (req.method === 'POST' && (req.url === '/api/embed' || req.url?.startsWith('/api/embed?'))) {
      let body = '';
      req.on('data', (chunk: any) => {
        body += chunk;
      });
      req.on('end', async () => {
        try {
          const { texts } = JSON.parse(body || '{}');
          if (!Array.isArray(texts) || !texts.length) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'texts array required' }));
            return;
          }
          const extractor = await getExtractor();
          const out = await extractor(texts, { pooling: 'mean', normalize: true });
          const vectors = out.tolist();
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ vectors }));
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: String(err) }));
        }
      });
      return;
    }
    next();
  };

  return {
    name: 'embed-api',
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}

export default defineConfig({
  plugins: [embedApiPlugin()],
  build: {
    target: 'es2020',
    modulePreload: { polyfill: false },
  },
});

