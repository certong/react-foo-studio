import { useId, useRef, useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { authErrorMessage, PIN_LENGTH } from '@/api/auth';
import { Button } from '@/components/Button';
import { fieldStyles as f } from '@/components/Field';
import { useSession } from '@/state/session';
import { formatShort } from '@/lib/date';
import { cx } from '@/lib/cx';
import { routes } from '@/routes';
import s from './Welcome.module.css';

const CHI_WHATSAPP = 'https://wa.me/60123000000';

export function Welcome() {
  const { signedIn, remembered, unlock, forgetDevice } = useSession();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from;

  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const pinRef = useRef<HTMLInputElement>(null);
  const ids = { pin: useId(), err: useId() };

  if (signedIn) return <Navigate to={from ?? routes.home} replace />;
  if (!remembered) return <Navigate to={routes.signIn} replace />;

  const { user, until } = remembered;

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
      setError(authErrorMessage(err));
      setPin('');
      setSubmitting(false);
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
          Welcome back, {user.name}
        </h1>

        <div className={s.card}>
          <span aria-hidden="true" className={s.avatar}>
            {user.initials}
          </span>
          <span className={s.who}>
            <strong>{user.fullName}</strong>
            <span>{user.email}</span>
          </span>
          <button type="button" className={s.linkButton} onClick={notYou}>
            Not you?
          </button>
        </div>

        <div className={f.field}>
          <label htmlFor={ids.pin} className={f.label}>
            Your {PIN_LENGTH}-digit PIN
          </label>
          <input
            ref={pinRef}
            id={ids.pin}
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="current-password"
            placeholder="••••••"
            autoFocus
            className={cx(f.input, s.pin)}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, PIN_LENGTH))}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? ids.err : undefined}
            disabled={submitting}
          />
          {error && (
            <span id={ids.err} role="alert" className={f.error}>
              {error}
            </span>
          )}
        </div>

        <div className={s.actions}>
          <Button type="submit" size="hero" className={s.submit} loading={submitting} loadingLabel="Unlocking…">
            Unlock
          </Button>
          <a className={s.forgot} href={CHI_WHATSAPP} target="_blank" rel="noopener noreferrer">
            Forgot PIN? Ask Chi to reset it
          </a>
        </div>
        <p className={s.note}>This device is remembered until {formatShort(new Date(until))}.</p>
      </form>
    </div>
  );
}
