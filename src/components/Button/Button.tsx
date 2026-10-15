import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { cx } from '@/lib/cx';
import s from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary';
/** hero 56 · lg 52 · md 48 (standard) · sm 44 · xs 40 */
export type ButtonSize = 'hero' | 'lg' | 'md' | 'sm' | 'xs';

interface StyleProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
}

export function buttonClass({ variant = 'primary', size = 'md', block }: StyleProps, extra?: string) {
  return cx(s.btn, s[variant], s[size], block && s.block, extra);
}

type ButtonProps = StyleProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    loading?: boolean;
    loadingLabel?: string;
  };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, block, loading, loadingLabel = 'Sending…', className, disabled, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClass({ variant, size, block }, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? loadingLabel : children}
    </button>
  );
});

type ButtonLinkProps = StyleProps & Omit<LinkProps, 'className'> & { className?: string };

/** Button-styled router link. */
export function ButtonLink({ variant, size, block, className, ...rest }: ButtonLinkProps) {
  return <Link className={buttonClass({ variant, size, block }, className)} {...rest} />;
}

type IconButtonBase = { label: string; children: ReactNode; className?: string };

/** 40×40 icon-only button. `label` becomes the required aria-label. */
export function IconButton({ label, className, children, ...rest }: IconButtonBase & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" aria-label={label} title={label} className={cx(s.icon, className)} {...rest}>
      {children}
    </button>
  );
}

export function IconLink({ label, className, children, ...rest }: IconButtonBase & Omit<LinkProps, 'className' | 'children'>) {
  return (
    <Link aria-label={label} title={label} className={cx(s.icon, className)} {...rest}>
      {children}
    </Link>
  );
}
