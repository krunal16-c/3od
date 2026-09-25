import Link from 'next/link';
import { siteCopy } from '../../app/content/site-copy';

export function Footer() {
  return (
    <footer className="footer shell">
      <div>
        <Link className="wordmark" href="/">
          <span>3</span>oD
        </Link>
        <p>{siteCopy.footer.tagline}</p>
      </div>
      <div className="footer-links">
        <Link href="/for-buyers">{siteCopy.nav.buyers}</Link>
        <Link href="/for-printer-owners">{siteCopy.nav.suppliers}</Link>
        <Link href="/how-it-works">{siteCopy.nav.howItWorks}</Link>
      </div>
      <small>{siteCopy.footer.copyright}</small>
    </footer>
  );
}
