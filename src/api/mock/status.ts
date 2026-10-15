/**
 * The mock's copy of nest-foo-studio's mapStatus() (src/contract/status.ts, FS-85).
 * In production the API sends statusKey, badge, owner and steps[] with every request; only the
 * mock needs to work them out, so this lives here and nowhere in src/lib.
 */
import type { ActiveStatus, CloseReason, Owner, RequestStatus, RequestType, StatusKey, Step, StepKey, StepState } from '@/data/types';

const STEP_LABELS: Record<StepKey, string> = {
  plan: 'Plan',
  build: 'Build',
  check: 'Check',
  ready_to_check: 'Ready to Check',
  live: 'Live',
};

const STEPS_BY_TYPE: Record<RequestType, readonly StepKey[]> = {
  change: ['plan', 'check', 'ready_to_check', 'live'],
  new_page: ['plan', 'build', 'check', 'ready_to_check', 'live'],
};

interface Row {
  statusKey: StatusKey;
  badge: string;
  owner: Owner;
}

const ACTIVE_ROWS: Record<ActiveStatus, Row & { step: StepKey }> = {
  draft: { statusKey: 'Draft-You', badge: 'Draft (You)', owner: 'client', step: 'plan' },
  paused: { statusKey: 'Draft-You', badge: 'Draft (You)', owner: 'client', step: 'plan' },
  submitted: { statusKey: 'Building-Agent', badge: 'Building (Agent)', owner: 'agent', step: 'build' },
  building: { statusKey: 'Building-Agent', badge: 'Building (Agent)', owner: 'agent', step: 'build' },
  checking: { statusKey: 'Checking-Agent', badge: 'Checking (Agent)', owner: 'agent', step: 'check' },
  uat: { statusKey: 'Ready-to-Check-You', badge: 'Ready to Check (You)', owner: 'client', step: 'ready_to_check' },
  live: { statusKey: 'Live', badge: 'Live', owner: null, step: 'live' },
};

const ON_HOLD_ROW: Row = { statusKey: 'On-Hold', badge: 'On Hold', owner: 'agent' };

const CLOSED_ROWS: Record<CloseReason, Row> = {
  client_cancelled: { statusKey: 'Cancelled-You', badge: 'Cancelled (You)', owner: null },
  no_reply: { statusKey: 'Closed-No-Reply', badge: 'Closed (No Reply)', owner: null },
  agent_closed: { statusKey: 'Closed-Agent', badge: 'Closed (Agent)', owner: null },
};

export interface StatusView extends Row {
  status: RequestStatus;
  closeReason: CloseReason | null;
  steps: Step[];
}

/** Changes have no Build step, so submitted/building sit on Check. */
function stepFor(status: ActiveStatus, type: RequestType): StepKey {
  const step = ACTIVE_ROWS[status].step;
  return step === 'build' && type === 'change' ? 'check' : step;
}

function buildSteps(type: RequestType, current: StepKey, stateAtCurrent: StepState): Step[] {
  const keys = STEPS_BY_TYPE[type];
  const at = keys.indexOf(current);
  return keys.map((key, i) => ({ key, label: STEP_LABELS[key], state: i < at ? 'done' : i === at ? stateAtCurrent : 'todo' }));
}

export function mapStatus(input: { status: RequestStatus; closeReason: CloseReason | null; type: RequestType; stoppedAt?: ActiveStatus | null }): StatusView {
  const { status, closeReason, type } = input;
  const stoppedAt = input.stoppedAt ?? null;
  if (status === 'closed') {
    if (!closeReason || !stoppedAt) throw new Error('closed request needs closeReason and stoppedAt');
    return { status, closeReason, ...CLOSED_ROWS[closeReason], steps: buildSteps(type, stepFor(stoppedAt, type), 'todo') };
  }
  if (status === 'pending_chi') {
    if (!stoppedAt) throw new Error('pending_chi request needs stoppedAt');
    return { status, closeReason: null, ...ON_HOLD_ROW, steps: buildSteps(type, stepFor(stoppedAt, type), 'problem') };
  }
  const { step: _step, ...row } = ACTIVE_ROWS[status];
  const current: StepState = status === 'live' ? 'done' : row.owner === 'client' ? 'your_turn' : 'now';
  return { status, closeReason: null, ...row, steps: buildSteps(type, stepFor(status, type), current) };
}
