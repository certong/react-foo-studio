import { Link, useSearchParams } from 'react-router-dom';
import { AppShell, ChatPromptBar, Columns, HeroNumber } from '@/components/Layout';
import { ButtonLink } from '@/components/Button';
import { StatusBadge } from '@/components/Badge';
import { EmptyState } from '@/components/States';
import { session } from '@/data/seed';
import { useStudio } from '@/state/studio';
import type { StudioRequest } from '@/data/types';
import { formatLong, greeting, today } from '@/lib/date';
import { byFocus, deadlineFor, isYourTurn, REPLY_WINDOW_DAYS, requestHref, typeLabel } from '@/lib/requests';
import { statusBadge } from '@/lib/status';
import { cx } from '@/lib/cx';
import t from '@/styles/type.module.css';
import s from './Home.module.css';

const pad = (n: number) => String(n).padStart(2, '0');

/** What the focus block says and offers, per status. */
function focusCopy(r: StudioRequest): { lead: string; cta: string; primary: boolean } {
  switch (r.status) {
    case 'preview':
      return { lead: 'The page is ready to look at. It goes live only when you approve.', cta: 'Review preview', primary: true };
    case 'approve':
      return {
        lead: `${r.changeCount ? `${r.changeCount} changes are` : 'Your change is'} ready to check. Nothing changes on ${session.site} until you approve.`,
        cta: 'Check before and after',
        primary: true,
      };
    case 'with_chi':
      return { lead: "A check didn't pass, so nothing went live. Chi is fixing it. No action needed from you.", cta: 'See details', primary: false };
    default:
      return { lead: `We're on it. ${r.note}.`, cta: 'See progress', primary: false };
  }
}

/** `?demo=empty` shows the no-requests state; `?demo=caught-up` shows nothing waiting. */
function useHomeRequests(): StudioRequest[] {
  const { requests } = useStudio();
  const [params] = useSearchParams();
  const demo = params.get('demo');
  if (demo === 'empty') return [];
  if (demo === 'caught-up') return requests.filter((r) => r.status === 'live');
  return requests;
}

export function Home() {
  const all = useHomeRequests();
  const ordered = byFocus(all);
  const focus = ordered[0];
  const waiting = ordered.filter(isYourTurn);
  const afterThis = waiting.filter((r) => r !== focus);
  const inProgress = ordered.filter((r) => !isYourTurn(r) && r !== focus);
  const next = afterThis[0] ?? inProgress[0];
  const now = today();

  const hero = focus && isYourTurn(focus) ? (
    <HeroNumber value={waiting.indexOf(focus) + 1} caption={`of ${pad(waiting.length)} waiting`} />
  ) : (
    <HeroNumber value={0} caption="waiting on you" />
  );

  const aside = (
    <>
      {afterThis.length > 0 && <span className={cx(t.label, s.asideLabel)}>After this</span>}
      {afterThis.map((r, i) => (
        <QueueItem key={r.id} r={r} prefix={`${pad(i + 2)} · `} />
      ))}
      {inProgress.length > 0 && <span className={cx(t.label, s.asideLabel)}>In progress</span>}
      {inProgress.map((r) => (
        <QueueItem key={r.id} r={r} />
      ))}
    </>
  );

  return (
    <AppShell bottomBar={<ChatPromptBar />}>
      <Columns hero={hero} aside={aside} mainClassName={s.main} asideClassName={s.aside}>
        <span className={s.date}>
          {formatLong(now)} · {greeting()}, {session.name}
        </span>
        {focus ? <Focus r={focus} /> : <Empty hasRequests={all.length > 0} />}
        {focus && next && (
          <Link to={requestHref(next)} className={s.skip}>
            Skip to {next.shortTitle ?? next.title} →
          </Link>
        )}
      </Columns>
    </AppShell>
  );
}

function Focus({ r }: { r: StudioRequest }) {
  const copy = focusCopy(r);
  const deadline = deadlineFor(r);
  return (
    <>
      <div className={s.meta}>
        <span>
          #{r.id} · {typeLabel(r)}
        </span>
        <StatusBadge status={r.status} />
      </div>
      <h1 className={s.title}>{r.title}</h1>
      <p className={s.lead}>{copy.lead}</p>
      <div className={s.action}>
        <ButtonLink to={requestHref(r)} size="hero" variant={copy.primary ? 'primary' : 'secondary'}>
          {copy.cta}
        </ButtonLink>
        {deadline && (
          <div className={s.deadline}>
            <span className={s.deadlineText}>{deadline.text}</span>
            <div className={s.days} role="img" aria-label={`${deadline.daysUsed} of ${REPLY_WINDOW_DAYS} days used`}>
              {Array.from({ length: REPLY_WINDOW_DAYS }, (_, i) => (
                <span key={i} className={cx(s.day, i < deadline.daysUsed && s.dayUsed)} />
              ))}
            </div>
          </div>
        )}
      </div>
      {deadline && (
        <p className={s.note}>
          No reply by {deadline.label}: the {r.type === 'page' ? 'page' : 'change'} closes without going live, and Chi checks in.
        </p>
      )}
    </>
  );
}

function Empty({ hasRequests }: { hasRequests: boolean }) {
  return hasRequests ? (
    <EmptyState plain headingLevel="h1" title="Nothing needs you right now" body="Everything you asked for is live. Ask agent-ba when you want something else changed." />
  ) : (
    <EmptyState plain headingLevel="h1" title="No requests yet" body="When you ask agent-ba for something, it shows up here." />
  );
}

function QueueItem({ r, prefix = '' }: { r: StudioRequest; prefix?: string }) {
  const deadline = deadlineFor(r);
  const problem = statusBadge[r.status].tone === 'prob';
  const detail = isYourTurn(r)
    ? [r.changeCount ? `${r.changeCount} changes` : null, deadline ? deadline.text : 'no deadline'].filter(Boolean).join(' · ')
    : r.note;
  return (
    <Link to={requestHref(r)} className={s.queueItem}>
      <span className={s.queueMeta}>
        {prefix}#{r.id} · {statusBadge[r.status].label}
      </span>
      <strong className={s.queueTitle}>{r.title}</strong>
      <span className={cx(s.queueDetail, problem && s.queueDetailProblem)}>{detail}</span>
    </Link>
  );
}
