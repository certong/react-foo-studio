import { Link, useSearchParams } from 'react-router-dom';
import { AppShell, Columns, HeroNumber } from '@/components/Layout';
import { ButtonLink } from '@/components/Button';
import { SegmentedSwitch } from '@/components/SegmentedSwitch';
import { EmptyState } from '@/components/States';
import { PRICES } from '@/data/seed';
import type { PastRequest } from '@/data/types';
import { useStudio } from '@/state/studio';
import { parseDay, shortDay } from '@/lib/date';
import { costLabel } from '@/lib/requests';
import { cx } from '@/lib/cx';
import { routes } from '@/routes';
import t from '@/styles/type.module.css';
import s from './History.module.css';

type Filter = 'all' | 'change' | 'page';
const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'change', label: 'Text changes' },
  { key: 'page', label: 'New pages' },
];
const isFilter = (v: string | null): v is Filter => v === 'all' || v === 'change' || v === 'page';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthOf = (iso: string) => {
  const d = parseDay(iso);
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

/** Groups newest-first items by "Oct 2026", keeping month order. */
function byMonth(items: PastRequest[]) {
  const groups: Array<{ month: string; items: PastRequest[] }> = [];
  for (const item of [...items].sort((a, b) => b.date.localeCompare(a.date))) {
    const month = monthOf(item.date);
    const last = groups[groups.length - 1];
    if (last?.month === month) last.items.push(item);
    else groups.push({ month, items: [item] });
  }
  return groups;
}

export function History() {
  const { history: all } = useStudio();
  const [params, setParams] = useSearchParams();
  const filter: Filter = isFilter(params.get('type')) ? (params.get('type') as Filter) : 'all';
  const history = params.get('demo') === 'empty' ? [] : all;
  const shown = history.filter((h) => filter === 'all' || h.type === filter);
  const groups = byMonth(shown);

  const creditsUsed = history.reduce((n, h) => n + (h.credits ?? 0), 0);
  const pagesRm = history.filter((h) => h.type === 'page').length * PRICES.newPageRm;
  const since = history.length ? parseDay([...history].sort((a, b) => a.date.localeCompare(b.date))[0].date).toLocaleDateString('en-GB', { month: 'long' }) : null;

  const aside = (
    <>
      <span className={t.label}>{since ? `Since ${since}` : 'So far'}</span>
      <div className={s.totals}>
        <div className={s.total}>
          <strong className="num">{creditsUsed}</strong>
          <span>credits used</span>
        </div>
        <div className={s.total}>
          <strong className="num">RM {pagesRm}</strong>
          <span>on new pages</span>
        </div>
      </div>
      <p className={s.note}>Each request keeps its before and after. To undo one, open it and ask agent-ba.</p>
      <Link to={routes.credits} className={s.creditLink}>
        Credit history →
      </Link>
    </>
  );

  return (
    <AppShell>
      <Columns hero={<HeroNumber value={shown.length} caption="live on your site" />} aside={aside}>
        <div className={s.top}>
          <Link to={routes.requests} className={s.back}>
            ← Requests
          </Link>
          <div className={s.header}>
            <h1 className={s.h1}>Past requests</h1>
            <SegmentedSwitch
              label="Show"
              value={filter}
              onChange={(k) => setParams(k === 'all' ? {} : { type: k }, { replace: true })}
              options={FILTERS}
            />
          </div>
        </div>

        {groups.length === 0 ? (
          <div className={t.ruleTop} style={{ paddingTop: 24 }}>
            <EmptyState
              plain
              number="00"
              title={history.length ? 'Nothing of this type yet' : 'No past requests yet'}
              body={history.length ? 'Try another filter.' : 'Once a change or a new page goes live, it stays here with its before and after.'}
              action={history.length ? null : undefined}
            />
          </div>
        ) : (
          groups.map((g, i) => (
            <section key={g.month} className={s.month} aria-labelledby={`m-${i}`}>
              <h2 id={`m-${i}`} className={cx(t.label, s.monthTitle)}>
                {g.month}
              </h2>
              <ul className={s.list}>
                {g.items.map((x) => (
                  <li key={x.id} className={s.row}>
                    <span className={s.date}>{shortDay(x.date)}</span>
                    <div className={s.what}>
                      <span className={s.meta}>
                        #{x.id} · {x.type === 'page' ? 'New page' : 'Text change'} · {x.scope}
                      </span>
                      <h3 className={s.title}>{x.title}</h3>
                    </div>
                    <span className={s.cost}>{costLabel(x.credits)}</span>
                    <ButtonLink to={routes.review(x.id)} variant="secondary" size="xs" aria-label={`See changes: ${x.title}`}>
                      See changes
                    </ButtonLink>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </Columns>
    </AppShell>
  );
}
