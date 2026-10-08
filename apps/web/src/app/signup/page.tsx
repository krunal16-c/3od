import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '../../components/marketing/hero';
import { SignupForm } from '../../components/auth/auth-form';

export const metadata: Metadata = {
  title: 'Create an Account',
  alternates: { canonical: '/signup' },
  robots: { index: false, follow: false },
};

export default function SignupPage() {
  return <><Header /><main className="simple-page shell"><p className="eyebrow">Join 3oD</p><h1>Create your 3oD account</h1><p className="lead">Choose how you’ll use the marketplace and create your account.</p><SignupForm /><p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.5, maxWidth: 680 }}>By creating an account, you agree to our <Link href="/policies/terms" style={{ color: 'var(--orange-dark)', textDecoration: 'underline' }}>terms</Link>, <Link href="/policies/privacy" style={{ color: 'var(--orange-dark)', textDecoration: 'underline' }}>privacy policy</Link>, and <Link href="/policies/acceptable-use" style={{ color: 'var(--orange-dark)', textDecoration: 'underline' }}>acceptable-use rules</Link>.</p><p style={{ marginTop: 28 }}><Link href="/" style={{ color: 'var(--orange-dark)', textDecoration: 'underline' }}>← Return home</Link></p></main></>;
}
