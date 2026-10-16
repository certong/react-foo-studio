/**
 * GET /portal/requests?tab= (FS-89): request cards with badge and steps, plus a count per tab. The
 * Requests screen (FS-73) reads this; with VITE_USE_MOCK_API=true the mock answers in the same shape.
 */
import { config } from '@/config';
import type { ListRequestsResponse, RequestListItem, RequestTab } from '@/data/types';
import { api } from './client';
import { portal } from './portal';
import { listRequestsMock } from './studio';

/**
 * One tab's rows and the count per tab. `nextCursor` is left out until the screen pages: the
 * contract currently types it as string[] where the API sends a nullable string (raised on FS-85).
 */
export interface RequestsPage {
  items: RequestListItem[];
  counts: ListRequestsResponse['counts'];
}

export async function listRequests(tab: RequestTab): Promise<RequestsPage> {
  if (config.useMockApi) return listRequestsMock(tab);
  const { items, counts } = await portal(() => api.GET('/portal/requests', { params: { query: { tab } } }));
  return { items, counts };
}
