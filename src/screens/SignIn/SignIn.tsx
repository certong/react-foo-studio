import { useId, useRef, useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthError, authErrorMessage } from '@/api/auth';
import { AppShell } from '@/components/Layout';
import { Button } from '@/components/Button';
import { fieldStyles as f } from '@/components/Field';
import { CHI_WHATSAPP } from '@/components/States';
import { useSession } from '@/state/session';
import { cx } from '@/lib/cx';
import { routes } from '@/routes';
import t from '@/styles/type.module.css';
import s from './SignIn.module.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * 01 Sign in, against nest-foo-auth (FS-87): email + password for now. The design's email + PIN and
 * "remember this device" come back with FA-23, which adds them to nest-foo-auth.
 */
export function SignIn() {
  const { status, signIn } = useSession();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const ids = { email: useId(), emailErr: useId(), password: useId(), passwordErr: useId(), formErr: useId() };

  if (status === 'signed-in') return <Navigate to={from ?? routes.home} replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const eErr = !email.trim() ? 'Enter your email.' : !EMAIL_RE.test(email.trim()) ? "That doesn't look like an email address." : null;
    const pErr = password ? null : 'Enter your password.';
    setEmailError(eErr);
    setPasswordError(pErr);
    setFormError(null);
    if (eErr) return emailRef.current?.focus();
    if (pErr) return passwordRef.current?.focus();

    setSubmitting(true);
    try {
      await signIn(email, password);
      navigate(from ?? routes.home, { replace: true });
    } catch (err) {
      setFormError(authErrorMessage(err));
      // Wrong email and wrong password look the same from the server, so clear the password and retry there.
      if (err instanceof AuthError && err.code === 'invalid_credentials') setPassword('');
      passwordRef.current?.focus();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell active={false}>
      <div className={s.cols}>
        <form className={s.form} onSubmit={onSubmit} noValidate aria-labelledby="signin-title" aria-describedby={formError ? ids.formErr : undefined}>
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
                autoComplete="username"
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
              <label htmlFor={ids.password} className={f.label}>
                Password
              </label>
              <input
                ref={passwordRef}
                id={ids.password}
                type="password"
                autoComplete="current-password"
                className={cx(f.input, s.email)}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={passwordError || formError ? true : undefined}
                aria-describedby={passwordError ? ids.passwordErr : undefined}
                disabled={submitting}
              />
              {passwordError && (
                <span id={ids.passwordErr} role="alert" className={f.error}>
                  {passwordError}
                </span>
              )}
            </div>
          </div>

          {formError && (
            <p id={ids.formErr} role="alert" className={cx(f.error, s.formError)}>
              {formError}
            </p>
          )}

          <div className={s.actions}>
            <Button type="submit" size="hero" className={s.submit} loading={submitting} loadingLabel="Signing in…">
              Sign in
            </Button>
            <a className={s.help} href={CHI_WHATSAPP} target="_blank" rel="noopener noreferrer">
              Forgot your password? Ask Chi
            </a>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
