'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getMyRfqs, getCurrentUser, logout, type RfqRecord } from '../../../lib/api-client';
import styles from './buyer-dashboard.module.css';

type IconName =
  | 'arrow'
  | 'bell'
  | 'box'
  | 'chevron'
  | 'clock'
  | 'cube'
  | 'file'
  | 'grid'
  | 'heart'
  | 'help'
  | 'plus'
  | 'search'
  | 'settings'
  | 'spark';

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true };
  const paths: Record<IconName, React.ReactNode> = {
    arrow: <><path d="M5 12h13" /><path d="m13 6 6 6-6 6" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
    box: <><path d="m21 8-9 5-9-5 9-5 9 5Z" /><path d="M3 8v8l9 5 9-5V8" /><path d="M12 13v8" /></>,
    chevron: <path d="m7 10 5 5 5-5" />,
    clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3 2" /></>,
    cube: <><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" /><path d="m4.5 7.8 7.5 4.4 7.5-4.4M12 12.2V21" /></>,
    file: <><path d="M6 3h8l4 4v14H6V3Z" /><path d="M14 3v5h4M9 13h6M9 17h4" /></>,
    grid: <><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></>,
    heart: <path d="M20.8 8.7c0 5.2-8.8 10.3-8.8 10.3S3.2 13.9 3.2 8.7A4.7 4.7 0 0 1 12 6.4a4.7 4.7 0 0 1 8.8 2.3Z" />,
    help: <><circle cx="12" cy="12" r="9" /><path d="M9.7 9a2.4 2.4 0 1 1 3.8 2c-1.2.8-1.5 1.3-1.5 2.5M12 17h.01" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 1.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.1h-2.5v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-1.8-1.8.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H6.5v-2.5h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 1.8-1.8.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5v-.1H15v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.8 1.8-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.1V15h-.1a1.7 1.7 0 0 0-1.5 0Z" /></>,
    spark: <><path d="m12 3 1.3 5.7L19 10l-5.7 1.3L12 17l-1.3-5.7L5 10l5.7-1.3L12 3ZM19 16l.6 2.4L22 19l-2.4.6L19 22l-.6-2.4L16 19l2.4-.6L19 16Z" /></>,
  };

  return <svg {...common} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

const navItems: { label: string; href: string; icon: IconName; active?: boolean; count?: string }[] = [
  { label: 'Overview', href: '/dashboard/buyer', icon: 'grid', active: true },
  { label: 'My RFQs', href: '/dashboard/buyer/rfqs', icon: 'file', count: '3' },
  { label: 'Orders', href: '/dashboard/buyer/orders', icon: 'box', count: '2' },
  { label: 'Saved designs', href: '/dashboard/buyer/designs', icon: 'heart' },
];

const rfqs = [
  { name: 'Desk organiser v2', meta: 'PLA · 4 parts · Due 28 Sep', status: '3 new quotes', price: '₹ 1,280 – ₹ 1,950', tone: 'orange' },
  { name: 'Enclosure bracket', meta: 'PETG · 12 parts · Due 02 Oct', status: 'Awaiting quotes', price: 'Closes in 2d 8h', tone: 'blue' },
];

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || '3D';
}

function NavContent({ accountName }: { accountName: string }) {
  return (
    <>
      <Link className={styles.brand} href="/" aria-label="3oD by Zester Product Studio home"><span>3</span>oD<small>by Zester Product Studio</small></Link>
      <div className={styles.workspaceLabel}>Buyer workspace <Icon name="chevron" size={14} /></div>
      <nav className={styles.nav} aria-label="Buyer dashboard">
        <p className={styles.navHeading}>Workspace</p>
        {navItems.map((item) => (
          <Link className={`${styles.navLink} ${item.active ? styles.navActive : ''}`} href={item.href} key={item.label}>
            <Icon name={item.icon} size={17} /><span>{item.label}</span>{item.count && <b>{item.count}</b>}
          </Link>
        ))}
        <p className={`${styles.navHeading} ${styles.navHeadingSpaced}`}>Account</p>
        <Link className={styles.navLink} href="/dashboard/buyer/settings"><Icon name="settings" size={17} /><span>Settings</span></Link>
        <Link className={styles.navLink} href="/dashboard/buyer/help"><Icon name="help" size={17} /><span>Help centre</span></Link>
      </nav>
      <div className={styles.sidebarBottom}>
        <div className={styles.trustNote}><Icon name="spark" size={16} /><span><strong>Made for makers</strong>Quotes from verified Indian print partners.</span></div>
        <Link className={styles.account} href="/login"><span className={styles.avatar}>{initials(accountName)}</span><span><strong>{accountName}</strong><small>Personal account</small></span><Icon name="chevron" size={15} /></Link>
      </div>
    </>
  );
}

