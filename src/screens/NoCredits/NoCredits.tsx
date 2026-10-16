import { useState, type MouseEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { scheduleDraft } from '@/api/studio';
import { AppShell, Columns } from '@/components/Layout';
import { Badge, DraftTag } from '@/components/Badge';
import { buttonClass } from '@/components/Button';
import { EmptyState } from '@/components/States';
import { useToast } from '@/components/Toast';
import { PRICES } from '@/data/seed';
import { useStudio } from '@/state/studio';
import { daysBetween, parseDay, shortDay, today } from '@/lib/date';
import { cx } from '@/lib/cx';
import { routes } from '@/routes';
import t from '@/styles/type.module.css';
import s from './NoCredits.module.css';

/** 13: a text change needs more credits than are free. Nothing is charged; the draft stays saved. */
export function NoCredits() {
  const { id = '' } = useParams();
  const { threads, credits } = useStudio();
  const navigate = useNavigate();
  const toast = useToast();
  const [waiting, setWaiting] = useState(false);
  const thread = threads[id];

  if (!thread || thread.kind !== 'change') {
    return (
      <AppShell>
        <Columns aside={null}>
          <EmptyState title="We couldn't find that draft" body="Your drafts are kept in Chat. Start a new one if you can't see it." />
        </Columns>
      </AppShell>
    );
  }

  const needed = thread.cost;
  const have = Math.min(credits.free, needed);
  const short = Math.max(0, needed - credits.free);
  // Two buckets: monthly credits (reset on the 1st) are spent before top-up credits (never expire).
  const topupFree = Math.min(credits.topUp, credits.free);
  const monthlyFree = credits.free - topupFree;
  const reset = shortDay(credits.resetDate);
  const daysToReset = daysBetween(today(), parseDay(credits.resetDate));
  const summary = thread.summary ?? `${thread.changes.length} ${thread.changes.length === 1 ? 'change' : 'changes'}`;

  const wait = async (e: MouseEvent) => {
    e.preventDefault();
    if (waiting) return;
    setWaiting(true);
    await scheduleDraft(id);
    toast(`Draft kept. #${thread.number} ${thread.title} starts on ${reset}. Nothing was charged.`);
    navigate(routes.requests);
  };

  const aside = (
    <>
      <h2 className={t.label}>If you top up</h2>
      <ol className={s.steps}>
        {[
          ['Request', 'You get a DuitNow ID and reference'],
          [`Pay RM ${PRICES.topUpRm}`, 'From any Malaysian bank app'],
          [`Chi adds ${PRICES.topUpCredits} credits`, `#${thread.number} ${thread.title} starts right away`],
        ].map(([title, detail], i) => (
          <li key={title} className={s.step}>
            <span className={s.stepNo}>{i + 1}</span>
            <span>
              <strong>{title}</strong>
              <small>{detail}</small>
            </span>
          </li>
        ))}
      </ol>
      <p className={s.foot}>Top-up credits never expire and are used after your monthly credits.</p>
    </>
  );

  if (short === 0) {
    return (
      <AppShell>
        <Columns aside={aside} mainClassName={s.main}>
          <EmptyState
            plain
            headingLevel="h1"
            title="You have enough credits now"
            body={`#${thread.number} ${thread.title} needs ${needed} credits and you have ${credits.free} free. Send it from the chat when you're ready.`}
            action={{ label: 'Open draft', to: routes.thread(id) }}
          />
        </Columns>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Columns aside={aside} mainClassName={s.main} mainAs="section">
        <div className={s.block}>
          <Badge tone="prob" size="lg">
            ! Not enough credits
          </Badge>
          <h1 className={s.h1}>You're {short} credits short for this change</h1>
          <p className={s.lead}>
            A change needs {needed} credits. You have {credits.free} ({monthlyFree} monthly, {topupFree} top-up).
          </p>
          <p className={s.calm}>Nothing has started and nothing was charged. Your draft is saved.</p>
        </div>

        <div className={s.block} style={{ gap: 10 }}>
          <div className={s.gapHead}>
            <span>
              This change needs <strong>{needed}</strong>
            </span>
            <span>Resets {reset}</span>
          </div>
          <div className={s.gapBar} role="img" aria-label={`Needs ${needed} credits: you have ${have}, short by ${short}`} style={{ gridTemplateColumns: have > 0 ? `${have}fr ${short}fr` : '1fr' }}>
            {have > 0 && <div className={s.have}>You have {have}</div>}
            <div className={s.short}>Short by {short}</div>
          </div>
        </div>

        <div className={s.draft}>
          <DraftTag />
          <div className={s.draftWhat}>
            <strong>
              #{thread.number} {thread.title}
            </strong>
            <span>
              {summary} · saved {shortDay(thread.savedOn)}
            </span>
          </div>
          <Link to={routes.thread(id)} className={s.openDraft}>
            Open draft
          </Link>
        </div>

        <div className={s.block}>
          <h2 className={t.label}>Choose one</h2>
          <div className={s.cards}>
            <Link to={`${routes.credits}?topup=1`} className={cx('card-link', s.card, s.recommended)}>
              <span className={s.cardHead}>
                <strong>Top up {PRICES.topUpCredits} credits</strong>
                <span className={s.tagGood}>Recommended</span>
              </span>
              <span className={s.cardBody}>RM {PRICES.topUpRm} by DuitNow. Your change starts once Chi confirms payment, usually the same day.</span>
              <span className={buttonClass({ block: true }, s.cardBtn)} aria-hidden="true">
                Top up
              </span>
            </Link>
            <Link to={routes.requests} onClick={wait} className={cx('card-link', s.card)} aria-busy={waiting || undefined}>
              <span className={s.cardHead}>
                <strong>Wait for {reset}</strong>
                <span className={s.tagMuted}>Free · {daysToReset} days</span>
              </span>
              <span className={s.cardBody}>
                We keep the draft. It starts on {reset} when your {credits.monthly} monthly credits arrive.
              </span>
              <span className={buttonClass({ variant: 'secondary', block: true }, s.cardBtn)} aria-hidden="true">
                {waiting ? 'Keeping it…' : `Keep draft for ${reset}`}
              </span>
            </Link>
          </div>
        </div>
      </Columns>
    </AppShell>
  );
}

