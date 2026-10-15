import type { CloseReason, RequestStatus, StepState } from '@/data/types';

export type BadgeTone = 'draft' | 'work' | 'turn' | 'prob' | 'live' | 'end';
export type Owner = 'client' | 'agent' | null;

export interface StatusInfo {
  statusKey: string;
  label: string;
  tone: BadgeTone;
  /** Whose move it is. "Agent" is one party for the client: Studio, the AI agents and Chi. */
  owner: Owner;
  icon?: string;
  /** Tracker state of the request's current step. */
  step: StepState;
}

const CLOSED: Record<CloseReason, StatusInfo> = {
  client_cancelled: { statusKey: 'Cancelled-You', label: 'Cancelled (You)', tone: 'end', owner: null, step: 'todo' },
  no_reply: { statusKey: 'Closed-No-Reply', label: 'Closed (No Reply)', tone: 'end', owner: null, step: 'todo' },
  agent_closed: { statusKey: 'Closed-Agent', label: 'Closed (Agent)', tone: 'end', owner: null, step: 'todo' },
};

const BY_STATUS: Record<Exclude<RequestStatus, 'closed'>, StatusInfo> = {
  draft: { statusKey: 'Draft-You', label: 'Draft (You)', tone: 'draft', owner: 'client', step: 'turn' },
  paused: { statusKey: 'Draft-You', label: 'Draft (You)', tone: 'draft', owner: 'client', step: 'turn' },
  submitted: { statusKey: 'Building-Agent', label: 'Building (Agent)', tone: 'work', owner: 'agent', step: 'now' },
  building: { statusKey: 'Building-Agent', label: 'Building (Agent)', tone: 'work', owner: 'agent', step: 'now' },
  checking: { statusKey: 'Checking-Agent', label: 'Checking (Agent)', tone: 'work', owner: 'agent', step: 'now' },
  uat: { statusKey: 'Ready-to-Check-You', label: 'Ready to Check (You)', tone: 'turn', owner: 'client', step: 'turn' },
  live: { statusKey: 'Live', label: 'Live', tone: 'live', owner: null, icon: '✓', step: 'done' },
  pending_chi: { statusKey: 'On-Hold', label: 'On Hold', tone: 'prob', owner: 'agent', icon: '!', step: 'fail' },
};

/**
 * The single status mapping (FS-85): DB status + close reason → badge, owner and tracker state.
 * Mirrors the backend's shared mapping so both sides show the same words.
 */
export function statusInfo(r: { status: RequestStatus; closeReason?: CloseReason }): StatusInfo {
  if (r.status === 'closed') return CLOSED[r.closeReason ?? 'agent_closed'];
  return BY_STATUS[r.status];
}

/** Home focus priority: your turn > problem > working; drafts and ended requests last. */
export const focusRank: Record<BadgeTone, number> = { turn: 0, prob: 1, work: 2, draft: 3, live: 4, end: 5 };
