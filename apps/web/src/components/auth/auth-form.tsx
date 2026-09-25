'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ApiClientError, apiMode, dashboardPathForUser, login, signup } from '../../lib/api-client';

type Role = 'buyer' | 'printer';

const styles = {
  panel: { background: 'var(--white)', border: '1px solid var(--line)', padding: '28px', maxWidth: 680 },
  fields: { display: 'grid', gap: 18, marginTop: 28 },
  label: { display: 'grid', gap: 8, fontSize: 14, fontWeight: 600 },
  input: { width: '100%', border: '1px solid var(--line)', background: 'var(--paper)', padding: '13px 14px', color: 'var(--ink)', font: 'inherit' },
  roleGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 },
  roleCard: { border: '1px solid var(--line)', padding: 16, background: 'var(--paper)', cursor: 'pointer', textAlign: 'left' as const },
  roleTitle: { display: 'block', fontSize: 17, marginBottom: 6 },
  roleBody: { color: 'var(--muted)', fontSize: 13, lineHeight: 1.45 },
  error: { color: 'var(--orange-dark)', fontSize: 13, lineHeight: 1.5, margin: 0 },
  helper: { color: 'var(--muted)', fontSize: 14, marginTop: 24 },
};

function RoleSelector({ role, onChange }: { role: Role; onChange: (role: Role) => void }) {
  return (
    <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
      <legend style={{ fontWeight: 600, marginBottom: 10 }}>I’m here as a…</legend>
      <div style={styles.roleGrid}>
        {[
          ['buyer', 'Buyer', 'I need something printed.'],
          ['printer', 'Printer owner', 'I want to earn from my printer.'],
        ].map(([value, title, body]) => (
          <label key={value} style={{ ...styles.roleCard, borderColor: role === value ? 'var(--orange-dark)' : 'var(--line)' }}>
            <input
              type="radio"
              name="role"
              value={value}
              checked={role === value}
              onChange={() => onChange(value as Role)}
              style={{ marginRight: 8, accentColor: 'var(--orange-dark)' }}
            />
            <span style={styles.roleTitle}>{title}</span>
            <span style={styles.roleBody}>{body}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function errorMessage(error: unknown) {
  if (error instanceof ApiClientError) return error.message;
  return 'We could not reach 3oD. Please try again.';
}

export function SignupForm({ initialRole = 'buyer' }: { initialRole?: Role }) {
  const router = useRouter();
  const [role, setRole] = useState<Role>(initialRole);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  if (submitted) {
    return (
      <section style={styles.panel} aria-live="polite">
        <p className="eyebrow">Account created</p>
        <h2 style={{ margin: '16px 0' }}>You’re ready to get quotes</h2>
        <p className="lead">Your demo account is set up as a {role === 'buyer' ? 'buyer' : 'printer owner'}.</p>
        {role === 'buyer' ? <Link className="button" href="/request-quote">Request a quote <span aria-hidden="true">↗</span></Link> : <Link className="button" href="/dashboard/owner">Go to printer dashboard <span aria-hidden="true">↗</span></Link>}
      </section>
    );
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setErrors([]);

    if (apiMode === 'demo') {
      setSubmitted(true);
      return;
    }

    setSubmitting(true);
    try {
      const { user } = await signup({
        name: String(form.get('name') ?? '').trim(),
        email: String(form.get('email') ?? '').trim(),
        password: String(form.get('password') ?? ''),
        role: role === 'printer' ? 'printer_owner' : 'buyer',
      });
      router.push(dashboardPathForUser(user));
    } catch (error) {
      setErrors([errorMessage(error)]);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form style={styles.panel} onSubmit={submit}>
      <RoleSelector role={role} onChange={setRole} />
      {errors.length > 0 && <div role="alert" style={styles.error}>{errors.map((error) => <div key={error}>{error}</div>)}</div>}
      <div style={styles.fields}>
        <label style={styles.label}>Full name<input style={styles.input} name="name" aria-label="Full name" required /></label>
        <label style={styles.label}>Email<input style={styles.input} name="email" type="email" aria-label="Email" required /></label>
        <label style={styles.label}>Password<input style={styles.input} name="password" type="password" minLength={8} aria-label="Password" required /></label>
        <button className="button" type="submit" disabled={submitting}>{submitting ? 'Creating account…' : 'Create account'} <span aria-hidden="true">↗</span></button>
      </div>
      <p style={styles.helper}>Already have an account? <Link href="/login" style={{ color: 'var(--orange-dark)', textDecoration: 'underline' }}>Log in</Link></p>
    </form>
  );
}

export function LoginForm() {
  const router = useRouter();
  const [role, setRole] = useState<Role>('buyer');
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nextErrors: string[] = [];
    if (!String(form.get('email') ?? '').trim()) nextErrors.push('Enter your email.');
    if (!String(form.get('password') ?? '')) nextErrors.push('Enter your password.');
    setErrors(nextErrors);
    if (nextErrors.length > 0) return;

    setSubmitting(true);
    try {
      if (apiMode === 'demo') {
        router.push(role === 'buyer' ? '/dashboard/buyer' : '/dashboard/owner');
        return;
      }

      const { user } = await login({
        email: String(form.get('email') ?? '').trim(),
        password: String(form.get('password') ?? ''),
      });
      router.push(dashboardPathForUser(user));
    } catch (error) {
      setErrors([errorMessage(error)]);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form style={styles.panel} onSubmit={submit} noValidate>
      <RoleSelector role={role} onChange={setRole} />
      <p style={{ ...styles.helper, marginTop: 14 }}><strong>{role === 'buyer' ? 'Buyer' : 'Printer owner'}</strong> {apiMode === 'demo' ? 'demo login selected.' : 'account selected.'}</p>
      {errors.length > 0 && <div role="alert" style={styles.error}>{errors.map((error) => <div key={error}>{error}</div>)}</div>}
      <div style={styles.fields}>
        <label style={styles.label}>Email<input style={styles.input} name="email" type="email" aria-label="Email" /></label>
        <label style={styles.label}>Password<input style={styles.input} name="password" type="password" aria-label="Password" /></label>
        <button className="button" type="submit" disabled={submitting}>{submitting ? 'Logging in…' : 'Log in'} <span aria-hidden="true">↗</span></button>
      </div>
      <p style={styles.helper}>New to 3oD? <Link href="/signup" style={{ color: 'var(--orange-dark)', textDecoration: 'underline' }}>Create an account</Link></p>
    </form>
  );
}
