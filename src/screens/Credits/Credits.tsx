import { useEffect, useRef, useState } from 'react';
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
import { creditSplit } from '@/lib/credits';
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
      <Columns aside={<TopUpAside credits={credits} focus={params.get('topup') === '1'} />} mainClassName={s.main}>
        <Header credits={credits} entries={entries} />

        {layout === 'dial' ? (
          <DialLayout credits={credits} entries={entries} loaded={loaded} />
        ) : (
          <>
            <div className={s.cards}>
              <MonthlyCard credits={credits} loaded={loaded} />
              <TopUpCard credits={credits} />
            </div>
            <div className={s.trendWrap}>
              <Trend credits={credits} />
              <Stats credits={credits} />
            </div>
          </>
        )}
      </Columns>
    </AppShell>
  );
}

/** Title left; total free right-aligned with the monthly · top-up split. Set-aside credits aren't counted. */
function Header({ credits, entries }: { credits: CreditsData; entries: LedgerEntry[] }) {
  const { total, monthlyFree, topUp } = creditSplit(credits);
  const heldFor = [...new Set(entries.filter((e) => e.kind === 'held').map((e) => /^#\d+/.exec(e.text)?.[0]).filter(Boolean))];
  return (
    <div className={s.header}>
      <h1 className={s.h1}>Credits</h1>
      <div className={s.headTotal}>
        <span className={s.headNumber}>
          <strong className="num">{total}</strong>
          <span>free to use</span>
        </span>
        <span className={s.headSplit}>
          {monthlyFree} monthly · {topUp} top-up
          {credits.setAside > 0 && ` · ${credits.setAside} set aside${heldFor.length ? ` for ${heldFor.join(', ')}` : ''}, not counted`}
        </span>
      </div>
    </div>
  );
}

/**
 * Monthly bucket. The bar is monthly only, so its length always means the plan. On load the free part grows,
 * then the set-aside part (none with reduced motion). Click the bar to replay.
 */
function MonthlyCard({ credits, loaded }: { credits: CreditsData; loaded: boolean }) {
  const { monthlyFree } = creditSplit(credits);
  const { setAside, used, monthly } = credits;
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!loaded || shown) return;
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
    return () => cancelAnimationFrame(id);
  }, [loaded, shown]);

  const pct = (n: number) => `${(Math.max(0, n) / monthly) * 100}%`;
  return (
    <section className={s.card} aria-labelledby="monthly-title">
      <div className={s.cardHead}>
        <h2 id="monthly-title" className={t.label}>
          Monthly
        </h2>
        <span>Resets {shortDay(credits.resetDate)}</span>
      </div>
      <div className={s.cardNumber}>
        <strong className="num">{monthlyFree}</strong>
        <span>of {monthly} free</span>
      </div>
      {loaded ? (
        <button
          type="button"
          className={s.monthBar}
          title="Click to replay"
          aria-label={`Free ${monthlyFree}, set aside ${setAside}, used ${used}, of ${monthly}`}
          onClick={() => setShown(false)}
        >
          <span className={s.monthFree} style={{ width: shown ? pct(monthlyFree) : 0 }} />
          {setAside > 0 && (
            <span className={s.monthHeld} style={{ left: `calc(${shown ? pct(monthlyFree) : '0%'} + 2px)`, width: shown ? pct(setAside) : 0 }} />
          )}
        </button>
      ) : (
        <div className={s.skeleton} aria-label="Loading credits" />
      )}
      <div className={s.legend}>
        <span>Free {monthlyFree}</span>
        <span>Set aside {setAside}</span>
        <span>Used {used}</span>
      </div>
      <span className={s.cardNote}>Used first. Unused ones are removed on {shortDay(credits.resetDate)}.</span>
    </section>
  );
}

