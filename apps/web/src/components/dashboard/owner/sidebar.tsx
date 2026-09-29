import Link from 'next/link';
import { Icon } from './icons';

const navItems = [
  { label: 'Overview', href: '/dashboard/owner', icon: 'grid' as const, active: true },
  { label: 'RFQ inbox', href: '/dashboard/owner/rfqs', icon: 'inbox' as const, badge: '4' },
  { label: 'My printers', href: '/dashboard/owner/printers', icon: 'printer' as const },
  { label: 'Earnings', href: '/dashboard/owner/earnings', icon: 'wallet' as const },
];

export function OwnerSidebar({ open, onClose, ownerName, rfqCount }: { open: boolean; onClose: () => void; ownerName: string; rfqCount: number }) {
  const initials = ownerName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || '3D';
  return (
    <>
      <aside className={`od-sidebar ${open ? 'od-sidebar-open' : ''}`}>
        <div className="od-brand-row">
          <Link className="od-brand" href="/" onClick={onClose}><span>3</span>oD</Link>
          <button className="od-icon-button od-close-button" onClick={onClose} aria-label="Close navigation"><Icon name="close" size={19} /></button>
        </div>
        <div className="od-workspace-chip"><span className="od-avatar od-avatar-small">{initials}</span><span><strong>{ownerName}</strong><small>Printer owner</small></span><Icon name="chevron" size={14} /></div>
        <p className="od-nav-label">Workspace</p>
        <nav className="od-nav" aria-label="Owner workspace navigation">
          {navItems.map((item) => <Link className={`od-nav-link ${item.active ? 'od-nav-active' : ''}`} href={item.href} key={item.label} onClick={onClose}><Icon name={item.icon} size={18} /><span>{item.label}</span>{item.label === 'RFQ inbox' && rfqCount > 0 && <b>{rfqCount}</b>}</Link>)}
        </nav>
        <div className="od-sidebar-bottom">
          <Link className="od-nav-link" href="/dashboard/owner/settings" onClick={onClose}><Icon name="settings" size={18} /><span>Settings</span></Link>
          <Link className="od-nav-link" href="/dashboard/owner/help" onClick={onClose}><Icon name="help" size={18} /><span>Help centre</span></Link>
          <div className="od-sidebar-footer"><span className="od-status-dot" /> Accepting new work <span className="od-live-pill">LIVE</span></div>
        </div>
      </aside>
      {open && <button className="od-sidebar-scrim" aria-label="Close navigation" onClick={onClose} />}
    </>
  );
}
