'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ApiClientError, verifyEmail } from '../../lib/api-client';

export default function VerifyEmailPage() {
  const [status, setStatus] = useState('Verifying your email…');
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) { setStatus('This verification link is missing its token.'); return; }
    void verifyEmail(token).then(({ message }) => setStatus(message)).catch((error) => setStatus(error instanceof ApiClientError ? error.message : 'This verification link is invalid or expired.'));
  }, []);
  return <main className="simple-page shell"><p className="eyebrow">Account verification</p><h1>{status}</h1><p className="lead">Once verified, return to the login page to access your 3oD workspace.</p><Link className="button" href="/login">Go to login ↗</Link></main>;
}
