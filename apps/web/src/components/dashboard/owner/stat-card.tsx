import { Icon } from './icons';

type StatCardProps = {
  label: string;
  value: string;
  change: string;
  tone?: 'orange' | 'green' | 'ink' | 'cream';
  icon: 'wallet' | 'printer' | 'bolt' | 'clock';
};

export function StatCard({ label, value, change, tone = 'cream', icon }: StatCardProps) {
  return (
    <article className={`od-stat od-stat-${tone}`}>
      <div className="od-stat-top">
        <span className="od-stat-label">{label}</span>
        <span className="od-stat-icon"><Icon name={icon} size={17} /></span>
      </div>
      <strong>{value}</strong>
      <span className="od-stat-change">{change}</span>
    </article>
  );
}
