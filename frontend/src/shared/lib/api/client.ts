/**
 * Thin fetch wrapper. Lives in shared/lib/api so module-specific clients
 * (manufacturing, quality, ...) can compose it without re-implementing
 * error handling.
 */

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

type RequestOptions = Omit<RequestInit, 'body'> & { body?: unknown };

const serverBase =
  typeof window === 'undefined'
    ? (process.env.API_INTERNAL_URL ?? 'http://localhost:5080')
    : '';

export async function api<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { body, headers, ...rest } = opts;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const res = await fetch(`${serverBase}${normalized}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;

  if (!res.ok) {
    throw new ApiError(
      res.status,
      data?.title ?? `http_${res.status}`,
      data?.detail ?? res.statusText,
    );
  }

  return data as T;
}
