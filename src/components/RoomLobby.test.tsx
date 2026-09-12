/** @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RoomLobby } from '@/components/RoomLobby';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('room lobby', () => {
  let root: Root | undefined;
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo) => {
        if (String(input).endsWith('/api/rooms')) {
          return new Response(
            JSON.stringify({
              rooms: [
                {
                  id: '7K2MQX',
                  name: 'Tripod 2026',
                  playerCount: 100,
                  pickCount: 3,
                  updatedAt: '2026-09-12T01:00:00.000Z',
                },
              ],
            }),
            { headers: { 'Content-Type': 'application/json' } },
          );
        }
        return new Response(JSON.stringify({ error: 'Not found.' }), { status: 404 });
      }),
    );
  });

  afterEach(() => {
    act(() => root?.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it('shows available rooms without opening them', async () => {
    await act(async () => {
      root?.render(<RoomLobby onEnterRoom={() => undefined} onEnterSandbox={() => undefined} />);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Choose a draft');
    expect(container.textContent).toContain('Tripod 2026');
    expect(container.textContent).toContain('7K2MQX');
    expect(container.textContent).toContain('100 players');
    expect(container.textContent).not.toContain('Keep this private');
  });
});