function SectionTitle({ eyebrow, title, action }: { eyebrow: string; title: string; action?: React.ReactNode }) {
  return <div className={styles.sectionTitle}><div><p className={styles.eyebrow}>{eyebrow}</p><h2>{title}</h2></div>{action}</div>;
}

export function BuyerDashboard() {
  const [liveRfqs, setLiveRfqs] = useState<RfqRecord[]>([]);
  const [accountName, setAccountName] = useState('Your account');
  useEffect(() => {
    void getMyRfqs().then(({ rfqs: nextRfqs }) => setLiveRfqs(nextRfqs)).catch(() => undefined);
    void getCurrentUser().then(({ user }) => setAccountName(user.name || user.email)).catch(() => undefined);
  }, []);
  const displayName = accountName.split(/\s+/)[0] || 'there';
  const visibleRfqs = liveRfqs.length > 0 ? liveRfqs.slice(0, 2).map((rfq, index) => ({ name: rfq.title, meta: `${rfq.material ?? 'Material flexible'} · ${rfq.quantity ?? 1} parts · ${rfq.deadline ? `Due ${new Date(rfq.deadline).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}` : 'Date flexible'}`, status: rfq.state === 'QUOTES_RECEIVED' ? 'Quotes ready' : 'Awaiting quotes', price: rfq.state === 'QUOTES_RECEIVED' ? 'Compare quotes' : 'Open for quotes', tone: index % 2 === 0 ? 'orange' : 'blue' })) : rfqs;
  return (
    <div className={styles.dashboard}>
      <aside className={styles.sidebar}><NavContent accountName={accountName} /></aside>
      <details className={styles.mobileMenu}>
        <summary aria-label="Open dashboard menu"><span className={styles.mobileLogo}><span>3</span>oD</span><span className={styles.menuIcon}>☰</span></summary>
        <div className={styles.mobilePanel}><NavContent accountName={accountName} /></div>
      </details>
      <main className={styles.main}>
        <header className={styles.topbar}>
          <div className={styles.breadcrumb}><span>Buyer workspace</span><i>/</i><strong>Overview</strong></div>
          <div className={styles.topActions}><button className={styles.iconButton} aria-label="Search"><Icon name="search" /></button><button className={styles.iconButton} aria-label="Notifications"><Icon name="bell" /><em>2</em></button><Link className={styles.helpLink} href="/dashboard/buyer/help"><Icon name="help" size={16} /> Help</Link></div>
        </header>

        <div className={styles.content}>
          <section className={styles.welcome} aria-labelledby="welcome-title">
            <div><p className={styles.eyebrow}>Your 3oD workspace</p><h1 id="welcome-title">Good morning, {displayName}<span>.</span></h1><p className={styles.welcomeCopy}>Your print queue is looking good. Your live RFQs and quotes appear here as they move.</p></div>
            <Link className={styles.primaryButton} href="/request-quote"><Icon name="plus" size={17} /> Start a new RFQ <Icon name="arrow" size={16} /></Link>
          </section>

          <section className={styles.stats} aria-label="Workspace summary">
            <div className={styles.stat}><span className={styles.statIcon}><Icon name="file" size={17} /></span><span><small>Active RFQs</small><strong>2 <i>+1 this month</i></strong></span></div>
            <div className={styles.stat}><span className={`${styles.statIcon} ${styles.mint}`}><Icon name="box" size={17} /></span><span><small>In production</small><strong>1 <i>On track</i></strong></span></div>
            <div className={styles.stat}><span className={`${styles.statIcon} ${styles.lilac}`}><Icon name="heart" size={17} /></span><span><small>Saved designs</small><strong>8 <i>+2 this month</i></strong></span></div>
          </section>

          <div className={styles.grid}>
            <section className={styles.rfqSection} aria-labelledby="rfq-title"><SectionTitle eyebrow="01 / In progress" title="Active RFQs" action={<Link className={styles.textLink} href="/dashboard/buyer/rfqs">View all <Icon name="arrow" size={15} /></Link>} />
              <div className={styles.rfqList}>{visibleRfqs.map((rfq) => <article className={styles.rfqCard} key={rfq.name}><div className={`${styles.filePreview} ${rfq.tone}`}><Icon name="cube" size={27} /><span>.STL</span></div><div className={styles.rfqDetails}><div className={styles.rfqTop}><h3>{rfq.name}</h3><button className={styles.moreButton} aria-label={`More options for ${rfq.name}`}>•••</button></div><p>{rfq.meta}</p><div className={styles.rfqBottom}><span className={`${styles.pill} ${rfq.tone === 'orange' ? styles.pillOrange : styles.pillBlue}`}><span />{rfq.status}</span><strong>{rfq.price}</strong></div></div></article>)}</div>
            </section>

            <section className={styles.quoteSection} aria-labelledby="quote-title"><SectionTitle eyebrow="02 / Compare" title="Quote comparison" action={<span className={styles.updated}><span />Updated just now</span>} />
              <article className={styles.quoteCard}><div className={styles.quoteHeader}><div><span className={styles.recommended}><Icon name="spark" size={13} /> Best match</span><h3>Compare your responses</h3><p>Open an RFQ to review vendor quotes</p></div><Link href="/dashboard/buyer/rfqs" className={styles.viewLink}>View RFQs <Icon name="arrow" size={15} /></Link></div><div className={styles.quoteRows}><div className={`${styles.quoteRow} ${styles.bestRow}`}><span className={styles.printerLogo}>P</span><span className={styles.printerInfo}><strong>Printwise Studio</strong><small>Recommended local partner · MOQ 1</small></span><span className={styles.delivery}>Fast</span><strong className={styles.quotePrice}>₹1,280</strong><Link className={styles.selectButton} href="/dashboard/buyer/rfqs">View</Link></div><div className={styles.quoteRow}><span className={`${styles.printerLogo} ${styles.logoBlue}`}>M</span><span className={styles.printerInfo}><strong>MakerSpace 3D</strong><small>Engineering materials · MOQ 5</small></span><span className={styles.delivery}>2–4d</span><strong className={styles.quotePrice}>₹1,450</strong><Link className={styles.outlineButton} href="/dashboard/buyer/rfqs">View</Link></div><div className={styles.quoteRow}><span className={`${styles.printerLogo} ${styles.logoGreen}`}>F</span><span className={styles.printerInfo}><strong>FabLab Chennai</strong><small>Resin detail · MOQ 2</small></span><span className={styles.delivery}>4–6d</span><strong className={styles.quotePrice}>₹1,950</strong><Link className={styles.outlineButton} href="/dashboard/buyer/rfqs">View</Link></div></div></article>
            </section>
          </div>

          <div className={styles.lowerGrid}>
            <section aria-labelledby="order-title"><SectionTitle eyebrow="03 / On the move" title="Order progress" action={<Link className={styles.textLink} href="/dashboard/buyer/orders">All orders <Icon name="arrow" size={15} /></Link>} /><article className={styles.orderCard}><div className={styles.orderTop}><div><span className={styles.orderNumber}>ORDER #3OD-1048</span><h3>Phone stand — batch of 4</h3></div><span className={styles.pillMint}><span />In production</span></div><div className={styles.timeline}><div className={`${styles.timelineStep} ${styles.done}`}><span>✓</span><small>Order placed<em>18 Sep</em></small></div><div className={`${styles.timelineStep} ${styles.done}`}><span>✓</span><small>Design approved<em>19 Sep</em></small></div><div className={`${styles.timelineStep} ${styles.current}`}><span>3</span><small>Printing<em>Est. 25 Sep</em></small></div><div className={styles.timelineStep}><span>4</span><small>Delivered<em>Est. 27 Sep</em></small></div></div><div className={styles.orderFooter}><span><Icon name="box" size={15} /> Printwise Studio · Bengaluru</span><Link href="/dashboard/buyer/orders">Track order <Icon name="arrow" size={14} /></Link></div></article></section>
            <section aria-labelledby="saved-title"><SectionTitle eyebrow="04 / Your library" title="Saved designs" action={<Link className={styles.textLink} href="/dashboard/buyer/designs">Library <Icon name="arrow" size={15} /></Link>} /><div className={styles.designCard}><div className={styles.designThumbs}><div className={`${styles.thumb} ${styles.thumbOne}`}><span /></div><div className={`${styles.thumb} ${styles.thumbTwo}`}><span /></div><div className={`${styles.thumb} ${styles.thumbThree}`}><span /></div></div><div className={styles.designInfo}><div><h3>8 designs ready to print</h3><p>Keep your best ideas close. Start an RFQ from any saved design.</p></div><Link className={styles.smallButton} href="/dashboard/buyer/designs">Browse designs <Icon name="arrow" size={14} /></Link></div></div></section>
          </div>

          <section className={styles.prompt}><div className={styles.promptIcon}><Icon name="spark" size={21} /></div><div><p className={styles.eyebrow}>Not sure where to start?</p><h2>Have a design in mind?</h2><p>Upload a file, tell us what you need, and let verified print partners do the rest.</p></div><Link className={styles.promptButton} href="/request-quote">Get a quote <Icon name="arrow" size={15} /></Link></section>
          <footer className={styles.footer}><span>© 2026 3oD by Zester Product Studio</span><span>Made for makers across India <span className={styles.footerDot}>●</span></span><button className={styles.footerSignOut} onClick={() => { void logout().finally(() => { window.location.href = '/login'; }); }}>Sign out</button></footer>
        </div>
      </main>
    </div>
  );
}
