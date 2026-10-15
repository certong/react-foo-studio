import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthError, authErrorMessage, PIN_LENGTH } from '@/api/auth';
import { Button } from '@/components/Button';
import { PinInput, fieldStyles as f, type PinInputHandle } from '@/components/Field';
import { CHI_WHATSAPP } from '@/components/States';
import { useSession } from '@/state/session';
import { formatShort } from '@/lib/date';
import { routes } from '@/routes';
import s from './Welcome.module.css';

/** "Mei Ling Tan" → { first: "Mei", initials: "MT" }. Falls back to the email when there's no name. */
function nameParts(displayName: string | null, email: string) {
  const words = (displayName ?? '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return { full: email, first: null, initials: email[0]?.toUpperCase() ?? '?' };
  const initials = (words[0][0] + (words.length > 1 ? words[words.length - 1][0] : '')).toUpperCase();
  return { full: words.join(' '), first: words[0], initials };
}

/** 02 Welcome back (FS-71): a remembered device asks for the PIN only (FA-23). */
export function Welcome() {
  const { status, remembered, unlock, forgetDevice } = useSession();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from;

  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const pinRef = useRef<PinInputHandle>(null);
  const ids = { pinLabel: useId(), err: useId() };

  // First box focused on load.
  useEffect(() => {
    if (status === 'signed-out' && remembered) pinRef.current?.focus();
  }, [status, remembered]);

  if (status === 'checking') return <p className="visually-hidden" role="status">Checking your session…</p>;
  if (status === 'signed-in') return <Navigate to={from ?? routes.home} replace />;
  if (!remembered) return <Navigate to={routes.signIn} replace state={from ? { from } : undefined} />;

  const name = nameParts(remembered.displayName, remembered.email);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (pin.length < PIN_LENGTH) {
      setError(`Enter all ${PIN_LENGTH} digits of your PIN.`);
      return pinRef.current?.focus();
    }
    setSubmitting(true);
    try {
      await unlock(pin);
      navigate(from ?? routes.home, { replace: true });
    } catch (err) {
      setSubmitting(false);
      // Device revoked or expired: the session drops `remembered` and this screen redirects to Sign in.
      if (err instanceof AuthError && err.code === 'device_gone') return;
      setError(authErrorMessage(err, { knownEmail: true }));
      setPin('');
      requestAnimationFrame(() => pinRef.current?.focus());
    }
  };

  const notYou = () => {
    forgetDevice();
    navigate(routes.signIn, { replace: true });
  };

  return (
    <div className={s.page}>
      <form className={s.form} onSubmit={onSubmit} noValidate aria-labelledby="welcome-title">
        <h1 id="welcome-title" className={s.h1}>
          Welcome back{name.first ? `, ${name.first}` : ''}
        </h1>

        <div className={s.card}>
          <span aria-hidden="true" className={s.avatar}>
            {name.initials}
          </span>
          <span className={s.who}>
            <strong>{name.full}</strong>
            {name.first && <span>{remembered.email}</span>}
          </span>
          <button type="button" className={s.linkButton} onClick={notYou}>
            Not you?
          </button>
        </div>

        <div className={f.field}>
          <span id={ids.pinLabel} className={f.label}>
            Your {PIN_LENGTH}-digit PIN
          </span>
          <PinInput
            ref={pinRef}
            value={pin}
            onChange={(next) => {
              setPin(next);
              if (error) setError(null);
            }}
            length={PIN_LENGTH}
            invalid={!!error}
            disabled={submitting}
            labelledBy={ids.pinLabel}
            describedBy={error ? ids.err : undefined}
          />
          {error && (
            <span id={ids.err} role="alert" className={f.error}>
              {error}
            </span>
          )}
        </div>

        <div className={s.actions}>
          <Button type="submit" loading={submitting} loadingLabel="Signing in…">
            Sign in
          </Button>
          <a className={s.forgot} href={CHI_WHATSAPP} target="_blank" rel="noopener noreferrer">
            Forgot PIN? Ask Chi to reset it
          </a>
        </div>
        <p className={s.note}>This device is remembered until {formatShort(new Date(remembered.rememberedUntil))}.</p>
      </form>
    </div>
  );
}
