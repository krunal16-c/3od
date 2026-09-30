import Link from 'next/link';
import { siteCopy } from '../../app/content/site-copy';
import { Button } from '../ui/button';
import { MobileNav } from './mobile-nav';

export function Header() {
  return (
    <header className="site-header">
      <Link className="wordmark" href="/" aria-label="3oD by Zester Product Studio home"><span className="wordmark-name"><i>3</i>oD</span><small>by Zester Product Studio</small></Link>
      <nav className="nav-links" aria-label="Main navigation">
        <Link href="/for-buyers">{siteCopy.nav.buyers}</Link>
        <Link href="/for-printer-owners">{siteCopy.nav.suppliers}</Link>
        <Link href="/how-it-works">{siteCopy.nav.howItWorks}</Link>
        <Link href="/login">Sign in</Link>
      </nav>
      <Link className="nav-cta" href="/request-quote">{siteCopy.nav.quote} <span aria-hidden="true">↗</span></Link>
      <MobileNav />
    </header>
  );
}

export function Hero() {
  return (
    <section className="hero shell">
      <div className="hero-copy">
        <p className="eyebrow">{siteCopy.hero.eyebrow}</p>
        <h1>{siteCopy.hero.title}</h1>
        <p className="hero-body">{siteCopy.hero.body}</p>
        <div className="button-row">
          <Button href="/request-quote">{siteCopy.buyer.cta}</Button>
          <Button href="/join-as-supplier" secondary>{siteCopy.supplier.cta}</Button>
        </div>
      </div>
      <div className="hero-art" aria-label="Digital manufacturing workshop with a 3D printer" role="img">
        <div className="hero-art-shade" />
        <div className="hero-art-copy">
          <span className="art-label">DIGITAL WORKSHOP / INDIA</span>
          <strong>From CAD file<br />to useful part.</strong>
          <div className="hero-art-tags"><span>3D PRINTING</span><span>CNC NEXT</span><span>LASER NEXT</span></div>
        </div>
      </div>
    </section>
  );
}
