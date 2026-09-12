import type { SessionAction } from './session';
import { createRoomService, RoomError } from './service';
import { getRoomStore, toPublicRoom } from './store';

export type ApiRequest = {
  method: string;
  pathname: string;
  body: unknown;
  authorization?: string;
};

export type ApiResponse = {
  status: number;
  body: unknown;
};

function bearer(authorization?: string): string {
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? '';
}

function asObject(body: unknown): Record<string, unknown> {
  return body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
}

export async function handleApi(request: ApiRequest): Promise<ApiResponse> {
  try {
    const path = request.pathname.replace(/\/+$/, '') || '/';
    const method = request.method.toUpperCase();
    const body = asObject(request.body);
    const store = await getRoomStore();
    const service = createRoomService(store);

    if (method === 'GET' && path === '/api/rooms') {
      const rooms = (await store.list()).map(toPublicRoom);
      return { status: 200, body: { rooms, storage: store.kind } };
    }

    if (method === 'POST' && path === '/api/rooms') {
      return {
        status: 201,
        body: await service.create(String(body.name ?? ''), String(body.password ?? '')),
      };
    }

    const join = path.match(/^\/api\/rooms\/([^/]+)\/join$/);
    if (method === 'POST' && join) {
      return {
        status: 200,
        body: await service.join(join[1], String(body.password ?? '')),
      };
    }

    const action = path.match(/^\/api\/rooms\/([^/]+)\/actions$/);
    if (method === 'POST' && action) {
      return {
        status: 200,
        body: await service.apply(action[1], bearer(request.authorization), body.action as SessionAction),
      };
    }

    const room = path.match(/^\/api\/rooms\/([^/]+)$/);
    if (method === 'GET' && room) {
      return { status: 200, body: await service.read(room[1], bearer(request.authorization)) };
    }

    return { status: 404, body: { error: 'Not found.' } };
  } catch (caught) {
    if (caught instanceof RoomError) {
      return { status: caught.status, body: { error: caught.message } };
    }
    const message = caught instanceof Error ? caught.message : 'The room server failed.';
    console.error(caught);
    return { status: 500, body: { error: message } };
  }
}
