import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '../../components/marketing/hero';
import { AuthGate } from '../../components/auth/auth-gate';
import { RfqForm } from '../../components/rfq/rfq-form';

export const metadata: Metadata = { title: 'Request a Quote', alternates: { canonical: '/request-quote' } };

export default function RequestQuotePage() {
  return <><Header /><AuthGate><main className="simple-page shell"><p className="eyebrow">For buyers</p><h1>Tell us what you want made.</h1><p className="lead">Share your design and a few details. Independent manufacturing partners can then send you a real quote.</p><RfqForm /><p style={{ marginTop: 28 }}><Link href="/" style={{ color: 'var(--orange-dark)', textDecoration: 'underline' }}>← Return home</Link></p></main></AuthGate></>;
}
