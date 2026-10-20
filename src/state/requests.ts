import { useCallback, useEffect, useMemo, useState } from 'react';
import { config } from '@/config';
import { listRequests, type RequestsPage } from '@/api/requests';
import { listRequestsMock } from '@/api/studio';
import { PortalError, toPortalError } from '@/api/portal';
import type { RequestTab } from '@/data/types';
import { useStudio } from './studio';

export interface RequestsValue {
  items: RequestsPage['items'];
  counts: RequestsPage['counts'];
  /** True while a tab's first page is on its way (the previous tab's rows stay meanwhile). */
  loading: boolean;
  error: PortalError | null;
  /** Reads the tab again, e.g. "Try again" after a failure. */
  reload: () => void;
}

const NO_COUNTS: RequestsPage['counts'] = { active: 0, live: 0, all: 0 };

/** Real API: one GET /portal/requests per tab (and per reload). */
function useApiRequests(tab: RequestTab): RequestsValue {
  const [page, setPage] = useState<Pick<RequestsPage, 'items' | 'counts'>>({ items: [], counts: NO_COUNTS });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<PortalError | null>(null);
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    listRequests(tab).then(
      ({ items, counts }) => {
        if (!alive) return;
        setPage({ items, counts });
        setError(null);
        setLoading(false);
      },
      (err: unknown) => {
        if (!alive) return;
        setError(toPortalError(err));
        setLoading(false);
      },
    );
    return () => {
      alive = false;
    };
  }, [tab, version]);

  return useMemo(() => ({ ...page, loading, error, reload }), [page, loading, error, reload]);
}

/** Mock API: the same page shape, live with every change in the mock. */
function useMockRequests(tab: RequestTab): RequestsValue {
  const snapshot = useStudio();
  return useMemo(() => {
    void snapshot; // the mock's list changes whenever the snapshot does
    const { items, counts } = listRequestsMock(tab);
    return { items, counts, loading: false, error: null, reload: () => {} };
  }, [snapshot, tab]);
}

/** The Requests list for one tab (GET /portal/requests, FS-89). Picked once at build time from VITE_USE_MOCK_API. */
export const useRequests = config.useMockApi ? useMockRequests : useApiRequests;
