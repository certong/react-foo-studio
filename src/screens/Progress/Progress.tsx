import { useParams } from 'react-router-dom';
import { AppShell, Columns, HeroNumber } from '@/components/Layout';
import { ButtonLink } from '@/components/Button';
import { StatusBadge } from '@/components/Badge';
import { StepDot } from '@/components/StepTracker';
import { EmptyState } from '@/components/States';
import { PRICES } from '@/data/seed';
import type { StudioRequest } from '@/data/types';
import { useStudio } from '@/state/studio';
import { stepsFor } from '@/lib/steps';
import { actionLabel, isYourTurn, requestHref, typeLabel } from '@/lib/requests';
import { shortDay } from '@/lib/date';
import { cx } from '@/lib/cx';
import t from '@/styles/type.module.css';
import s from './Progress.module.css';

/** 12: dated timeline. The current step pulses; a failed step is red with "!" and Chi's note. */
export function Progress() {
  const { id: param } = useParams();
  const { requests } = useStudio();
  const r = requests.find((x) => x.id === Number(param));

  if (!r) {
    return (
      <AppShell>
        <Columns hero={<HeroNumber value="—" />} aside={null}>
          <EmptyState title="We couldn't find that request" body="It may have gone live or been closed. Past requests keep everything that went live." action={{ label: 'Go to Requests', to: '/requests' }} />
        </Columns>
      </AppShell>
    );
  }

  const steps = stepsFor(r);
  const allDone = steps.every((x) => x.state === 'done');
  const current = allDone ? steps.length : r.currentStep + 1;

  return (
    <AppShell>
      <Columns hero={<HeroNumber value={current} caption={allDone ? 'all steps done' : `of ${steps.length} steps`} />} aside={<SignedOff r={r} />}>
        <div className={s.intro}>
          <div className={s.meta}>
            <span>
              #{r.id} · {typeLabel(r)}
            </span>
            <StatusBadge request={r} />
          </div>
          <h1 className={s.h1}>{r.title}</h1>
        </div>

        <ol className={s.timeline} aria-label="Progress">
          {steps.map((step, i) => {
            const when = r.timeline?.[i];
            const date = when ? (when.estimate ? `by ${when.when}` : when.when) : '';
            const isNow = step.state === 'now';
            return (
              <li key={step.label} className={cx(s.item, s[step.state])} aria-current={isNow || step.state === 'turn' || step.state === 'fail' ? 'step' : undefined}>
                <span className={s.date}>{date}</span>
                <StepDot state={step.state} className={cx(s.dot, isNow && s.ring)} />
                {isNow && (
                  <>
                    <span className={s.beacon} aria-hidden="true" />
                    <span className={s.blink} aria-hidden="true" />
                  </>
                )}
                <h2 className={s.name}>
                  {step.label}
                  <span className="visually-hidden">
                    {' '}
                    ({{ done: 'done', now: 'in progress', turn: 'your turn', fail: 'problem', todo: 'not started' }[step.state]})
                  </span>
                </h2>
                <span className={s.detail}>{when?.detail}</span>
                {step.state === 'fail' && r.chiNote && <p className={s.chiNote}>{r.chiNote}</p>}
              </li>
            );
          })}
        </ol>

        {isYourTurn(r) && (
          <ButtonLink to={requestHref(r)} className={s.cta}>
            {actionLabel(r)}
          </ButtonLink>
        )}
      </Columns>
    </AppShell>
  );
}

function SignedOff({ r }: { r: StudioRequest }) {
  if (r.type === 'change') {
    return (
      <>
        <span className={t.label}>What's changing</span>
        <span className={s.signed}>
          {r.credits} credits · {r.status === 'live' ? 'charged' : 'set aside, charged when you approve'}
        </span>
        {(r.changes ?? []).map((c, i) => (
          <div key={i} className={s.block}>
            <span>{i + 1}</span>
            <span>
              <strong>{c.where}</strong>
              <small>{c.kind === 'text' ? c.rows.map((row) => row.after).join(' · ') : c.after}</small>
            </span>
          </div>
        ))}
        <p className={s.note}>{r.note}</p>
      </>
    );
  }
  return (
    <>
      <span className={t.label}>What you signed off</span>
      <span className={s.signed}>
        {r.signedOff ? `${shortDay(r.signedOff)} · ` : ''}RM {PRICES.newPageRm} · invoice sent
      </span>
      {(r.blocks ?? []).map((b, i) => (
        <div key={i} className={s.block}>
          <span>{i + 1}</span>
          <span>
            <strong>{b.kind}</strong>
            <small>{b.title}</small>
          </span>
        </div>
      ))}
      <p className={s.note}>
        {r.status === 'pending_chi'
          ? "No action needed from you. Chi will message you when it's fixed."
          : "You'll get a message when the preview is ready. You then have 7 days and 1 free change round."}
      </p>
    </>
  );
}
