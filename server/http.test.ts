import { afterEach, describe, expect, it } from 'vitest';
import { handleApi } from './http';

const originalCwd = process.cwd();

afterEach(() => {
  delete process.env.VERCEL;
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  process.chdir(originalCwd);
});

describe('rooms http', () => {
  it('lists rooms without crashing', async () => {
    const result = await handleApi({
      method: 'GET',
      pathname: '/api/rooms',
      body: {},
    });
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ rooms: expect.any(Array) });
  });
});
