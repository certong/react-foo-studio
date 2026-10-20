/**
 * GET /portal/me (FS-86): the signed-in account, its workspace and the credit meter. The top bar
 * (FS-69) is the first piece on the real API; with VITE_USE_MOCK_API=true it reads the mock instead.
 */
import { config } from '@/config';
import type { MeResponse } from '@/data/types';
import { api } from './client';
import { portal } from './portal';
import { getMe as mockMe } from './studio';

export async function fetchMe(): Promise<MeResponse> {
  if (config.useMockApi) return mockMe();
  return portal(() => api.GET('/portal/me'));
}
