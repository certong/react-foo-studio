import { Link, useLocation, useNavigate } from 'react-router-dom';
import { session } from '@/data/seed';
import { useStudio } from '@/state/studio';
import { creditSplit } from '@/lib/credits';
import type { Credits } from '@/data/types';
import { IconButton } from '@/components/Button';
import { useSession } from '@/state/session';
import { routes } from '@/routes';
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
  /** Overrides the stored credits, e.g. for the low-credit sample on /kit. */
  credits?: Partial<Credits>;
}

export function TopBar({ active, credits: override }: TopBarProps) {
  const stored = useStudio().credits;
  const credits = { ...stored, ...override };
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
        <span>{session.business}</span>
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
        <a className={s.navLink} href={`https://${session.site}`} target="_blank" rel="noopener noreferrer">
          My site ↗
        </a>
      </nav>

      <div className={s.right}>
        <CreditMeter credits={credits} />
        <IconButton label="Sign out" onClick={onSignOut}>
          <SignOutIcon />
        </IconButton>
      </div>
    </header>
  );
}

/**
 * Header credits (spec sheet): total free, a monthly-only bar (its length always means the monthly plan),
 * a "+N" pill for top-up credits, and the monthly · top-up split underneath.
 */
function CreditMeter({ credits }: { credits: Credits }) {
  const { total, monthlyFree, topUp } = creditSplit(credits);
  const pct = (n: number) => ({ width: `${(Math.max(0, n) / credits.monthly) * 100}%` });
  return (
    <Link to={routes.credits} className={s.meter} aria-label={`${total} credits free: ${monthlyFree} monthly, ${topUp} top-up`}>
      <span className={s.meterTotal}>
        <strong className="num">{total}</strong> free
      </span>
      <span className={s.meterRow} aria-hidden="true">
        <span className={s.meterBar}>
          {monthlyFree > 0 && <span className={s.meterFree} style={pct(monthlyFree)} />}
          {credits.setAside > 0 && <span className={s.meterHeld} style={pct(credits.setAside)} />}
          <span className={s.meterUsed} />
        </span>
        {topUp > 0 && <span className={s.meterTopUp}>+{topUp}</span>}
      </span>
      <span className={s.meterSplit}>
        {monthlyFree} monthly · {topUp} top-up
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
