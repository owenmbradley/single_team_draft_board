export const config = { runtime: 'nodejs' };

export default function handler(
  _req: unknown,
  res: { status: (code: number) => { json: (body: unknown) => unknown } },
) {
  res.status(200).json({ ok: true });
}
