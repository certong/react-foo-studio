import { useId, useRef, useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthError, authErrorMessage, PIN_LENGTH } from '@/api/auth';
import { AppShell } from '@/components/Layout';
import { Button } from '@/components/Button';
import { PinInput, fieldStyles as f, type PinInputHandle } from '@/components/Field';
import { useSession } from '@/state/session';
import { cx } from '@/lib/cx';
import { routes } from '@/routes';
import t from '@/styles/type.module.css';
import s from './SignIn.module.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function SignIn() {
  const { signedIn, signIn } = useSession();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from;

  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [remember, setRemember] = useState(true);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);
  const pinRef = useRef<PinInputHandle>(null);
  const ids = { email: useId(), emailErr: useId(), pinLabel: useId(), pinErr: useId() };

  if (signedIn) return <Navigate to={from ?? routes.home} replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const eErr = !email.trim() ? 'Enter your email.' : !EMAIL_RE.test(email.trim()) ? "That doesn't look like an email address." : null;
    const pErr = pin.length < PIN_LENGTH ? `Enter all ${PIN_LENGTH} digits of your PIN.` : null;
    setEmailError(eErr);
    setPinError(pErr);
    if (eErr) return emailRef.current?.focus();
    if (pErr) return pinRef.current?.focus();

    setSubmitting(true);
    try {
      await signIn(email, pin, remember);
      navigate(from ?? routes.home, { replace: true });
    } catch (err) {
      const message = authErrorMessage(err);
      if (err instanceof AuthError && err.code === 'unknown_email') {
        setEmailError(message);
        emailRef.current?.focus();
      } else {
        setPinError(message);
        pinRef.current?.focus();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell active={false}>
      <div className={s.cols}>
        <form className={s.form} onSubmit={onSubmit} noValidate aria-labelledby="signin-title">
          <div className={s.intro}>
            <span className={t.label}>Sign in</span>
            <h1 id="signin-title" className={s.h1}>
              Sign in to Studio.
            </h1>
            <p className={s.lead}>Use the email Chi set up for you.</p>
          </div>

          <div className={s.fields}>
            <div className={f.field}>
              <label htmlFor={ids.email} className={f.label}>
                Email
              </label>
              <input
                ref={emailRef}
                id={ids.email}
                type="email"
                autoComplete="email"
                autoFocus
                className={cx(f.input, s.email)}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={emailError ? true : undefined}
                aria-describedby={emailError ? ids.emailErr : undefined}
                disabled={submitting}
              />
              {emailError && (
                <span id={ids.emailErr} role="alert" className={f.error}>
                  {emailError}
                </span>
              )}
            </div>

            <div className={f.field}>
              <span id={ids.pinLabel} className={f.label}>
                {PIN_LENGTH}-digit PIN
              </span>
              <PinInput
                ref={pinRef}
                value={pin}
                onChange={setPin}
                length={PIN_LENGTH}
                invalid={!!pinError}
                disabled={submitting}
                labelledBy={ids.pinLabel}
                describedBy={pinError ? ids.pinErr : undefined}
              />
              {pinError && (
                <span id={ids.pinErr} role="alert" className={f.error}>
                  {pinError}
                </span>
              )}
            </div>
          </div>

          <div className={s.actions}>
            <Button type="submit" size="hero" className={s.submit} loading={submitting} loadingLabel="Signing in…">
              Sign in
            </Button>
            <label className={f.check}>
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} disabled={submitting} />
              Remember this device for 30 days
            </label>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
