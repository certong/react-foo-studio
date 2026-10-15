import type { ReactNode } from 'react';
import type { StatusKey } from '@/data/types';
import { cx } from '@/lib/cx';
import { badgeLook, type BadgeTone } from '@/lib/status';
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

/** Badge for a request: the words come from the API's `badge`, the colour and icon from its `statusKey`. */
export function StatusBadge({ request, size }: { request: { statusKey: StatusKey; badge: string }; size?: 'md' | 'lg' }) {
  const { tone, icon } = badgeLook[request.statusKey];
  return (
    <Badge tone={tone} size={size}>
      {icon && <span aria-hidden="true">{icon}</span>}
      {request.badge}
    </Badge>
  );
}

/** Plan not signed off yet. Dashed so it never reads as a button. */
export function DraftTag() {
  return <Badge tone="draft">Draft</Badge>;
}