function TopUpCard({ credits }: { credits: CreditsData }) {
  const { topUp } = creditSplit(credits);
  const { busy, request } = useTopUpRequest();
  const waiting = credits.topUpRequest === 'waiting';
  return (
    <section className={cx(s.card, s.topUpCard)} aria-labelledby="topup-title">
      <div className={s.cardHead}>
        <h2 id="topup-title" className={t.label}>
          Top-up
        </h2>
        <span>Never expire</span>
      </div>
      <div className={s.cardNumber}>
        <strong className="num">{topUp}</strong>
        <span>credits</span>
      </div>
      <span className={s.topUpNote}>
        {topUp > 0 ? 'Used only after monthly credits run out.' : 'Top up to keep going when monthly credits run out.'}
      </span>
      <div className={s.topUpFoot}>
        {waiting ? (
          <Badge tone="turn">Waiting for payment</Badge>
        ) : (
          <Button size="sm" className={s.topUpBtn} loading={busy} loadingLabel="Requesting…" onClick={request}>
            Top up
          </Button>
        )}
        <span>
          {PRICES.topUpCredits} credits = RM {PRICES.topUpRm}
        </span>
      </div>
    </section>
  );
}

/** Credits used per month, last 6 months. Bars are drawn to scale: the plan line sits at 160px. */
function Trend({ credits }: { credits: CreditsData }) {
  const month = today().toLocaleDateString('en-GB', { month: 'short' });
  const bars = [
    ...usage.map((u) => ({ month: u.month, used: u.used, topUp: u.topUpUsed, now: false })),
    { month: `${month} so far`, used: credits.used, topUp: 0, now: true },
  ];
  const px = (n: number) => `${(n / credits.monthly) * TREND_PLAN_PX}px`;
  return (
    <section className={s.trend} aria-labelledby="trend-title">
      <div className={s.trendHead}>
        <h2 id="trend-title" className={t.label}>
          Used per month · last {bars.length} months
        </h2>
        <span className={s.trendKey} aria-hidden="true">
          <span>
            <i className={s.keyMonthly} />
            Monthly
          </span>
          <span>
            <i className={s.keyTopUp} />
            Top-up
          </span>
          <span>
            <i className={s.keyPlan} />
            {credits.monthly} plan
          </span>
        </span>
      </div>
      <div
        className={s.trendChart}
        role="img"
        aria-label={bars.map((b) => `${b.month}: ${b.used} monthly${b.topUp ? ` + ${b.topUp} top-up` : ''}`).join(', ')}
      >
        <span className={s.planLine} aria-hidden="true" />
        {bars.map((b) => (
          <div key={b.month} className={s.trendCol} aria-hidden="true">
            <span className={s.trendValue}>{b.used + b.topUp}</span>
            {b.topUp > 0 && <span className={s.trendTopUp} style={{ height: px(b.topUp) }} />}
            <span className={cx(s.trendMonthly, b.topUp > 0 && s.trendUnder, b.now && s.trendNow)} style={{ height: px(b.used) }} />
          </div>
        ))}
      </div>
      <div className={s.trendLabels} aria-hidden="true">
        {bars.map((b) => (
          <span key={b.month}>{b.month}</span>
        ))}
      </div>
    </section>
  );
}

const TREND_PLAN_PX = 160;
const TIMES = ['never', 'once', 'twice'];

