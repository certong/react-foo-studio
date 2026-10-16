/**
 * One way to call the Studio API's /portal routes from a screen: the typed client's result becomes
 * the response body, or a PortalError with the API's error code. A 401 TOKEN_EXPIRED gets one silent
 * refresh and retry, as the backend guard expects; when the refresh fails too, the session ends.
 */
import { isApiError, type ApiErrorCode } from './client';
import { refreshAccessToken } from './auth';

export class PortalError extends Error {
  constructor(
    /** The API's `code`, or UNREACHABLE when no reply came back at all. */
    public code: ApiErrorCode | 'UNREACHABLE',
    message: string,
  ) {
    super(message);
  }
}

export function toPortalError(err: unknown): PortalError {
  return err instanceof PortalError ? err : new PortalError('UNREACHABLE', err instanceof Error ? err.message : String(err));
}

/** What openapi-fetch resolves to: `data` on 2xx, `error` otherwise. */
interface Result<T> {
  data?: T;
  error?: unknown;
}

export async function portal<T>(request: () => Promise<Result<T>>): Promise<T> {
  const first = await attempt(request);
  if (first instanceof PortalError && first.code === 'TOKEN_EXPIRED' && (await refreshAccessToken())) {
    const second = await attempt(request);
    if (second instanceof PortalError) throw second;
    return second;
  }
  if (first instanceof PortalError) throw first;
  return first;
}

async function attempt<T>(request: () => Promise<Result<T>>): Promise<T | PortalError> {
  try {
    const { data, error } = await request();
    if (data !== undefined) return data;
    return isApiError(error) ? new PortalError(error.code, error.message) : new PortalError('UNREACHABLE', "The Studio API gave no usable reply");
  } catch {
    return new PortalError('UNREACHABLE', "Can't reach the Studio API");
  }
}
