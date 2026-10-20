import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useMe } from '@/state/me';
import type { MeError } from '@/api/me';
import type { CreditsBlock } from '@/data/types';
import { IconButton } from '@/components/Button';
import { useSession } from '@/state/session';
import { routes } from '@/routes';
import { cx } from '@/lib/cx';
import s from './TopBar.module.css';

export type NavKey = 'home' | 'requests' | 'credits' | 'chat';

const NAV: Array<{ key: NavKey; label: string; to: string }> = [
  { key: 'home', label: 'Home', to: routes.home },
  { key: 'requests', label: 'Requests', to: routes.requests },
  { key: 'credits', label: 'Credits', to: routes.credits },
  { key: 'chat', label: 'Chat', to: routes.chatStart },
];

/** Nav item for a path: request pages count as Requests, credit pages as Credits. */
export function navKeyFor(pathname: string): NavKey | undefined {
  if (pathname === routes.home) return 'home';
  if (pathname.startsWith('/requests') || pathname === routes.states) return 'requests';
  if (pathname.startsWith('/credits')) return 'credits';
  if (pathname.startsWith('/chat')) return 'chat';
  return undefined;
}

interface TopBarProps {
  /** Defaults to the item matching the current URL. */
  active?: NavKey;
  /** Shows these credits instead of the account's, e.g. the low-credit sample on /kit. */
  credits?: CreditsBlock;
}

/** The bar on every signed-in page. Workspace, site and credits come from GET /portal/me (FS-86). */
export function TopBar({ active, credits: override }: TopBarProps) {
  const { me, loading, error } = useMe();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { signOut } = useSession();
  const current = active ?? navKeyFor(pathname);

  const onSignOut = () => {
    // Welcome back sends on to Sign in when this device isn't remembered.
    signOut().finally(() => navigate(routes.welcome));
  };

  return (
    <header className={s.bar}>
      <Link to={routes.home} className={s.brand}>
        <strong>Studio</strong>
        {me && <span>{me.workspace.name}</span>}
      </Link>

      <nav className={s.nav} aria-label="Main">
        {NAV.map((item) => (
          <Link
            key={item.key}
            to={item.to}
            className={s.navLink}
            aria-current={item.key === current ? 'page' : undefined}
          >
            {item.label}
          </Link>
        ))}
        {me?.workspace.site && (
          <a className={s.navLink} href={`https://${me.workspace.site}`} target="_blank" rel="noopener noreferrer">
            My site ↗
          </a>
        )}
      </nav>

      <div className={s.right}>
        {override ? <CreditMeter credits={override} /> : me ? <CreditMeter credits={me.credits} /> : <MeterNote text={noteFor(loading, error)} busy={loading} />}
        <IconButton label="Sign out" onClick={onSignOut}>
          <SignOutIcon />
        </IconButton>
      </div>
    </header>
  );
}

/** What the meter says while there are no credits to show. */
function noteFor(loading: boolean, error: MeError | null): string {
  if (loading) return 'Loading credits…';
  if (!error) return 'Credits';
  // A valid account that has no Studio workspace yet (FS-86 → 404).
  if (error.code === 'NOT_FOUND') return 'No workspace yet';
  return 'Credits unavailable';
}

/**
 * Header credits (spec sheet): total free, a monthly-only bar (its length always means the monthly plan),
 * a "+N" pill for top-up credits, and the monthly · top-up split underneath.
 */
function CreditMeter({ credits }: { credits: CreditsBlock }) {
  const { free, monthly, topup, held } = credits;
  // Holds come out of the monthly bucket first (FS-86), so the bar's held segment is whatever
  // monthly free and used leave of the grant; any top-up part of a hold isn't on this bar.
  const heldMonthly = Math.max(0, monthly.grant - monthly.used - monthly.free);
  const pct = (n: number) => ({ width: monthly.grant > 0 ? `${(Math.max(0, n) / monthly.grant) * 100}%` : '0%' });
  const label = `${free} credits free: ${monthly.free} monthly, ${topup.free} top-up${held > 0 ? `, ${held} set aside` : ''}`;
  return (
    <Link to={routes.credits} className={s.meter} aria-label={label}>
      <span className={s.meterTotal}>
        <strong className="num">{free}</strong> free
      </span>
      <span className={s.meterRow} aria-hidden="true">
        <span className={s.meterBar}>
          {monthly.free > 0 && <span className={s.meterFree} style={pct(monthly.free)} />}
          {heldMonthly > 0 && <span className={s.meterHeld} style={pct(heldMonthly)} />}
          <span className={s.meterUsed} />
        </span>
        {topup.free > 0 && <span className={s.meterTopUp}>+{topup.free}</span>}
      </span>
      <span className={s.meterSplit}>
        {monthly.free} monthly · {topup.free} top-up
      </span>
    </Link>
  );
}

/** The meter's place while /portal/me is loading, failed, or nobody is signed in: same width, empty bar. */
function MeterNote({ text, busy }: { text: string; busy: boolean }) {
  return (
    <Link to={routes.credits} className={cx(s.meter, s.meterNote)} aria-busy={busy || undefined}>
      <span className={s.meterTotal}>{text}</span>
      <span className={s.meterRow} aria-hidden="true">
        <span className={s.meterBar}>
          <span className={s.meterUsed} />
        </span>
      </span>
    </Link>
  );
}

function SignOutIcon() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 4H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h8" />
      <path d="M10 12h10" />
      <path d="M16.5 8.5 20 12l-3.5 3.5" />
    </svg>
  );
}
