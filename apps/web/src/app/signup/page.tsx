import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '../../components/marketing/hero';
import { SignupForm } from '../../components/auth/auth-form';

export const metadata: Metadata = { title: 'Create an Account', alternates: { canonical: '/signup' } };

export default function SignupPage() {
  return <><Header /><main className="simple-page shell"><p className="eyebrow">Join 3oD</p><h1>Create your 3oD account</h1><p className="lead">Choose how you’ll use the marketplace, then start with a simple demo account.</p><SignupForm /><p style={{ marginTop: 28 }}><Link href="/" style={{ color: 'var(--orange-dark)', textDecoration: 'underline' }}>← Return home</Link></p></main></>;
}
