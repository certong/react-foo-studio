import type { StepState } from '@/data/types';
import type { Step } from '@/lib/steps';
import { cx } from '@/lib/cx';
import { StepDot } from './StepDot';
import s from './StepTracker.module.css';

const stateText: Record<StepState, string> = {
  done: 'done',
  now: 'in progress',
  turn: 'your turn',
  fail: 'problem',
  todo: 'not started',
};

/** "Timeline" tracker: 14px dots joined by 2px lines, 11px labels. */
export function StepTracker({ steps, className }: { steps: Step[]; className?: string }) {
  return (
    <ol className={cx(s.tracker, className)} aria-label="Progress">
      {steps.map((step) => (
        <li key={step.label} className={cx(s.step, s[step.state])}>
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
