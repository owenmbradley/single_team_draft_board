import { createRoomService, RoomError } from './service';
import { getRoomStore } from './store';
import type { SessionAction } from '../src/lib/session';

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
    const service = createRoomService(await getRoomStore());
    const path = request.pathname.replace(/\/+$/, '') || '/';
    const method = request.method.toUpperCase();
    const body = asObject(request.body);

    if (method === 'GET' && path === '/api/rooms') {
      return { status: 200, body: { rooms: await service.list() } };
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
    console.error(caught);
    return { status: 500, body: { error: 'The room server failed.' } };
  }
}
