import type { CSSProperties, ReactNode } from 'react';
import { TopBar, type NavKey } from '@/components/TopBar';
import { ButtonLink } from '@/components/Button';
import { routes } from '@/routes';
import { cx } from '@/lib/cx';
import s from './Layout.module.css';

interface AppShellProps {
  /** Highlighted nav item. Pass `false` to render an empty top row (sign-in). */
  active?: NavKey | false;
  topBar?: ReactNode;
  bottomBar?: ReactNode;
  /** Bottom bar height in px: 104 (chat prompt), 112 (action bar), 120 (composer). */
  bottomHeight?: number;
  children: ReactNode;
}

export function AppShell({ active, topBar, bottomBar, bottomHeight = 104, children }: AppShellProps) {
  const style = bottomBar ? ({ '--bottom-h': `${bottomHeight}px` } as CSSProperties) : undefined;
  return (
    <div className={cx(s.shell, bottomBar != null && s.withBar)} style={style}>
      {active === false ? <div className={s.emptyTop} /> : (topBar ?? <TopBar active={active} />)}
      {children}
      {bottomBar}
    </div>
  );
}

interface ColumnsProps {
  /** Left 200px column (hero number). Omit for the two-column layout. */
  hero?: ReactNode;
  aside?: ReactNode;
  /** Aside width in px: 360 (default) or 400 on chat / review screens. */
  asideWidth?: number;
  /** White aside background (chat panels, sign-off, preview). */
  asideCard?: boolean;
  mainClassName?: string;
  heroClassName?: string;
  asideClassName?: string;
  mainAs?: 'div' | 'section' | 'form' | 'main';
  children: ReactNode;
}

export function Columns({
  hero,
  aside,
  asideWidth,
  asideCard,
  mainClassName,
  heroClassName,
  asideClassName,
  mainAs: Main = 'main',
  children,
}: ColumnsProps) {
  const twoCol = hero === undefined;
  const style = asideWidth ? ({ '--aside-w': `${asideWidth}px` } as CSSProperties) : undefined;
  return (
    <div className={cx(s.cols, twoCol && s.cols2)} style={style}>
      {!twoCol && <div className={cx(s.hero, heroClassName)}>{hero}</div>}
      <Main className={cx(s.main, mainClassName)}>{children}</Main>
      {aside !== undefined && <aside className={cx(s.aside, asideCard && s.asideCard, asideClassName)}>{aside}</aside>}
    </div>
  );
}

/** The 120px number in the left column, e.g. queue position or step count. */
export function HeroNumber({ value, caption }: { value: number | string; caption?: ReactNode }) {
  const text = typeof value === 'number' ? String(value).padStart(2, '0') : value;
  return (
    <>
      <span className={s.heroNumber}>{text}</span>
      {caption && <span className={s.heroCaption}>{caption}</span>}
    </>
  );
}

export function BottomBar({ className, style, children }: { className?: string; style?: CSSProperties; children: ReactNode }) {
  return (
    <div className={cx(s.bottomBar, className)} style={style}>
      {children}
    </div>
  );
}

/** Bottom bar on Home and Requests that opens the chat. */
export function ChatPromptBar({ cta = 'Start a chat' }: { cta?: string }) {
  return (
    <BottomBar>
      <div className={s.chatPrompt}>
        <span className={s.chatPromptText}>Tell agent-ba what to change…</span>
        <span className={s.chatPromptHint}>You'll see the cost before anything starts.</span>
      </div>
      <ButtonLink to={routes.chatStart}>{cta}</ButtonLink>
    </BottomBar>
  );
}
