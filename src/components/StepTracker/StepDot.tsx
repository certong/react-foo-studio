import type { CSSProperties } from 'react';
import type { StepState } from '@/data/types';
import { cx } from '@/lib/cx';
import s from './StepDot.module.css';

const MARK: Record<StepState, string> = { done: '✓', now: '', turn: '•', fail: '!', todo: '' };

/** One step marker. Colours come from the --dot-* tokens; the mark keeps it readable without colour. */
export function StepDot({ state, size = 14, className }: { state: StepState; size?: number; className?: string }) {
  return (
    <span aria-hidden="true" className={cx(s.dot, s[state], className)} style={{ '--dot-size': `${size}px` } as CSSProperties}>
      {MARK[state]}
    </span>
  );
}
