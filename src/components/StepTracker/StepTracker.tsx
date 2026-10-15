import type { Step, StepState } from '@/data/types';
import { cx } from '@/lib/cx';
import { StepDot } from './StepDot';
import s from './StepTracker.module.css';

const stateText: Record<StepState, string> = {
  done: 'done',
  now: 'in progress',
  your_turn: 'your turn',
  problem: 'problem',
  todo: 'not started',
};
const stateClass: Record<StepState, string | undefined> = { done: s.done, now: s.now, your_turn: s.turn, problem: s.fail, todo: undefined };

/** "Timeline" tracker: 14px dots joined by 2px lines, 11px labels. Renders the API's steps[] as-is. */
export function StepTracker({ steps, className }: { steps: Step[]; className?: string }) {
  return (
    <ol className={cx(s.tracker, className)} aria-label="Progress">
      {steps.map((step) => (
        <li key={step.key} className={cx(s.step, stateClass[step.state])}>
          <span className={s.node} aria-hidden="true">
            <span className={s.line} />
            <StepDot state={step.state} />
          </span>
          <span className={s.label}>
            {step.label}
            <span className="visually-hidden">, {stateText[step.state]}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
