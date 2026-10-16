import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { confirmSignOff } from '@/api/studio';
import { AppShell, Columns, HeroNumber } from '@/components/Layout';
import { Button } from '@/components/Button';
import { BlockMap, SketchFrame } from '@/components/Chat';
import { fieldStyles as f } from '@/components/Field';
import { EmptyState } from '@/components/States';
import { useToast } from '@/components/Toast';
import { PRICES, session } from '@/data/seed';
import { useStudio } from '@/state/studio';
import { addWorkingDays, formatShort, today } from '@/lib/date';
import { cx } from '@/lib/cx';
import { routes } from '@/routes';
import t from '@/styles/type.module.css';
import s from './SignOff.module.css';

const BUILD_DAYS = 3;

/** 10: sign off a new page. Confirm stays disabled until the terms are ticked; confirming sends the invoice. */
export function SignOff() {
  const { id = '' } = useParams();
  const { threads, requests } = useStudio();
  const navigate = useNavigate();
  const toast = useToast();
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const thread = threads[id];

  if (requests.some((r) => r.id === id)) return <Navigate to={routes.progress(id)} replace />;
  if (!thread || thread.kind !== 'new_page' || !thread.plan?.length) {
    return (
      <AppShell>
        <Columns hero={<HeroNumber value="—" />} aside={null}>
          <EmptyState title="Nothing to sign off yet" body="Plan the page with agent-ba first. Its sections show up here once there's a plan." action={{ label: 'Back to chat', to: thread ? routes.thread(id) : routes.chatStart }} />
        </Columns>
      </AppShell>
    );
  }

  const blocks = thread.plan.filter((b) => !b.unmatched);
  const unmatched = thread.plan.filter((b) => b.unmatched);
  const ready = formatShort(addWorkingDays(today(), BUILD_DAYS));

  const confirm = async () => {
    setBusy(true);
    await confirmSignOff(id);
    toast(`Signed off. Invoice for RM ${PRICES.newPageRm} sent to ${session.email}.`);
    navigate(routes.progress(id));
  };

  const aside = (
    <>
      <div className={s.facts}>
        <div className={s.fact}>
          <span className={t.label}>Price</span>
          <strong>RM {PRICES.newPageRm}</strong>
          <span>Invoiced separately</span>
        </div>
        <div className={s.fact}>
          <span className={t.label}>Ready in</span>
          <strong>{BUILD_DAYS} days</strong>
          <span>Working days · by {ready}</span>
        </div>
      </div>
      {unmatched.length > 0 && <p className={s.excluded}>{unmatched.map((b) => b.kind).join(', ')} is not included. Chi will quote it separately.</p>}
      <ul className={s.terms}>
        <li>English only, using images already on your site.</li>
        <li>You check a preview before it goes live. 1 free change round.</li>
        <li>You have 7 days to reply. If not, the page closes without going live and Chi follows up.</li>
      </ul>
      <label className={cx(f.check, s.agree)}>
        <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} disabled={busy} />
        I agree to these terms
      </label>
      <Button size="lg" block disabled={!terms} loading={busy} loadingLabel="Sending invoice…" onClick={confirm}>
        Confirm · RM {PRICES.newPageRm}
      </Button>
      <Link to={routes.thread(id)} className={s.back}>
        Back to chat
      </Link>
    </>
  );

  return (
    <AppShell>
      <Columns hero={<HeroNumber value={blocks.length} caption="sections" />} aside={aside} asideWidth={400} asideCard asideClassName={s.aside}>
        <div className={s.intro}>
          <span className={s.meta}>#{thread.number} · New page</span>
          <h1 className={s.h1}>Sign off: {thread.title}</h1>
        </div>

        <section className={s.section} aria-labelledby="build-title">
          <h2 id="build-title" className={cx(t.label, s.sectionTitle)}>
            What we'll build
          </h2>
          <ol className={s.list}>
            {blocks.map((b, i) => (
              <li key={i} className={s.row}>
                <span className={s.n}>{i + 1}</span>
                <span className={s.what}>
                  <strong>{b.kind}</strong>
                  <span>{b.title}</span>
                </span>
                <span className={s.words}>{b.words ?? ''}</span>
              </li>
            ))}
          </ol>
          <span className={s.used}>
            Previews used: {thread.previewsUsed ?? 0} of {PRICES.freePreviews}
          </span>
        </section>

        {thread.sketch && (
          <section className={cx(s.section, s.sketchWrap)} aria-labelledby="sketch-title">
            <h2 id="sketch-title" className={t.label}>
              Your sketch → our plan
            </h2>
            <div className={s.sketchGrid}>
              <SketchFrame blocks={thread.plan} width={220} caption={thread.sketch.name} />
              <div>
                <BlockMap blocks={thread.plan} />
                <p className={s.hint}>Check the numbers match. Spacing and sizes follow your site's style.</p>
              </div>
            </div>
          </section>
        )}
      </Columns>
    </AppShell>
  );
}
