import type { ReactNode } from 'react';
import { Button, ButtonLink } from '@/components/Button';
import { StatusBadge } from '@/components/Badge';
import { StepTracker } from '@/components/StepTracker';
import type { StudioRequest } from '@/data/types';
import { stepsFor } from '@/lib/steps';
import { typeLabel } from '@/lib/requests';
import { cx } from '@/lib/cx';
import { routes } from '@/routes';
import s from './States.module.css';

export const CHI_WHATSAPP = 'https://wa.me/60123000000';

interface EmptyStateProps {
  title: string;
  body: ReactNode;
  /** Big number above the title, e.g. "00". */
  number?: string;
  action?: { label: string; to: string } | null;
  /** Drop the 2px top rule when the state sits inside a list that already has one. */
  plain?: boolean;
  headingLevel?: 'h1' | 'h2';
}

/** "Nothing here yet" block used by Home, Requests, Past requests and Chat. */
export function EmptyState({ title, body, number, action = { label: 'Start a chat', to: routes.chatStart }, plain, headingLevel: H = 'h2' }: EmptyStateProps) {
  return (
    <section className={cx(s.block, plain && s.plain)}>
      {number && (
        <span className={s.number} aria-hidden="true">
          {number}
        </span>
      )}
      <H className={s.title}>{title}</H>
      <p className={s.body}>{body}</p>
      {action && <ButtonLink to={action.to}>{action.label}</ButtonLink>}
    </section>
  );
}

/** agent-ba can't reply. The message stays saved; Try again re-sends it. */
export function ChatOffline({ onRetry, retrying, plain }: { onRetry: () => void; retrying?: boolean; plain?: boolean }) {
  return (
    <section className={cx(s.block, s.offline, plain && s.plain)} role="alert">
      <span className={s.alert}>Chat offline</span>
      <h2 className={s.title}>agent-ba can't reply right now</h2>
      <p className={s.body}>Your message is saved. Try again in a few minutes, or talk to Chi.</p>
      <div className={s.actions}>
        <Button variant="secondary" onClick={onRetry} loading={retrying} loadingLabel="Trying…">
          Try again
        </Button>
        <a className={s.link} href={CHI_WHATSAPP} target="_blank" rel="noopener noreferrer">
          Talk to Chi
        </a>
      </div>
    </section>
  );
}

/** A request whose automatic check failed: red step on the shared tracker, Chi's note, nothing to do. */
export function CheckFailed({ request, plain }: { request: StudioRequest; plain?: boolean }) {
  return (
    <section className={cx(s.block, plain && s.plain)}>
      <div className={s.meta}>
        <span>
          #{request.id} · {typeLabel(request)}
        </span>
        <StatusBadge status={request.status} />
      </div>
      <h2 className={s.title}>{request.title}</h2>
      <StepTracker steps={stepsFor(request)} />
      <p className={s.body}>{request.chiNote ?? "A check didn't pass, so nothing went live. Chi is fixing it."}</p>
      <p className={s.calm}>No action needed from you.</p>
    </section>
  );
}
