'use client';

import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useState } from 'react';
import { dashboardPathForUser, getCurrentUser, type ApiRole } from '../../lib/api-client';

export function AuthGate({ children, redirectTo = '/request-quote', requiredRole }: { children: ReactNode; redirectTo?: string; requiredRole?: ApiRole }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let active = true;
    void getCurrentUser()
      .then(({ user }) => {
        if (requiredRole && user.role !== requiredRole) {
          router.replace(dashboardPathForUser(user));
          return;
        }
        if (active) setAuthorized(true);
      })
      .catch(() => { router.replace(`/login?next=${encodeURIComponent(redirectTo)}`); });
    return () => { active = false; };
  }, [redirectTo, requiredRole, router]);

  if (!authorized) return <section className="simple-page shell"><p className="eyebrow">Checking your workspace</p><h1>One moment.</h1><p className="lead">We’re confirming your secure 3oD session before opening the quote form.</p></section>;
  return children;
}
