import { useSyncExternalStore } from 'react';
import { getSnapshot, subscribe } from '@/api/studio';
import type { StudioData } from '@/data/types';

/** Live view of the Studio data. Re-renders whenever an API call changes it. */
export function useStudio(): StudioData {
  return useSyncExternalStore(subscribe, getSnapshot);
}
