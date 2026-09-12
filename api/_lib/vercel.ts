import { handleApi } from './http';

type VercelLikeRequest = {
  method?: string;
  url?: string;
  headers: { host?: string; authorization?: string | string[] };
  body?: unknown;
};

type VercelLikeResponse = {
  status: (code: number) => { json: (body: unknown) => unknown };
};

function requestUrl(req: VercelLikeRequest): URL {
  const raw = req.url ?? '/api';
  if (raw.startsWith('http://') || raw.startsWith('https://')) return new URL(raw);
  return new URL(raw, `https://${req.headers.host ?? 'localhost'}`);
}

export async function runVercelApi(req: VercelLikeRequest, res: VercelLikeResponse): Promise<void> {
  try {
    const url = requestUrl(req);
    const authorization = Array.isArray(req.headers.authorization)
      ? req.headers.authorization[0]
      : req.headers.authorization;
    const result = await handleApi({
      method: req.method ?? 'GET',
      pathname: url.pathname,
      body: req.body,
      authorization,
    });
    res.status(result.status).json(result.body);
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : 'The room server failed.';
    res.status(500).json({ error: message });
  }
}
