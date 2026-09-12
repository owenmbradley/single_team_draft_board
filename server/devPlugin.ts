import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import { handleApi } from './http';

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

export function roomsApiPlugin(): Plugin {
  return {
    name: 'rooms-api',
    configureServer(server) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next) => {
        const url = req.url ?? '';
        if (!url.startsWith('/api/')) {
          next();
          return;
        }

        const pathname = url.split('?')[0] ?? url;
        const result = await handleApi({
          method: req.method ?? 'GET',
          pathname,
          body: req.method === 'GET' ? {} : await readBody(req),
          authorization: typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined,
        });

        res.statusCode = result.status;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(result.body));
      });
    },
  };
}
