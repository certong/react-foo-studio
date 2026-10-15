import type { ReactNode } from 'react';
import type { CloseReason, RequestStatus } from '@/data/types';
import { cx } from '@/lib/cx';
import { statusInfo, type BadgeTone } from '@/lib/status';
import s from './Badge.module.css';

interface BadgeProps {
  tone: BadgeTone | 'info';
  size?: 'md' | 'lg';
  className?: string;
  children: ReactNode;
}

export function Badge({ tone, size = 'md', className, children }: BadgeProps) {
  return <span className={cx(s.badge, s[tone], size === 'lg' && s.lg, className)}>{children}</span>;
}

/** Badge for a request, from the shared FS-85 status mapping (e.g. "Ready to Check (You)"). */
export function StatusBadge({ request, size }: { request: { status: RequestStatus; closeReason?: CloseReason }; size?: 'md' | 'lg' }) {
  const { label, tone, icon } = statusInfo(request);
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
