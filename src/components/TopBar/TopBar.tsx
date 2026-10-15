import { Link, useLocation, useNavigate } from 'react-router-dom';
import { session } from '@/data/seed';
import { useStudio } from '@/state/studio';
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
  /** Credits free right now. */
  free?: number;
  /** Credits currently set aside. */
  setAside?: number;
  /** Credits used this month. Defaults to whatever the free and set-aside counts leave over. */
  used?: number;
  monthly?: number;
}

export function TopBar(props: TopBarProps) {
  const { credits } = useStudio();
  const {
    active,
    free = credits.free,
    setAside = credits.setAside,
    monthly = credits.monthly,
    used = monthly - free - setAside,
  } = props;
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { signOut } = useSession();
  const current = active ?? navKeyFor(pathname);

  const onSignOut = () => {
    // Welcome back (PIN unlock) returns with FA-23; until then signing out goes to Sign in.
    signOut().finally(() => navigate(routes.signIn));
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
        <CreditMeter free={free} setAside={setAside} used={used} monthly={monthly} />
        <IconButton label="Sign out" onClick={onSignOut}>
          <SignOutIcon />
        </IconButton>
      </div>
    </header>
  );
}

/** Segments grow in proportion to their counts, so the 2px gaps never push the bar past 100%. */
function CreditMeter({ free, setAside, used, monthly }: Required<Omit<TopBarProps, 'active'>>) {
  const grow = (n: number) => ({ flex: `${Math.max(0, n)} 1 0` });
  return (
    <Link to={routes.credits} className={s.meter} aria-label={`${free} of ${monthly} credits left`}>
      <span className={s.meterText}>
        <span>
          <strong className="num">{free}</strong> credits left
        </span>
        <span className={s.meterTotal}>/ {monthly}</span>
      </span>
      <span className={s.meterBar} aria-hidden="true">
        {free > 0 && <span className={s.meterFree} style={grow(free)} />}
        {setAside > 0 && <span className={s.meterHeld} style={grow(setAside)} />}
        {used > 0 && <span className={s.meterUsed} style={grow(used)} />}
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
