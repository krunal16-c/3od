import Link from 'next/link';
import { Icon } from './icons';

const navItems = [
  { label: 'Overview', icon: 'grid' as const, active: true },
  { label: 'RFQ inbox', icon: 'inbox' as const, badge: '4' },
  { label: 'My printers', icon: 'printer' as const },
  { label: 'Earnings', icon: 'wallet' as const },
];

export function OwnerSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      <aside className={`od-sidebar ${open ? 'od-sidebar-open' : ''}`}>
        <div className="od-brand-row">
          <Link className="od-brand" href="/" onClick={onClose}><span>3</span>oD</Link>
          <button className="od-icon-button od-close-button" onClick={onClose} aria-label="Close navigation"><Icon name="close" size={19} /></button>
        </div>
        <div className="od-workspace-chip"><span className="od-avatar od-avatar-small">AK</span><span><strong>Arjun Kapadia</strong><small>Printer owner</small></span><Icon name="chevron" size={14} /></div>
        <p className="od-nav-label">Workspace</p>
        <nav className="od-nav" aria-label="Owner workspace navigation">
          {navItems.map((item) => <a className={`od-nav-link ${item.active ? 'od-nav-active' : ''}`} href={`#${item.label.toLowerCase().replaceAll(' ', '-')}`} key={item.label} onClick={onClose}><Icon name={item.icon} size={18} /><span>{item.label}</span>{item.badge && <b>{item.badge}</b>}</a>)}
        </nav>
        <div className="od-sidebar-bottom">
          <a className="od-nav-link" href="#settings" onClick={onClose}><Icon name="settings" size={18} /><span>Settings</span></a>
          <a className="od-nav-link" href="#help" onClick={onClose}><Icon name="help" size={18} /><span>Help centre</span></a>
          <div className="od-sidebar-footer"><span className="od-status-dot" /> Accepting new work <span className="od-live-pill">LIVE</span></div>
        </div>
      </aside>
      {open && <button className="od-sidebar-scrim" aria-label="Close navigation" onClick={onClose} />}
    </>
  );
}
