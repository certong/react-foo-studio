import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { cancelTopUp, getCredits, requestTopUp } from '@/api/studio';
import { AppShell, Columns } from '@/components/Layout';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { CountUp } from '@/components/CountUp/CountUp';
import { useToast } from '@/components/Toast';
import { PRICES, session, usage } from '@/data/seed';
import type { Credits as CreditsData, LedgerEntry } from '@/data/types';
import { useStudio } from '@/state/studio';
import { shortDay, today } from '@/lib/date';
import { cx } from '@/lib/cx';
import { routes } from '@/routes';
import t from '@/styles/type.module.css';
import s from './Credits.module.css';

const LEDGER_LIMIT = 5;

export function Credits() {
  const { credits, ledger } = useStudio();
  const [params] = useSearchParams();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    getCredits().then(() => alive && setLoaded(true));
    return () => {
      alive = false;
    };
  }, []);

  const entries = params.get('ledger') === 'long' ? [...ledger, ...demoEntries()] : ledger;
  const layout = params.get('layout') === 'dial' ? 'dial' : 'ledger';

  return (
    <AppShell>
      <Columns aside={<TopUpAside credits={credits} focus={params.get('topup') === '1'} />}>
        <div className={s.intro}>
          <h1 className={s.h1}>Credits</h1>
          <p className={t.lead}>
            Your plan gives you {credits.monthly} credits each month. They reset on the 1st and don't roll over.
          </p>
        </div>

        {layout === 'dial' ? (
          <DialLayout credits={credits} entries={entries} loaded={loaded} />
        ) : (
          <>
            <CreditBar credits={credits} loaded={loaded} />
            <div className={s.cols}>
              <Ledger entries={entries} />
              <Usage credits={credits} entries={entries} />
            </div>
          </>
        )}
      </Columns>
    </AppShell>
  );
}

function CreditBar({ credits, loaded }: { credits: CreditsData; loaded: boolean }) {
  const { free, setAside, used, monthly } = credits;
  const grow = (n: number): CSSProperties => ({ flex: `${n} 1 0` });
  return (
    <div className={s.barWrap}>
      {loaded ? (
        <div className={s.bar} role="img" aria-label={`Free ${free}, set aside ${setAside}, used ${used}, out of ${monthly}`}>
          {free > 0 && <span className={s.free} style={grow(free)}>Free {free}</span>}
          {setAside > 0 && <span className={s.held} style={grow(setAside)}>Set aside {setAside}</span>}
          {used > 0 && <span className={s.used} style={grow(used)}>Used {used}</span>}
        </div>
      ) : (
        <div className={s.skeleton} aria-label="Loading credits" />
      )}
      <div className={s.barFoot}>
        <span>Top-up {credits.topUp}</span>
        <span>Next reset {shortDay(credits.resetDate)}</span>
      </div>
    </div>
  );
}

function amountLabel(e: LedgerEntry) {
  if (e.kind === 'held') return { text: `${e.amount} held`, cls: s.heldAmt };
  if (e.amount > 0) return { text: `+${e.amount}`, cls: s.add };
  return { text: `−${Math.abs(e.amount)}`, cls: s.spend };
}

function LedgerRow({ e, pinned }: { e: LedgerEntry; pinned?: boolean }) {
  const amt = amountLabel(e);
  return (
    <li className={cx(s.ledgerRow, pinned && s.pinned)}>
      <span>{shortDay(e.date)}</span>
      <span title={e.text}>{e.text}</span>
      <strong className={cx(s.amt, amt.cls)}>{amt.text}</strong>
    </li>
  );
}

/** This month's ledger: held items pinned on top, then newest first. Long ledgers show 5 and expand. */
function Ledger({ entries }: { entries: LedgerEntry[] }) {
  const [open, setOpen] = useState(false);
  const held = entries.filter((e) => e.kind === 'held');
  const rest = entries.filter((e) => e.kind !== 'held').sort((a, b) => b.date.localeCompare(a.date));
  const hasMore = rest.length > LEDGER_LIMIT;
  const shown = open || !hasMore ? rest : rest.slice(0, LEDGER_LIMIT);
  const spent = rest.filter((e) => e.amount < 0).reduce((n, e) => n - e.amount, 0);
  const heldTotal = held.reduce((n, e) => n + e.amount, 0);

  return (
    <section className={s.section} aria-labelledby="ledger-title">
      <div className={s.sectionHead}>
        <h2 id="ledger-title" className={t.label}>
          This month{hasMore ? ` · ${entries.length}` : ''}
        </h2>
        {hasMore && (
          <span>
            Spent <strong style={{ color: 'var(--ink)' }}>{spent}</strong> · Held <strong style={{ color: 'var(--credit-held-ink)' }}>{heldTotal}</strong>
          </span>
        )}
      </div>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {held.map((e) => (
          <LedgerRow key={e.id} e={e} pinned />
        ))}
      </ul>
      <ul id="ledger-rest" className={s.scroller} style={{ margin: 0, padding: 0, listStyle: 'none', maxHeight: open ? 308 : 1000 }} tabIndex={open ? 0 : undefined} aria-label="Ledger entries">
        {shown.map((e) => (
          <LedgerRow key={e.id} e={e} />
        ))}
      </ul>
      {hasMore ? (
        <button type="button" className={s.more} aria-expanded={open} aria-controls="ledger-rest" onClick={() => setOpen(!open)}>
          {open ? 'Show fewer' : `Show all ${rest.length}`}
          <span>{open ? 'Newest first' : `${rest.length - LEDGER_LIMIT} older`}</span>
        </button>
      ) : (
        <Link to={routes.history} className={s.more}>
          Show more<span aria-hidden="true">→</span>
        </Link>
      )}
    </section>
  );
}

