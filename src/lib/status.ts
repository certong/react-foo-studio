import type { RequestStatus } from '@/data/types';

export type BadgeTone = 'work' | 'turn' | 'prob' | 'live' | 'end';

/** Badge label, tone and (Status Key v2) icon per request status. */
export const statusBadge: Record<RequestStatus, { label: string; tone: BadgeTone; icon?: string }> = {
  draft: { label: 'Draft', tone: 'end' },
  in_progress: { label: 'In progress', tone: 'work' },
  building: { label: 'Building', tone: 'work' },
  approve: { label: 'Approve', tone: 'turn' },
  preview: { label: 'Preview ready', tone: 'turn' },
  with_chi: { label: 'With Chi', tone: 'prob', icon: '!' },
  live: { label: 'Live', tone: 'live', icon: '✓' },
  closed: { label: 'Closed', tone: 'end' },
  dropped: { label: 'Dropped', tone: 'end' },
};

/** Home focus priority: your turn > problem > working. Lower sorts first. */
export const focusRank: Record<BadgeTone, number> = { turn: 0, prob: 1, work: 2, live: 3, end: 4 };
