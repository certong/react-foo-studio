import type { RequestStatus, RequestType, StepState, StudioRequest } from '@/data/types';

export const STEP_LABELS: Record<RequestType, string[]> = {
  change: ['Plan', 'Check', 'Approve', 'Live'],
  page: ['Plan', 'Build', 'Check', 'Approve', 'Live'],
};

export interface Step {
  label: string;
  state: StepState;
}

const currentState: Record<RequestStatus, StepState> = {
  draft: 'todo',
  in_progress: 'now',
  building: 'now',
  approve: 'turn',
  preview: 'turn',
  with_chi: 'fail',
  live: 'done',
  closed: 'todo',
  dropped: 'todo',
};

export function buildSteps(type: RequestType, current: number, kind: StepState): Step[] {
  return STEP_LABELS[type].map((label, i) => ({
    label,
    state: i < current ? 'done' : i === current ? kind : 'todo',
  }));
}

export function stepsFor(req: Pick<StudioRequest, 'type' | 'status' | 'currentStep'>): Step[] {
  return buildSteps(req.type, req.currentStep, currentState[req.status]);
}
