'use client';

import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useState } from 'react';
import { getCurrentUser } from '../../lib/api-client';

export function AuthGate({ children, redirectTo = '/request-quote' }: { children: ReactNode; redirectTo?: string }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let active = true;
    void getCurrentUser()
      .then(() => { if (active) setAuthorized(true); })
      .catch(() => { router.replace(`/login?next=${encodeURIComponent(redirectTo)}`); });
    return () => { active = false; };
  }, [redirectTo, router]);

  if (!authorized) return <section className="simple-page shell"><p className="eyebrow">Checking your workspace</p><h1>One moment.</h1><p className="lead">We’re confirming your secure 3oD session before opening the quote form.</p></section>;
  return children;
}
