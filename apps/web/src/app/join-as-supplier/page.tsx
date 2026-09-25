import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '../../components/marketing/hero';
import { SignupForm } from '../../components/auth/auth-form';

export const metadata: Metadata = {
  title: 'Join as a Printer Owner',
  description: 'Turn your idle 3D printer into income with 3oD.',
  alternates: { canonical: '/join-as-supplier' },
};

export default function JoinAsSupplierPage() {
  return (
    <>
      <Header />
      <main className="simple-page shell">
        <p className="eyebrow">For printer owners</p>
        <h1>Turn your idle printer into income.</h1>
        <p className="lead">
          Create a printer-owner account, set your capabilities, and start receiving relevant
          requests from buyers across India.
        </p>
        <SignupForm initialRole="printer" />
        <p style={{ marginTop: 28 }}>
          <Link href="/" style={{ color: 'var(--orange-dark)', textDecoration: 'underline' }}>
            ← Return home
          </Link>
        </p>
      </main>
    </>
  );
}
