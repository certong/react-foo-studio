import type { ReactNode } from 'react';
import type { RequestStatus } from '@/data/types';
import { cx } from '@/lib/cx';
import { statusBadge, type BadgeTone } from '@/lib/status';
import s from './Badge.module.css';

interface BadgeProps {
  tone: BadgeTone | 'draft' | 'info';
  size?: 'md' | 'lg';
  className?: string;
  children: ReactNode;
}

export function Badge({ tone, size = 'md', className, children }: BadgeProps) {
  return <span className={cx(s.badge, s[tone], size === 'lg' && s.lg, className)}>{children}</span>;
}

export function StatusBadge({ status, size }: { status: RequestStatus; size?: 'md' | 'lg' }) {
  const { label, tone, icon } = statusBadge[status];
  return (
    <Badge tone={tone} size={size}>
      {icon && <span aria-hidden="true">{icon}</span>}
      {label}
    </Badge>
  );
}

/** Plan not signed off yet. Dashed so it never reads as a button. */
export function DraftTag() {
  return <Badge tone="draft">Draft</Badge>;
}
