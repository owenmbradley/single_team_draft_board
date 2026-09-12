import { runVercelApi } from '../api/_lib/vercel';

export default async function handler(
  req: { method?: string; url?: string; headers: { host?: string; authorization?: string | string[] }; body?: unknown },
  res: { status: (code: number) => { json: (body: unknown) => unknown } },
) {
  try {
    await runVercelApi(req, res);
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : 'The room server failed.';
    res.status(500).json({ error: message });
  }
}
