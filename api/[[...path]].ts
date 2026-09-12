import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleApi } from '../server/http';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const host = req.headers.host ?? 'localhost';
  const url = new URL(req.url ?? '/api', `http://${host}`);
  const result = await handleApi({
    method: req.method ?? 'GET',
    pathname: url.pathname,
    body: req.body,
    authorization: typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined,
  });
  res.status(result.status).json(result.body);
}
