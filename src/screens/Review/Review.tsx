import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { approveChange } from '@/api/studio';
import { AppShell, BottomBar, Columns, HeroNumber } from '@/components/Layout';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { fieldStyles as f } from '@/components/Field';
import { EmptyState } from '@/components/States';
import { useToast } from '@/components/Toast';
import { session } from '@/data/seed';
import type { ReviewChange } from '@/data/types';
import { useStudio } from '@/state/studio';
import { shortDay } from '@/lib/date';
import { cx } from '@/lib/cx';
import { routes } from '@/routes';
import t from '@/styles/type.module.css';
import s from './Review.module.css';

export function Review() {
  const { id: idParam } = useParams();
  const id = Number(idParam);
  const { requests, history, credits } = useStudio();
  const navigate = useNavigate();
  const toast = useToast();

  const [lang, setLang] = useState<'both' | 'en'>('both');
  const [checked, setChecked] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const active = requests.find((r) => r.id === id);
  const past = history.find((h) => h.id === id);
  const title = active?.title ?? past?.title;
  const changes: ReviewChange[] = (active?.changes?.length ? active.changes : past?.changes) ?? [];
  const approvable = active?.status === 'uat' && active.type === 'change';
  const hasMalay = changes.some((c) => c.kind === 'text' && c.rows.some((r) => r.lang === 'Malay'));

  if (!title) {
    return (
      <AppShell>
        <Columns hero={<HeroNumber value="—" />} aside={null}>
          <EmptyState title="We couldn't find that request" body="It may have been closed. Your requests are all on the Requests page." action={{ label: 'Go to Requests', to: routes.requests }} />
        </Columns>
      </AppShell>
    );
  }

  const cost = active?.credits ?? 0;
  const liveSince = past ? shortDay(past.date) : null;

  const onApprove = async () => {
    setPublishing(true);
    try {
      await approveChange(id, lang === 'en');
      toast(`Published to ${session.site}. ${cost} credits charged.`);
      navigate(routes.requests);
    } catch {
      toast("Couldn't publish. Nothing was charged. Try again.", 'error');
      setPublishing(false);
    }
  };

  const aside =
    approvable && hasMalay ? (
      <>
        <span className={t.label}>Malay text</span>
        <p className={s.asideText}>Your site also has Malay text.</p>
        <div className={s.toggles} role="group" aria-label="Languages to update">
          <Button variant="secondary" aria-pressed={lang === 'both'} onClick={() => setLang('both')}>
            Update Malay too
          </Button>
          <Button variant="secondary" aria-pressed={lang === 'en'} onClick={() => setLang('en')}>
            English only
          </Button>
        </div>
      </>
    ) : null;

  const bottomBar = approvable ? (
    <BottomBar className={s.bar}>
      <label className={cx(f.check, s.check)}>
        <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} disabled={publishing} />
        I've checked the changes
      </label>
      <span className={s.charge}>
        {cost} credits will be charged when you approve. You'll still have {credits.free} free.
      </span>
      <Link to={routes.thread(id)} className={s.fix}>
        Ask agent-ba to fix
      </Link>
      <Button size="lg" disabled={!checked} loading={publishing} loadingLabel="Publishing…" onClick={onApprove}>
        Approve and publish
      </Button>
    </BottomBar>
  ) : undefined;

  return (
    <AppShell bottomBar={bottomBar} bottomHeight={112}>
      <Columns
        hero={<HeroNumber value={changes.length} caption={approvable ? 'changes to check' : changes.length === 1 ? 'change' : 'changes'} />}
        heroClassName={s.hero}
        mainClassName={s.main}
        aside={aside}
        asideClassName={s.hero}
      >
        <div className={s.intro}>
          <span className={s.meta}>
            #{id} · {title}
          </span>
          <h1 className={s.h1}>{approvable ? 'Check before and after' : 'What changed'}</h1>
          <p className={s.lead}>
            {approvable
              ? `Nothing changes on ${session.site} until you approve.`
              : liveSince
                ? `Live on ${session.site} since ${liveSince}.`
                : `This is live on ${session.site}.`}
          </p>
        </div>

        {changes.length === 0 ? (
          <EmptyState
            title="This was a new page"
            body={`There was no "before" to compare: the whole page was added to ${session.site}.`}
            action={{ label: 'Back to Past requests', to: routes.history }}
          />
        ) : (
          changes.map((c, i) => <Change key={i} n={i + 1} change={c} englishOnly={lang === 'en'} />)
        )}
      </Columns>
    </AppShell>
  );
}

/** One change: text rows (Now / After per language) or a visual Now / After pair. */
function Change({ n, change, englishOnly }: { n: number; change: ReviewChange; englishOnly: boolean }) {
  const heading = `${n}. ${change.where}`;
  if (change.kind === 'visual') {
    return (
      <section className={s.change} aria-label={heading}>
        <div className={s.changeHead}>
          <h2 className={s.changeTitle}>{heading}</h2>
          <Badge tone="info">Visual change</Badge>
        </div>
        <div className={s.figures}>
          <Shot caption="Now" label={change.now} />
          <Shot caption="After" label={change.after} changed />
        </div>
        <span className={s.hint}>The yellow outline marks what changed.</span>
      </section>
    );
  }
  return (
    <section className={s.change} aria-label={heading}>
      <h2 className={s.changeTitle}>{heading}</h2>
      {change.rows.map((row) => {
        const unchanged = englishOnly && row.lang === 'Malay';
        return (
          <div key={row.lang} className={s.row}>
            <span className={s.lang}>{row.lang}</span>
            <div className={s.cell}>
              <small>Now</small>
              <span>{row.now}</span>
            </div>
            <div className={cx(s.cell, unchanged ? s.unchanged : s.after)}>
              <small>After</small>
              <span>{unchanged ? 'Stays as now' : row.after}</span>
            </div>
          </div>
        );
      })}
    </section>
  );
}

function Shot({ caption, label, changed }: { caption: string; label: string; changed?: boolean }) {
  return (
    <figure className={s.figure}>
      <figcaption>{caption}</figcaption>
      <div className={s.frame}>
        <div className={s.chrome} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className={cx(s.shot, changed && s.shotChanged)} role="img" aria-label={`${caption}: ${label}`}>
          {label}
          {changed && <span className={s.changedTag}>Changed</span>}
        </div>
        <div className={s.lines} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
    </figure>
  );
}
