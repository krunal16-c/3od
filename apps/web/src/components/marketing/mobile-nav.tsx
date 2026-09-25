'use client';

import Link from 'next/link';
import { useState } from 'react';
import { siteCopy } from '../../app/content/site-copy';

export function MobileNav() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mobile-nav-wrap">
      <button
        className="menu-button"
        type="button"
        aria-expanded={open}
        aria-controls="mobile-navigation"
        aria-label={open ? 'Close navigation' : 'Open navigation'}
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden="true">{open ? '×' : '☰'}</span>
      </button>
      <nav
        id="mobile-navigation"
        className="mobile-navigation"
        aria-label="Mobile navigation"
        hidden={!open}
      >
        <Link href="/for-buyers" onClick={() => setOpen(false)}>
          {siteCopy.nav.buyers}
        </Link>
        <Link href="/for-printer-owners" onClick={() => setOpen(false)}>
          {siteCopy.nav.suppliers}
        </Link>
        <Link href="/how-it-works" onClick={() => setOpen(false)}>
          {siteCopy.nav.howItWorks}
        </Link>
        <Link href="/login" onClick={() => setOpen(false)}>
          Sign in
        </Link>
      </nav>
    </div>
  );
}