function Stats({ credits }: { credits: CreditsData }) {
  const months = usage.map((u) => ({ ...u, total: u.used + u.topUpUsed }));
  const all = months.length + 1;
  const avg = Math.round(months.reduce((n, m) => n + m.total, 0) / Math.max(1, months.length));
  const over = months.filter((m) => m.total > credits.monthly);
  const rm = months.reduce((n, m) => n + m.topUpRm, 0);
  const toppedUp = months.filter((m) => m.topUpUsed > 0).length;
  const stats = [
    { value: String(avg), label: 'used per month on average' },
    {
      value: `${over.length} of ${all}`,
      label: `months went over ${credits.monthly}${over.length ? ` (${over.map((m) => `${m.month}, by ${m.total - credits.monthly}`).join('; ')})` : ''}`,
    },
    { value: `RM ${rm}`, label: `spent on top-ups since ${months[0]?.month ?? 'you joined'}` },
  ];
  return (
    <aside className={s.stats} aria-label="Credit stats">
      {stats.map((x) => (
        <div key={x.label} className={s.stat}>
          <strong className="num">{x.value}</strong>
          <span>{x.label}</span>
        </div>
      ))}
      <p className={s.statsNote}>
        The {credits.monthly} monthly plan covers a normal month.{' '}
        {toppedUp === 0 ? "You haven't needed a top-up yet." : `Top-up has only been needed ${TIMES[toppedUp] ?? `${toppedUp} times`}.`}
      </p>
    </aside>
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

type Segment = 'free' | 'held' | 'used';
const SEGMENTS: Record<Segment, { label: string; color: string; ink: string }> = {
  free: { label: 'Free', color: 'var(--credit-free)', ink: 'var(--credit-free-ink)' },
  held: { label: 'Set aside', color: 'var(--credit-held)', ink: 'var(--credit-held-ink)' },
  used: { label: 'Used', color: '#0f172a', ink: '#0f172a' },
};

/** Alternate layout: donut with a thickening hover segment, count-up centre and a synced legend. */
function DialLayout({ credits, entries, loaded }: { credits: CreditsData; entries: LedgerEntry[]; loaded: boolean }) {
  const [hi, setHi] = useState<Segment>('free');
  const values: Record<Segment, number> = { free: creditSplit(credits).monthlyFree, held: credits.setAside, used: credits.used };
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

/** Request or cancel a 100-credit top-up, with a toast either way. Shared by the Top-up card and the aside. */
function useTopUpRequest() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<void>, done: string) => {
    setBusy(true);
    try {
      await fn();
      toast(done);
    } finally {
      setBusy(false);
    }
  };
  return {
    busy,
    request: () => run(requestTopUp, `Top-up requested. Pay RM ${PRICES.topUpRm} to get ${PRICES.topUpCredits} credits.`),
    cancel: () => run(cancelTopUp, 'Top-up request cancelled.'),
  };
}

function TopUpAside({ credits, focus }: { credits: CreditsData; focus: boolean }) {
  const { busy, request, cancel } = useTopUpRequest();
  const requestRef = useRef<HTMLButtonElement>(null);
  const waiting = credits.topUpRequest === 'waiting';
  const reference = `${session.business.replace(/\s+/g, '').toUpperCase()}-${String(today().getMonth() + 1).padStart(2, '0')}${String(today().getDate()).padStart(2, '0')}`;

  useEffect(() => {
    if (focus && !waiting) requestRef.current?.focus();
  }, [focus, waiting]);

  return (
    <>
      <span className={t.label}>Prices</span>
      <p className={s.order}>How credits are used: monthly first, then top-up.</p>
      {/* Credits only: the RM 100 new page price shows on 10 Page sign-off. */}
      <div className={s.prices}>
        {[
          ['Change to your site', `${PRICES.change} credits`],
          [`Extra page preview (after ${PRICES.freePreviews})`, `${PRICES.extraPreview} credits`],
          ['Draft dropped (change or page)', `${PRICES.draftDropped} credits`],
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
          <Button variant="secondary" size="sm" block loading={busy} loadingLabel="Cancelling…" onClick={cancel}>
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
          onClick={request}
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
    [2, 'Top-up · bank transfer', 100], [4, '#44 Change · Footer link', -20], [5, '#45 Change · Promo banner', -20],
    [6, '#46 Extra preview · Catering', -10], [8, '#47 Change · Instagram link', -20], [9, '#49 Change · Holiday hours', -20],
    [11, '#51 Extra preview · Our Story', -10], [12, '#52 Change · Delivery note', -20], [13, '#54 Page draft dropped · Careers', -15],
    [13, '#55 Change · Seasonal drinks', -20],
  ];
  return rows.map(([day, text, amount], i) => ({
    id: `demo${i}`,
    date: `2026-10-${String(day).padStart(2, '0')}`,
    text,
    amount,
    kind: amount > 0 ? 'add' : 'spend',
  }));
}

