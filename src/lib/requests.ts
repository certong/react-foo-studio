import type { StudioRequest } from '@/data/types';
import { daysBetween, formatShort, parseDay, today } from '@/lib/date';
import { badgeLook, focusRank } from '@/lib/status';
import { routes } from '@/routes';

/** Reply window for your-turn items (approve a change, review a preview). */
export const REPLY_WINDOW_DAYS = 7;

const ENDED = new Set(['live', 'closed']);

/** "20 credits" for a change, "RM 100" for a new page. */
export function costLabel(credits: number | null): string {
  return credits == null ? 'RM 100' : `${credits} credits`;
}

export function typeLabel(r: Pick<StudioRequest, 'type'>): string {
  return r.type === 'new_page' ? 'New page' : 'Change';
}

/** Problem tone (On Hold): notes show in red. */
export function isProblem(r: Pick<StudioRequest, 'statusKey'>) {
  return badgeLook[r.statusKey].tone === 'prob';
}

export function isOpen(r: Pick<StudioRequest, 'status'>) {
  return !ENDED.has(r.status);
}

export function isYourTurn(r: Pick<StudioRequest, 'statusKey'>) {
  return r.statusKey === 'Ready-to-Check-You';
}

/** Row action label per status (04 Requests). */
export function actionLabel(r: Pick<StudioRequest, 'status' | 'type'>): string {
  switch (r.status) {
    case 'uat':
      return r.type === 'change' ? 'Check before and after' : 'Review preview';
    case 'pending_chi':
      return 'See details';
    case 'paused':
    case 'draft':
      return 'Open draft';
    case 'live':
      return 'See what changed';
    default:
      return 'See progress';
  }
}

/** Where a request opens: the page that matches what it's waiting on. */
export function requestHref(r: Pick<StudioRequest, 'status' | 'type' | 'id'>): string {
  switch (r.status) {
    case 'uat':
      return r.type === 'change' ? routes.review(r.id) : routes.preview(r.id);
    case 'draft':
    case 'paused':
      return routes.thread(r.id);
    case 'live':
      return r.type === 'change' ? routes.review(r.id) : routes.progress(r.id);
    default:
      return routes.progress(r.id);
  }
}

/**
 * Open requests in focus order: your turn > problem > working.
 * Within a group, items with a deadline come first (soonest first), then newest.
 */
export function byFocus<T extends Pick<StudioRequest, 'status' | 'statusKey' | 'replyBy' | 'number'>>(requests: T[]): T[] {
  return requests.filter(isOpen).sort((a, b) => {
    const rank = focusRank[badgeLook[a.statusKey].tone] - focusRank[badgeLook[b.statusKey].tone];
    if (rank) return rank;
    if (a.replyBy && b.replyBy) return a.replyBy.localeCompare(b.replyBy);
    if (a.replyBy || b.replyBy) return a.replyBy ? -1 : 1;
    return b.number - a.number;
  });
}

export interface Deadline {
  date: Date;
  label: string;
  daysLeft: number;
  /** Days of the reply window already gone, 0…REPLY_WINDOW_DAYS. */
  daysUsed: number;
  text: string;
}

export function deadlineFor(r: Pick<StudioRequest, 'replyBy'>, now = today()): Deadline | null {
  if (!r.replyBy) return null;
  const date = parseDay(r.replyBy);
  const daysLeft = Math.max(0, daysBetween(now, date));
  const label = formatShort(date);
  const left = daysLeft === 0 ? 'last day' : `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left`;
  return {
    date,
    label,
    daysLeft,
    daysUsed: Math.min(REPLY_WINDOW_DAYS, Math.max(0, REPLY_WINDOW_DAYS - daysLeft)),
    text: `Reply by ${label} · ${left}`,
  };
}