function byType(entries: LedgerEntry[]) {
  const sum = (re: RegExp) => entries.filter((e) => e.kind === 'spend' && re.test(e.text)).reduce((n, e) => n - e.amount, 0);
  return [
    { label: 'Changes', value: sum(/Change/) },
    { label: 'Drafts dropped', value: sum(/draft dropped/i) },
    { label: 'Extra previews', value: sum(/Extra (preview|change round)/) },
  ];
}

function Usage({ credits, entries }: { credits: CreditsData; entries: LedgerEntry[] }) {
  const month = today().toLocaleDateString('en-GB', { month: 'long' });
  const bars = [...usage.map((u) => ({ ...u, now: false })), { month: `${month.slice(0, 3)} so far`, used: credits.used, now: true }];
  return (
    <section className={s.section} style={{ gap: 12 }} aria-labelledby="usage-title">
      <div className={s.sectionHead} style={{ margin: 0 }}>
        <h2 id="usage-title" className={t.label}>
          Past usage
        </h2>
        <span>Line = {credits.monthly} a month</span>
      </div>
      <div className={s.chart} role="img" aria-label={bars.map((b) => `${b.month}: ${b.used}`).join(', ')}>
        {bars.map((b) => (
          <div key={b.month} className={s.chartCol}>
            <strong>{b.used}</strong>
            <div className={cx(s.chartBar, b.now && s.chartBarNow)} style={{ height: `${Math.min(100, (b.used / credits.monthly) * 100)}%` }} />
          </div>
        ))}
      </div>
      <div className={s.chartLabels} aria-hidden="true">
        {bars.map((b) => (
          <span key={b.month}>{b.month}</span>
        ))}
      </div>
      <h2 className={t.label} style={{ marginTop: 12 }}>
        {month} by type
      </h2>
      <div>
        {byType(entries).map((r) => (
          <div key={r.label} className={s.typeRow}>
            <span>{r.label}</span>
            <strong className="num">{r.value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

type Segment = 'free' | 'held' | 'used';
const SEGMENTS: Record<Segment, { label: string; color: string; ink: string }> = {
  free: { label: 'Free', color: 'var(--credit-free)', ink: 'var(--credit-free-ink)' },
  held: { label: 'Set aside', color: 'var(--credit-held)', ink: 'var(--credit-held-ink)' },
  used: { label: 'Used', color: '#0f172a', ink: '#0f172a' },
};

/** Alternate layout: donut with a thickening hover segment, count-up centre and a synced legend. */
function DialLayout({ credits, entries, loaded }: { credits: CreditsData; entries: LedgerEntry[]; loaded: boolean }) {
  const [hi, setHi] = useState<Segment>('free');
  const values: Record<Segment, number> = { free: credits.free, held: credits.setAside, used: credits.used };
  const R = 104;
  const C = 2 * Math.PI * R;
  const GAP = 6;
  let acc = 0;
  const arcs = (Object.keys(SEGMENTS) as Segment[]).map((k) => {
    const len = (values[k] / credits.monthly) * C;
    const arc = { k, dash: `${Math.max(0, len - GAP).toFixed(1)} ${C.toFixed(1)}`, offset: (-acc - GAP / 2).toFixed(1) };
    acc += len;
    return arc;
  });

  return (
    <>
      <div className={s.dialWrap}>
        <div className={s.dialCol}>
          <div className={s.dial} onMouseLeave={() => setHi('free')}>
            <svg viewBox="0 0 260 260" width="260" height="260" role="img" aria-label={`Credits: free ${values.free}, set aside ${values.held}, used ${values.used} of ${credits.monthly}`}>
              {loaded &&
                arcs.map((a) =>
                  values[a.k] > 0 ? (
                    <circle
                      key={a.k}
                      className={s.arc}
                      cx="130"
                      cy="130"
                      r={R}
                      fill="none"
                      stroke={SEGMENTS[a.k].color}
                      strokeWidth={hi === a.k ? 30 : 14}
                      strokeDasharray={a.dash}
                      strokeDashoffset={a.offset}
                      opacity={hi === a.k ? 1 : 0.9}
                      onMouseEnter={() => setHi(a.k)}
                    />
                  ) : null,
                )}
            </svg>
            <div className={s.dialCentre} aria-live="polite">
              <strong style={{ color: SEGMENTS[hi].ink }}>
                <CountUp value={values[hi]} />
              </strong>
              <span>{SEGMENTS[hi].label}</span>
            </div>
          </div>
          <span className={s.dialCaption}>
            {today().toLocaleDateString('en-GB', { month: 'long' })} · {credits.monthly} credits
          </span>
        </div>
        <div>
          <h2 className={t.label} style={{ marginBottom: 12 }}>
            Credits left
          </h2>
          {(Object.keys(SEGMENTS) as Segment[]).map((k) => (
            <button
              key={k}
              type="button"
              className={s.legendRow}
              aria-pressed={hi === k}
              onMouseEnter={() => setHi(k)}
              onFocus={() => setHi(k)}
              onClick={() => setHi(k)}
              style={{ color: hi === k ? SEGMENTS[k].ink : 'var(--ink)' }}
            >
              <span className={s.swatch} style={{ background: SEGMENTS[k].color }} />
              <span>{SEGMENTS[k].label}</span>
              <strong className="num">{values[k]}</strong>
            </button>
          ))}
          <p className={s.dialNote}>Resets {shortDay(credits.resetDate)}. Set-aside credits come back if you don't approve.</p>
        </div>
      </div>
      <Ledger entries={entries} />
    </>
  );
}

function TopUpAside({ credits, focus }: { credits: CreditsData; focus: boolean }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const requestRef = useRef<HTMLButtonElement>(null);
  const waiting = credits.topUpRequest === 'waiting';
  const reference = `${session.business.replace(/\s+/g, '').toUpperCase()}-${String(today().getMonth() + 1).padStart(2, '0')}${String(today().getDate()).padStart(2, '0')}`;

  useEffect(() => {
    if (focus && !waiting) requestRef.current?.focus();
  }, [focus, waiting]);

  const run = async (fn: () => Promise<void>, done: string) => {
    setBusy(true);
    try {
      await fn();
      toast(done);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <span className={t.label}>Prices</span>
      <div className={s.prices}>
        {[
          ['Change to your site', `${PRICES.change} credits`],
          [`Extra page preview (after ${PRICES.freePreviews})`, `${PRICES.extraPreview} credits`],
          ['Page draft dropped', `${PRICES.draftDropped} credits`],
          ['New page', `RM ${PRICES.newPageRm}, invoiced`],
        ].map(([label, price]) => (
          <div key={label} className={s.price}>
            <span>{label}</span>
            <strong>{price}</strong>
          </div>
        ))}
      </div>
      <p className={s.small}>Credits are set aside when a change is planned and charged only when you approve.</p>

      <div className={s.topHead} id="top-up">
        <h2 className={t.label}>Top up</h2>
        {waiting && <Badge tone="turn">Waiting for payment</Badge>}
      </div>
      <p className={s.asideBody}>
        {PRICES.topUpCredits} credits = RM {PRICES.topUpRm}. Top-up credits never expire and are used after your monthly credits.
      </p>
      {waiting ? (
        <>
          <div className={s.payCard} aria-live="polite">
            <strong>Pay RM {PRICES.topUpRm} by DuitNow or bank transfer</strong>
            <span>DuitNow ID: 012-388 4421 (Chi Studio)</span>
            <span>
              Reference: <strong>{reference}</strong>
            </span>
            <span>Chi adds the credits after the payment arrives.</span>
          </div>
          <Button variant="secondary" size="sm" block loading={busy} loadingLabel="Cancelling…" onClick={() => run(cancelTopUp, 'Top-up request cancelled.')}>
            Cancel request
          </Button>
        </>
      ) : (
        <Button
          ref={requestRef}
          block
          className={cx(focus && s.flash)}
          loading={busy}
          loadingLabel="Requesting…"
          onClick={() => run(requestTopUp, `Top-up requested. Pay RM ${PRICES.topUpRm} to get ${PRICES.topUpCredits} credits.`)}
        >
          Request {PRICES.topUpCredits} credits
        </Button>
      )}
    </>
  );
}

/** `?ledger=long`: a busy month, to review the "Show all N" expand. */
function demoEntries(): LedgerEntry[] {
  const rows: Array<[number, string, number]> = [
    [2, 'Top-up · bank transfer', 100], [4, '#44 Change · Footer link', -5], [5, '#45 Change · Promo banner', -20],
    [6, '#46 Extra preview · Catering', -10], [8, '#47 Change · Instagram link', -5], [8, '#48 Change · Menu photo caption', -20],
    [9, '#49 Change · Holiday hours', -20], [11, '#50 Change · Price typo', -5], [11, '#51 Extra preview · Our Story', -10],
    [12, '#52 Change · Delivery note', -20], [12, '#53 Change · WhatsApp text', -5], [13, '#54 Page draft dropped · Careers', -15],
    [13, '#55 Change · Seasonal drinks', -20], [13, '#56 Change · Address line', -5], [14, '#57 Change · Map link', -5],
  ];
  return rows.map(([day, text, amount], i) => ({
    id: `demo${i}`,
    date: `2026-10-${String(day).padStart(2, '0')}`,
    text,
    amount,
    kind: amount > 0 ? 'add' : 'spend',
  }));
}

