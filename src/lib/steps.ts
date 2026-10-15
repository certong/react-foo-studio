import type { RequestType, StepState, StudioRequest } from '@/data/types';
import { statusInfo } from '@/lib/status';

export const STEP_LABELS: Record<RequestType, string[]> = {
  change: ['Plan', 'Check', 'Ready to Check', 'Live'],
  page: ['Plan', 'Build', 'Check', 'Ready to Check', 'Live'],
};

export interface Step {
  label: string;
  state: StepState;
}


export function buildSteps(type: RequestType, current: number, kind: StepState): Step[] {
  return STEP_LABELS[type].map((label, i) => ({
    label,
    state: i < current ? 'done' : i === current ? kind : 'todo',
  }));
}

/** Tracker for a request. Closed and on-hold requests stop at the step they reached. */
export function stepsFor(req: Pick<StudioRequest, 'type' | 'status' | 'closeReason' | 'currentStep'>): Step[] {
  return buildSteps(req.type, req.currentStep, statusInfo(req).step);
}
