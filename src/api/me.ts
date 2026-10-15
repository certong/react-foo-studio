/**
 * GET /portal/me (FS-86): the signed-in account, its workspace and the credit meter. The top bar
 * (FS-69) is the first piece on the real API; with VITE_USE_MOCK_API=true it reads the mock instead.
 */
import { config } from '@/config';
import type { MeResponse } from '@/data/types';
import { api, isApiError, type ApiErrorCode } from './client';
import { refreshAccessToken } from './auth';
import { getMe as mockMe } from './studio';

/** Why /portal/me gave no answer: an API error code, or the API couldn't be reached at all. */
export class MeError extends Error {
  constructor(
    public code: ApiErrorCode | 'UNREACHABLE',
    message: string,
  ) {
    super(message);
  }
}

const UNREACHABLE = () => new MeError('UNREACHABLE', "Can't reach the Studio API");

/**
 * Loads /portal/me. On 401 TOKEN_EXPIRED it refreshes the access token once and tries again, as
 * the guard expects; when the refresh fails too, the session is signed out.
 */
export async function fetchMe(): Promise<MeResponse> {
  if (config.useMockApi) return mockMe();
  const first = await get();
  if (first instanceof MeError && first.code === 'TOKEN_EXPIRED' && (await refreshAccessToken())) {
    const second = await get();
    if (second instanceof MeError) throw second;
    return second;
  }
  if (first instanceof MeError) throw first;
  return first;
}

async function get(): Promise<MeResponse | MeError> {
  try {
    const { data, error } = await api.GET('/portal/me');
    if (data) return data;
    return isApiError(error) ? new MeError(error.code, error.message) : UNREACHABLE();
  } catch {
    return UNREACHABLE();
  }
}
