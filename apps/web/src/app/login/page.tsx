import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '../../components/marketing/hero';
import { LoginForm } from '../../components/auth/auth-form';

export const metadata: Metadata = { title: 'Log In', alternates: { canonical: '/login' } };

export default function LoginPage() {
  return <><Header /><main className="simple-page shell"><p className="eyebrow">Welcome back</p><h1>Log in to 3oD</h1><p className="lead">Pick your marketplace role to continue.</p><LoginForm /><p style={{ marginTop: 28 }}><Link href="/" style={{ color: 'var(--orange-dark)', textDecoration: 'underline' }}>← Return home</Link></p></main></>;
}
