import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.API_INTERNAL_URL ?? 'http://localhost:5080';

async function handle(req: NextRequest) {
  const { pathname, search } = new URL(req.url);
  const target = `${BACKEND}${pathname}${search}`;

  const body =
    req.method !== 'GET' && req.method !== 'HEAD'
      ? await req.arrayBuffer()
      : undefined;

  const forwardHeaders: Record<string, string> = {
    Accept: req.headers.get('accept') ?? 'application/json',
  };
  const ct = req.headers.get('content-type');
  // Only forward Content-Type when the client set one. Omitting it for multipart
  // uploads lets the browser-generated boundary pass through intact.
  if (ct) forwardHeaders['Content-Type'] = ct;

  const upstream = await fetch(target, {
    method: req.method,
    headers: forwardHeaders,
    body: body && body.byteLength > 0 ? body : undefined,
  });

  // 204/304 (and other bodiless statuses) must not carry a body or Content-Type,
  // or constructing the Response throws.
  if (upstream.status === 204 || upstream.status === 304) {
    return new NextResponse(null, { status: upstream.status });
  }

  const responseBody = await upstream.arrayBuffer();
  return new NextResponse(responseBody, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('content-type') ?? 'application/json',
    },
  });
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
