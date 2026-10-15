import type { StatusKey } from '@/data/types';

/*
 * Badge look is a UI concern, keyed by the statusKey the API sends (FS-85/FS-104).
 * The words come from the data (`badge`); this file only decides colour and icon.
 */
export type BadgeTone = 'draft' | 'work' | 'turn' | 'prob' | 'live' | 'end';

export const badgeLook: Record<StatusKey, { tone: BadgeTone; icon?: string }> = {
  'Draft-You': { tone: 'draft' },
  'Building-Agent': { tone: 'work' },
  'Checking-Agent': { tone: 'work' },
  'Ready-to-Check-You': { tone: 'turn' },
  Live: { tone: 'live', icon: '✓' },
  'On-Hold': { tone: 'prob', icon: '!' },
  'Cancelled-You': { tone: 'end' },
  'Closed-No-Reply': { tone: 'end' },
  'Closed-Agent': { tone: 'end' },
};

/** Home focus priority: your turn > problem > working; drafts and ended requests last. */
export const focusRank: Record<BadgeTone, number> = { turn: 0, prob: 1, work: 2, draft: 3, live: 4, end: 5 };
